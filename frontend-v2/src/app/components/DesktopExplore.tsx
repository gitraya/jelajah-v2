import { useState } from "react";
import { Search, Star, MapPin, Users, Clock, Bookmark, ExternalLink } from "lucide-react";

const categories = ["All", "Beach", "City", "Nature", "Food", "Culture", "Adventure"];

const destinations = [
  {
    id: 1,
    name: "Ubud, Bali",
    country: "🇮🇩 Indonesia",
    img: "https://images.unsplash.com/photo-1555400038-63f5ba517a47?w=600&h=400&fit=crop&auto=format",
    tag: "Nature",
    rating: 4.9,
    reviews: 2840,
    duration: "4–7 days",
    budget: "Rp 3–5M",
    badge: "Trending",
    badgeColor: "#FF8A4C",
  },
  {
    id: 2,
    name: "Singapore",
    country: "🇸🇬 Singapore",
    img: "https://images.unsplash.com/photo-1595290429614-88ba93221dba?w=600&h=400&fit=crop&auto=format",
    tag: "City",
    rating: 4.8,
    reviews: 5120,
    duration: "3–5 days",
    budget: "Rp 8–12M",
    badge: "Popular",
    badgeColor: "#16B364",
  },
  {
    id: 3,
    name: "Osaka, Japan",
    country: "🇯🇵 Japan",
    img: "https://images.unsplash.com/photo-1659094438327-493ee9cc0c4c?w=600&h=400&fit=crop&auto=format",
    tag: "Food",
    rating: 4.9,
    reviews: 6780,
    duration: "5–7 days",
    budget: "Rp 6–10M",
    badge: "Editor's Pick",
    badgeColor: "#16B364",
  },
  {
    id: 4,
    name: "Bangkok",
    country: "🇹🇭 Thailand",
    img: "https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=600&h=400&fit=crop&auto=format",
    tag: "Culture",
    rating: 4.7,
    reviews: 4350,
    duration: "4–6 days",
    budget: "Rp 3–6M",
    badge: null,
    badgeColor: null,
  },
  {
    id: 5,
    name: "Kuala Lumpur",
    country: "🇲🇾 Malaysia",
    img: "https://images.unsplash.com/photo-1470217957101-da7150b9b681?w=600&h=400&fit=crop&auto=format",
    tag: "City",
    rating: 4.6,
    reviews: 3210,
    duration: "3–5 days",
    budget: "Rp 3–5M",
    badge: null,
    badgeColor: null,
  },
  {
    id: 6,
    name: "Sapa, Vietnam",
    country: "🇻🇳 Vietnam",
    img: "https://images.unsplash.com/photo-1558005530-a7958896ec60?w=600&h=400&fit=crop&auto=format",
    tag: "Nature",
    rating: 4.8,
    reviews: 1940,
    duration: "3–4 days",
    budget: "Rp 2–4M",
    badge: "New",
    badgeColor: "#FF8A4C",
  },
];

const communityTrips = [
  {
    id: 1,
    title: "Tokyo on a shoestring",
    author: "Marco V.",
    avatar: "MV",
    avatarColor: "#16B364",
    days: 6,
    budget: "Rp 4.2M",
    stops: 18,
    saves: 342,
    flag: "🇯🇵",
  },
  {
    id: 2,
    title: "Bali wellness retreat",
    author: "Siti R.",
    avatar: "SR",
    avatarColor: "#FF8A4C",
    days: 7,
    budget: "Rp 6.5M",
    stops: 12,
    saves: 278,
    flag: "🇮🇩",
  },
  {
    id: 3,
    title: "SEA backpacking circuit",
    author: "James K.",
    avatar: "JK",
    avatarColor: "#0B6B3A",
    days: 21,
    budget: "Rp 9.8M",
    stops: 34,
    saves: 891,
    flag: "🌏",
  },
];

export function DesktopExplore() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const toggleSave = (id: number) => {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = destinations.filter((d) => {
    const matchesCategory = activeCategory === "All" || d.tag === activeCategory;
    const matchesSearch =
      !searchQuery ||
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.country.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex-1 overflow-y-auto px-10 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-foreground mb-1" style={{ fontWeight: 800, fontSize: 30, letterSpacing: "-0.03em" }}>
            Explore <span className="text-primary">destinations</span>
          </h1>
          <p className="text-muted-foreground" style={{ fontSize: 14 }}>
            Browse community itineraries and popular spots across Southeast Asia
          </p>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative mb-5">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search destinations…"
          className="w-full bg-card border border-border rounded-2xl pl-11 pr-4 py-3 text-foreground placeholder-muted-foreground outline-none focus:border-primary transition-colors"
          style={{ fontSize: 14 }}
        />
      </div>

      {/* Category chips */}
      <div className="flex gap-2 flex-wrap mb-7">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setActiveCategory(c)}
            className={`px-4 py-1.5 rounded-full border transition-all ${
              activeCategory === c
                ? "bg-primary text-white border-primary"
                : "bg-card border-border text-foreground hover:border-primary/50"
            }`}
            style={{ fontSize: 13, fontWeight: 500 }}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Destination grid */}
      <div className="grid grid-cols-3 gap-5 mb-10">
        {filtered.map((dest) => (
          <div
            key={dest.id}
            className="bg-card rounded-2xl overflow-hidden border border-border hover:shadow-md hover:border-primary/20 transition-all group cursor-pointer"
          >
            <div className="relative h-44 overflow-hidden bg-slate-200">
              <img
                src={dest.img}
                alt={dest.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              {/* Badges */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5">
                {dest.badge && (
                  <span
                    className="text-white rounded-full px-2.5 py-1"
                    style={{ fontSize: 10, fontWeight: 700, background: dest.badgeColor! }}
                  >
                    {dest.badge}
                  </span>
                )}
              </div>
              {/* Save button */}
              <button
                onClick={(e) => { e.stopPropagation(); toggleSave(dest.id); }}
                className="absolute top-3 right-3 w-8 h-8 rounded-xl bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors"
              >
                <Bookmark
                  className="w-4 h-4"
                  style={{ color: savedIds.has(dest.id) ? "#16B364" : "#8A93A6" }}
                  fill={savedIds.has(dest.id) ? "#16B364" : "none"}
                  strokeWidth={2}
                />
              </button>
              {/* Tag */}
              <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1" style={{ fontSize: 10, fontWeight: 600, color: "#16213E" }}>
                {dest.country}
              </div>
            </div>

            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-foreground" style={{ fontWeight: 700, fontSize: 15 }}>{dest.name}</h3>
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5" style={{ color: "#FF8A4C" }} fill="#FF8A4C" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#16213E" }}>{dest.rating}</span>
                </div>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground mb-3" style={{ fontSize: 12 }}>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{dest.duration}</span>
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{dest.tag}</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-muted-foreground" style={{ fontSize: 11 }}>Budget est. </span>
                  <span className="text-foreground" style={{ fontSize: 13, fontWeight: 700 }}>{dest.budget}</span>
                  <span className="text-muted-foreground" style={{ fontSize: 11 }}>/person</span>
                </div>
                <span className="text-muted-foreground" style={{ fontSize: 11 }}>{dest.reviews.toLocaleString()} reviews</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Community trips */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <p className="text-foreground" style={{ fontWeight: 700, fontSize: 17 }}>Community itineraries</p>
          <button className="text-primary flex items-center gap-1" style={{ fontSize: 13, fontWeight: 600 }}>
            View all <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-4">
          {communityTrips.map((trip) => (
            <div key={trip.id} className="bg-card border border-border rounded-2xl p-4 hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0"
                  style={{ background: trip.avatarColor, fontSize: 11, fontWeight: 700 }}
                >
                  {trip.avatar}
                </div>
                <div>
                  <p className="text-foreground" style={{ fontSize: 13, fontWeight: 600 }}>{trip.title}</p>
                  <p className="text-muted-foreground" style={{ fontSize: 11 }}>by {trip.author}</p>
                </div>
                <span className="ml-auto text-xl">{trip.flag}</span>
              </div>
              <div className="flex items-center gap-4 text-muted-foreground border-t border-border pt-3" style={{ fontSize: 12 }}>
                <span>{trip.days} days</span>
                <span className="text-foreground" style={{ fontWeight: 600 }}>{trip.budget}</span>
                <span className="ml-auto flex items-center gap-1">
                  <Bookmark className="w-3 h-3" /> {trip.saves}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
