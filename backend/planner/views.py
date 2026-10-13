from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from trips.serializers import TripSerializer

from . import services
from .serializers import PlannerRequestSerializer, SaveDraftSerializer

NOT_CONFIGURED = {"detail": "AI planner is not configured."}


class PlannerItineraryView(APIView):
    """Draft or revise a trip itinerary with Claude (one chat turn)."""
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'planner'

    def post(self, request):
        if not services.is_configured():
            return Response(NOT_CONFIGURED, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        serializer = PlannerRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            result = services.generate(serializer.validated_data['messages'], serializer.validated_data['draft'])
        except services.PlannerError as exc:
            return Response({"detail": exc.detail}, status=exc.status_code)
        return Response(result)


class PlannerSaveView(APIView):
    """Save a planner draft as a new trip with its itinerary items."""
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'planner_save'

    def post(self, request):
        if not services.is_configured():
            return Response(NOT_CONFIGURED, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        serializer = SaveDraftSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        trip = services.save_draft(serializer.validated_data['draft'], request.user)
        return Response(TripSerializer(trip, context={'request': request}).data, status=status.HTTP_201_CREATED)
