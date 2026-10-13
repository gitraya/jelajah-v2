from rest_framework import serializers
from .models import  ItineraryItem, ItineraryType
from trips.models import Trip

class ItineraryTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItineraryType
        fields = ['id', 'name']

class ItineraryItemSerializer(serializers.ModelSerializer):
    type = ItineraryTypeSerializer(read_only=True)
    type_id = serializers.PrimaryKeyRelatedField(queryset=ItineraryType.objects.all(), source='type', write_only=True, required=True)
    
    class Meta:
        model = ItineraryItem
        fields = [
            'id',
            'name',
            'address',
            'type',
            'description',
            'latitude',
            'longitude',
            'estimated_time',
            'visit_time',
            'notes',
            'status',
            'type_id',
            'cost',
            'booking_url',
        ]

    def validate_cost(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError("Cost cannot be negative.")
        return value
    
    def validate_visit_time(self, value):
        trip_id = self.context['trip_id']
        trip = Trip.objects.get(id=trip_id)
        if value and (value.date() < trip.start_date or value.date() > trip.end_date):
            raise serializers.ValidationError("Visit time must be within the trip's start and end dates.")
        return value
    
    def create(self, validated_data):
        trip_id = self.context['trip_id']
        validated_data['trip_id'] = trip_id
        return super().create(validated_data)
