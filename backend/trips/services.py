from django.db import models, transaction

from .models import Trip, TripMember, TripStatus, MemberStatus, MemberRole, Tag


def create_trip_for_owner(owner, tags=(), **fields):
    """Create a trip and make `owner` its accepted ORGANIZER.

    The single trip-creation path shared by TripSerializer.create, trip
    duplication and the AI planner's "save draft" endpoint.
    """
    trip = Trip.objects.create(owner=owner, **fields)
    trip.tags.set(tags)
    TripMember.objects.create(user=owner, trip=trip, status=MemberStatus.ACCEPTED, role=MemberRole.ORGANIZER)
    return trip


@transaction.atomic
def duplicate_trip(source, owner, title=None, start_date=None):
    """Copy `source` into a new PLANNING trip owned by `owner`.

    Dates (trip, itinerary visit times, checklist due dates) shift by the
    difference between `start_date` and the source start date. Itinerary,
    packing and checklist items are copied with their progress reset; members,
    expenses and the cover image are never copied.
    """
    # Imported here: these apps import trips.models, so a module-level import
    # would be circular.
    from itineraries.models import ItineraryItem, ItineraryStatus
    from packing.models import PackingItem
    from checklist.models import ChecklistItem

    start_date = start_date or source.start_date
    delta = start_date - source.start_date
    tags = list(source.tags.all())

    trip = create_trip_for_owner(
        owner,
        tags=tags,
        title=title or f"{source.title} (copy)",
        description=source.description,
        destination=source.destination,
        notes=source.notes,
        member_spots=source.member_spots,
        duration=source.duration,
        budget=source.budget,
        difficulty=source.difficulty,
        is_joinable=source.is_joinable,
        start_date=start_date,
        end_date=source.end_date + delta,
        status=TripStatus.PLANNING,
        is_public=False,
    )
    if tags:
        Tag.objects.filter(id__in=[tag.id for tag in tags]).update(usage_count=models.F('usage_count') + 1)

    ItineraryItem.objects.bulk_create([
        ItineraryItem(
            trip=trip,
            name=item.name,
            address=item.address,
            type_id=item.type_id,
            description=item.description,
            latitude=item.latitude,
            longitude=item.longitude,
            estimated_time=item.estimated_time,
            visit_time=item.visit_time + delta if item.visit_time else None,
            notes=item.notes,
            status=ItineraryStatus.PLANNED,
            cost=item.cost,
            booking_url=item.booking_url,
        )
        for item in source.itinerary_items.all()
    ])
    PackingItem.objects.bulk_create([
        PackingItem(
            trip=trip,
            name=item.name,
            category_id=item.category_id,
            quantity=item.quantity,
            packed=False,
            assigned_to=None,
        )
        for item in source.packing_items.all()
    ])
    ChecklistItem.objects.bulk_create([
        ChecklistItem(
            trip=trip,
            title=item.title,
            description=item.description,
            category=item.category,
            priority=item.priority,
            due_date=item.due_date + delta if item.due_date else None,
            is_completed=False,
            assigned_to=None,
            position=item.position,
        )
        for item in source.checklist_items.all()
    ])
    return trip
