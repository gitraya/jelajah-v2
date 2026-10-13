from datetime import timezone as dt_timezone

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.db.models import Count, OuterRef, Q, Subquery
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from users.services import are_buddies
from .models import Conversation, Message
from .permissions import IsConversationParticipant
from .serializers import ConversationSerializer, MessageSerializer, StartConversationSerializer

User = get_user_model()

RECENT_MESSAGES_LIMIT = 100


def annotate_conversations(qs, user):
    """Add the last message and the requester's unread count without per-row queries."""
    last = Message.objects.filter(conversation=OuterRef('pk')).order_by('-created_at')
    unread = (
        Message.objects.filter(conversation=OuterRef('pk'), read_at__isnull=True)
        .exclude(sender=user)
        .order_by().values('conversation').annotate(c=Count('id')).values('c')
    )
    return qs.select_related('user_a', 'user_b').annotate(
        last_id=Subquery(last.values('id')[:1]),
        last_body=Subquery(last.values('body')[:1]),
        last_sender_id=Subquery(last.values('sender_id')[:1]),
        last_created_at=Subquery(last.values('created_at')[:1]),
        unread_count=Coalesce(Subquery(unread), 0),
    )


class MessagingView(APIView):
    """Shared setup: authenticated only, with frontend polling in mind.

    The conversation views are polled (every 5 s / 30 s), so they use their own
    scoped rate instead of the global per-user rate; sending is limited separately.
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'messaging'

    def get_throttles(self):
        if self.request.method == 'POST':
            self.throttle_scope = 'messaging_send'
        return super().get_throttles()

    def get_conversation(self, pk):
        conversation = get_object_or_404(Conversation.objects.for_user(self.request.user), pk=pk)
        self.check_object_permissions(self.request, conversation)
        return conversation


class ConversationListView(MessagingView):
    permission_classes = [IsAuthenticated, IsConversationParticipant]

    def get(self, request):
        qs = annotate_conversations(Conversation.objects.for_user(request.user), request.user)
        data = ConversationSerializer(qs.order_by('-updated_at'), many=True, context={'request': request}).data
        return Response(data)

    def post(self, request):
        serializer = StartConversationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        other_id = serializer.validated_data['user_id']
        if other_id == request.user.pk:
            return Response({'user_id': ['You cannot message yourself.']}, status=status.HTTP_400_BAD_REQUEST)
        other = get_object_or_404(User, pk=other_id)

        conversation = Conversation.get_between(request.user, other)
        created = False
        if conversation is None:
            if not are_buddies(request.user, other):
                return Response(
                    {'detail': 'You can only message people you share a trip with.'},
                    status=status.HTTP_403_FORBIDDEN,
                )
            user_a, user_b = Conversation.canonical_pair(request.user, other)
            try:
                with transaction.atomic():
                    conversation = Conversation.objects.create(user_a=user_a, user_b=user_b)
                created = True
            except IntegrityError:  # created concurrently by the other participant
                conversation = Conversation.get_between(request.user, other)

        conversation = annotate_conversations(Conversation.objects.filter(pk=conversation.pk), request.user).get()
        return Response(
            ConversationSerializer(conversation, context={'request': request}).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class MessageListView(MessagingView):
    permission_classes = [IsAuthenticated, IsConversationParticipant]

    def get(self, request, pk):
        conversation = self.get_conversation(pk)
        messages = conversation.messages.all()

        raw_after = request.query_params.get('after')
        if raw_after:
            # A literal "+" in an unencoded offset arrives as a space.
            after = parse_datetime(raw_after.replace(' ', '+'))
            if after is None:
                return Response({'after': ['Invalid datetime.']}, status=status.HTTP_400_BAD_REQUEST)
            if timezone.is_naive(after):
                after = timezone.make_aware(after, dt_timezone.utc)
            result = list(messages.filter(created_at__gt=after).order_by('created_at'))
        else:
            result = list(messages.order_by('-created_at')[:RECENT_MESSAGES_LIMIT])[::-1]

        # Mark everything the other participant sent here as read, including
        # older messages not in this page.
        now = timezone.now()
        conversation.messages.filter(read_at__isnull=True).exclude(sender=request.user).update(read_at=now)
        for message in result:
            if message.read_at is None and message.sender_id != request.user.pk:
                message.read_at = now

        return Response(MessageSerializer(result, many=True).data)

    def post(self, request, pk):
        conversation = self.get_conversation(pk)
        serializer = MessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            message = serializer.save(conversation=conversation, sender=request.user)
            conversation.save(update_fields=['updated_at'])
        return Response(MessageSerializer(message).data, status=status.HTTP_201_CREATED)


class UnreadCountView(MessagingView):
    def get(self, request):
        conversations = Conversation.objects.for_user(request.user)
        unread = (
            Message.objects.filter(conversation__in=conversations, read_at__isnull=True)
            .exclude(sender=request.user)
            .count()
        )
        return Response({'unread': unread})
