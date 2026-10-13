import { getInitials } from "@/lib/utils";
import { ITINERARY_TYPES_ICONS } from "@/config";

export const MEMBER_COLORS = [
  "#16B364",
  "#FF8A4C",
  "#0B6B3A",
  "#F5A623",
  "#1a7aaa",
  "#9b59b6",
  "#e74c3c",
];

// Deterministic color from a string so the same member keeps the same color.
export const colorFor = (seed: string) => {
  let hash = 0;
  for (let i = 0; i < (seed || "").length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return MEMBER_COLORS[Math.abs(hash) % MEMBER_COLORS.length];
};

export const memberName = (m: any) => {
  const u = m.user || m;
  const name = `${u.first_name || ""} ${u.last_name || ""}`.trim();
  return name || u.email || "Traveler";
};

export const memberInitials = (m: any) => getInitials(memberName(m)).slice(0, 2);

// Uploaded trip cover, else a stock photo keyed on destination keyword.
const DESTINATION_IMAGES: Record<string, string> = {
  japan: "photo-1659094438327-493ee9cc0c4c",
  osaka: "photo-1659094438327-493ee9cc0c4c",
  tokyo: "photo-1540959733332-eab4deabeeaf",
  thailand: "photo-1563492065599-3520f775eeed",
  bangkok: "photo-1563492065599-3520f775eeed",
  malaysia: "photo-1470217957101-da7150b9b681",
  bali: "photo-1555400038-63f5ba517a47",
  indonesia: "photo-1555400038-63f5ba517a47",
  singapore: "photo-1595290429614-88ba93221dba",
  vietnam: "photo-1558005530-a7958896ec60",
  canada: "photo-1517935706615-2717063c2225",
};

export const coverImage = (trip: any) => {
  if (trip.cover_image) return trip.cover_image;
  const key = `${trip.destination || ""} ${trip.title || ""}`.toLowerCase();
  const match = Object.keys(DESTINATION_IMAGES).find((k) => key.includes(k));
  const photo = match ? DESTINATION_IMAGES[match] : "photo-1488646953014-85cb44e25828";
  return `https://images.unsplash.com/${photo}?w=600&h=400&fit=crop&auto=format`;
};

const STATUS_LABEL: Record<string, string> = {
  PLANNING: "Planning",
  ONGOING: "Ongoing",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

// Maps a "card status" bucket used by DesktopTrips filters.
export const tripBucket = (trip: any): "upcoming" | "planning" | "past" => {
  if (trip.status === "COMPLETED" || trip.status === "CANCELLED") return "past";
  if (trip.status === "ONGOING") return "upcoming";
  const start = trip.start_date ? new Date(trip.start_date) : null;
  if (start && start.getTime() > Date.now()) return "upcoming";
  return "planning";
};

export const formatRp = (amount?: number | string) => {
  const n = Number(amount || 0);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);
};

// Backend trip -> shape consumed by DesktopTrips cards.
export const tripToCard = (trip: any) => {
  const members = trip.members_data || trip.members_list || [];
  const spent = Number(trip.spent_budget || 0);
  const budget = Number(trip.budget || 0);
  return {
    id: trip.id,
    name: trip.title,
    flag: "🧭",
    country: trip.destination,
    dates: trip.dates || "",
    travelers: trip.members_count ?? members.length ?? 0,
    stops: trip.stops_count ?? 0,
    budget: formatRp(budget),
    spent: formatRp(spent),
    progress:
      budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0,
    status: tripBucket(trip),
    statusLabel: STATUS_LABEL[trip.status] || trip.status,
    img: coverImage(trip),
    members: (members.slice(0, 5) as any[]).map(memberInitials),
    memberColors: (members.slice(0, 5) as any[]).map((m) =>
      colorFor(m.user?.email || m.email || String(m.id))
    ),
    raw: trip,
  };
};

/** Inclusive day count from the trip dates; `duration` isn't kept in sync on edits. */
export const tripDays = (trip: any): number => {
  const start = Date.parse(trip?.start_date);
  const end = Date.parse(trip?.end_date);
  if (!Number.isNaN(start) && !Number.isNaN(end) && end >= start) {
    return Math.round((end - start) / 86_400_000) + 1;
  }
  return Number(trip?.duration || 0);
};

// Backend trip -> shape consumed by DesktopExplore destination cards.
export const tripToDestination = (trip: any) => ({
  id: trip.id,
  name: trip.title,
  country: trip.destination,
  img: coverImage(trip),
  tag: trip.difficulty
    ? trip.difficulty.charAt(0) + trip.difficulty.slice(1).toLowerCase()
    : "Trip",
  duration: (() => {
    const n = tripDays(trip) || 1;
    return `${n} ${n === 1 ? "day" : "days"}`;
  })(),
  budget: formatRp(trip.budget),
  members: trip.members_count ?? 0,
  status: trip.status,
  isSaved: Boolean(trip.is_saved),
  savesCount: trip.saves_count ?? 0,
  rating: formatRating(trip.rating_avg),
  reviewsCount: trip.reviews_count ?? 0,
  raw: trip,
});

// "Rp 2.8M" / "Rp 120K" / "Rp 500" — compact IDR for tight UI (prices, stats).
export const formatRpShort = (amount?: number | string | null) => {
  const n = Number(amount || 0);
  const abs = Math.abs(n);
  const trim = (v: number) => String(Math.round(v * 10) / 10);
  if (abs >= 1_000_000_000) return `Rp ${trim(n / 1_000_000_000)}B`;
  if (abs >= 1_000_000) return `Rp ${trim(n / 1_000_000)}M`;
  if (abs >= 1_000) return `Rp ${Math.round(n / 1_000)}K`;
  return `Rp ${Math.round(n)}`;
};

/**
 * Itinerary stop price label. `cost` is IDR per person: null/"" = unknown
 * (no label), 0 = "Free", otherwise full ("Rp 2.800.000") or compact.
 */
export const stopPrice = (
  cost: number | string | null | undefined,
  short = false
): { label: string; free: boolean } | null => {
  if (cost === null || cost === undefined || cost === "") return null;
  const n = Number(cost);
  if (Number.isNaN(n)) return null;
  if (n === 0) return { label: "Free", free: true };
  return { label: short ? formatRpShort(n) : formatRp(n), free: false };
};

/** Emoji for an itinerary type name (backend ItineraryType.name). */
export const stopIcon = (typeName?: string | null) =>
  (typeName && ITINERARY_TYPES_ICONS[typeName]) || "📍";

// Backend trip -> compact "Community itineraries" card on Explore.
export const tripToTemplate = (trip: any) => {
  const owner = trip.owner || {};
  return {
    id: trip.id,
    title: trip.title,
    destination: trip.destination,
    owner,
    author: memberName(owner),
    days: tripDays(trip),
    budget: formatRpShort(trip.budget),
    saves: trip.saves_count ?? 0,
    isSaved: Boolean(trip.is_saved),
    rating: formatRating(trip.rating_avg),
    reviewsCount: trip.reviews_count ?? 0,
    raw: trip,
  };
};

// "YYYY-MM-DD" parsed as a local date (new Date("YYYY-MM-DD") is UTC).
const localDate = (d?: string | null) =>
  d ? new Date(`${d.slice(0, 10)}T00:00:00`) : null;

/** "12–16 Sep 2026", "30 Sep – 3 Oct 2026", or "28 Dec 2026 – 2 Jan 2027". */
export const formatDateRange = (start?: string | null, end?: string | null) => {
  const s = localDate(start);
  const e = localDate(end) || s;
  if (!s || !e || Number.isNaN(s.getTime())) return "";
  const day = (d: Date) => d.getDate();
  const mon = (d: Date) => d.toLocaleDateString("en-GB", { month: "short" });
  if (s.getFullYear() !== e.getFullYear())
    return `${day(s)} ${mon(s)} ${s.getFullYear()} – ${day(e)} ${mon(e)} ${e.getFullYear()}`;
  if (s.getMonth() !== e.getMonth())
    return `${day(s)} ${mon(s)} – ${day(e)} ${mon(e)} ${e.getFullYear()}`;
  if (day(s) === day(e)) return `${day(s)} ${mon(s)} ${s.getFullYear()}`;
  return `${day(s)}–${day(e)} ${mon(s)} ${s.getFullYear()}`;
};

/** "Fri 12 Sep" for a "YYYY-MM-DD" day. */
export const formatDayLabel = (d?: string | null) => {
  const date = localDate(d);
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
};

// ---------------------------------------------------------------------------
// Buddies, presence, messages, reviews
// ---------------------------------------------------------------------------

const toDate = (iso?: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** "just now" / "5m ago" / "2h ago" / "Yesterday" / "3 days ago" / "12 Sep". */
export const timeAgo = (iso?: string | null, now: number = Date.now()) => {
  const d = toDate(iso);
  if (!d) return "";
  const secs = Math.max(0, Math.round((now - d.getTime()) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(d.getFullYear() !== new Date(now).getFullYear() ? { year: "numeric" } : {}),
  });
};

/** Presence line for a user: "Online", "Last seen 2h ago", or "Offline". */
export const presenceLabel = (u: { is_online?: boolean; last_seen?: string | null }) => {
  if (u?.is_online) return "Online";
  const ago = timeAgo(u?.last_seen);
  return ago ? `Last seen ${ago}` : "Offline";
};

export const PRESENCE_COLORS = { online: "#16B364", offline: "#8A93A6" };

// Backend GET /auth/buddies/ item -> buddy card.
export const buddyToCard = (b: any) => ({
  id: b.id as string,
  user: b,
  name: memberName(b),
  email: b.email || "",
  location: b.location || "",
  bio: b.bio || "",
  interests: (b.interests || []) as string[],
  isOnline: Boolean(b.is_online),
  presence: presenceLabel(b),
  tripsCount: b.trips_count ?? 0,
  mutualCount: b.mutual_count ?? 0,
  sharedTrips: (b.shared_trips || []) as {
    id: string;
    title: string;
    destination?: string;
    start_date?: string | null;
  }[],
});

/** Short time for a chat bubble: "14:05". */
export const messageTime = (iso?: string | null) => {
  const d = toDate(iso);
  return d
    ? d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : "";
};

/** Local calendar-day key used to group chat messages. */
export const dayKey = (iso?: string | null) => {
  const d = toDate(iso);
  return d ? `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` : "";
};

/** Chat day separator: "Today" / "Yesterday" / "Mon 12 Sep" / "12 Sep 2025". */
export const dayLabel = (iso?: string | null) => {
  const d = toDate(iso);
  if (!d) return "";
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (dayKey(iso) === dayKey(today.toISOString())) return "Today";
  if (dayKey(iso) === dayKey(yesterday.toISOString())) return "Yesterday";
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(d.getFullYear() !== today.getFullYear() ? { year: "numeric" } : {}),
  });
};

/** "4.8" for a rating average, or null when there are no reviews. */
export const formatRating = (avg?: number | string | null) => {
  if (avg === null || avg === undefined || avg === "") return null;
  const n = Number(avg);
  return Number.isNaN(n) ? null : n.toFixed(1);
};

/** "1 review" / "1,240 reviews". */
export const reviewsLabel = (count?: number | null) => {
  const n = Number(count || 0);
  return `${n.toLocaleString("en-US")} ${n === 1 ? "review" : "reviews"}`;
};
