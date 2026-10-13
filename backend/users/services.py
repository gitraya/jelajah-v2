"""Travel buddies: users who share at least one trip as accepted members.

A trip's owner counts as an accepted member even without a TripMember row.
Soft-deleted trips never make anyone buddies.
"""
from collections import defaultdict

from django.contrib.auth import get_user_model
from django.db.models import Q

from trips.models import MemberStatus, Trip, TripMember, TripStatus

User = get_user_model()


def _accepted_member_q(user, prefix=''):
    return Q(**{f'{prefix}owner': user}) | Q(**{
        f'{prefix}trip_members__user': user,
        f'{prefix}trip_members__status': MemberStatus.ACCEPTED,
    })


def _membership_pairs(trips):
    """`{(trip_id, user_id)}` for every accepted member (owner included) of `trips`.

    Two queries regardless of how many trips `trips` (a queryset) matches.
    """
    pairs = set(
        TripMember.objects.filter(trip__in=trips, status=MemberStatus.ACCEPTED)
        .values_list('trip_id', 'user_id')
    )
    pairs.update(trips.values_list('id', 'owner_id'))
    return pairs


def _live_trips():
    return Trip.objects.exclude(status=TripStatus.DELETED)


def are_buddies(user, other):
    """Whether `user` and `other` share a (non-deleted) trip as accepted members."""
    return (
        _live_trips()
        .filter(_accepted_member_q(user))
        .filter(_accepted_member_q(other))
        .exists()
    )


def get_buddies(user):
    """Return `user`'s buddies as User instances carrying `trips_count`,
    `mutual_count` and `shared_trips`, sorted online-first then by name.

    Runs a fixed number of queries; all per-buddy work happens on in-memory sets.
    """
    my_trips = _live_trips().filter(_accepted_member_q(user)).distinct()
    my_pairs = _membership_pairs(my_trips)

    shared = defaultdict(set)  # buddy id -> trip ids shared with `user`
    for trip_id, member_id in my_pairs:
        if member_id != user.pk:
            shared[member_id].add(trip_id)
    if not shared:
        return []
    buddy_ids = set(shared)

    # Every live trip any buddy belongs to, and everyone on those trips: enough
    # to count each buddy's trips and each buddy's own buddies.
    buddy_trip_ids = set(
        TripMember.objects.filter(user_id__in=buddy_ids, status=MemberStatus.ACCEPTED)
        .exclude(trip__status=TripStatus.DELETED)
        .values_list('trip_id', flat=True)
    )
    buddy_trip_ids.update(_live_trips().filter(owner_id__in=buddy_ids).values_list('id', flat=True))
    buddy_trips = _live_trips().filter(id__in=buddy_trip_ids)
    trip_info = {
        t['id']: t
        for t in buddy_trips.values('id', 'title', 'destination', 'start_date', 'status')
    }
    trip_members = defaultdict(set)
    for trip_id, member_id in _membership_pairs(buddy_trips):
        trip_members[trip_id].add(member_id)

    user_trips = defaultdict(set)
    for trip_id, members in trip_members.items():
        for member_id in members:
            user_trips[member_id].add(trip_id)

    buddies = list(User.objects.filter(id__in=buddy_ids))
    for buddy in buddies:
        trips = user_trips[buddy.pk]
        buddy.trips_count = sum(
            1 for trip_id in trips if trip_info[trip_id]['status'] != TripStatus.CANCELLED
        )
        their_buddies = set().union(*(trip_members[t] for t in trips)) if trips else set()
        buddy.mutual_count = len((their_buddies & buddy_ids) - {buddy.pk, user.pk})
        buddy.shared_trips = sorted(
            (
                {k: trip_info[t][k] for k in ('id', 'title', 'destination', 'start_date')}
                for t in shared[buddy.pk]
            ),
            key=lambda t: t['start_date'],
            reverse=True,
        )

    def sort_key(buddy):
        name = f'{buddy.first_name} {buddy.last_name}'.strip() or buddy.email
        return (not buddy.is_online, name.lower())

    return sorted(buddies, key=sort_key)
