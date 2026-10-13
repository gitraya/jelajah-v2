"""Jelajah AI trip planner: drafting with Gemini or Claude, cleaning, and saving drafts as trips."""
import json
import logging
import re
from datetime import datetime, time, timedelta
from decimal import Decimal

import anthropic
import httpx
import pydantic
from django.conf import settings
from google import genai
from google.genai import errors as genai_errors
from google.genai import types as genai_types
from django.core.exceptions import ValidationError
from django.core.validators import URLValidator
from django.db import transaction
from django.utils import timezone

from itineraries.models import ItineraryItem, ItineraryType
from trips.models import TripStatus
from trips.services import create_trip_for_owner

from .schemas import PlannerResponse

logger = logging.getLogger(__name__)

FALLBACK_TYPE_NAME = 'Other'
DEFAULT_STOP_TIME = '09:00'

# Static so it can be cached by the API; anything per-request (today's date,
# allowed stop types, the current draft) goes in the latest user turn instead.
SYSTEM_PROMPT = """You are Jelajah AI, a friendly travel planner for Jelajah, a collaborative trip-planning app popular with travelers from Southeast Asia (especially Indonesia).

You turn a traveler's request into a complete, realistic day-by-day trip draft and answer with a short chat reply plus the draft.

Rules for the draft:
- Prices are in Indonesian Rupiah (IDR), as whole numbers, estimated PER PERSON. Use 0 for free stops. Keep estimates realistic for the destination.
- If the traveler gave no dates, pick sensible dates in the future relative to the "Today's date" line in the latest message. Dates use YYYY-MM-DD. Day N's date is start_date + (N - 1) days, and end_date is the last day's date.
- If the traveler gave no group size, assume 2 travelers.
- Plan 3 to 6 stops per day, in chronological order, with times as 24-hour HH:MM. Leave realistic travel time between stops.
- Each stop's `type` MUST be exactly one of the allowed stop types listed in the latest message.
- `description` is one short line (what to do or eat there); `address` is a real, findable address or area; `estimated_time` is a short duration such as "2 hours".
- Only include a `booking_url` when it is the well-known official website of that exact place, hotel or attraction. Otherwise use an empty string. Never invent or guess URLs.
- `country_flag` is the flag emoji of the destination country. `difficulty` reflects how physically demanding the trip is.
- When a current draft is provided, revise it according to the traveler's latest request and keep everything they did not ask to change (same dates, stops, and prices unless the request affects them).

Rules for the reply:
- 1 to 3 friendly sentences summarizing what you planned or changed, including the approximate total cost per person in IDR.
- Do not repeat the whole itinerary in the reply; the app shows the draft separately."""


class PlannerError(Exception):
    """An error with an HTTP status code and a user-facing `detail`."""

    def __init__(self, status_code, detail):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


PROVIDERS = ('gemini', 'claude')


def _has_key(provider):
    if provider == 'gemini':
        return bool(settings.GEMINI_API_KEY)
    return bool(settings.ANTHROPIC_API_KEY)


def configured_providers():
    """Providers with an API key, the preferred one (settings.AI_PROVIDER) first.

    The others act as fallbacks when the preferred provider fails upstream.
    """
    preferred = settings.AI_PROVIDER if settings.AI_PROVIDER in PROVIDERS else PROVIDERS[0]
    ordered = [preferred] + [p for p in PROVIDERS if p != preferred]
    return [p for p in ordered if _has_key(p)]


def is_configured():
    return bool(configured_providers())


def itinerary_type_names():
    return list(ItineraryType.objects.order_by('name').values_list('name', flat=True))


def draft_to_json(draft):
    """Serialize a validated draft (from DraftSerializer) into the contract's Draft shape."""
    return {
        'title': draft['title'],
        'destination': draft['destination'],
        'country_flag': draft.get('country_flag', ''),
        'description': draft.get('description', ''),
        'start_date': draft['start_date'].isoformat(),
        'end_date': draft['end_date'].isoformat(),
        'travelers': draft.get('travelers', 1),
        'difficulty': draft.get('difficulty'),
        'days': [
            {
                'day': day['day'],
                'title': day.get('title', ''),
                'date': (day.get('date') or draft['start_date'] + timedelta(days=day['day'] - 1)).isoformat(),
                'stops': [
                    {
                        'time': stop['time'],
                        'name': stop['name'],
                        'type': stop.get('type', ''),
                        'description': stop.get('description', ''),
                        'address': stop.get('address', ''),
                        'estimated_time': stop.get('estimated_time', ''),
                        'cost': int(stop.get('cost') or 0),
                        'booking_url': stop.get('booking_url', ''),
                    }
                    for stop in day['stops']
                ],
            }
            for day in draft['days']
        ],
    }


def build_messages(messages, draft, type_names, today):
    """Build chat messages (Claude shape): merge same-role runs and put per-request context in the last user turn."""
    merged = []
    for message in messages:
        content = message['content'].strip()
        if merged and merged[-1]['role'] == message['role']:
            merged[-1]['content'] += '\n\n' + content
        else:
            merged.append({'role': message['role'], 'content': content})

    parts = []
    if draft is not None:
        parts.append('Current draft:\n```json\n' + json.dumps(draft_to_json(draft), ensure_ascii=False, indent=2) + '\n```')
        parts.append('Request: ' + merged[-1]['content'])
    else:
        parts.append(merged[-1]['content'])
    parts.append('Allowed stop types: ' + ', '.join(type_names))
    parts.append(f"Today's date: {today.isoformat()}")
    merged[-1]['content'] = '\n\n'.join(parts)
    return merged


def call_claude(messages):
    """Ask Claude for a PlannerResponse; raise PlannerError on refusal or upstream failure."""
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    try:
        response = client.beta.messages.parse(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=16000,
            betas=["server-side-fallback-2026-07-01"],
            fallbacks="default",
            output_config={"effort": "medium"},
            system=SYSTEM_PROMPT,
            messages=messages,
            output_format=PlannerResponse,
        )
    except anthropic.RateLimitError:
        logger.warning("Planner: Claude API rate limited")
        raise PlannerError(502, "The AI planner is busy right now. Please try again in a moment.")
    except anthropic.APIStatusError as exc:
        logger.error("Planner: Claude API error %s: %s", exc.status_code, exc.message)
        raise PlannerError(502, "The AI planner is unavailable right now. Please try again later.")
    except anthropic.APIConnectionError:
        logger.error("Planner: could not reach the Claude API")
        raise PlannerError(502, "Could not reach the AI planner. Please try again later.")
    except pydantic.ValidationError:
        logger.error("Planner: Claude returned an invalid draft")
        raise PlannerError(502, "The AI planner returned an invalid plan. Please try again.")

    if response.stop_reason == "refusal":
        raise PlannerError(422, "The AI planner can't help with that request. Try asking about a trip instead.")
    result = response.parsed_output
    if result is None:
        logger.error("Planner: no parsed output (stop_reason=%s)", response.stop_reason)
        raise PlannerError(502, "The AI planner returned an incomplete plan. Please try a shorter trip or try again.")
    return result


# Gemini finish reasons that mean the request was declined, not cut short.
_GEMINI_BLOCKED = {
    genai_types.FinishReason.SAFETY,
    genai_types.FinishReason.PROHIBITED_CONTENT,
    genai_types.FinishReason.BLOCKLIST,
    genai_types.FinishReason.SPII,
    genai_types.FinishReason.RECITATION,
}


def call_gemini(messages):
    """Ask Gemini for a PlannerResponse; raise PlannerError on a block or upstream failure."""
    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    contents = [
        genai_types.Content(
            role='model' if message['role'] == 'assistant' else 'user',
            parts=[genai_types.Part(text=message['content'])],
        )
        for message in messages
    ]
    try:
        response = client.models.generate_content(
            model=settings.GEMINI_MODEL,
            contents=contents,
            config=genai_types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                response_mime_type='application/json',
                response_json_schema=PlannerResponse.model_json_schema(),
                max_output_tokens=16000,
            ),
        )
    except genai_errors.APIError as exc:
        if exc.code == 429:
            logger.warning("Planner: Gemini API rate limited")
            raise PlannerError(502, "The AI planner is busy right now. Please try again in a moment.")
        logger.error("Planner: Gemini API error %s: %s", exc.code, exc.message)
        raise PlannerError(502, "The AI planner is unavailable right now. Please try again later.")
    except httpx.TransportError:
        logger.error("Planner: could not reach the Gemini API")
        raise PlannerError(502, "Could not reach the AI planner. Please try again later.")

    feedback = response.prompt_feedback
    if feedback is not None and feedback.block_reason:
        raise PlannerError(422, "The AI planner can't help with that request. Try asking about a trip instead.")
    candidate = response.candidates[0] if response.candidates else None
    finish_reason = candidate.finish_reason if candidate else None
    if finish_reason in _GEMINI_BLOCKED:
        raise PlannerError(422, "The AI planner can't help with that request. Try asking about a trip instead.")

    text = response.text if candidate else None
    if not text or finish_reason == genai_types.FinishReason.MAX_TOKENS:
        logger.error("Planner: no complete Gemini output (finish_reason=%s)", finish_reason)
        raise PlannerError(502, "The AI planner returned an incomplete plan. Please try a shorter trip or try again.")
    try:
        return PlannerResponse.model_validate_json(text)
    except pydantic.ValidationError:
        logger.error("Planner: Gemini returned an invalid draft")
        raise PlannerError(502, "The AI planner returned an invalid plan. Please try again.")


_CALLERS = {'gemini': call_gemini, 'claude': call_claude}


def call_provider(messages):
    """Try each configured provider in order; fall back only on upstream (502) failures.

    A 422 means the request itself was declined, so it is returned as-is.
    """
    providers = configured_providers()
    if not providers:
        raise PlannerError(503, "AI planner is not configured.")
    last_error = None
    for index, provider in enumerate(providers):
        try:
            return _CALLERS[provider](messages)
        except PlannerError as exc:
            if exc.status_code != 502:
                raise
            if index + 1 < len(providers):
                logger.warning("Planner: %s failed, falling back to %s", provider, providers[index + 1])
            last_error = exc
    raise last_error


def generate(messages, draft):
    """Run one planner turn and return the response body `{reply, draft}`."""
    type_names = itinerary_type_names()
    today = timezone.localdate()
    result = call_provider(build_messages(messages, draft, type_names, today))
    return {
        'reply': result.reply.strip(),
        'draft': clean_draft(result.draft.model_dump(), type_names, today),
    }


# --- cleaning -----------------------------------------------------------------

_url_validator = URLValidator(schemes=['http', 'https'])
_time_re = re.compile(r'^\s*(\d{1,2})[:.](\d{2})')


def clean_booking_url(value):
    value = (value or '').strip()
    if not value or len(value) > 500:
        return ''
    try:
        _url_validator(value)
    except ValidationError:
        return ''
    return value


def clean_time(value):
    match = _time_re.match(value or '')
    if match:
        hours, minutes = int(match.group(1)), int(match.group(2))
        if hours < 24 and minutes < 60:
            return f'{hours:02d}:{minutes:02d}'
    return DEFAULT_STOP_TIME


def clean_type(value, type_names):
    by_lower = {name.lower(): name for name in type_names}
    value = (value or '').strip().lower()
    if value in by_lower:
        return by_lower[value]
    if FALLBACK_TYPE_NAME.lower() in by_lower:
        return by_lower[FALLBACK_TYPE_NAME.lower()]
    return type_names[0] if type_names else ''


def _parse_date(value):
    try:
        return datetime.strptime((value or '').strip(), '%Y-%m-%d').date()
    except ValueError:
        return None


def _non_negative_int(value):
    try:
        return max(0, int(value))
    except (TypeError, ValueError):
        return 0


def clean_draft(raw, type_names, today):
    """Normalize a model-produced draft (dict from PlannerResponse.draft) into a valid contract Draft."""
    days = raw.get('days') or []
    start_date = _parse_date(raw.get('start_date')) or today + timedelta(days=14)
    end_date = _parse_date(raw.get('end_date'))
    last_day = start_date + timedelta(days=max(len(days) - 1, 0))
    if end_date is None or end_date < start_date:
        end_date = last_day

    cleaned_days = []
    for index, day in enumerate(days):
        date = _parse_date(day.get('date'))
        if date is None or not (start_date <= date <= end_date):
            date = min(start_date + timedelta(days=index), end_date)
        stops = sorted(
            (
                {
                    'time': clean_time(stop.get('time')),
                    'name': (stop.get('name') or '').strip()[:100] or 'Stop',
                    'type': clean_type(stop.get('type'), type_names),
                    'description': (stop.get('description') or '').strip(),
                    'address': (stop.get('address') or '').strip()[:255],
                    'estimated_time': (stop.get('estimated_time') or '').strip()[:50],
                    'cost': _non_negative_int(stop.get('cost')),
                    'booking_url': clean_booking_url(stop.get('booking_url')),
                }
                for stop in day.get('stops') or []
            ),
            key=lambda stop: stop['time'],
        )
        cleaned_days.append({
            'day': index + 1,
            'title': (day.get('title') or '').strip(),
            'date': date.isoformat(),
            'stops': stops,
        })

    try:
        travelers = max(1, int(raw.get('travelers') or 1))
    except (TypeError, ValueError):
        travelers = 1

    return {
        'title': (raw.get('title') or '').strip()[:255] or 'My Trip',
        'destination': (raw.get('destination') or '').strip()[:255],
        'country_flag': (raw.get('country_flag') or '').strip(),
        'description': (raw.get('description') or '').strip()[:2000],
        'start_date': start_date.isoformat(),
        'end_date': end_date.isoformat(),
        'travelers': travelers,
        'difficulty': raw.get('difficulty') or 'EASY',
        'days': cleaned_days,
    }


# --- saving -------------------------------------------------------------------

@transaction.atomic
def save_draft(draft, owner):
    """Create a PLANNING trip (requester as organizer) plus one itinerary item per stop.

    `draft` is validated data from DraftSerializer.
    """
    types = {itinerary_type.name.lower(): itinerary_type for itinerary_type in ItineraryType.objects.all()}
    fallback_type = types.get(FALLBACK_TYPE_NAME.lower())
    travelers = draft.get('travelers') or 1
    start_date, end_date = draft['start_date'], draft['end_date']

    per_person = sum(
        (Decimal(stop.get('cost') or 0) for day in draft['days'] for stop in day['stops']),
        Decimal('0'),
    )
    trip = create_trip_for_owner(
        owner,
        title=draft['title'][:255],
        destination=draft['destination'][:255],
        description=(draft.get('description') or '')[:2000],
        start_date=start_date,
        end_date=end_date,
        member_spots=travelers,
        duration=(end_date - start_date).days + 1,
        budget=per_person * travelers,
        difficulty=draft.get('difficulty'),
        status=TripStatus.PLANNING,
    )

    tz = timezone.get_current_timezone()
    items = []
    for day in draft['days']:
        date = day.get('date') or start_date + timedelta(days=day['day'] - 1)
        for stop in day['stops']:
            hours, minutes = (int(part) for part in stop['time'].split(':'))
            items.append(ItineraryItem(
                trip=trip,
                name=stop['name'][:100],
                type=types.get((stop.get('type') or '').strip().lower(), fallback_type),
                description=(stop.get('description') or '')[:2000],
                address=(stop.get('address') or '')[:255],
                estimated_time=(stop.get('estimated_time') or '')[:50],
                visit_time=timezone.make_aware(datetime.combine(date, time(hours, minutes)), tz),
                cost=stop.get('cost') or Decimal('0'),
                booking_url=clean_booking_url(stop.get('booking_url')),
            ))
    ItineraryItem.objects.bulk_create(items)
    return trip
