import { useEffect, useMemo, useState } from "react";
import { Sparkles, Pencil, Copy, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router";

import { TripFormModal } from "@/components/modals/TripFormModal";
import { useAuth } from "@/contexts/AuthContext";
import { useTrips } from "@/contexts/TripsContext";
import { coverImage, formatRp, tripBucket } from "@/lib/adapters";

interface Props {
  onPlanIt: (query: string) => void;
}

const suggestions = [
  { label: "Weekend beach escape", icon: "🏖️" },
  { label: "Hiking in Bali", icon: "🥾" },
  { label: "Culture trip Japan", icon: "🏯" },
  { label: "Budget Southeast Asia", icon: "✈️" },
];

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
};

export function DesktopPlanHome({ onPlanIt }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    myTrips,
    fetchMyTrips,
    tripsStatistics,
    fetchTripsStatistics,
    createTrip,
  } = useTrips();
  const [query, setQuery] = useState("");
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    fetchMyTrips();
    fetchTripsStatistics();
  }, [fetchMyTrips, fetchTripsStatistics]);

  // "Continue planning" surfaces the trips that aren't finished yet.
  const activeTrips = useMemo(
    () => (myTrips || []).filter((t: any) => tripBucket(t) !== "past").slice(0, 3),
    [myTrips]
  );

  const handleSubmit = () => {
    const q = query.trim() || "5 days in Osaka with my 3 friends, food-focused, mid budget";
    onPlanIt(q);
  };

  const mine = tripsStatistics?.my_trips || {};

  return (
    <div className="flex-1 overflow-y-auto px-10 py-8">
      {/* Greeting */}
      <p className="text-muted-foreground mb-2" style={{ fontSize: 14, fontWeight: 500 }}>
        {greeting()}
        {user?.first_name ? `, ${user.first_name}` : ""}
      </p>

      {/* Headline */}
      <h1 className="text-foreground mb-6" style={{ fontWeight: 800, fontSize: 38, letterSpacing: "-0.03em", lineHeight: 1.2 }}>
        Where do you want to go{" "}
        <span className="text-primary">next?</span>
      </h1>

      {/* AI Prompt bar */}
      <div
        className="bg-card rounded-[18px] flex items-center gap-3 px-5 py-4 mb-4"
        style={{ boxShadow: "0 4px 20px rgba(22,179,100,0.10)", border: "1px solid #E7ECF4" }}
      >
        <Sparkles className="w-5 h-5 text-primary shrink-0" strokeWidth={2} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="5 days in Osaka with my 3 friends, food-focused, mid budget…"
          className="flex-1 bg-transparent border-none outline-none text-foreground placeholder-muted-foreground"
          style={{ fontSize: 15, fontWeight: 400 }}
        />
        <button
          onClick={handleSubmit}
          className="bg-primary text-white rounded-xl px-5 py-2 flex items-center gap-2 hover:bg-[#13a058] transition-colors shrink-0"
          style={{ fontSize: 14, fontWeight: 600 }}
        >
          Plan it <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Suggestion chips */}
      <div className="flex flex-wrap gap-2 mb-7">
        {suggestions.map((s) => (
          <button
            key={s.label}
            onClick={() => { setQuery(s.label); }}
            className="flex items-center gap-1.5 bg-card border border-border rounded-full px-3.5 py-1.5 hover:border-primary hover:bg-secondary transition-all"
            style={{ fontSize: 13, fontWeight: 500, color: "#16213E" }}
          >
            <span>{s.icon}</span>
            {s.label}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 h-px bg-border" />
        <span className="text-muted-foreground shrink-0" style={{ fontSize: 13 }}>or start your own way</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Path cards */}
      <div className="grid grid-cols-2 gap-4 mb-9">
        <div
          onClick={() => setFormOpen(true)}
          className="bg-card border border-border rounded-2xl p-5 hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center mb-3">
            <Pencil className="w-5 h-5 text-primary" strokeWidth={2} />
          </div>
          <p className="text-foreground mb-1" style={{ fontWeight: 700, fontSize: 15 }}>Build it step by step</p>
          <p className="text-muted-foreground" style={{ fontSize: 13, lineHeight: 1.5 }}>
            A light guided flow — pick dates, add stops, invite friends. No blank pages.
          </p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group">
          <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center mb-3">
            <Copy className="w-5 h-5 text-primary" strokeWidth={2} />
          </div>
          <p className="text-foreground mb-1" style={{ fontWeight: 700, fontSize: 15 }}>Start from a template</p>
          <p className="text-muted-foreground" style={{ fontSize: 13, lineHeight: 1.5 }}>
            Copy a ready-made itinerary from the community and tweak it.
          </p>
        </div>
      </div>

      {/* Your numbers, from /trips/statistics/ */}
      <div className="grid grid-cols-4 gap-4 mb-9">
        {[
          { label: "Your trips", value: mine.total ?? 0 },
          { label: "Ongoing", value: mine.ongoing ?? 0 },
          { label: "Upcoming", value: mine.upcoming ?? 0 },
          { label: "Planned budget", value: formatRp(mine.total_budget ?? 0) },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-2xl p-4">
            <p className="text-muted-foreground mb-1" style={{ fontSize: 12 }}>
              {s.label}
            </p>
            <p
              className="text-foreground"
              style={{ fontWeight: 800, fontSize: 20, letterSpacing: "-0.03em" }}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Continue planning */}
      <div>
        <p className="text-foreground mb-4" style={{ fontWeight: 700, fontSize: 17 }}>Continue planning</p>
        {activeTrips.length === 0 ? (
          <p className="text-muted-foreground" style={{ fontSize: 14 }}>
            No trips in progress yet — start one above.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {activeTrips.map((trip: any) => {
              const budget = Number(trip.budget || 0);
              const spent = Number(trip.spent_budget || 0);
              const progress =
                budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
              return (
                <div
                  key={trip.id}
                  onClick={() => navigate(`/trips/${trip.id}`)}
                  className="bg-card rounded-2xl overflow-hidden border border-border hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="relative h-40 overflow-hidden bg-slate-200">
                    <img
                      src={coverImage(trip)}
                      alt={trip.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1" style={{ fontSize: 11, fontWeight: 600, color: "#16213E" }}>
                      <span>🧭</span>
                      {trip.destination}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                      <div className="h-full bg-white rounded-full" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-foreground truncate" style={{ fontWeight: 600, fontSize: 14 }}>{trip.title}</p>
                    <p className="text-muted-foreground" style={{ fontSize: 12 }}>
                      {trip.dates} · {progress}% of budget
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <TripFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        onSave={async (payload) => {
          const trip = await createTrip(payload);
          navigate(`/trips/${trip.id}`);
          return trip;
        }}
      />
    </div>
  );
}
