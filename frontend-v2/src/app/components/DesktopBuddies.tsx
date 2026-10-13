import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar,
  Check,
  MapPin,
  MessageCircle,
  Search,
  Star,
  UserPlus,
  X,
} from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import { ChatSheet } from "@/components/messages/ChatSheet";
import { InviteBuddyModal } from "@/components/modals/InviteBuddyModal";
import { UserAvatar } from "@/components/UserAvatar";
import { useTrips } from "@/contexts/TripsContext";
import { useApi } from "@/hooks/useApi";
import {
  PRESENCE_COLORS,
  buddyToCard,
  colorFor,
  memberInitials,
  memberName,
} from "@/lib/adapters";
import { getErrorMessage } from "@/lib/utils";

type Buddy = ReturnType<typeof buddyToCard>;

/** A PENDING membership on a trip you can manage. */
interface PendingInvite {
  memberId: string;
  tripId: string;
  tripTitle: string;
  name: string;
  initials: string;
  color: string;
}

/**
 * Buddies come from GET /auth/buddies/ (people you share an accepted trip
 * with, already sorted online-first). Pending join requests are still read
 * from the member list of each trip you can manage.
 */
export function DesktopBuddies() {
  const navigate = useNavigate();
  const { myTrips, fetchMyTrips } = useTrips();
  const { getRequest, patchRequest } = useApi();

  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [buddies, setBuddies] = useState<Buddy[]>([]);
  const [pending, setPending] = useState<PendingInvite[]>([]);
  const [resolved, setResolved] = useState<Set<string>>(new Set());
  /** null = closed; {} = generic invite; a Buddy = invite that person. */
  const [inviting, setInviting] = useState<Buddy | {} | null>(null);
  const invitee = inviting && "id" in inviting ? inviting : null;
  const [chatWith, setChatWith] = useState<any | null>(null);

  const fetchBuddies = useCallback(async () => {
    try {
      const res = await getRequest("/auth/buddies/");
      setBuddies((res.data || []).map(buddyToCard));
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not load your buddies"));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBuddies();
    fetchMyTrips();
  }, [fetchBuddies, fetchMyTrips]);

  // Join requests only exist on trips you can manage, so only read those.
  useEffect(() => {
    if (!myTrips) return;
    let cancelled = false;
    const manageable = myTrips.filter((t: any) => t.is_editable);

    Promise.all(
      manageable.map(async (trip: any) => {
        try {
          const res = await getRequest(`/trips/${trip.id}/members/items/`);
          return { trip, members: res.data || [] };
        } catch {
          // A trip we can't read members for shouldn't sink the banner.
          return { trip, members: [] };
        }
      })
    ).then((results) => {
      if (cancelled) return;
      const invites: PendingInvite[] = [];
      results.forEach(({ trip, members }) => {
        members.forEach((m: any) => {
          const uid = m.user?.id;
          if (!uid || m.status !== "PENDING") return;
          invites.push({
            memberId: m.id,
            tripId: trip.id,
            tripTitle: trip.title,
            name: memberName(m),
            initials: memberInitials(m),
            color: colorFor(m.user?.email || uid),
          });
        });
      });
      setPending(invites);
    });

    return () => {
      cancelled = true;
    };
  }, [myTrips]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return buddies;
    return buddies.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.email.toLowerCase().includes(q) ||
        b.location.toLowerCase().includes(q) ||
        b.interests.some((i) => i.toLowerCase().includes(q))
    );
  }, [buddies, search]);

  const onlineCount = buddies.filter((b) => b.isOnline).length;

  const respond = async (invite: PendingInvite, status: string) => {
    try {
      await patchRequest(
        `/trips/${invite.tripId}/members/items/${invite.memberId}/`,
        { status }
      );
      setResolved((prev) => new Set(prev).add(invite.memberId));
      toast.success(
        status === "ACCEPTED" ? "Request accepted" : "Request declined",
        { description: `${invite.name} · ${invite.tripTitle}` }
      );
      if (status === "ACCEPTED") fetchBuddies();
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not update this request"));
    }
  };

  const openInvites = pending.filter((p) => !resolved.has(p.memberId));

  return (
    <div className="flex-1 min-w-0 overflow-y-auto px-4 py-5 md:px-10 md:py-8">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1
            className="text-foreground mb-1"
            style={{ fontWeight: 800, fontSize: 30, letterSpacing: "-0.03em" }}
          >
            Travel <span className="text-primary">buddies</span>
          </h1>
          <p className="text-muted-foreground" style={{ fontSize: 14 }}>
            {isLoading
              ? "People you've travelled with across your trips"
              : `${buddies.length} ${buddies.length === 1 ? "friend" : "friends"} · ${onlineCount} online now`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setInviting({})}
          className="bg-primary text-white rounded-2xl px-5 py-2.5 flex items-center gap-2 hover:bg-[#13a058] transition-colors"
          style={{ fontSize: 14, fontWeight: 600 }}
        >
          <UserPlus className="w-4 h-4" /> Invite a buddy
        </button>
      </div>

      {openInvites.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-5 mb-6">
          <p
            className="text-foreground mb-3"
            style={{ fontWeight: 700, fontSize: 15 }}
          >
            Pending join requests
          </p>
          <div className="space-y-2">
            {openInvites.map((p) => (
              <div
                key={p.memberId}
                className="flex items-center gap-3 rounded-xl border border-border px-4 py-2.5"
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0"
                  style={{ background: p.color, fontSize: 11, fontWeight: 700 }}
                >
                  {p.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-foreground truncate"
                    style={{ fontWeight: 600, fontSize: 14 }}
                  >
                    {p.name}
                  </p>
                  <p className="text-muted-foreground" style={{ fontSize: 12 }}>
                    wants to join {p.tripTitle}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => respond(p, "ACCEPTED")}
                  className="flex items-center gap-1 bg-primary text-primary-foreground rounded-lg px-3 py-1.5 hover:bg-primary/90 transition-colors"
                  style={{ fontSize: 12, fontWeight: 600 }}
                >
                  <Check className="w-3.5 h-3.5" /> Accept
                </button>
                <button
                  type="button"
                  onClick={() => respond(p, "DECLINED")}
                  aria-label={`Decline ${p.name}`}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search buddies by name, place or interest…"
          className="w-full bg-card border border-input rounded-2xl pl-11 pr-4 py-3 text-foreground placeholder-muted-foreground outline-none focus:border-primary transition-colors"
          style={{ fontSize: 14 }}
        />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground" style={{ fontSize: 14 }}>
          Loading buddies…
        </p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mb-4 text-3xl">
            🧑‍🤝‍🧑
          </div>
          <p
            className="text-foreground mb-2"
            style={{ fontWeight: 700, fontSize: 18 }}
          >
            {buddies.length ? "No buddies match your search" : "No travel buddies yet"}
          </p>
          <p className="text-muted-foreground mb-5" style={{ fontSize: 14 }}>
            {buddies.length
              ? "Try a different name, place or interest"
              : "Invite people to a trip and they'll show up here"}
          </p>
          {buddies.length === 0 && (
            <button
              onClick={() => navigate("/trips")}
              className="bg-primary text-white rounded-2xl px-6 py-3 flex items-center gap-2"
              style={{ fontSize: 14, fontWeight: 600 }}
            >
              <UserPlus className="w-4 h-4" /> Go to your trips
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((b) => (
            <BuddyCard
              key={b.id}
              buddy={b}
              onChat={() => setChatWith(b.user)}
              onInvite={() => setInviting(b)}
              onOpenTrip={(id) => navigate(`/trips/${id}`)}
            />
          ))}
        </div>
      )}

      <InviteBuddyModal
        open={inviting !== null}
        onOpenChange={(open) => !open && setInviting(null)}
        email={invitee?.email || undefined}
        name={invitee?.name}
        excludeTripIds={invitee?.sharedTrips.map((t) => t.id)}
        onInvited={() => {
          fetchMyTrips();
          fetchBuddies();
        }}
      />

      <ChatSheet user={chatWith} onOpenChange={(open) => !open && setChatWith(null)} />
    </div>
  );
}

function BuddyCard({
  buddy: b,
  onChat,
  onInvite,
  onOpenTrip,
}: {
  buddy: Buddy;
  onChat: () => void;
  onInvite: () => void;
  onOpenTrip: (id: string) => void;
}) {
  const shared = b.sharedTrips.length;
  return (
    <div className="bg-card border border-border rounded-2xl p-5 hover:border-primary/30 hover:shadow-sm transition-all flex flex-col">
      <div className="flex items-start gap-3 mb-4">
        <div className="relative shrink-0">
          <UserAvatar
            person={b.user}
            className="w-12 h-12 rounded-2xl"
            style={{ fontSize: 14, fontWeight: 800 }}
          />
          <span
            className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card"
            style={{
              background: b.isOnline ? PRESENCE_COLORS.online : PRESENCE_COLORS.offline,
            }}
            aria-label={b.isOnline ? "Online" : "Offline"}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p
            className="text-foreground truncate"
            style={{ fontWeight: 700, fontSize: 15 }}
          >
            {b.name}
          </p>
          {b.location ? (
            <p
              className="text-muted-foreground flex items-center gap-1 truncate"
              style={{ fontSize: 12 }}
            >
              <MapPin className="w-3 h-3 shrink-0" /> {b.location}
            </p>
          ) : null}
          <p
            className={b.isOnline ? "text-primary" : "text-muted-foreground"}
            style={{ fontSize: 11, fontWeight: b.isOnline ? 600 : 400 }}
          >
            {b.presence}
          </p>
        </div>
        <button
          type="button"
          onClick={onChat}
          aria-label={`Message ${b.name}`}
          title={`Message ${b.name}`}
          className="group w-8 h-8 rounded-xl bg-muted flex items-center justify-center hover:bg-secondary transition-colors shrink-0"
        >
          <MessageCircle className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
        </button>
      </div>

      {b.bio ? (
        <p
          className="text-muted-foreground mb-3"
          style={{ fontSize: 13, lineHeight: 1.5 }}
        >
          {b.bio}
        </p>
      ) : null}

      {b.interests.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {b.interests.map((tag) => (
            <span
              key={tag}
              className="bg-secondary text-secondary-foreground rounded-full px-2.5 py-0.5"
              style={{ fontSize: 11, fontWeight: 600 }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div
        className="flex items-center gap-4 border-t border-border pt-3 mb-3 mt-auto"
        style={{ fontSize: 12 }}
      >
        <span className="text-muted-foreground flex items-center gap-1">
          <Star className="w-3 h-3" style={{ color: "#FF8A4C" }} fill="#FF8A4C" />{" "}
          {b.tripsCount} {b.tripsCount === 1 ? "trip" : "trips"}
        </span>
        <span className="text-muted-foreground">{b.mutualCount} mutual</span>
        {shared > 0 && (
          <span className="text-primary flex items-center gap-1">
            <Calendar className="w-3 h-3" /> {shared} shared
          </span>
        )}
      </div>

      {shared > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {b.sharedTrips.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onOpenTrip(t.id)}
              className="bg-muted text-muted-foreground rounded-lg px-2 py-0.5 hover:bg-primary hover:text-white transition-colors"
              style={{ fontSize: 11 }}
              title={t.destination || t.title}
            >
              {t.title}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onInvite}
        className="w-full border-2 border-dashed border-border rounded-xl py-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        style={{ fontSize: 12, fontWeight: 500 }}
      >
        + Invite to a trip
      </button>
    </div>
  );
}
