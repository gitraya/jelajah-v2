from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient, APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from datetime import date, timedelta
from decimal import Decimal

from .models import Trip, TripMember, TripStatus, MemberStatus, MemberRole, SavedTrip, TripReview
from users.tests import LOCAL_STORAGES

User = get_user_model()


class TripModelTests(TestCase):
    """Model-level tests for Trip and TripMember"""

    def setUp(self):
        self.user = User.objects.create_user(
            email="modeluser@example.com",
            password="testpass123",
            first_name="Model",
            last_name="User",
        )

    def test_create_trip_and_str(self):
        trip = Trip.objects.create(
            owner=self.user,
            title="Test Trip",
            destination="Testland",
            start_date=date.today() + timedelta(days=5),
            end_date=date.today() + timedelta(days=8),
            budget=Decimal("15000000.00"),
        )
        self.assertEqual(str(trip), "Test Trip")
        self.assertEqual(trip.owner, self.user)

    def test_trip_member_creation(self):
        trip = Trip.objects.create(
            owner=self.user,
            title="Member Trip",
            destination="Somewhere",
            start_date=date.today() + timedelta(days=5),
            end_date=date.today() + timedelta(days=7),
        )
        member = TripMember.objects.create(
            trip=trip, user=self.user, role=MemberRole.ORGANIZER, status=MemberStatus.ACCEPTED
        )
        self.assertEqual(member.role, MemberRole.ORGANIZER)
        self.assertIn(member, trip.trip_members.all())


class TripAPITests(APITestCase):
    """API tests for TripViewSet and TripMember endpoints"""

    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(
            email="owner@example.com", password="testpass123", first_name="Owner"
        )
        self.user = User.objects.create_user(
            email="user@example.com", password="testpass123", first_name="User"
        )
        self.client.force_authenticate(user=self.owner)

    def test_create_trip(self):
        data = {
            "title": "API Trip",
            "destination": "APIland",
            "start_date": (date.today() + timedelta(days=10)).isoformat(),
            "end_date": (date.today() + timedelta(days=12)).isoformat(),
            "budget": "18500000.00",
            "duration": 2,
            "is_public": True,
        }
        resp = self.client.post(reverse("trip-list"), data, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Trip.objects.filter(title="API Trip").exists())

    def test_list_and_filter_trips(self):
        Trip.objects.create(
            owner=self.owner,
            title="Bali Trip",
            destination="Bali",
            start_date=date.today() + timedelta(days=10),
            end_date=date.today() + timedelta(days=15),
            is_public=True,
        )
        Trip.objects.create(
            owner=self.owner,
            title="Jakarta Trip",
            destination="Jakarta",
            start_date=date.today() + timedelta(days=20),
            end_date=date.today() + timedelta(days=23),
            is_public=True,
        )
        resp = self.client.get(reverse("trip-list") + "?destination=Bali")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]["destination"], "Bali")

    def test_retrieve_update_and_soft_delete(self):
        trip = Trip.objects.create(
            owner=self.owner,
            title="To Update",
            destination="City",
            start_date=date.today() + timedelta(days=5),
            end_date=date.today() + timedelta(days=7),
        )
        # retrieve
        resp = self.client.get(reverse("trip-detail", kwargs={"pk": trip.id}))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        # update
        patch = {"title": "Updated Title"}
        resp = self.client.patch(reverse("trip-detail", kwargs={"pk": trip.id}), patch, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        trip.refresh_from_db()
        self.assertEqual(trip.title, "Updated Title")
        # soft delete
        resp = self.client.delete(reverse("trip-detail", kwargs={"pk": trip.id}))
        self.assertIn(resp.status_code, (status.HTTP_204_NO_CONTENT, status.HTTP_200_OK))
        trip.refresh_from_db()
        self.assertEqual(trip.status, TripStatus.DELETED)

    def test_trip_member_api(self):
        trip = Trip.objects.create(
            owner=self.owner,
            title="Members API",
            destination="Dest",
            start_date=date.today() + timedelta(days=3),
            end_date=date.today() + timedelta(days=5),
        )
        TripMember.objects.create(
            trip=trip, user=self.owner, role=MemberRole.ORGANIZER, status=MemberStatus.ACCEPTED
        )
    
        # add member
        data = {"user_id": str(self.user.id), "role": MemberRole.MEMBER, "status": MemberStatus.PENDING}
        resp = self.client.post(reverse("trip-member-list", kwargs={"trip_id": trip.id}), data, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(TripMember.objects.filter(trip=trip).count(), 2)  # owner created in create() or owner-only test

        # list members
        resp = self.client.get(reverse("trip-member-list", kwargs={"trip_id": trip.id}))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        # update member status
        member = TripMember.objects.filter(trip=trip, user=self.user).first()
        patch = {"status": MemberStatus.ACCEPTED}
        resp = self.client.patch(
            reverse("trip-member-detail", kwargs={"trip_id": trip.id, "pk": member.id}), patch, format="json"
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        member.refresh_from_db()
        self.assertEqual(member.status, MemberStatus.ACCEPTED)


class TripCoverTests(APITestCase):
    """PUT/DELETE /api/trips/<id>/cover/ manage the trip's cover image."""

    def setUp(self):
        import tempfile
        from django.core.cache import cache
        from django.test import override_settings

        cache.clear()  # throttle history lives in the cache
        self.media_dir = tempfile.TemporaryDirectory()
        self.override = override_settings(MEDIA_ROOT=self.media_dir.name, STORAGES=LOCAL_STORAGES)
        self.override.enable()

        self.owner = User.objects.create_user(email="cover-owner@example.com", password="testpass123")
        self.member = User.objects.create_user(email="cover-member@example.com", password="testpass123")
        self.trip = Trip.objects.create(
            owner=self.owner,
            title="Cover Trip",
            destination="Bali",
            start_date=date.today() + timedelta(days=5),
            end_date=date.today() + timedelta(days=8),
        )
        TripMember.objects.create(trip=self.trip, user=self.owner, role=MemberRole.ORGANIZER, status=MemberStatus.ACCEPTED)
        TripMember.objects.create(trip=self.trip, user=self.member, role=MemberRole.MEMBER, status=MemberStatus.ACCEPTED)
        self.url = reverse("trip-cover", args=[self.trip.id])

    def tearDown(self):
        self.override.disable()
        self.media_dir.cleanup()

    def image(self, size=(3000, 1500)):
        from io import BytesIO
        from PIL import Image
        from django.core.files.uploadedfile import SimpleUploadedFile

        buffer = BytesIO()
        Image.new("RGB", size, "blue").save(buffer, format="JPEG")
        return SimpleUploadedFile("cover.jpg", buffer.getvalue(), content_type="image/jpeg")

    def upload(self):
        with self.captureOnCommitCallbacks(execute=True):
            return self.client.put(self.url, {"cover_image": self.image()}, format="multipart")

    def test_organizer_uploads_resized_webp_cover(self):
        from PIL import Image

        self.client.force_authenticate(user=self.owner)
        response = self.upload()

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertTrue(response.data["cover_image"].endswith(".webp"))
        self.trip.refresh_from_db()
        with Image.open(self.trip.cover_image.path) as stored:
            self.assertEqual(stored.size, (1600, 800))

    def test_replacing_and_removing_cover_deletes_old_files(self):
        import os

        self.client.force_authenticate(user=self.owner)
        self.upload()
        self.trip.refresh_from_db()
        first = self.trip.cover_image.path

        self.upload()
        self.trip.refresh_from_db()
        second = self.trip.cover_image.path
        self.assertFalse(os.path.exists(first))

        with self.captureOnCommitCallbacks(execute=True):
            response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data["cover_image"])
        self.assertFalse(os.path.exists(second))

    def test_regular_member_cannot_change_cover(self):
        self.client.force_authenticate(user=self.member)
        self.assertEqual(self.upload().status_code, status.HTTP_403_FORBIDDEN)

    def test_anonymous_cannot_change_cover(self):
        self.assertIn(self.upload().status_code, (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN))

    def test_rejects_invalid_image_and_missing_file(self):
        from django.core.files.uploadedfile import SimpleUploadedFile

        self.client.force_authenticate(user=self.owner)
        bogus = SimpleUploadedFile("cover.jpg", b"nope", content_type="image/jpeg")
        response = self.client.put(self.url, {"cover_image": bogus}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        response = self.client.put(self.url, {}, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_trip_edit_cannot_set_cover(self):
        self.client.force_authenticate(user=self.owner)
        response = self.client.patch(
            reverse("trip-detail", args=[self.trip.id]), {"cover_image": "trip_covers/evil.webp"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.trip.refresh_from_db()
        self.assertFalse(self.trip.cover_image)


class TripDuplicateTests(APITestCase):
    """POST /api/trips/<id>/duplicate/"""

    def setUp(self):
        from itineraries.models import ItineraryItem, ItineraryType, ItineraryStatus
        from packing.models import PackingItem
        from checklist.models import ChecklistItem
        from expenses.models import Expense
        from .models import Tag

        self.client = APIClient()
        self.owner = User.objects.create_user(email="dup-owner@example.com", password="testpass123")
        self.stranger = User.objects.create_user(email="dup-stranger@example.com", password="testpass123")
        self.start = date.today() + timedelta(days=10)
        self.source = Trip.objects.create(
            owner=self.owner, title="Kyoto", destination="Kyoto, Japan", description="Temples",
            notes="Bring cash", start_date=self.start, end_date=self.start + timedelta(days=3),
            member_spots=4, duration=4, budget=Decimal("9000000.00"), difficulty="MODERATE",
            status=TripStatus.ONGOING, is_public=True, is_joinable=False,
        )
        self.tag = Tag.objects.create(name="Temples", slug="temples", usage_count=1)
        self.source.tags.add(self.tag)
        self.owner_member = TripMember.objects.create(trip=self.source, user=self.owner, role=MemberRole.ORGANIZER, status=MemberStatus.ACCEPTED)
        self.it_type = ItineraryType.objects.create(name="Temple")
        from django.utils import timezone
        from datetime import datetime, time
        self.visit_time = timezone.make_aware(datetime.combine(self.start + timedelta(days=1), time(9, 30)))
        ItineraryItem.objects.create(
            trip=self.source, name="Kinkaku-ji", type=self.it_type, visit_time=self.visit_time,
            status=ItineraryStatus.VISITED, cost=Decimal("50000"), booking_url="https://www.shokoku-ji.jp/kinkakuji/",
        )
        PackingItem.objects.create(trip=self.source, name="Shoes", quantity=2, packed=True, assigned_to=self.owner_member)
        ChecklistItem.objects.create(trip=self.source, title="Buy JR pass", is_completed=True, assigned_to=self.owner_member, due_date=self.start)
        Expense.objects.create(trip=self.source, title="Hotel", amount=Decimal("100"), paid_by=self.owner_member)
        self.url = reverse("trip-duplicate", kwargs={"pk": self.source.id})

    def test_member_duplicates_with_defaults(self):
        from itineraries.models import ItineraryStatus
        self.client.force_authenticate(user=self.owner)
        resp = self.client.post(self.url, {}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        new = Trip.objects.get(id=resp.data["id"])
        self.assertNotEqual(new.id, self.source.id)
        self.assertEqual(new.title, "Kyoto (copy)")
        self.assertEqual(new.owner, self.owner)
        self.assertEqual((new.start_date, new.end_date), (self.source.start_date, self.source.end_date))
        self.assertEqual(new.status, TripStatus.PLANNING)
        self.assertFalse(new.is_public)
        self.assertFalse(new.is_joinable)
        self.assertEqual(new.budget, self.source.budget)
        self.assertEqual((new.member_spots, new.duration, new.difficulty), (4, 4, "MODERATE"))
        self.assertEqual((new.description, new.notes), ("Temples", "Bring cash"))
        self.assertEqual(list(new.tags.all()), [self.tag])
        self.assertFalse(new.cover_image)
        # Requester is the only member, as organizer
        members = list(new.trip_members.all())
        self.assertEqual(len(members), 1)
        self.assertEqual((members[0].user, members[0].role, members[0].status), (self.owner, MemberRole.ORGANIZER, MemberStatus.ACCEPTED))
        # Items copied with progress reset
        item = new.itinerary_items.get()
        self.assertEqual((item.name, item.status, item.cost, item.booking_url, item.visit_time),
                         ("Kinkaku-ji", ItineraryStatus.PLANNED, Decimal("50000"), "https://www.shokoku-ji.jp/kinkakuji/", self.visit_time))
        packing = new.packing_items.get()
        self.assertEqual((packing.name, packing.quantity, packing.packed, packing.assigned_to), ("Shoes", 2, False, None))
        check = new.checklist_items.get()
        self.assertEqual((check.title, check.is_completed, check.assigned_to), ("Buy JR pass", False, None))
        self.assertFalse(new.expenses.exists())
        # Source untouched
        self.assertEqual(self.source.itinerary_items.get().status, ItineraryStatus.VISITED)
        # Response is a normal TripSerializer payload
        self.assertEqual(resp.data["title"], "Kyoto (copy)")
        self.assertIn("is_saved", resp.data)
        self.assertEqual(resp.data["user_role"], MemberRole.ORGANIZER)

    def test_title_and_start_date_shift_all_dates(self):
        self.client.force_authenticate(user=self.owner)
        new_start = self.start + timedelta(days=30)
        resp = self.client.post(self.url, {"title": "Kyoto again", "start_date": new_start.isoformat()}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        new = Trip.objects.get(id=resp.data["id"])
        self.assertEqual(new.title, "Kyoto again")
        self.assertEqual(new.start_date, new_start)
        self.assertEqual(new.end_date, new_start + timedelta(days=3))
        self.assertEqual(new.itinerary_items.get().visit_time, self.visit_time + timedelta(days=30))
        self.assertEqual(new.checklist_items.get().due_date, new_start)

    def test_invalid_start_date(self):
        self.client.force_authenticate(user=self.owner)
        resp = self.client.post(self.url, {"start_date": "next week"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Trip.objects.count(), 1)

    def test_non_member_can_duplicate_public_trip(self):
        self.client.force_authenticate(user=self.stranger)
        resp = self.client.post(self.url, {}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        new = Trip.objects.get(id=resp.data["id"])
        self.assertEqual(new.owner, self.stranger)
        self.assertEqual(list(new.trip_members.values_list("user", flat=True)), [self.stranger.id])

    def test_non_member_cannot_duplicate_private_trip(self):
        self.source.is_public = False
        self.source.save()
        self.client.force_authenticate(user=self.stranger)
        resp = self.client.post(self.url, {}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Trip.objects.count(), 1)

    def test_accepted_member_can_duplicate_private_trip(self):
        self.source.is_public = False
        self.source.save()
        TripMember.objects.create(trip=self.source, user=self.stranger, role=MemberRole.MEMBER, status=MemberStatus.ACCEPTED)
        self.client.force_authenticate(user=self.stranger)
        resp = self.client.post(self.url, {}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_anonymous_cannot_duplicate(self):
        resp = self.client.post(self.url, {}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)


class TripBookmarkTests(APITestCase):
    """POST/DELETE /api/trips/<id>/bookmark/, is_saved / saves_count, ?saved=true"""

    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(email="bm-owner@example.com", password="testpass123")
        self.user = User.objects.create_user(email="bm-user@example.com", password="testpass123")
        self.public_trip = Trip.objects.create(
            owner=self.owner, title="Public", destination="Bali", is_public=True,
            start_date=date.today() + timedelta(days=5), end_date=date.today() + timedelta(days=7),
        )
        self.private_trip = Trip.objects.create(
            owner=self.owner, title="Private", destination="Bali",
            start_date=date.today() + timedelta(days=5), end_date=date.today() + timedelta(days=7),
        )
        TripMember.objects.create(trip=self.public_trip, user=self.owner, role=MemberRole.ORGANIZER, status=MemberStatus.ACCEPTED)
        TripMember.objects.create(trip=self.private_trip, user=self.owner, role=MemberRole.ORGANIZER, status=MemberStatus.ACCEPTED)

    def _url(self, trip):
        return reverse("trip-bookmark", kwargs={"pk": trip.id})

    def test_add_is_idempotent_and_remove(self):
        self.client.force_authenticate(user=self.user)
        resp = self.client.post(self._url(self.public_trip))
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data, {"is_saved": True, "saves_count": 1})
        resp = self.client.post(self._url(self.public_trip))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data, {"is_saved": True, "saves_count": 1})

        self.client.force_authenticate(user=self.owner)
        resp = self.client.post(self._url(self.public_trip))
        self.assertEqual(resp.data, {"is_saved": True, "saves_count": 2})

        resp = self.client.delete(self._url(self.public_trip))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data, {"is_saved": False, "saves_count": 1})
        resp = self.client.delete(self._url(self.public_trip))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data, {"is_saved": False, "saves_count": 1})

    def test_cannot_bookmark_unreadable_trip(self):
        self.client.force_authenticate(user=self.user)
        resp = self.client.post(self._url(self.private_trip))
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(SavedTrip.objects.exists())

    def test_anonymous_cannot_bookmark(self):
        resp = self.client.post(self._url(self.public_trip))
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_trip_serializer_exposes_is_saved_and_saves_count(self):
        SavedTrip.objects.create(user=self.user, trip=self.public_trip)
        SavedTrip.objects.create(user=self.owner, trip=self.public_trip)

        self.client.force_authenticate(user=self.user)
        resp = self.client.get(reverse("trip-detail", kwargs={"pk": self.public_trip.id}))
        self.assertTrue(resp.data["is_saved"])
        self.assertEqual(resp.data["saves_count"], 2)

        resp = self.client.get(reverse("trip-list") + "?is_public=true")
        by_id = {t["id"]: t for t in resp.data}
        self.assertTrue(by_id[str(self.public_trip.id)]["is_saved"])
        self.assertEqual(by_id[str(self.public_trip.id)]["saves_count"], 2)

        self.client.force_authenticate(user=None)
        resp = self.client.get(reverse("trip-detail", kwargs={"pk": self.public_trip.id}))
        self.assertFalse(resp.data["is_saved"])
        self.assertEqual(resp.data["saves_count"], 2)

    def test_list_saved_trips(self):
        other_public = Trip.objects.create(
            owner=self.owner, title="Other", destination="Lombok", is_public=True,
            start_date=date.today() + timedelta(days=5), end_date=date.today() + timedelta(days=7),
        )
        SavedTrip.objects.create(user=self.user, trip=self.public_trip)
        SavedTrip.objects.create(user=self.owner, trip=other_public)
        # A bookmark on a trip the user can no longer read is hidden.
        SavedTrip.objects.create(user=self.user, trip=self.private_trip)

        self.client.force_authenticate(user=self.user)
        resp = self.client.get(reverse("trip-list") + "?saved=true")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual([t["id"] for t in resp.data], [str(self.public_trip.id)])
        self.assertTrue(resp.data[0]["is_saved"])

        # Removing a bookmark on an unreadable trip is still allowed.
        resp = self.client.delete(self._url(self.private_trip))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertFalse(SavedTrip.objects.filter(user=self.user, trip=self.private_trip).exists())

    def test_saved_list_empty_for_anonymous(self):
        SavedTrip.objects.create(user=self.user, trip=self.public_trip)
        resp = self.client.get(reverse("trip-list") + "?saved=true")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data, [])


class TripReviewTests(APITestCase):
    """GET/POST /api/trips/<id>/reviews/, DELETE .../reviews/mine/, rating fields on TripSerializer."""

    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(email="rv-owner@example.com", password="x", first_name="Owner")
        self.member = User.objects.create_user(email="rv-member@example.com", password="x", first_name="Member")
        self.visitor = User.objects.create_user(email="rv-visitor@example.com", password="x", first_name="Visitor")
        self.outsider = User.objects.create_user(email="rv-outsider@example.com", password="x")
        dates = {"start_date": date.today() + timedelta(days=5), "end_date": date.today() + timedelta(days=7)}
        self.public_trip = Trip.objects.create(owner=self.owner, title="Public", destination="Bali", is_public=True, **dates)
        self.private_trip = Trip.objects.create(owner=self.owner, title="Private", destination="Bali", **dates)
        for trip in (self.public_trip, self.private_trip):
            TripMember.objects.create(trip=trip, user=self.owner, role=MemberRole.ORGANIZER, status=MemberStatus.ACCEPTED)
        TripMember.objects.create(trip=self.private_trip, user=self.member, status=MemberStatus.ACCEPTED)

    def _url(self, trip):
        return reverse("trip-reviews", kwargs={"pk": trip.id})

    def _mine_url(self, trip):
        return reverse("trip-reviews-mine", kwargs={"pk": trip.id})

    def test_create_then_update_is_an_upsert(self):
        self.client.force_authenticate(user=self.visitor)
        resp = self.client.post(self._url(self.public_trip), {"rating": 4, "comment": "Great"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
        self.assertEqual(resp.data["rating"], 4)
        self.assertEqual(resp.data["comment"], "Great")
        self.assertEqual(
            set(resp.data["user"]), {"id", "first_name", "last_name", "email", "avatar"},
        )
        review_id = resp.data["id"]

        resp = self.client.post(self._url(self.public_trip), {"rating": 2}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["id"], review_id)
        self.assertEqual(resp.data["rating"], 2)
        self.assertEqual(TripReview.objects.filter(trip=self.public_trip).count(), 1)

    def test_list_newest_first_and_readable_by_anonymous_on_public_trip(self):
        TripReview.objects.create(trip=self.public_trip, user=self.visitor, rating=5)
        TripReview.objects.create(trip=self.public_trip, user=self.outsider, rating=3, comment="ok")
        resp = self.client.get(self._url(self.public_trip))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual([r["rating"] for r in resp.data], [3, 5])
        self.assertEqual(
            set(resp.data[0]), {"id", "user", "rating", "comment", "created_at", "updated_at"},
        )

    def test_private_trip_reviews_hidden_from_non_members(self):
        self.client.force_authenticate(user=self.outsider)
        self.assertEqual(self.client.get(self._url(self.private_trip)).status_code, status.HTTP_403_FORBIDDEN)
        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.get(self._url(self.private_trip)).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_owner_cannot_review_own_trip(self):
        self.client.force_authenticate(user=self.owner)
        resp = self.client.post(self._url(self.public_trip), {"rating": 5}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.assertFalse(TripReview.objects.exists())

    def test_private_trip_member_can_review_but_non_member_cannot(self):
        self.client.force_authenticate(user=self.outsider)
        resp = self.client.post(self._url(self.private_trip), {"rating": 5}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

        self.client.force_authenticate(user=self.member)
        resp = self.client.post(self._url(self.private_trip), {"rating": 5}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_anonymous_cannot_review(self):
        resp = self.client.post(self._url(self.public_trip), {"rating": 5}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_rating_and_comment_validation(self):
        self.client.force_authenticate(user=self.visitor)
        for payload in ({"rating": 0}, {"rating": 6}, {"rating": "abc"}, {}, {"rating": 3, "comment": "x" * 1001}):
            resp = self.client.post(self._url(self.public_trip), payload, format="json")
            self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST, payload)
        self.assertFalse(TripReview.objects.exists())

    def test_delete_mine(self):
        TripReview.objects.create(trip=self.public_trip, user=self.visitor, rating=5)
        TripReview.objects.create(trip=self.public_trip, user=self.outsider, rating=1)
        self.client.force_authenticate(user=self.visitor)
        resp = self.client.delete(self._mine_url(self.public_trip))
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(list(TripReview.objects.values_list("user_id", flat=True)), [self.outsider.id])
        # Idempotent.
        self.assertEqual(self.client.delete(self._mine_url(self.public_trip)).status_code, status.HTTP_204_NO_CONTENT)
        self.client.force_authenticate(user=None)
        self.assertEqual(self.client.delete(self._mine_url(self.public_trip)).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_trip_serializer_rating_fields(self):
        detail = reverse("trip-detail", kwargs={"pk": self.public_trip.id})
        self.client.force_authenticate(user=self.visitor)
        resp = self.client.get(detail)
        self.assertIsNone(resp.data["rating_avg"])
        self.assertEqual(resp.data["reviews_count"], 0)
        self.assertIsNone(resp.data["my_review"])

        TripReview.objects.create(trip=self.public_trip, user=self.visitor, rating=5, comment="Loved it")
        TripReview.objects.create(trip=self.public_trip, user=self.outsider, rating=4)
        TripReview.objects.create(trip=self.public_trip, user=self.member, rating=4)

        resp = self.client.get(detail)
        self.assertEqual(resp.data["rating_avg"], 4.3)
        self.assertEqual(resp.data["reviews_count"], 3)
        self.assertEqual(resp.data["my_review"], {"rating": 5, "comment": "Loved it"})

        resp = self.client.get(reverse("trip-list") + "?is_public=true")
        by_id = {t["id"]: t for t in resp.data}
        listed = by_id[str(self.public_trip.id)]
        self.assertEqual((listed["rating_avg"], listed["reviews_count"]), (4.3, 3))
        self.assertEqual(listed["my_review"], {"rating": 5, "comment": "Loved it"})

        self.client.force_authenticate(user=None)
        resp = self.client.get(detail)
        self.assertEqual((resp.data["rating_avg"], resp.data["reviews_count"]), (4.3, 3))
        self.assertIsNone(resp.data["my_review"])

        # Owner's list of own trips (joins trip_members) still counts each review once.
        self.client.force_authenticate(user=self.owner)
        resp = self.client.get(reverse("trip-list"))
        by_id = {t["id"]: t for t in resp.data}
        self.assertEqual(by_id[str(self.public_trip.id)]["reviews_count"], 3)
        self.assertEqual(by_id[str(self.private_trip.id)]["reviews_count"], 0)
        self.assertIsNone(by_id[str(self.private_trip.id)]["rating_avg"])
