from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers

from trips.models import TripDifficulty

MAX_MESSAGES = 40


class StopSerializer(serializers.Serializer):
    time = serializers.RegexField(r'^([01]?\d|2[0-3]):[0-5]\d$', error_messages={'invalid': 'Time must be HH:MM.'})
    name = serializers.CharField(max_length=255)
    type = serializers.CharField(allow_blank=True, required=False, default='')
    description = serializers.CharField(allow_blank=True, required=False, default='')
    address = serializers.CharField(allow_blank=True, required=False, default='')
    estimated_time = serializers.CharField(allow_blank=True, required=False, default='')
    cost = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=0, required=False, default=0)
    # Cleaned (invalid -> '') rather than rejected; see services.clean_booking_url.
    booking_url = serializers.CharField(allow_blank=True, required=False, default='')


class DaySerializer(serializers.Serializer):
    day = serializers.IntegerField(min_value=1)
    title = serializers.CharField(allow_blank=True, required=False, default='')
    date = serializers.DateField(required=False, allow_null=True, default=None)
    stops = StopSerializer(many=True)


class DraftSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255)
    destination = serializers.CharField(max_length=255)
    country_flag = serializers.CharField(allow_blank=True, required=False, default='')
    description = serializers.CharField(allow_blank=True, required=False, default='', max_length=2000)
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    travelers = serializers.IntegerField(min_value=1, required=False, default=1)
    difficulty = serializers.ChoiceField(choices=TripDifficulty.choices, required=False, default=TripDifficulty.EASY)
    days = DaySerializer(many=True)

    def validate(self, attrs):
        start_date, end_date = attrs['start_date'], attrs['end_date']
        if end_date < start_date:
            raise serializers.ValidationError({'end_date': 'End date cannot be before start date.'})
        for day in attrs['days']:
            date = day['date'] or start_date + timedelta(days=day['day'] - 1)
            if not (start_date <= date <= end_date):
                raise serializers.ValidationError({'days': f"Day {day['day']} date must be within the trip dates."})
        return attrs


class MessageSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=['user', 'assistant'])
    content = serializers.CharField(max_length=4000)


class PlannerRequestSerializer(serializers.Serializer):
    messages = MessageSerializer(many=True, allow_empty=False)
    draft = DraftSerializer(required=False, allow_null=True, default=None)

    def validate_messages(self, messages):
        if len(messages) > MAX_MESSAGES:
            raise serializers.ValidationError(f'At most {MAX_MESSAGES} messages are allowed.')
        if messages[0]['role'] != 'user' or messages[-1]['role'] != 'user':
            raise serializers.ValidationError('The first and last messages must be from the user.')
        return messages


class SaveDraftSerializer(serializers.Serializer):
    draft = DraftSerializer()

    def validate_draft(self, draft):
        # Same rule as creating a trip through TripSerializer.
        if draft['start_date'] < timezone.localdate():
            raise serializers.ValidationError({'start_date': 'Start date cannot be in the past.'})
        return draft
