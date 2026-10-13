from rest_framework.permissions import BasePermission
from .models import MemberStatus, TripStatus, MemberRole

class IsTripAccessible(BasePermission):
    """
    - Anyone can view public trips
    - Authenticated users can view trips they own or are a member of
    - Only owners or members other than 'MEMBER' can update trips
    - Only owners can delete trips
    - Anyone who can view a trip can duplicate, bookmark or review it (reviews
      add their own owner/member rules in the view); removing a bookmark or
      one's own review is always allowed so stale rows can be cleared
    """

    READ_ACTIONS = ["retrieve", "list", "duplicate", "bookmark", "reviews"]

    def has_object_permission(self, request, view, obj):
        if view.action == "bookmark" and request.method == "DELETE":
            return True
        if view.action == "my_review":
            return True
        if view.action in self.READ_ACTIONS:
            if obj.status == TripStatus.DELETED:
                return False
            if obj.is_public:
                return True
            if not request.user.is_authenticated:
                return False
            return (
                obj.owner == request.user
                or obj.trip_members.filter(
                    user=request.user, status=MemberStatus.ACCEPTED
                ).exists()
            )
        # For update/delete → only owner or members with elevated roles
        if view.action == "destroy":
            return obj.owner == request.user
        return obj.owner == request.user or obj.trip_members.filter(user=request.user, status=MemberStatus.ACCEPTED).exclude(role=MemberRole.MEMBER).exists()


class IsMemberAccessible(BasePermission):
    """
    - Only trip owners or members with role 'ORGANIZER' can manage trip members
    - Members can view their own membership details
    - Member with owner attached cannot be modified or deleted
    """

    def has_object_permission(self, request, view, obj):
        trip = obj.trip
        if view.action in ["retrieve", "list"]:
            if not request.user.is_authenticated:
                return False
            if obj.user == request.user:
                return True
            return trip.owner == request.user or trip.trip_members.filter(
                user=request.user, status=MemberStatus.ACCEPTED
            ).exists()
        # For create/update/delete → only owner or members with elevated roles
        if obj.user == trip.owner:
            return False
        return trip.owner == request.user or trip.trip_members.filter(
            user=request.user, status=MemberStatus.ACCEPTED, role=MemberRole.ORGANIZER
        ).exists()
