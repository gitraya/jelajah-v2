from django.test import TestCase
from rest_framework.test import APIClient, APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from datetime import timedelta, date
from django.urls import reverse
from django.utils import timezone

from .models import ItineraryItem, ItineraryType, ItineraryStatus
from trips.models import Trip, TripMember, MemberRole, MemberStatus

User = get_user_model()


class ItineraryModelTests(TestCase):
    """Model tests for itinerary items"""

    def setUp(self):
        self.user = User.objects.create_user(email="ituser@example.com", password="testpass123")
        self.trip = Trip.objects.create(owner=self.user, title="IT Trip", destination="Z", start_date=date.today()+timedelta(days=5), end_date=date.today()+timedelta(days=7))
        self.it_type = ItineraryType.objects.create(name="Historical")
    def test_create_itinerary_item(self):
        visit_time = timezone.now() + timedelta(days=6)
        item = ItineraryItem.objects.create(trip=self.trip, name="Visit", type=self.it_type, visit_time=visit_time)
        item = ItineraryItem.objects.create(trip=self.trip, name="Visit", type=self.it_type, visit_time=visit_time)
        self.assertEqual(item.name, "Visit")
        self.assertEqual(item.trip, self.trip)


class ItineraryAPITests(APITestCase):
    """API tests for itinerary endpoints"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(email="itapi@example.com", password="testpass123")
        self.trip = Trip.objects.create(owner=self.user, title="API IT Trip", destination="Z", start_date=date.today()+timedelta(days=5), end_date=date.today()+timedelta(days=8))
        self.member = TripMember.objects.create(trip=self.trip, user=self.user, role=MemberRole.ORGANIZER, status=MemberStatus.ACCEPTED)
        self.it_type = ItineraryType.objects.create(name="Adventure")
        self.client.force_authenticate(user=self.user)
    def test_create_and_list_itinerary_items(self):
        visit_time = (timezone.now() + timedelta(days=6)).isoformat()
        data = {
            "name": "Beach Visit",
            "type_id": str(self.it_type.id),
            "visit_time": visit_time,
            "status": ItineraryStatus.PLANNED
        }
        resp = self.client.post(reverse("itinerary-item-list", kwargs={"trip_id": self.trip.id}), data, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        resp = self.client.get(reverse("itinerary-item-list", kwargs={"trip_id": self.trip.id}))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(len(resp.data) >= 1)

    def test_itinerary_statistics(self):
        ItineraryItem.objects.create(trip=self.trip, name="A", type=self.it_type, status=ItineraryStatus.PLANNED)
        ItineraryItem.objects.create(trip=self.trip, name="B", type=self.it_type, status=ItineraryStatus.VISITED)
        resp = self.client.get(reverse("itinerary-statistics", kwargs={"trip_id": self.trip.id}))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("total", resp.data)
        self.assertIn("visited", resp.data)


class ItineraryCostAndBookingTests(APITestCase):
    """cost / booking_url on itinerary items and total_cost in statistics"""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(email="itcost@example.com", password="testpass123")
        self.trip = Trip.objects.create(owner=self.user, title="Cost Trip", destination="Z", start_date=date.today()+timedelta(days=5), end_date=date.today()+timedelta(days=8))
        TripMember.objects.create(trip=self.trip, user=self.user, role=MemberRole.ORGANIZER, status=MemberStatus.ACCEPTED)
        self.it_type = ItineraryType.objects.create(name="Museum")
        self.client.force_authenticate(user=self.user)
        self.list_url = reverse("itinerary-item-list", kwargs={"trip_id": self.trip.id})

    def _payload(self, **extra):
        return {
            "name": "Louvre",
            "type_id": str(self.it_type.id),
            "visit_time": (timezone.now() + timedelta(days=6)).isoformat(),
            **extra,
        }

    def test_create_read_and_update_cost_and_booking_url(self):
        resp = self.client.post(self.list_url, self._payload(cost="150000", booking_url="https://www.louvre.fr/"), format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data["cost"], "150000.00")
        self.assertEqual(resp.data["booking_url"], "https://www.louvre.fr/")

        detail_url = reverse("itinerary-item-detail", kwargs={"trip_id": self.trip.id, "pk": resp.data["id"]})
        resp = self.client.patch(detail_url, {"cost": "0", "booking_url": ""}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["cost"], "0.00")
        self.assertEqual(resp.data["booking_url"], "")

        resp = self.client.patch(detail_url, {"cost": None}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIsNone(resp.data["cost"])

    def test_cost_and_booking_url_are_optional(self):
        resp = self.client.post(self.list_url, self._payload(), format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(resp.data["cost"])
        self.assertEqual(resp.data["booking_url"], "")

    def test_rejects_negative_cost_and_invalid_url(self):
        resp = self.client.post(self.list_url, self._payload(cost="-1"), format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("cost", resp.data)
        resp = self.client.post(self.list_url, self._payload(booking_url="not a url"), format="json")
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("booking_url", resp.data)

    def test_statistics_total_cost_ignores_unknown_costs(self):
        ItineraryItem.objects.create(trip=self.trip, name="A", type=self.it_type, cost=100000)
        ItineraryItem.objects.create(trip=self.trip, name="B", type=self.it_type, cost=0)
        ItineraryItem.objects.create(trip=self.trip, name="C", type=self.it_type, cost=None)
        ItineraryItem.objects.create(trip=self.trip, name="D", type=self.it_type, cost="25000.50")
        resp = self.client.get(reverse("itinerary-statistics", kwargs={"trip_id": self.trip.id}))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data["total_cost"], "125000.50")

    def test_statistics_total_cost_zero_when_empty(self):
        resp = self.client.get(reverse("itinerary-statistics", kwargs={"trip_id": self.trip.id}))
        self.assertEqual(resp.data["total_cost"], "0.00")
