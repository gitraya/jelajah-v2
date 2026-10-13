from django.conf import settings
from django.db import models
from django.db.models import Q

from backend.models import BaseModel

MESSAGE_MAX_LENGTH = 2000


class ConversationQuerySet(models.QuerySet):
    def for_user(self, user):
        return self.filter(Q(user_a=user) | Q(user_b=user))


class Conversation(BaseModel):
    """A direct-message thread between exactly two users.

    The pair is stored in canonical order (`user_a.id < user_b.id`) so the
    unique constraint guarantees one conversation per pair.
    """
    user_a = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='+')
    user_b = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='+')

    objects = ConversationQuerySet.as_manager()

    class Meta:
        ordering = ['-updated_at']
        constraints = [
            models.UniqueConstraint(fields=['user_a', 'user_b'], name='unique_conversation_pair'),
            models.CheckConstraint(condition=~Q(user_a=models.F('user_b')), name='conversation_distinct_users'),
        ]

    def __str__(self):
        return f"{self.user_a_id} <-> {self.user_b_id}"

    @staticmethod
    def canonical_pair(user, other):
        return (user, other) if user.pk < other.pk else (other, user)

    @classmethod
    def get_between(cls, user, other):
        user_a, user_b = cls.canonical_pair(user, other)
        return cls.objects.filter(user_a=user_a, user_b=user_b).first()

    def has_participant(self, user):
        return user.pk in (self.user_a_id, self.user_b_id)

    def other_user(self, user):
        return self.user_b if self.user_a_id == user.pk else self.user_a


class Message(BaseModel):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='sent_messages')
    body = models.TextField(max_length=MESSAGE_MAX_LENGTH)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['created_at']
        indexes = [models.Index(fields=['conversation', 'created_at'])]

    def __str__(self):
        return f"{self.sender_id}: {self.body[:40]}"
