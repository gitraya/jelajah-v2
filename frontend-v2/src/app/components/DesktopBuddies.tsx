import { useEffect, useMemo, useState } from "react";
import { Calendar, Check, MapPin, Search, UserPlus, X } from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { useTrips } from "@/contexts/TripsContext";
import { useApi } from "@/hooks/useApi";
import { colorFor, memberInitials, memberName } from "@/lib/adapters";
import { getErrorMessage } from "@/lib/utils";

/** A person you share at least one trip with, folded across all your trips. */
interface Buddy {
  userId: string;
  name: string;
  email: string;
  initials: string;
  color: string;
  sharedTrips: { id: string; title: string }[];
}

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
 * There is no /buddies endpoint — this view is derived by fanning out over the
 * member list of every trip you belong to and folding the results by user.
 */
export function DesktopBuddies() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { myTrips, fetchMyTrips } = useTrips();
  const { getRequest, patchRequest } = useApi();

  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [buddies, setBuddies] = useState<Buddy[]>([]);
  const [pending, setPending] = useState<PendingInvite[]>([]);
  const [resolved, setResolved] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchMyTrips();
  }, [fetchMyTrips]);

  useEffect(() => {
    if (!myTrips) return;
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      const results = await Promise.all(
        myTrips.map(async (trip: any) => {
          try {
            const res = await getRequest(`/trips/${trip.id}/members/items/`);
            return { trip, members: res.data || [] };
          } catch {
            // A trip we can't read members for shouldn't sink the whole page.
            return { trip, members: [] };
          }
        })
      );
      if (cancelled) return;

      const byUser = new Map<string, Buddy>();
      const invites: PendingInvite[] = [];

      results.forEach(({ trip, members }) => {
        members.forEach((m: any) => {
          const uid = m.user?.id;
          if (!uid) return;

          if (m.status === "PENDING" && trip.is_editable) {
            invites.push({
              memberId: m.id,
              tripId: trip.id,
              tripTitle: trip.title,
              name: memberName(m),
              initials: memberInitials(m),
              color: colorFor(m.user?.email || uid),
            });
          }

          if (uid === user?.id || m.status !== "ACCEPTED") return;

          const existing = byUser.get(uid);
          if (existing) {
            existing.sharedTrips.push({ id: trip.id, title: trip.title });
          } else {
            byUser.set(uid, {
              userId: uid,
              name: memberName(m),
              email: m.user?.email || "",
              initials: memberInitials(m),
              color: colorFor(m.user?.email || uid),
              sharedTrips: [{ id: trip.id, title: trip.title }],
            });
          }
        });
      });

      setBuddies(
        [...byUser.values()].sort(
          (a, b) => b.sharedTrips.length - a.sharedTrips.length
        )
      );
      setPending(invites);
      setIsLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [myTrips, user?.id]);

  const filtered = useMemo(
    () =>
      buddies.filter(
        (b) =>
          !search ||
          b.name.toLowerCase().includes(search.toLowerCase()) ||
          b.email.toLowerCase().includes(search.toLowerCase())
      ),
    [buddies, search]
  );

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
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not update this request"));
    }
  };

  const openInvites = pending.filter((p) => !resolved.has(p.memberId));

  return (
    <div className="flex-1 overflow-y-auto px-10 py-8">
      <div className="mb-6">
        <h1
          className="text-foreground mb-1"
          style={{ fontWeight: 800, fontSize: 30, letterSpacing: "-0.03em" }}
        >
          Travel <span className="text-primary">buddies</span>
        </h1>
        <p className="text-muted-foreground" style={{ fontSize: 14 }}>
          People you've travelled with across your trips
        </p>
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
          placeholder="Search buddies…"
          className="w-full bg-card border border-border rounded-2xl pl-11 pr-4 py-3 text-foreground placeholder-muted-foreground outline-none focus:border-primary transition-colors"
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
            No travel buddies yet
          </p>
          <p className="text-muted-foreground mb-5" style={{ fontSize: 14 }}>
            Invite people to a trip and they'll show up here
          </p>
          <button
            onClick={() => navigate("/trips")}
            className="bg-primary text-white rounded-2xl px-6 py-3 flex items-center gap-2"
            style={{ fontSize: 14, fontWeight: 600 }}
          >
            <UserPlus className="w-4 h-4" /> Go to your trips
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map((b) => (
            <div
              key={b.userId}
              className="bg-card border border-border rounded-2xl p-5 hover:shadow-md hover:border-primary/20 transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0"
                  style={{ background: b.color, fontSize: 14, fontWeight: 800 }}
                >
                  {b.initials}
                </div>
                <div className="min-w-0">
                  <p
                    className="text-foreground truncate"
                    style={{ fontWeight: 700, fontSize: 15 }}
                  >
                    {b.name}
                  </p>
                  <p
                    className="text-muted-foreground truncate"
                    style={{ fontSize: 12 }}
                  >
                    {b.email}
                  </p>
                </div>
              </div>

              <div
                className="flex items-center gap-3 text-muted-foreground mb-3"
                style={{ fontSize: 12 }}
              >
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {b.sharedTrips.length} shared
                  {b.sharedTrips.length === 1 ? " trip" : " trips"}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {b.sharedTrips.slice(0, 3).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => navigate(`/trips/${t.id}`)}
                    className="flex items-center gap-1 bg-secondary text-secondary-foreground rounded-full px-2.5 py-1 hover:bg-primary hover:text-white transition-colors"
                    style={{ fontSize: 11, fontWeight: 500 }}
                  >
                    <MapPin className="w-3 h-3" />
                    {t.title}
                  </button>
                ))}
                {b.sharedTrips.length > 3 && (
                  <span
                    className="text-muted-foreground px-1 py-1"
                    style={{ fontSize: 11 }}
                  >
                    +{b.sharedTrips.length - 3} more
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
