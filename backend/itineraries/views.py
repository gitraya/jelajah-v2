from rest_framework import viewsets, permissions, generics
from django.db.models import Sum
from rest_framework.response import Response
from backend.permissions import IsStatisticAccessible
from .models import ItineraryType, ItineraryItem
from .serializers import ItineraryTypeSerializer, ItineraryItemSerializer
from .permissions import IsItineraryItemAccessible

class ItineraryTypeViewSet(viewsets.ReadOnlyModelViewSet):
    """Itinerary types."""
    queryset = ItineraryType.objects.all()
    serializer_class = ItineraryTypeSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    
class ItineraryItemViewSet(viewsets.ModelViewSet):
    """Itinerary items for a specific trip."""
    serializer_class = ItineraryItemSerializer
    permission_classes = [IsItineraryItemAccessible]
    
    def get_queryset(self):
        type_id = self.request.query_params.get("type_id")
        status = self.request.query_params.get("status")
        trip_id = self.kwargs.get('trip_id')
        queryset = ItineraryItem.objects.filter(trip_id=trip_id)
        if type_id:
            queryset = queryset.filter(type_id=type_id)
        if status:
            queryset = queryset.filter(status=status.upper())
        return queryset

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['trip_id'] = self.kwargs.get('trip_id')
        return context
    
class ItineraryOrganizedListViewSet(viewsets.ViewSet):
    """Itinerary items desc sorted by visit_time & only not skipped items."""
    permission_classes = [IsItineraryItemAccessible]

    def list(self, request, trip_id=None):
        items = ItineraryItem.objects.filter(trip_id=trip_id).exclude(status='SKIPPED').order_by('-visit_time')
        serializer = ItineraryItemSerializer(items, many=True)
        return Response(serializer.data)

class ItineraryItemStatisticsView(generics.RetrieveAPIView):
    """Statistics for itinerary items in a trip."""
    permission_classes = [IsStatisticAccessible]

    def get(self, request, trip_id=None):
        total = ItineraryItem.objects.filter(trip_id=trip_id).count()
        visited = ItineraryItem.objects.filter(trip_id=trip_id, status='VISITED').count()
        planned = ItineraryItem.objects.filter(trip_id=trip_id, status='PLANNED').count()
        skipped = ItineraryItem.objects.filter(trip_id=trip_id, status='SKIPPED').count()
        total_cost = ItineraryItem.objects.filter(trip_id=trip_id).aggregate(total=Sum('cost'))['total'] or 0

        return Response({
            "total": total,
            "visited": visited,
            "planned": planned,
            "skipped": skipped,
            "total_cost": f"{total_cost:.2f}",
        })
