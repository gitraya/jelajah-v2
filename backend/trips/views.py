from rest_framework import status, generics
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from django.db.models import Q, Avg, Count, Exists, OuterRef, Subquery, Value, BooleanField, CharField, IntegerField, FloatField
from django.db.models.functions import Coalesce
from django.utils.dateparse import parse_date
from django.contrib.auth import get_user_model
from django.db import models
from django.contrib.auth.tokens import default_token_generator

from .models import Trip, TripStatus, MemberStatus, TripMember, Tag, SavedTrip, TripReview
from .serializers import TripSerializer, TripMemberSerializer, TagSerializer, TripCoverSerializer, TripReviewSerializer
from .permissions import IsTripAccessible, IsMemberAccessible
from .services import duplicate_trip
from expenses.models import ExpenseSplit
from itineraries.models import ItineraryItem
from checklist.models import ChecklistItem
from datetime import timedelta
from backend.images import delete_replaced_file
from backend.services import send_templated_email
from django.conf import settings

User = get_user_model()

class TripViewSet(ModelViewSet):
    """
    ViewSet for Trip CRUD operations with custom actions
    """
    serializer_class = TripSerializer
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve'] or (self.action == 'reviews' and self.request.method == 'GET'):
            permission_classes = [IsTripAccessible]
        else:
            permission_classes = [IsAuthenticated, IsTripAccessible]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        qs = Trip.objects.select_related('owner').prefetch_related('trip_members__user').all()
        qs = self._annotate(qs)
        
        if self.action == "list":
            is_public = self.request.query_params.get("is_public")
            saved = self.request.query_params.get("saved", "").lower() in ("true", "1")
            if saved:
                # Bookmarked trips the user can still read.
                user = self.request.user
                if not user.is_authenticated:
                    return qs.none()
                qs = qs.filter(saves__user=user).filter(
                    Q(is_public=True) |
                    Q(owner=user) |
                    Q(trip_members__user=user, trip_members__status=MemberStatus.ACCEPTED)
                ).exclude(status=TripStatus.DELETED).distinct()
            elif not self.request.user.is_authenticated or is_public:
                qs = qs.filter(is_public=True).exclude(status=TripStatus.DELETED).exclude(status=TripStatus.CANCELLED)
            else:
                user = self.request.user
                qs = qs.filter(
                    (Q(owner=user) | 
                    Q(trip_members__user=user, trip_members__status=MemberStatus.ACCEPTED)) & ~Q(status=TripStatus.DELETED)
                ).distinct()
            
            # Apply additional filters from query params
            destination = self.request.query_params.get("destination")
            if destination:
                qs = qs.filter(destination__icontains=destination)
            
            difficulty = self.request.query_params.get("difficulty")
            if difficulty:
                qs = qs.filter(difficulty=difficulty.upper())
            
            status = self.request.query_params.get("status")
            if status:
                qs = qs.filter(status=status.upper())
            
            search = self.request.query_params.get("search")
            if search:
                qs = qs.filter(Q(title__icontains=search) | Q(destination__icontains=search) | Q(tags__name__icontains=search)).distinct()

        return qs

    def _annotate(self, qs):
        return self._annotate_reviews(self._annotate_saves(qs))

    def _annotate_reviews(self, qs):
        """Annotate `rating_avg`, `reviews_count`, `my_rating` and `my_comment` (read by TripSerializer)."""
        reviews = TripReview.objects.filter(trip=OuterRef('pk')).order_by().values('trip')
        qs = qs.annotate(
            rating_avg=Subquery(reviews.annotate(a=Avg('rating')).values('a'), output_field=FloatField()),
            reviews_count=Coalesce(Subquery(reviews.annotate(c=Count('id')).values('c')), 0),
        )
        user = self.request.user
        if user.is_authenticated:
            mine = TripReview.objects.filter(trip=OuterRef('pk'), user=user)
            return qs.annotate(
                my_rating=Subquery(mine.values('rating')[:1]),
                my_comment=Subquery(mine.values('comment')[:1]),
            )
        return qs.annotate(
            my_rating=Value(None, output_field=IntegerField()),
            my_comment=Value(None, output_field=CharField()),
        )

    def _annotate_saves(self, qs):
        """Annotate `saves_count` and `is_saved` (read by TripSerializer) to avoid N+1 queries."""
        saves = SavedTrip.objects.filter(trip=OuterRef('pk')).order_by().values('trip').annotate(c=Count('id')).values('c')
        qs = qs.annotate(saves_count=Coalesce(Subquery(saves), 0))
        user = self.request.user
        if user.is_authenticated:
            return qs.annotate(is_saved=Exists(SavedTrip.objects.filter(trip=OuterRef('pk'), user=user)))
        return qs.annotate(is_saved=Value(False, output_field=BooleanField()))
    
    def destroy(self, request, *args, **kwargs):
        trip = self.get_object()
        self.check_object_permissions(request, trip)

        trip.status = TripStatus.DELETED
        trip.save()
        return Response(status=204)

    def get_throttles(self):
        if self.action == 'cover' and self.request.method == 'PUT':
            self.throttle_scope = 'uploads'
        return super().get_throttles()

    @action(detail=True, methods=['post'], url_path='duplicate')
    def duplicate(self, request, pk=None):
        """Copy a readable trip (own or public) into a new private trip owned by the requester."""
        source = self.get_object()

        title = request.data.get('title') or None
        if title is not None:
            title = str(title).strip()[:255] or None

        start_date = None
        raw_start_date = request.data.get('start_date')
        if raw_start_date:
            try:
                start_date = parse_date(str(raw_start_date))
            except ValueError:
                start_date = None
            if start_date is None:
                return Response({"start_date": ["Invalid date format, expected YYYY-MM-DD."]}, status=status.HTTP_400_BAD_REQUEST)

        trip = duplicate_trip(source, request.user, title=title, start_date=start_date)
        trip = self._annotate(Trip.objects.filter(pk=trip.pk)).get()
        return Response(TripSerializer(trip, context=self.get_serializer_context()).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post', 'delete'], url_path='bookmark')
    def bookmark(self, request, pk=None):
        """Save (POST, idempotent) or unsave (DELETE) a trip for the requester."""
        trip = self.get_object()
        if request.method == 'DELETE':
            SavedTrip.objects.filter(user=request.user, trip=trip).delete()
            is_saved, response_status = False, status.HTTP_200_OK
        else:
            _, created = SavedTrip.objects.get_or_create(user=request.user, trip=trip)
            is_saved = True
            response_status = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response({
            "is_saved": is_saved,
            "saves_count": SavedTrip.objects.filter(trip=trip).count(),
        }, status=response_status)

    @action(detail=True, methods=['get', 'post'], url_path='reviews')
    def reviews(self, request, pk=None):
        """List a readable trip's reviews (GET) or upsert the requester's own review (POST)."""
        trip = self.get_object()
        if request.method == 'GET':
            reviews = trip.reviews.select_related('user').order_by('-created_at')
            return Response(TripReviewSerializer(reviews, many=True, context=self.get_serializer_context()).data)

        if trip.owner_id == request.user.pk:
            return Response({"detail": "You cannot review your own trip."}, status=status.HTTP_403_FORBIDDEN)
        is_member = trip.trip_members.filter(user=request.user, status=MemberStatus.ACCEPTED).exists()
        if not (trip.is_public or is_member):
            return Response({"detail": "Only members can review a private trip."}, status=status.HTTP_403_FORBIDDEN)

        existing = TripReview.objects.filter(trip=trip, user=request.user).first()
        serializer = TripReviewSerializer(existing, data=request.data, context=self.get_serializer_context())
        serializer.is_valid(raise_exception=True)
        review = serializer.save(trip=trip, user=request.user)
        return Response(
            TripReviewSerializer(review, context=self.get_serializer_context()).data,
            status=status.HTTP_200_OK if existing else status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=['delete'], url_path='reviews/mine', url_name='reviews-mine')
    def my_review(self, request, pk=None):
        """Delete the requester's review of the trip (idempotent)."""
        trip = self.get_object()
        TripReview.objects.filter(trip=trip, user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=['put', 'delete'], url_path='cover', parser_classes=[MultiPartParser, FormParser])
    def cover(self, request, pk=None):
        """Upload (PUT, multipart `cover_image`) or remove (DELETE) the trip's cover image."""
        trip = self.get_object()
        old_cover = trip.cover_image

        if request.method == 'DELETE':
            trip.cover_image = None
            trip.save(update_fields=['cover_image', 'updated_at'])
        else:
            serializer = TripCoverSerializer(trip, data=request.data)
            serializer.is_valid(raise_exception=True)
            trip = serializer.save()

        delete_replaced_file(old_cover, trip.cover_image.name)
        return Response(TripSerializer(trip, context=self.get_serializer_context()).data)
    
class TripMemberViewSet(ModelViewSet):
    """
    ViewSet for TripMember CRUD operations
    """
    serializer_class = TripMemberSerializer
    permission_classes = [IsAuthenticated, IsMemberAccessible]

    def get_queryset(self):
        qs = TripMember.objects.filter(trip_id=self.kwargs.get('trip_id'))
        
        if self.action == "list":
            status = self.request.query_params.get("status")
            if status:
                qs = qs.filter(status=status.upper())
        
        return qs
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['trip'] = self.kwargs.get('trip_id')
        return context

    def perform_create(self, serializer):
        instance = serializer.save()
        
        # Notify new member with new user account via email
        if instance.user.has_usable_password() is False:
            token = default_token_generator.make_token(instance.user)
            send_templated_email(
                recipient_email=instance.user.email,
                subject=f"You've Been Added to Trip: {instance.trip.title}",
                template_name='trip_membership_added_new_user',
                context={
                    'user': instance.user,
                    'trip': instance.trip,
                    'login_url': settings.FRONTEND_URL + '/login?redirect=/trips/' + str(instance.trip.id),
                    'set_password_url': settings.FRONTEND_URL + '/set-password/' + str(instance.user.id) + '/' + token,
                }
            )
        else:
            send_templated_email(
                recipient_email=instance.user.email,
                subject=f"You've Been Added to Trip: {instance.trip.title}",
                template_name='trip_membership_added',
                context={
                    'user': instance.user,
                    'trip': instance.trip,
                    'login_url': settings.FRONTEND_URL + '/login?redirect=/trips/' + str(instance.trip.id),
                }
            )
        
        return super().perform_create(serializer)
    
    def perform_update(self, serializer):
        old_instance = self.get_object()
        new_instance = serializer.save()
        # Notify member via email if status changed
        if old_instance.status != new_instance.status:
            if new_instance.status == MemberStatus.ACCEPTED:
                send_templated_email(
                    recipient_email=new_instance.user.email,
                    subject=f"You've Been Accepted to Join Trip: {new_instance.trip.title}",
                    template_name='trip_membership_accepted',
                    context={
                        'user': new_instance.user,
                        'trip': new_instance.trip,
                        'login_url': settings.FRONTEND_URL + '/login?redirect=/trips/' + str(new_instance.trip.id) + '/manage',
                    }
                )
            elif new_instance.status == MemberStatus.DECLINED:
                send_templated_email(
                    recipient_email=new_instance.user.email,
                    subject=f"Your Request to Join Trip: {new_instance.trip.title} has Been Declined",
                    template_name='trip_membership_declined',
                    context={
                        'user': new_instance.user,
                        'trip': new_instance.trip,
                        'login_url': settings.FRONTEND_URL + '/login?redirect=/trips/' + str(new_instance.trip.id),
                        'trips_url': settings.FRONTEND_URL + '/login',
                    }
                )
            elif new_instance.status == MemberStatus.BLOCKED:
                send_templated_email(
                    recipient_email=new_instance.user.email,
                    subject=f"You've Been Blocked from Trip: {new_instance.trip.title}",
                    template_name='trip_membership_blocked',
                    context={
                        'user': new_instance.user,
                        'trip': new_instance.trip,
                        'login_url': settings.FRONTEND_URL + '/login?redirect=/trips/' + str(new_instance.trip.id),
                    }
                )
            else:
                # For other status changes, no email is sent
                pass
        super().perform_update(serializer)
    
class TripMemberStatisticsView(generics.RetrieveAPIView):
    """
    View to get statistics of trip members by their status
    """
    permission_classes = [IsAuthenticated, IsTripAccessible]

    def get(self, request, trip_id=None):
        total = TripMember.objects.filter(trip_id=trip_id).count()
        pending = TripMember.objects.filter(trip_id=trip_id, status=MemberStatus.PENDING).count()
        accepted = TripMember.objects.filter(trip_id=trip_id, status=MemberStatus.ACCEPTED).count()
        declined = TripMember.objects.filter(trip_id=trip_id, status=MemberStatus.DECLINED).count()
        blocked = TripMember.objects.filter(trip_id=trip_id, status=MemberStatus.BLOCKED).count()
        # Calculate total expenses for all accepted members
        accepted_members = TripMember.objects.filter(trip_id=trip_id, status=MemberStatus.ACCEPTED)
        total_expenses = sum(
            ExpenseSplit.objects.filter(
            expense__trip_id=trip_id,
            member=member
            ).aggregate(total=models.Sum('amount'))['total'] or 0
            for member in accepted_members
        )
        
        # Calculate average expense
        accepted_count = accepted_members.count()
        average_expense = total_expenses / accepted_count if accepted_count > 0 else 0

        return Response({
            "total": total,
            "pending": pending,
            "accepted": accepted,
            "declined": declined,
            "blocked": blocked,
            "average_expense": average_expense,
            "total_expenses": total_expenses,
        })
        
class TripItinerarySummaryView(generics.RetrieveAPIView):
    """
    View to get itinerary summary for a trip
    """
    permission_classes = [IsTripAccessible]
    queryset = Trip.objects.all()

    def get(self, request, trip_id=None):
        trip = Trip.objects.filter(id=trip_id).only('start_date', 'end_date').first()
        start_date, end_date = trip.start_date, trip.end_date
        if not start_date or not end_date:
            return Response({"detail": "Trip dates are not set."}, status=status.HTTP_400_BAD_REQUEST)

        allChecklistItems = ChecklistItem.objects.filter(trip_id=trip_id)
        allLocations = ItineraryItem.objects.filter(trip_id=trip_id)


        summary = []
        day_count = (end_date - start_date).days + 1
        for i in range(day_count):
            d = start_date + timedelta(days=i)
            
            # "Month Day" label like "March 17"
            date_label = f"{d.strftime('%B')} {d.day}"

            tasks = allChecklistItems.filter(due_date=d).count()
            tasks_completed = allChecklistItems.filter(
                due_date=d, is_completed=True
            ).count()
            
            locations = allLocations.filter(
                visit_time__date=d
            ).only('name', 'address', 'status')
            locations_visited = locations.filter(status='VISITED').count()

            summary.append({
                "date": date_label,
                "locations": [loc.address for loc in locations],
                "itineraries": [loc.name for loc in locations],
                "tasks": tasks,
                "locations_visited": locations_visited,
                "tasks_completed": tasks_completed,
            })
        
        
        return Response(summary)

class TripStatisticsView(generics.RetrieveAPIView):
    """
    View to get overall trip statistics
    """
    permission_classes = []
    
    def get(self, request):
        tripObjects = Trip.objects.filter(is_public=True).exclude(status=TripStatus.DELETED).exclude(status=TripStatus.CANCELLED)
        total = tripObjects.count()
        average_budget = tripObjects.aggregate(models.Avg('budget'))['budget__avg'] or 0
        
        joinable = 0
        joinableTrips = tripObjects.filter(is_joinable=True)
        for trip in joinableTrips:
            accepted_members_count = TripMember.objects.filter(trip=trip, status=MemberStatus.ACCEPTED).count()
            if accepted_members_count < trip.member_spots:
                joinable += 1
        
        destinations = set()
        for destination in tripObjects.values_list('destination', flat=True).distinct():
            if ',' in destination:
                destinations.update([d.strip() for d in destination.split(',')])
            else:
                destinations.add(destination)

        user = request.user
        my_trips = {}
        if user.is_authenticated:
            myTripObjects = Trip.objects.filter(
                Q(owner=user) | 
                Q(trip_members__user=user, trip_members__status=MemberStatus.ACCEPTED)
            ).exclude(status=TripStatus.DELETED).distinct()
            my_trips['total'] = myTripObjects.count()
            my_trips['ongoing'] = myTripObjects.filter(status=TripStatus.ONGOING).count()
            my_trips['upcoming'] = myTripObjects.filter(status=TripStatus.PLANNING).count()
            my_trips['total_budget'] = myTripObjects.aggregate(models.Sum('budget'))['budget__sum'] or 0

        return Response({
            "total": total,
            "joinable": joinable,
            "destinations": list(destinations),
            "average_budget": average_budget,
            "my_trips": my_trips,
        })

class TagListView(generics.ListAPIView):
    """
    View to list all unique tags used in trips
    """
    serializer_class = TagSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    queryset = Tag.objects.all()


class JoinTripView(generics.CreateAPIView):
    """
    View to handle joining a trip
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, trip_id=None):
        user = request.user
        trip = Trip.objects.filter(id=trip_id, is_joinable=True).first()
        if not trip:
            return Response({"detail": "Trip not found or not joinable."}, status=status.HTTP_404_NOT_FOUND)
        
        members_count = TripMember.objects.filter(trip=trip, status=MemberStatus.ACCEPTED).count()
        if members_count >= trip.member_spots:
            return Response({"detail": "Trip is full."}, status=status.HTTP_400_BAD_REQUEST)
        
        existing_member = TripMember.objects.filter(trip=trip, user=user).first()
        if existing_member and existing_member.status == MemberStatus.ACCEPTED:
            return Response({"detail": "You are already a member of this trip."}, status=status.HTTP_400_BAD_REQUEST)
        if existing_member:
            return Response({"detail": "You have already requested to join this trip."}, status=status.HTTP_400_BAD_REQUEST)
        
        TripMember.objects.create(trip=trip, user=user, status=MemberStatus.PENDING)
        
        # Notify trip owner via email
        send_templated_email(
            recipient_email=trip.owner.email,
            subject=f"New Join Request for Trip: {trip.title}",
            template_name='join_trip_request',
            context={
                'owner': trip.owner,
                'trip': trip,
                'requester': user,
                'login_url': settings.FRONTEND_URL + '/login?redirect=/trips/' + str(trip.id) + '/manage?tab=members',
            }
        )
        
        return Response({"detail": "Join request sent."}, status=status.HTTP_201_CREATED)
