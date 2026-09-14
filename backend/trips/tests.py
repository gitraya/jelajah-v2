from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient, APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from datetime import date, timedelta
from decimal import Decimal

from .models import Trip, TripMember, TripStatus, MemberStatus, MemberRole
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
