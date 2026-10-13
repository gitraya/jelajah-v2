from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from trips.models import MemberRole, MemberStatus, Trip, TripMember, TripStatus
from .models import Conversation, Message

User = get_user_model()


class MessagingTestCase(APITestCase):
    def setUp(self):
        cache.clear()  # scoped throttle counters live in the cache
        self.client = APIClient()
        self.alice = User.objects.create_user(email="alice@example.com", password="x", first_name="Alice")
        self.bob = User.objects.create_user(email="bob@example.com", password="x", first_name="Bob")
        self.carol = User.objects.create_user(email="carol@example.com", password="x", first_name="Carol")
        self.trip = Trip.objects.create(
            owner=self.alice, title="Bali", destination="Bali",
            start_date=date.today() + timedelta(days=3), end_date=date.today() + timedelta(days=5),
        )
        TripMember.objects.create(trip=self.trip, user=self.alice, role=MemberRole.ORGANIZER, status=MemberStatus.ACCEPTED)
        TripMember.objects.create(trip=self.trip, user=self.bob, status=MemberStatus.ACCEPTED)
        # Carol only has a pending request: not a buddy.
        TripMember.objects.create(trip=self.trip, user=self.carol, status=MemberStatus.PENDING)

    def as_user(self, user):
        self.client.force_authenticate(user=user)

    def start(self, user, other):
        self.as_user(user)
        return self.client.post(reverse("conversation-list"), {"user_id": str(other.id)}, format="json")

    def make_conversation(self, a, b):
        user_a, user_b = Conversation.canonical_pair(a, b)
        return Conversation.objects.create(user_a=user_a, user_b=user_b)

    def messages_url(self, conversation):
        return reverse("conversation-messages", kwargs={"pk": conversation.pk if hasattr(conversation, "pk") else conversation})


class StartConversationTests(MessagingTestCase):
    def test_get_or_create_with_buddy(self):
        resp = self.start(self.alice, self.bob)
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
        self.assertEqual(set(resp.data), {"id", "other_user", "last_message", "unread_count", "updated_at"})
        self.assertEqual(resp.data["other_user"]["id"], str(self.bob.id))
        self.assertEqual(
            set(resp.data["other_user"]),
            {"id", "email", "first_name", "last_name", "avatar", "is_online", "last_seen"},
        )
        self.assertIsNone(resp.data["last_message"])
        self.assertEqual(resp.data["unread_count"], 0)

        # Same pair from the other side returns the existing conversation.
        resp2 = self.start(self.bob, self.alice)
        self.assertEqual(resp2.status_code, status.HTTP_200_OK)
        self.assertEqual(resp2.data["id"], resp.data["id"])
        self.assertEqual(resp2.data["other_user"]["id"], str(self.alice.id))
        self.assertEqual(Conversation.objects.count(), 1)

    def test_non_buddy_forbidden(self):
        resp = self.start(self.alice, self.carol)
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(Conversation.objects.exists())

    def test_deleted_trip_does_not_make_buddies(self):
        self.trip.status = TripStatus.DELETED
        self.trip.save()
        self.assertEqual(self.start(self.alice, self.bob).status_code, status.HTTP_403_FORBIDDEN)

    def test_existing_conversation_stays_usable_after_leaving_trip(self):
        conversation = self.make_conversation(self.alice, self.carol)
        resp = self.start(self.alice, self.carol)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["id"], str(conversation.id))
        resp = self.client.post(self.messages_url(conversation), {"body": "still here"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_self_and_invalid_targets(self):
        self.assertEqual(self.start(self.alice, self.alice).status_code, status.HTTP_400_BAD_REQUEST)
        resp = self.client.post(reverse("conversation-list"), {"user_id": "nope"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        resp = self.client.post(
            reverse("conversation-list"), {"user_id": "00000000-0000-0000-0000-000000000000"}, format="json",
        )
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_requires_authentication(self):
        self.assertEqual(self.client.get(reverse("conversation-list")).status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(self.client.get(reverse("messages-unread-count")).status_code, status.HTTP_401_UNAUTHORIZED)


class ConversationListTests(MessagingTestCase):
    def test_list_with_last_message_and_unread_newest_first(self):
        dave = User.objects.create_user(email="dave@example.com", password="x")
        TripMember.objects.create(trip=self.trip, user=dave, status=MemberStatus.ACCEPTED)
        with_bob = self.make_conversation(self.alice, self.bob)
        with_dave = self.make_conversation(self.alice, dave)
        self.make_conversation(self.bob, dave)  # not Alice's

        self.as_user(self.bob)
        self.client.post(self.messages_url(with_bob), {"body": "hi alice"}, format="json")
        self.client.post(self.messages_url(with_bob), {"body": "you there?"}, format="json")
        self.as_user(dave)
        self.client.post(self.messages_url(with_dave), {"body": "yo"}, format="json")
        self.as_user(self.alice)
        self.client.post(self.messages_url(with_dave), {"body": "hey dave"}, format="json")

        resp = self.client.get(reverse("conversation-list"))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual([c["id"] for c in resp.data], [str(with_dave.id), str(with_bob.id)])
        dave_conv, bob_conv = resp.data
        self.assertEqual(dave_conv["last_message"]["body"], "hey dave")
        self.assertEqual(dave_conv["last_message"]["sender_id"], str(self.alice.id))
        self.assertEqual(set(dave_conv["last_message"]), {"id", "body", "sender_id", "created_at"})
        self.assertEqual(dave_conv["unread_count"], 1)
        self.assertEqual(bob_conv["last_message"]["body"], "you there?")
        self.assertEqual(bob_conv["unread_count"], 2)
        self.assertEqual(bob_conv["other_user"]["id"], str(self.bob.id))

    def test_unread_count_endpoint(self):
        conversation = self.make_conversation(self.alice, self.bob)
        Message.objects.create(conversation=conversation, sender=self.bob, body="1")
        Message.objects.create(conversation=conversation, sender=self.bob, body="2")
        Message.objects.create(conversation=conversation, sender=self.alice, body="mine")
        Message.objects.create(conversation=conversation, sender=self.bob, body="seen", read_at=timezone.now())

        self.as_user(self.alice)
        self.assertEqual(self.client.get(reverse("messages-unread-count")).data, {"unread": 2})
        self.as_user(self.bob)
        self.assertEqual(self.client.get(reverse("messages-unread-count")).data, {"unread": 1})
        self.as_user(self.carol)
        self.assertEqual(self.client.get(reverse("messages-unread-count")).data, {"unread": 0})


class MessageTests(MessagingTestCase):
    def setUp(self):
        super().setUp()
        self.conversation = self.make_conversation(self.alice, self.bob)

    def test_send_message(self):
        before = self.conversation.updated_at
        self.as_user(self.alice)
        resp = self.client.post(self.messages_url(self.conversation), {"body": "  hello  "}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
        self.assertEqual(set(resp.data), {"id", "sender_id", "body", "created_at", "read_at"})
        self.assertEqual(resp.data["body"], "hello")
        self.assertEqual(resp.data["sender_id"], str(self.alice.id))
        self.assertIsNone(resp.data["read_at"])
        self.conversation.refresh_from_db()
        self.assertGreater(self.conversation.updated_at, before)

    def test_body_validation(self):
        self.as_user(self.alice)
        for body in ("", "   ", "x" * 2001):
            resp = self.client.post(self.messages_url(self.conversation), {"body": body}, format="json")
            self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        resp = self.client.post(self.messages_url(self.conversation), {"body": "x" * 2000}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_fetch_marks_other_participants_messages_read(self):
        Message.objects.create(conversation=self.conversation, sender=self.bob, body="from bob")
        Message.objects.create(conversation=self.conversation, sender=self.alice, body="from alice")

        self.as_user(self.alice)
        resp = self.client.get(self.messages_url(self.conversation))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual([m["body"] for m in resp.data], ["from bob", "from alice"])
        self.assertIsNotNone(resp.data[0]["read_at"])
        self.assertIsNone(resp.data[1]["read_at"])  # Alice's own message stays unread until Bob fetches
        self.assertFalse(Message.objects.filter(sender=self.bob, read_at__isnull=True).exists())
        self.assertTrue(Message.objects.filter(sender=self.alice, read_at__isnull=True).exists())

        self.as_user(self.bob)
        self.client.get(self.messages_url(self.conversation))
        self.assertFalse(Message.objects.filter(read_at__isnull=True).exists())

    def test_after_filter_and_recent_limit(self):
        base = timezone.now() - timedelta(hours=1)
        for i in range(105):
            message = Message.objects.create(conversation=self.conversation, sender=self.bob, body=str(i))
            Message.objects.filter(pk=message.pk).update(created_at=base + timedelta(seconds=i))

        self.as_user(self.alice)
        resp = self.client.get(self.messages_url(self.conversation))
        self.assertEqual(len(resp.data), 100)
        self.assertEqual(resp.data[0]["body"], "5")
        self.assertEqual(resp.data[-1]["body"], "104")

        after = (base + timedelta(seconds=101)).isoformat()
        resp = self.client.get(self.messages_url(self.conversation), {"after": after})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual([m["body"] for m in resp.data], ["102", "103", "104"])

        zulu = (base + timedelta(seconds=103)).strftime("%Y-%m-%dT%H:%M:%S.%fZ")
        resp = self.client.get(self.messages_url(self.conversation) + f"?after={zulu}")
        self.assertEqual([m["body"] for m in resp.data], ["104"])

        resp = self.client.get(self.messages_url(self.conversation), {"after": "yesterday"})
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_non_participant_gets_404(self):
        Message.objects.create(conversation=self.conversation, sender=self.bob, body="secret")
        self.as_user(self.carol)
        self.assertEqual(self.client.get(self.messages_url(self.conversation)).status_code, status.HTTP_404_NOT_FOUND)
        resp = self.client.post(self.messages_url(self.conversation), {"body": "hi"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.get(reverse("conversation-list")).data, [])
        self.assertIsNone(Message.objects.get(body="secret").read_at)

    def test_send_is_throttled(self):
        from unittest.mock import patch
        from rest_framework.throttling import ScopedRateThrottle
        rates = {**ScopedRateThrottle.THROTTLE_RATES, "messaging_send": "2/min"}
        self.as_user(self.alice)
        with patch.object(ScopedRateThrottle, "THROTTLE_RATES", rates):
            codes = [
                self.client.post(self.messages_url(self.conversation), {"body": "x"}, format="json").status_code
                for _ in range(3)
            ]
            # Reads use their own scope and keep working.
            read = self.client.get(self.messages_url(self.conversation)).status_code
        self.assertEqual(codes, [201, 201, 429])
        self.assertEqual(read, 200)
