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

// Backend trip -> shape consumed by DesktopExplore destination cards.
export const tripToDestination = (trip: any) => ({
  id: trip.id,
  name: trip.title,
  country: trip.destination,
  img: coverImage(trip),
  tag: trip.difficulty
    ? trip.difficulty.charAt(0) + trip.difficulty.slice(1).toLowerCase()
    : "Trip",
  duration: trip.duration_label || `${trip.duration || 1} days`,
  budget: formatRp(trip.budget),
  members: trip.members_count ?? 0,
  status: trip.status,
  isSaved: Boolean(trip.is_saved),
  savesCount: trip.saves_count ?? 0,
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
    days: trip.duration || 0,
    budget: formatRpShort(trip.budget),
    saves: trip.saves_count ?? 0,
    isSaved: Boolean(trip.is_saved),
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
