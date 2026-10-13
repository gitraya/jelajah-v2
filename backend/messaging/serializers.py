from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Message, MESSAGE_MAX_LENGTH

User = get_user_model()


class ParticipantSerializer(serializers.ModelSerializer):
    is_online = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'avatar', 'is_online', 'last_seen']
        read_only_fields = fields


class MessageSerializer(serializers.ModelSerializer):
    sender_id = serializers.UUIDField(read_only=True)
    body = serializers.CharField(max_length=MESSAGE_MAX_LENGTH, trim_whitespace=True, allow_blank=False)

    class Meta:
        model = Message
        fields = ['id', 'sender_id', 'body', 'created_at', 'read_at']
        read_only_fields = ['id', 'sender_id', 'created_at', 'read_at']


class ConversationSerializer(serializers.Serializer):
    """Reads the `last_*` / `unread_count` annotations from `annotate_conversations`."""
    id = serializers.UUIDField()
    other_user = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.IntegerField()
    updated_at = serializers.DateTimeField()

    def get_other_user(self, obj):
        other = obj.other_user(self.context['request'].user)
        return ParticipantSerializer(other, context=self.context).data

    def get_last_message(self, obj):
        if obj.last_id is None:
            return None
        return {
            'id': str(obj.last_id),
            'body': obj.last_body,
            'sender_id': str(obj.last_sender_id),
            'created_at': serializers.DateTimeField().to_representation(obj.last_created_at),
        }


class StartConversationSerializer(serializers.Serializer):
    user_id = serializers.UUIDField()
