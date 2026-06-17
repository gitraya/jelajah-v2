import { useState } from "react";
import { Sparkles, Pencil, Copy, ArrowRight } from "lucide-react";

interface Props {
  onPlanIt: (query: string) => void;
}

const suggestions = [
  { label: "Weekend beach escape", icon: "🏖️" },
  { label: "Hiking in Bali", icon: "🥾" },
  { label: "Culture trip Japan", icon: "🏯" },
  { label: "Budget Southeast Asia", icon: "✈️" },
];

const tripCards = [
  {
    id: "canada",
    name: "Canada Trip",
    flag: "🇨🇦",
    date: "24 Jul",
    progress: 72,
    img: "https://images.unsplash.com/photo-1517935706615-2717063c2225?w=600&h=400&fit=crop&auto=format",
    color: "#1a6b8a",
  },
  {
    id: "osaka",
    name: "Osaka Foodie",
    flag: "🇯🇵",
    date: "12 Sep",
    progress: 45,
    img: "https://images.unsplash.com/photo-1659094438327-493ee9cc0c4c?w=600&h=400&fit=crop&auto=format",
    color: "#8b3a4a",
  },
  {
    id: "bangkok",
    name: "Bangkok Trip",
    flag: "🇹🇭",
    date: "5 Oct",
    progress: 20,
    img: "https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=600&h=400&fit=crop&auto=format",
    color: "#7b5e1a",
  },
];

export function DesktopPlanHome({ onPlanIt }: Props) {
  const [query, setQuery] = useState("");

  const handleSubmit = () => {
    const q = query.trim() || "5 days in Osaka with my 3 friends, food-focused, mid budget";
    onPlanIt(q);
  };

  return (
    <div className="flex-1 overflow-y-auto px-10 py-8">
      {/* Greeting */}
      <p className="text-muted-foreground mb-2" style={{ fontSize: 14, fontWeight: 500 }}>Good evening, Raya</p>

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
        <div className="bg-card border border-border rounded-2xl p-5 hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group">
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

      {/* Continue planning */}
      <div>
        <p className="text-foreground mb-4" style={{ fontWeight: 700, fontSize: 17 }}>Continue planning</p>
        <div className="grid grid-cols-3 gap-4">
          {tripCards.map((trip) => (
            <div key={trip.id} className="bg-card rounded-2xl overflow-hidden border border-border hover:shadow-md transition-all cursor-pointer group">
              <div className="relative h-40 overflow-hidden" style={{ background: trip.color }}>
                <img
                  src={trip.img}
                  alt={trip.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {/* Flag pill */}
                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1" style={{ fontSize: 11, fontWeight: 600, color: "#16213E" }}>
                  <span>{trip.flag}</span>
                  {trip.name.split(" ")[0]}
                </div>
                {/* Progress bar */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
                  <div className="h-full bg-white rounded-full" style={{ width: `${trip.progress}%` }} />
                </div>
              </div>
              <div className="p-3">
                <p className="text-foreground" style={{ fontWeight: 600, fontSize: 14 }}>{trip.name}</p>
                <p className="text-muted-foreground" style={{ fontSize: 12 }}>{trip.date} · {trip.progress}% ready</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
