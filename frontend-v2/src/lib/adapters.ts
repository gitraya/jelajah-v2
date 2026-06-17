import { getInitials } from "@/lib/utils";

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

const memberName = (m: any) => {
  const u = m.user || m;
  const name = `${u.first_name || ""} ${u.last_name || ""}`.trim();
  return name || u.email || "Traveler";
};

export const memberInitials = (m: any) => getInitials(memberName(m)).slice(0, 2);

// Travel cover image fallback keyed on destination keyword.
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
  raw: trip,
});
