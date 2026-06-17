import { useEffect, useMemo, useState } from "react";
import { Search, MapPin, Users, Clock, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router";

import { useTrips } from "@/contexts/TripsContext";
import { tripToDestination } from "@/lib/adapters";
import { getTripDifficultyColor } from "@/lib/colors";
import { ImageWithFallback } from "./figma/ImageWithFallback";

const categories = ["All", "Easy", "Moderate", "Challenging"];

export function DesktopExplore() {
  const navigate = useNavigate();
  const { publicTrips, fetchPublicTrips } = useTrips();
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetchPublicTrips().finally(() => setIsLoading(false));
  }, [fetchPublicTrips]);

  const destinations = useMemo(
    () => (publicTrips || []).map(tripToDestination),
    [publicTrips]
  );

  const filtered = destinations.filter((d: any) => {
    const matchesCategory =
      activeCategory === "All" || d.tag === activeCategory;
    const matchesSearch =
      !searchQuery ||
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.country || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex-1 overflow-y-auto px-10 py-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1
            className="text-foreground mb-1"
            style={{ fontWeight: 800, fontSize: 30, letterSpacing: "-0.03em" }}
          >
            Explore <span className="text-primary">trips</span>
          </h1>
          <p className="text-muted-foreground" style={{ fontSize: 14 }}>
            Browse public trips shared by the community
          </p>
        </div>
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search trips…"
          className="w-full bg-card border border-border rounded-2xl pl-11 pr-4 py-3 text-foreground placeholder-muted-foreground outline-none focus:border-primary transition-colors"
          style={{ fontSize: 14 }}
        />
      </div>

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

      {isLoading ? (
        <p className="text-muted-foreground" style={{ fontSize: 14 }}>
          Loading trips…
        </p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mb-4 text-3xl">
            🌏
          </div>
          <p
            className="text-foreground mb-2"
            style={{ fontWeight: 700, fontSize: 18 }}
          >
            No public trips found
          </p>
          <p className="text-muted-foreground" style={{ fontSize: 14 }}>
            Try a different search or category
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-5 mb-10">
          {filtered.map((dest: any) => (
            <div
              key={dest.id}
              onClick={() => navigate(`/trips/${dest.id}`)}
              className="bg-card rounded-2xl overflow-hidden border border-border hover:shadow-md hover:border-primary/20 transition-all group cursor-pointer"
            >
              <div className="relative h-44 overflow-hidden bg-slate-200">
                <ImageWithFallback
                  src={dest.img}
                  alt={dest.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div
                  className="absolute top-3 left-3 rounded-full px-2.5 py-1"
                  style={{ fontSize: 10, fontWeight: 700 }}
                >
                  <span
                    className={`rounded-full px-2 py-0.5 ${getTripDifficultyColor(
                      dest.raw.difficulty
                    )}`}
                  >
                    {dest.tag}
                  </span>
                </div>
                <div
                  className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1"
                  style={{ fontSize: 10, fontWeight: 600, color: "#16213E" }}
                >
                  {dest.country}
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3
                    className="text-foreground"
                    style={{ fontWeight: 700, fontSize: 15 }}
                  >
                    {dest.name}
                  </h3>
                </div>
                <div
                  className="flex items-center gap-3 text-muted-foreground mb-3"
                  style={{ fontSize: 12 }}
                >
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {dest.duration}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {dest.members}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {dest.country}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span
                      className="text-muted-foreground"
                      style={{ fontSize: 11 }}
                    >
                      Budget{" "}
                    </span>
                    <span
                      className="text-foreground"
                      style={{ fontSize: 13, fontWeight: 700 }}
                    >
                      {dest.budget}
                    </span>
                  </div>
                  <span className="text-primary flex items-center gap-1" style={{ fontSize: 12, fontWeight: 600 }}>
                    View <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
