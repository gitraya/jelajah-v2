from rest_framework.permissions import BasePermission


class IsConversationParticipant(BasePermission):
    """Only the two participants can read or post in a conversation.

    Views also scope their querysets to the requester's conversations, so a
    non-participant gets a 404 rather than learning the conversation exists.
    """

    def has_object_permission(self, request, view, obj):
        return obj.has_participant(request.user)
