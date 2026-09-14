from rest_framework import status, generics
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from django.db.models import Q
from django.contrib.auth import get_user_model
from django.db import models
from django.contrib.auth.tokens import default_token_generator

from .models import Trip, TripStatus, MemberStatus, TripMember, Tag
from .serializers import TripSerializer, TripMemberSerializer, TagSerializer, TripCoverSerializer
from .permissions import IsTripAccessible, IsMemberAccessible
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
        if self.action in ['list', 'retrieve']:
            permission_classes = [IsTripAccessible]
        else:
            permission_classes = [IsAuthenticated, IsTripAccessible]
        return [permission() for permission in permission_classes]

    def get_queryset(self):
        qs = Trip.objects.select_related('owner').prefetch_related('trip_members__user').all()
        
        if self.action == "list":
            is_public = self.request.query_params.get("is_public")
            if not self.request.user.is_authenticated or is_public:
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
