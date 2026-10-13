from datetime import date, datetime, time, timedelta
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import patch

import anthropic
import httpx
import httpx2
from google.genai import errors as genai_errors
from google.genai import types as genai_types
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from itineraries.models import ItineraryItem, ItineraryType
from trips.models import Trip, TripMember, TripStatus, MemberRole, MemberStatus

from .schemas import PlannerResponse
from .services import clean_draft

User = get_user_model()

START = date.today() + timedelta(days=30)


def make_draft(**overrides):
    draft = {
        "title": "Osaka Foodie",
        "destination": "Osaka, Japan",
        "country_flag": "\U0001F1EF\U0001F1F5",
        "description": "Street food and castles.",
        "start_date": START.isoformat(),
        "end_date": (START + timedelta(days=1)).isoformat(),
        "travelers": 2,
        "difficulty": "EASY",
        "days": [
            {
                "day": 1, "title": "Arrival & Dotonbori", "date": START.isoformat(),
                "stops": [
                    {"time": "10:00", "name": "Osaka Castle", "type": "Cultural", "description": "Castle park",
                     "address": "1-1 Osakajo, Chuo Ward", "estimated_time": "2 hours", "cost": 60000,
                     "booking_url": "https://www.osakacastle.net/"},
                    {"time": "18:30", "name": "Dotonbori", "type": "Restaurant", "description": "Takoyaki crawl",
                     "address": "Dotonbori, Chuo Ward", "estimated_time": "3 hours", "cost": 150000, "booking_url": ""},
                ],
            },
            {
                "day": 2, "title": "Day trip", "date": (START + timedelta(days=1)).isoformat(),
                "stops": [
                    {"time": "09:00", "name": "Nara Park", "type": "Nature", "description": "Deer",
                     "address": "Nara", "estimated_time": "Half day", "cost": 0, "booking_url": ""},
                ],
            },
        ],
    }
    draft.update(overrides)
    return draft


def parsed_response(reply="Here's a 2-day Osaka plan, about Rp 210.000 per person.", draft=None, stop_reason="end_turn"):
    output = PlannerResponse.model_validate({"reply": reply, "draft": draft or make_draft()})
    return SimpleNamespace(stop_reason=stop_reason, parsed_output=output)


class CleanDraftTests(TestCase):
    """Post-parse cleanup of model output"""

    def test_clamps_and_drops_malformed_values(self):
        raw = make_draft(travelers=0)
        stop = raw["days"][0]["stops"][0]
        stop.update(cost=-500, booking_url="osakacastle dot net", type="castle", time="7:5")
        raw["days"][0]["stops"][1].update(booking_url="javascript:alert(1)", type="restaurant")
        cleaned = clean_draft(raw, ["Cultural", "Nature", "Other", "Restaurant"], date.today())

        self.assertEqual(cleaned["travelers"], 1)
        first, second = cleaned["days"][0]["stops"]
        self.assertEqual(first["cost"], 0)
        self.assertEqual(first["booking_url"], "")
        self.assertEqual(first["type"], "Other")
        self.assertEqual(first["time"], "09:00")
        self.assertEqual(second["booking_url"], "")
        self.assertEqual(second["type"], "Restaurant")

    def test_repairs_dates(self):
        raw = make_draft(start_date="soon", end_date="later")
        raw["days"][1]["date"] = "2001-01-01"
        today = date(2030, 1, 1)
        cleaned = clean_draft(raw, ["Other"], today)
        start = today + timedelta(days=14)
        self.assertEqual(cleaned["start_date"], start.isoformat())
        self.assertEqual(cleaned["end_date"], (start + timedelta(days=1)).isoformat())
        self.assertEqual(cleaned["days"][1]["date"], (start + timedelta(days=1)).isoformat())


# Claude-path tests: pin Gemini off so a real GEMINI_API_KEY in the env never leaks in.
@override_settings(GEMINI_API_KEY="")
class PlannerItineraryTests(APITestCase):
    """POST /api/planner/itinerary/"""

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user(email="planner@example.com", password="testpass123")
        self.client.force_authenticate(user=self.user)
        self.url = reverse("planner-itinerary")
        self.body = {"messages": [{"role": "user", "content": "3 days of food in Osaka for 2"}], "draft": None}

    @override_settings(ANTHROPIC_API_KEY="")
    def test_503_when_not_configured(self):
        with patch("planner.services.anthropic.Anthropic") as client_cls:
            resp = self.client.post(self.url, self.body, format="json")
        self.assertEqual(resp.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(resp.data, {"detail": "AI planner is not configured."})
        client_cls.assert_not_called()

    @override_settings(ANTHROPIC_API_KEY="test-key")
    def test_requires_authentication(self):
        self.client.force_authenticate(user=None)
        resp = self.client.post(self.url, self.body, format="json")
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    @override_settings(ANTHROPIC_API_KEY="test-key", ANTHROPIC_MODEL="claude-opus-5-5")
    @patch("planner.services.anthropic.Anthropic")
    def test_happy_path(self, client_cls):
        parse = client_cls.return_value.beta.messages.parse
        parse.return_value = parsed_response()

        resp = self.client.post(self.url, self.body, format="json")

        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
        self.assertEqual(resp.data["reply"], "Here's a 2-day Osaka plan, about Rp 210.000 per person.")
        draft = resp.data["draft"]
        self.assertEqual(draft["title"], "Osaka Foodie")
        self.assertEqual(draft["travelers"], 2)
        self.assertEqual(len(draft["days"]), 2)
        self.assertEqual(draft["days"][0]["stops"][0]["booking_url"], "https://www.osakacastle.net/")
        self.assertEqual(draft["days"][0]["stops"][0]["cost"], 60000)

        client_cls.assert_called_once_with(api_key="test-key")
        kwargs = parse.call_args.kwargs
        self.assertEqual(kwargs["model"], "claude-opus-5-5")
        self.assertIs(kwargs["output_format"], PlannerResponse)
        self.assertEqual(kwargs["betas"], ["server-side-fallback-2026-07-01"])
        self.assertEqual(kwargs["fallbacks"], "default")
        self.assertNotIn(date.today().isoformat(), kwargs["system"])
        last = kwargs["messages"][-1]
        self.assertEqual(last["role"], "user")
        self.assertIn("3 days of food in Osaka for 2", last["content"])
        self.assertIn(f"Today's date: {timezone.localdate().isoformat()}", last["content"])
        for type_name in ItineraryType.objects.values_list("name", flat=True):
            self.assertIn(type_name, last["content"])

    @override_settings(ANTHROPIC_API_KEY="test-key")
    @patch("planner.services.anthropic.Anthropic")
    def test_revision_sends_current_draft_in_last_user_turn(self, client_cls):
        parse = client_cls.return_value.beta.messages.parse
        parse.return_value = parsed_response()
        body = {
            "messages": [
                {"role": "user", "content": "Osaka trip"},
                {"role": "assistant", "content": "Here you go!"},
                {"role": "user", "content": "Make day 2 cheaper"},
            ],
            "draft": make_draft(),
        }
        resp = self.client.post(self.url, body, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
        messages = parse.call_args.kwargs["messages"]
        self.assertEqual([m["role"] for m in messages], ["user", "assistant", "user"])
        self.assertEqual(messages[0]["content"], "Osaka trip")
        self.assertIn("Current draft:\n```json", messages[-1]["content"])
        self.assertIn('"Nara Park"', messages[-1]["content"])
        self.assertIn("Request: Make day 2 cheaper", messages[-1]["content"])

    @override_settings(ANTHROPIC_API_KEY="test-key")
    @patch("planner.services.anthropic.Anthropic")
    def test_refusal_returns_422(self, client_cls):
        client_cls.return_value.beta.messages.parse.return_value = SimpleNamespace(stop_reason="refusal", parsed_output=None)
        resp = self.client.post(self.url, self.body, format="json")
        self.assertEqual(resp.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        self.assertIn("detail", resp.data)

    @override_settings(ANTHROPIC_API_KEY="test-key")
    @patch("planner.services.anthropic.Anthropic")
    def test_upstream_errors_return_502(self, client_cls):
        request = httpx2.Request("POST", "https://api.anthropic.com/v1/messages")
        errors = [
            anthropic.RateLimitError("rate limited", response=httpx2.Response(429, request=request), body=None),
            anthropic.InternalServerError("boom", response=httpx2.Response(500, request=request), body=None),
            anthropic.APIConnectionError(request=request),
        ]
        details = []
        for error in errors:
            client_cls.return_value.beta.messages.parse.side_effect = error
            resp = self.client.post(self.url, self.body, format="json")
            self.assertEqual(resp.status_code, status.HTTP_502_BAD_GATEWAY)
            details.append(resp.data["detail"])
        self.assertIn("busy", details[0])

    @override_settings(ANTHROPIC_API_KEY="test-key")
    @patch("planner.services.anthropic.Anthropic")
    def test_invalid_input_returns_400(self, client_cls):
        bad_bodies = [
            {"messages": []},
            {"messages": [{"role": "assistant", "content": "hi"}]},
            {"messages": [{"role": "user", "content": "hi"}, {"role": "assistant", "content": "hello"}]},
            {"messages": [{"role": "system", "content": "hi"}]},
            {"messages": [{"role": "user", "content": "hi"}], "draft": {"title": "x"}},
        ]
        for body in bad_bodies:
            resp = self.client.post(self.url, body, format="json")
            self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST, body)
        client_cls.return_value.beta.messages.parse.assert_not_called()


@override_settings(GEMINI_API_KEY="")
class PlannerSaveTests(APITestCase):
    """POST /api/planner/itinerary/save/"""

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user(email="planner-save@example.com", password="testpass123")
        self.client.force_authenticate(user=self.user)
        self.url = reverse("planner-save")

    @override_settings(ANTHROPIC_API_KEY="")
    def test_503_when_not_configured(self):
        resp = self.client.post(self.url, {"draft": make_draft()}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertFalse(Trip.objects.exists())

    @override_settings(ANTHROPIC_API_KEY="test-key")
    def test_saves_trip_and_items(self):
        draft = make_draft()
        draft["days"][1]["stops"][0]["type"] = "Volcano"  # unknown -> "Other"
        resp = self.client.post(self.url, {"draft": draft}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)

        trip = Trip.objects.get(id=resp.data["id"])
        self.assertEqual(resp.data["title"], "Osaka Foodie")
        self.assertEqual(trip.owner, self.user)
        self.assertEqual(trip.status, TripStatus.PLANNING)
        self.assertEqual((trip.start_date, trip.end_date), (START, START + timedelta(days=1)))
        self.assertEqual(trip.duration, 2)
        self.assertEqual(trip.member_spots, 2)
        self.assertEqual(trip.budget, Decimal("420000"))  # (60k + 150k + 0) x 2 travelers
        member = trip.trip_members.get()
        self.assertEqual((member.user, member.role, member.status), (self.user, MemberRole.ORGANIZER, MemberStatus.ACCEPTED))

        items = list(trip.itinerary_items.order_by("visit_time"))
        self.assertEqual([i.name for i in items], ["Osaka Castle", "Dotonbori", "Nara Park"])
        castle, _, nara = items
        self.assertEqual(castle.visit_time, timezone.make_aware(datetime.combine(START, time(10, 0))))
        self.assertEqual(castle.type.name, "Cultural")
        self.assertEqual(castle.cost, Decimal("60000"))
        self.assertEqual(castle.booking_url, "https://www.osakacastle.net/")
        self.assertEqual(castle.estimated_time, "2 hours")
        self.assertEqual(castle.address, "1-1 Osakajo, Chuo Ward")
        self.assertEqual(nara.type.name, "Other")
        self.assertEqual(nara.cost, Decimal("0"))
        self.assertEqual(nara.visit_time.date(), START + timedelta(days=1))

    @override_settings(ANTHROPIC_API_KEY="test-key")
    def test_rejects_invalid_draft(self):
        cases = [
            make_draft(end_date=(START - timedelta(days=1)).isoformat()),
            make_draft(start_date=(date.today() - timedelta(days=3)).isoformat()),
            make_draft(travelers=0),
        ]
        bad_time = make_draft()
        bad_time["days"][0]["stops"][0]["time"] = "25:00"
        negative = make_draft()
        negative["days"][0]["stops"][0]["cost"] = -1
        outside = make_draft()
        outside["days"][1]["date"] = (START + timedelta(days=5)).isoformat()
        cases += [bad_time, negative, outside]
        for draft in cases:
            resp = self.client.post(self.url, {"draft": draft}, format="json")
            self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST, draft)
        self.assertFalse(Trip.objects.exists())

    @override_settings(ANTHROPIC_API_KEY="test-key")
    def test_save_is_atomic(self):
        with patch("planner.services.ItineraryItem.objects.bulk_create", side_effect=RuntimeError("db down")):
            with self.assertRaises(RuntimeError):
                self.client.post(self.url, {"draft": make_draft()}, format="json")
        self.assertFalse(Trip.objects.exists())
        self.assertFalse(TripMember.objects.exists())
        self.assertFalse(ItineraryItem.objects.exists())

    @override_settings(ANTHROPIC_API_KEY="test-key")
    def test_drops_invalid_booking_url(self):
        draft = make_draft()
        draft["days"][0]["stops"][1]["booking_url"] = "not-a-url"
        resp = self.client.post(self.url, {"draft": draft}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ItineraryItem.objects.get(name="Dotonbori").booking_url, "")


def gemini_response(reply="Here's a 2-day Osaka plan, about Rp 210.000 per person.", draft=None,
                    finish_reason=genai_types.FinishReason.STOP, block_reason=None, text=None):
    body = text if text is not None else PlannerResponse.model_validate(
        {"reply": reply, "draft": draft or make_draft()}
    ).model_dump_json()
    candidate = SimpleNamespace(finish_reason=finish_reason)
    return SimpleNamespace(
        candidates=[candidate],
        prompt_feedback=SimpleNamespace(block_reason=block_reason) if block_reason else None,
        text=body,
    )


@override_settings(GEMINI_API_KEY="gemini-key", GEMINI_MODEL="gemini-3.8-flash", ANTHROPIC_API_KEY="", AI_PROVIDER="gemini")
class GeminiPlannerTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create_user(email="gemini@example.com", password="testpass123")
        self.client.force_authenticate(user=self.user)
        self.url = reverse("planner-itinerary")
        self.body = {"messages": [{"role": "user", "content": "3 days of food in Osaka for 2"}], "draft": None}

    @patch("planner.services.genai.Client")
    def test_happy_path(self, client_cls):
        generate = client_cls.return_value.models.generate_content
        generate.return_value = gemini_response()
        body = {
            "messages": [
                {"role": "user", "content": "Osaka trip"},
                {"role": "assistant", "content": "Here you go!"},
                {"role": "user", "content": "Make day 2 cheaper"},
            ],
            "draft": make_draft(),
        }

        resp = self.client.post(self.url, body, format="json")

        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
        self.assertEqual(resp.data["draft"]["title"], "Osaka Foodie")
        self.assertEqual(resp.data["draft"]["days"][0]["stops"][0]["cost"], 60000)
        client_cls.assert_called_once_with(api_key="gemini-key")
        kwargs = generate.call_args.kwargs
        self.assertEqual(kwargs["model"], "gemini-3.8-flash")
        self.assertEqual([c.role for c in kwargs["contents"]], ["user", "model", "user"])
        last = kwargs["contents"][-1].parts[0].text
        self.assertIn("Current draft:\n```json", last)
        self.assertIn("Request: Make day 2 cheaper", last)
        self.assertIn(f"Today's date: {timezone.localdate().isoformat()}", last)
        config = kwargs["config"]
        self.assertEqual(config.response_mime_type, "application/json")
        self.assertEqual(config.response_json_schema, PlannerResponse.model_json_schema())
        self.assertNotIn(date.today().isoformat(), config.system_instruction)

    @patch("planner.services.genai.Client")
    def test_blocked_returns_422(self, client_cls):
        generate = client_cls.return_value.models.generate_content
        for response in [
            gemini_response(block_reason="SAFETY", text=""),
            gemini_response(finish_reason=genai_types.FinishReason.SAFETY, text=""),
        ]:
            generate.return_value = response
            resp = self.client.post(self.url, self.body, format="json")
            self.assertEqual(resp.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)

    @patch("planner.services.genai.Client")
    def test_upstream_errors_return_502(self, client_cls):
        generate = client_cls.return_value.models.generate_content
        cases = [
            genai_errors.ClientError(429, {"error": {"message": "quota"}}),
            genai_errors.ServerError(500, {"error": {"message": "boom"}}),
            httpx.ConnectError("down"),
        ]
        details = []
        for error in cases:
            generate.side_effect = error
            resp = self.client.post(self.url, self.body, format="json")
            self.assertEqual(resp.status_code, status.HTTP_502_BAD_GATEWAY)
            details.append(resp.data["detail"])
        self.assertIn("busy", details[0])

    @patch("planner.services.genai.Client")
    def test_truncated_or_invalid_output_returns_502(self, client_cls):
        generate = client_cls.return_value.models.generate_content
        for response in [
            gemini_response(finish_reason=genai_types.FinishReason.MAX_TOKENS),
            gemini_response(text='{"reply": "hi"}'),
            gemini_response(text=""),
        ]:
            generate.return_value = response
            resp = self.client.post(self.url, self.body, format="json")
            self.assertEqual(resp.status_code, status.HTTP_502_BAD_GATEWAY)

    @override_settings(ANTHROPIC_API_KEY="claude-key")
    @patch("planner.services.anthropic.Anthropic")
    @patch("planner.services.genai.Client")
    def test_falls_back_to_claude_when_gemini_fails(self, gemini_cls, claude_cls):
        gemini_cls.return_value.models.generate_content.side_effect = genai_errors.ServerError(503, {"error": {"message": "overloaded"}})
        claude_cls.return_value.beta.messages.parse.return_value = parsed_response(reply="From Claude")
        resp = self.client.post(self.url, self.body, format="json")
        self.assertEqual(resp.status_code, status.HTTP_200_OK, resp.data)
        self.assertEqual(resp.data["reply"], "From Claude")

    @override_settings(ANTHROPIC_API_KEY="claude-key")
    @patch("planner.services.anthropic.Anthropic")
    @patch("planner.services.genai.Client")
    def test_block_does_not_fall_back(self, gemini_cls, claude_cls):
        gemini_cls.return_value.models.generate_content.return_value = gemini_response(block_reason="SAFETY", text="")
        resp = self.client.post(self.url, self.body, format="json")
        self.assertEqual(resp.status_code, status.HTTP_422_UNPROCESSABLE_ENTITY)
        claude_cls.assert_not_called()

    @override_settings(ANTHROPIC_API_KEY="claude-key", AI_PROVIDER="claude")
    @patch("planner.services.anthropic.Anthropic")
    @patch("planner.services.genai.Client")
    def test_ai_provider_claude_uses_claude_first(self, gemini_cls, claude_cls):
        claude_cls.return_value.beta.messages.parse.return_value = parsed_response(reply="From Claude")
        resp = self.client.post(self.url, self.body, format="json")
        self.assertEqual(resp.data["reply"], "From Claude")
        gemini_cls.assert_not_called()

    @override_settings(GEMINI_API_KEY="", ANTHROPIC_API_KEY="")
    def test_503_when_no_provider_configured(self):
        resp = self.client.post(self.url, self.body, format="json")
        self.assertEqual(resp.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        resp = self.client.post(reverse("planner-save"), {"draft": make_draft()}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)

    @patch("planner.services.genai.Client")
    def test_gemini_only_can_save(self, client_cls):
        resp = self.client.post(reverse("planner-save"), {"draft": make_draft()}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED, resp.data)
        client_cls.assert_not_called()
