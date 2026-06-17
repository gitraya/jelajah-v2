import { useState } from "react";
import { UserPlus, Search, MapPin, Calendar, MessageCircle, Star, Check } from "lucide-react";

const buddies = [
  {
    id: 1,
    initials: "CY",
    name: "Cinta Yusuf",
    color: "#FF8A4C",
    location: "Jakarta, ID",
    trips: 8,
    mutual: 3,
    bio: "Solo traveler turned group trip addict 🌏",
    tags: ["Beach", "Food", "City"],
    status: "active",
    lastSeen: "Online",
    sharedTrips: ["Canada Trip", "Osaka Foodie"],
  },
  {
    id: 2,
    initials: "VW",
    name: "Vina Widjaja",
    color: "#0B6B3A",
    location: "Bandung, ID",
    trips: 12,
    mutual: 5,
    bio: "Photographer & culture junkie 📷",
    tags: ["Culture", "Nature", "Adventure"],
    status: "active",
    lastSeen: "2h ago",
    sharedTrips: ["Canada Trip", "Osaka Foodie", "Bangkok Getaway"],
  },
  {
    id: 3,
    initials: "SF",
    name: "Sasha Fauzia",
    color: "#F5A623",
    location: "Surabaya, ID",
    trips: 5,
    mutual: 2,
    bio: "Budget travel pro ✈️ making every rupiah count",
    tags: ["Budget", "Beach", "Food"],
    status: "away",
    lastSeen: "Yesterday",
    sharedTrips: ["Canada Trip"],
  },
  {
    id: 4,
    initials: "WY",
    name: "Wahyu Yanto",
    color: "#1a7aaa",
    location: "Yogyakarta, ID",
    trips: 15,
    mutual: 7,
    bio: "Weekend warrior & street food enthusiast 🍜",
    tags: ["Food", "Adventure", "City"],
    status: "active",
    lastSeen: "Online",
    sharedTrips: ["Canada Trip", "Bangkok Getaway"],
  },
  {
    id: 5,
    initials: "DR",
    name: "Dika Ramadhan",
    color: "#9333ea",
    location: "Medan, ID",
    trips: 3,
    mutual: 1,
    bio: "New to group travel, very enthusiastic 🎒",
    tags: ["City", "Culture"],
    status: "offline",
    lastSeen: "3 days ago",
    sharedTrips: [],
  },
  {
    id: 6,
    initials: "NP",
    name: "Nadia Putri",
    color: "#e11d6b",
    location: "Bali, ID",
    trips: 20,
    mutual: 4,
    bio: "Local guide & travel curator 🌴",
    tags: ["Beach", "Culture", "Nature"],
    status: "active",
    lastSeen: "Online",
    sharedTrips: [],
  },
];

const pendingInvites = [
  { initials: "MH", name: "Maya Hartono", color: "#16B364", trip: "Osaka Foodie", sentAt: "2 days ago" },
  { initials: "RS", name: "Rizky Saputra", color: "#6366f1", trip: "Canada Trip", sentAt: "5 days ago" },
];

const statusColors: Record<string, string> = {
  active: "#16B364",
  away: "#F5A623",
  offline: "#8A93A6",
};

export function DesktopBuddies() {
  const [search, setSearch] = useState("");
  const [accepted, setAccepted] = useState<Set<number>>(new Set());

  const filtered = buddies.filter(
    (b) =>
      !search ||
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.location.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto px-10 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-foreground mb-1" style={{ fontWeight: 800, fontSize: 30, letterSpacing: "-0.03em" }}>
            Travel <span className="text-primary">buddies</span>
          </h1>
          <p className="text-muted-foreground" style={{ fontSize: 14 }}>
            {buddies.length} friends · {buddies.filter((b) => b.status === "active").length} online now
          </p>
        </div>
        <button className="bg-primary text-white rounded-2xl px-5 py-2.5 flex items-center gap-2 hover:bg-[#13a058] transition-colors" style={{ fontSize: 14, fontWeight: 600 }}>
          <UserPlus className="w-4 h-4" /> Invite a buddy
        </button>
      </div>

      {/* Pending invites banner */}
      {pendingInvites.length > 0 && (
        <div className="bg-secondary border border-primary/20 rounded-2xl p-4 mb-6">
          <p className="text-secondary-foreground mb-3" style={{ fontWeight: 700, fontSize: 14 }}>
            Pending trip invites ({pendingInvites.length})
          </p>
          <div className="flex gap-3 flex-wrap">
            {pendingInvites.map((inv, i) => (
              <div key={i} className="bg-card border border-border rounded-xl px-4 py-2.5 flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0"
                  style={{ background: inv.color, fontSize: 11, fontWeight: 700 }}
                >
                  {inv.initials}
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#16213E" }}>{inv.name}</p>
                  <p className="text-muted-foreground" style={{ fontSize: 11 }}>invited to {inv.trip} · {inv.sentAt}</p>
                </div>
                <div className="flex gap-2 ml-2">
                  <button className="bg-primary text-white rounded-lg px-3 py-1.5 hover:bg-[#13a058] transition-colors" style={{ fontSize: 12, fontWeight: 600 }}>
                    Remind
                  </button>
                  <button className="bg-muted text-muted-foreground rounded-lg px-3 py-1.5 hover:bg-border transition-colors" style={{ fontSize: 12 }}>
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
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

      {/* Buddy grid */}
      <div className="grid grid-cols-2 gap-4">
        {filtered.map((buddy) => (
          <div
            key={buddy.id}
            className="bg-card border border-border rounded-2xl p-5 hover:border-primary/30 hover:shadow-sm transition-all"
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="relative shrink-0">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-white"
                  style={{ background: buddy.color, fontSize: 14, fontWeight: 800 }}
                >
                  {buddy.initials}
                </div>
                <div
                  className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white"
                  style={{ background: statusColors[buddy.status] }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-foreground" style={{ fontWeight: 700, fontSize: 15 }}>{buddy.name}</p>
                <p className="text-muted-foreground flex items-center gap-1" style={{ fontSize: 12 }}>
                  <MapPin className="w-3 h-3" /> {buddy.location}
                </p>
                <p className="text-muted-foreground" style={{ fontSize: 11 }}>{buddy.lastSeen}</p>
              </div>
              <button className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center hover:bg-secondary hover:text-primary transition-colors">
                <MessageCircle className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <p className="text-muted-foreground mb-3" style={{ fontSize: 13, lineHeight: 1.5 }}>{buddy.bio}</p>

            {/* Tags */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {buddy.tags.map((tag) => (
                <span key={tag} className="bg-secondary text-secondary-foreground rounded-full px-2.5 py-0.5" style={{ fontSize: 11, fontWeight: 600 }}>
                  {tag}
                </span>
              ))}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 border-t border-border pt-3 mb-3" style={{ fontSize: 12 }}>
              <span className="text-muted-foreground flex items-center gap-1">
                <Star className="w-3 h-3" style={{ color: "#FF8A4C" }} fill="#FF8A4C" /> {buddy.trips} trips
              </span>
              <span className="text-muted-foreground">{buddy.mutual} mutual</span>
              {buddy.sharedTrips.length > 0 && (
                <span className="text-primary flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {buddy.sharedTrips.length} shared
                </span>
              )}
            </div>

            {/* Shared trips */}
            {buddy.sharedTrips.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {buddy.sharedTrips.map((t) => (
                  <span key={t} className="bg-muted text-muted-foreground rounded-lg px-2 py-0.5" style={{ fontSize: 11 }}>
                    {t}
                  </span>
                ))}
              </div>
            )}

            {buddy.sharedTrips.length === 0 && (
              <button className="w-full border-2 border-dashed border-border rounded-xl py-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors" style={{ fontSize: 12, fontWeight: 500 }}>
                + Invite to a trip
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
