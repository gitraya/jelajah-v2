import { useState } from "react";
import {
  Sparkles, Map, Briefcase, Users, ArrowLeft, Send, MoreHorizontal,
  Pencil, Copy, ExternalLink, Check, ArrowRight
} from "lucide-react";

const avatarColors = ["#16B364", "#FF8A4C", "#0B6B3A", "#F5A623"];

// ─── Shared components ───────────────────────────────────────────────

function MobileFrame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 shrink-0">
      <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "#8A93A6" }}>
        {label}
      </p>
      <div
        style={{
          width: 300,
          height: 600,
          borderRadius: 38,
          border: "7px solid #16213E",
          boxShadow: "0 24px 64px rgba(22,33,62,0.22), 0 4px 16px rgba(0,0,0,0.10)",
          overflow: "hidden",
          background: "#F4F8F5",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function StatusBar() {
  return (
    <div className="flex items-center justify-between px-5 pt-3 pb-1">
      <span style={{ fontSize: 12, fontWeight: 700, color: "#16213E" }}>9:41</span>
      <span style={{ fontSize: 10, color: "#16213E" }}>●●●</span>
    </div>
  );
}

function MobileTabBar({ active }: { active: string }) {
  const tabs = [
    { id: "plan", label: "Plan", icon: Sparkles },
    { id: "explore", label: "Explore", icon: Map },
    { id: "trips", label: "Trips", icon: Briefcase },
    { id: "buddies", label: "Buddies", icon: Users },
  ];
  return (
    <div className="flex border-t border-border bg-card shrink-0">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button key={id} className="flex-1 flex flex-col items-center py-2 gap-0.5">
          <Icon
            className="w-4 h-4"
            style={{ color: active === id ? "#16B364" : "#8A93A6" }}
            strokeWidth={active === id ? 2.5 : 2}
          />
          <span style={{ fontSize: 9, fontWeight: active === id ? 700 : 500, color: active === id ? "#16B364" : "#8A93A6" }}>
            {label}
          </span>
        </button>
      ))}
    </div>
  );
}

// ─── Screen 1: Plan Home ─────────────────────────────────────────────

function PlanHomeScreen() {
  return (
    <MobileFrame label="Plan Home">
      <div className="flex flex-col h-full bg-background">
        <StatusBar />
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-primary flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span style={{ fontWeight: 800, fontSize: 15, color: "#16213E" }}>
              Jelajah<span style={{ color: "#16B364" }}>.</span>
            </span>
          </div>
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <span className="text-white" style={{ fontSize: 11, fontWeight: 700 }}>RA</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-3">
          <p className="text-muted-foreground mb-1" style={{ fontSize: 12 }}>Good evening, Raya</p>
          <h2 style={{ fontWeight: 800, fontSize: 23, letterSpacing: "-0.03em", lineHeight: 1.2, color: "#16213E", marginBottom: 14 }}>
            Where to <span style={{ color: "#16B364" }}>next?</span>
          </h2>
          {/* AI bar */}
          <div
            className="bg-card border border-border rounded-2xl flex items-center gap-2 px-3 py-3 mb-3"
            style={{ boxShadow: "0 3px 12px rgba(22,179,100,0.08)" }}
          >
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
            <span className="text-muted-foreground" style={{ fontSize: 12 }}>5 days Osaka, food, 4 friends…</span>
          </div>
          {/* Chips */}
          <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-none pb-1">
            {["🏖️ Beach", "🥾 Hiking", "💸 Budget"].map((c) => (
              <button
                key={c}
                className="bg-secondary text-secondary-foreground rounded-full px-3 py-1 whitespace-nowrap"
                style={{ fontSize: 11, fontWeight: 600, border: "none" }}
              >
                {c}
              </button>
            ))}
          </div>
          {/* Divider */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-muted-foreground" style={{ fontSize: 11 }}>or your way</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          {/* Path cards */}
          <div className="space-y-2 mb-4">
            {[
              { icon: Pencil, title: "Build step by step", sub: "Guided flow, no blank pages." },
              { icon: Copy, title: "Use a template", sub: "Copy & tweak from community." },
            ].map(({ icon: Icon, title, sub }) => (
              <div key={title} className="bg-card border border-border rounded-2xl px-3 py-3 flex items-center gap-3">
                <div className="w-8 h-8 bg-secondary rounded-xl flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 13, color: "#16213E" }}>{title}</p>
                  <p className="text-muted-foreground" style={{ fontSize: 11 }}>{sub}</p>
                </div>
              </div>
            ))}
          </div>
          {/* Continue planning */}
          <p style={{ fontWeight: 700, fontSize: 13, color: "#16213E", marginBottom: 8 }}>Continue planning</p>
          <div className="space-y-2">
            {[
              { flag: "🇨🇦", name: "Canada Trip", date: "24 Jul", progress: 72, img: "https://images.unsplash.com/photo-1517935706615-2717063c2225?w=400&h=200&fit=crop" },
              { flag: "🇯🇵", name: "Osaka Foodie", date: "12 Sep", progress: 45, img: "https://images.unsplash.com/photo-1659094438327-493ee9cc0c4c?w=400&h=200&fit=crop" },
            ].map((t) => (
              <div key={t.name} className="bg-card border border-border rounded-xl overflow-hidden flex items-center gap-3">
                <div className="relative w-14 h-14 shrink-0 bg-slate-300">
                  <img src={t.img} alt={t.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 py-2 pr-3 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span style={{ fontSize: 12 }}>{t.flag}</span>
                    <p style={{ fontSize: 12, fontWeight: 600, color: "#16213E" }}>{t.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${t.progress}%` }} />
                    </div>
                    <span className="text-muted-foreground" style={{ fontSize: 10 }}>{t.progress}%</span>
                  </div>
                  <p className="text-muted-foreground" style={{ fontSize: 10 }}>{t.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <MobileTabBar active="plan" />
      </div>
    </MobileFrame>
  );
}

// ─── Screen 2: AI Chat ───────────────────────────────────────────────

function AIChatScreen() {
  const [msgs, setMsgs] = useState([
    { role: "user" as const, text: "5 days Osaka, food, 4 friends, mid budget" },
    { role: "ai" as const, text: "Done! A 5-day Osaka food trip for 4 — about Rp 8.4M each. Here's day 1:" },
  ]);
  const [input, setInput] = useState("");

  const send = () => {
    if (!input.trim()) return;
    setMsgs((m) => [...m, { role: "user", text: input }]);
    setInput("");
    setTimeout(() => setMsgs((m) => [...m, { role: "ai", text: "Added! Budget stays around Rp 8.4M per person 🎉" }]), 1000);
  };

  return (
    <MobileFrame label="AI Builder">
      <div className="flex flex-col h-full bg-background">
        <StatusBar />
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card shrink-0">
          <button className="w-7 h-7 bg-muted rounded-xl flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </button>
          <div className="w-6 h-6 bg-primary rounded-lg flex items-center justify-center">
            <Sparkles className="w-3 h-3 text-white" />
          </div>
          <div className="flex-1">
            <p style={{ fontWeight: 700, fontSize: 13, color: "#16213E" }}>Jelajah AI</p>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span style={{ fontSize: 10, fontWeight: 500, color: "#16B364" }}>Building your trip</span>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {msgs.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className="max-w-[85%] rounded-2xl px-3 py-2"
                style={{
                  fontSize: 12,
                  lineHeight: 1.5,
                  background: msg.role === "user" ? "#16B364" : "#F4F8F5",
                  color: msg.role === "user" ? "#fff" : "#16213E",
                  borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                }}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {/* Mini itinerary cards */}
          <div className="space-y-1.5 ml-1">
            {[
              { icon: "🏨", name: "Cross Hotel Osaka", price: "Rp 2.8M", booking: true },
              { icon: "🍜", name: "Dotonbori crawl", price: "Rp 250K", booking: false },
            ].map((card) => (
              <div key={card.name} className="bg-card border border-border rounded-xl px-3 py-2 flex items-center gap-2">
                <span style={{ fontSize: 16 }}>{card.icon}</span>
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#16213E" }}>{card.name}</p>
                  {card.booking && (
                    <div className="inline-flex items-center gap-0.5 bg-secondary rounded-full px-1.5 py-0.5">
                      <ExternalLink className="w-2 h-2 text-secondary-foreground" />
                      <span style={{ fontSize: 9, fontWeight: 600, color: "#0B6B3A" }}>Booking link added</span>
                    </div>
                  )}
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#16213E" }}>{card.price}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="px-3 py-3 border-t border-border space-y-2 bg-card shrink-0">
          <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Add a beach day…"
              className="flex-1 bg-transparent outline-none text-foreground placeholder-muted-foreground"
              style={{ fontSize: 12 }}
            />
            <button onClick={send} className="w-6 h-6 bg-primary rounded-lg flex items-center justify-center">
              <Send className="w-3 h-3 text-white" />
            </button>
          </div>
          <button className="w-full bg-primary text-white rounded-2xl py-2.5 flex items-center justify-center gap-2" style={{ fontSize: 13, fontWeight: 700 }}>
            <Check className="w-4 h-4" /> Save this trip
          </button>
        </div>
      </div>
    </MobileFrame>
  );
}

// ─── Screen 3: Trip Overview ─────────────────────────────────────────

function TripOverviewScreen() {
  return (
    <MobileFrame label="Trip Overview">
      <div className="flex flex-col h-full bg-background">
        <StatusBar />
        <div className="flex items-center gap-3 px-3 py-2 shrink-0">
          <button className="w-7 h-7 bg-muted rounded-xl flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-foreground" />
          </button>
          <p className="flex-1 text-center" style={{ fontWeight: 700, fontSize: 15, color: "#16213E" }}>Canada Trip</p>
          <button className="w-7 h-7 bg-muted rounded-xl flex items-center justify-center">
            <MoreHorizontal className="w-4 h-4 text-foreground" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-3">
          {/* Cover */}
          <div className="relative rounded-2xl overflow-hidden h-40 mb-3 bg-[#1a3a5c]">
            <img
              src="https://images.unsplash.com/photo-1517935706615-2717063c2225?w=600&h=400&fit=crop&auto=format"
              alt="Toronto"
              className="w-full h-full object-cover opacity-85"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
            <div className="absolute top-3 left-3 bg-white/90 rounded-full px-2 py-1" style={{ fontSize: 11, fontWeight: 600, color: "#16213E" }}>
              🇨🇦 Canada
            </div>
            <div className="absolute bottom-3 left-3">
              <p className="text-white" style={{ fontWeight: 700, fontSize: 15 }}>7 days in Toronto</p>
              <p className="text-white/80" style={{ fontSize: 11 }}>24–30 Jul · 5 travelers</p>
            </div>
            <div className="absolute bottom-3 right-3 flex -space-x-1.5">
              {["RA","CY","VW"].map((m, i) => (
                <div key={m} className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center" style={{ background: avatarColors[i], fontSize: 8, fontWeight: 700, color: "#fff" }}>{m}</div>
              ))}
            </div>
          </div>
          {/* Stat tiles */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { label: "Ready", value: "72%", icon: "✅" },
              { label: "Spent", value: "Rp 1.2M", icon: "💳" },
              { label: "Stops", value: "5", icon: "📍" },
            ].map((s) => (
              <div key={s.label} className="bg-card border border-border rounded-xl p-2.5 text-center">
                <p style={{ fontSize: 15 }}>{s.icon}</p>
                <p style={{ fontWeight: 800, fontSize: 13, color: "#16213E" }}>{s.value}</p>
                <p className="text-muted-foreground" style={{ fontSize: 10 }}>{s.label}</p>
              </div>
            ))}
          </div>
          {/* Day pill */}
          <div className="inline-flex items-center bg-primary text-white rounded-full px-3 py-1.5 mb-3" style={{ fontSize: 12, fontWeight: 700 }}>
            Day 1 · Fri 24 Jul
          </div>
          {/* Itinerary */}
          <div className="space-y-2">
            {[
              { icon: "🍶", name: "Kinka Izakaya", type: "Dinner", price: "Rp 80K", free: false, linked: false },
              { icon: "🏙️", name: "Nathan Phillips Sq", type: "Walk", price: "Free", free: true, linked: false },
              { icon: "🗼", name: "CN Tower", type: "Tickets linked", price: "Rp 220K", free: false, linked: true },
              { icon: "🛍️", name: "Kensington Market", type: "Shopping", price: "Rp 150K", free: false, linked: false },
            ].map((item) => (
              <div key={item.name} className="bg-card border border-border rounded-xl px-3 py-2.5 flex items-center gap-2">
                <span style={{ fontSize: 17 }}>{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#16213E" }}>{item.name}</p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground" style={{ fontSize: 10 }}>{item.type}</span>
                    {item.linked && (
                      <div className="inline-flex items-center gap-0.5 bg-secondary rounded-full px-1.5 py-0.5">
                        <ExternalLink className="w-2 h-2 text-secondary-foreground" />
                        <span style={{ fontSize: 9, fontWeight: 600, color: "#0B6B3A" }}>Linked</span>
                      </div>
                    )}
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: item.free ? "#16B364" : "#16213E" }}>
                  {item.price}
                </span>
              </div>
            ))}
          </div>
        </div>
        <MobileTabBar active="trips" />
      </div>
    </MobileFrame>
  );
}

// ─── Screen 4: Onboarding ────────────────────────────────────────────

const onboardingSlides = [
  {
    headline: "Your journey,", highlight: "perfectly planned.", emoji: "🗺️",
    bg: "#E6F7EE", accent: "#16B364",
    img: "https://images.unsplash.com/photo-1659094438327-493ee9cc0c4c?w=600&h=400&fit=crop&auto=format",
  },
  {
    headline: "Plan with AI,", highlight: "or your own way.", emoji: "✨",
    bg: "#FFF4EE", accent: "#FF8A4C",
    img: "https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=600&h=400&fit=crop&auto=format",
  },
  {
    headline: "Travel together", highlight: "with friends.", emoji: "🤝",
    bg: "#EEF3FF", accent: "#6366f1",
    img: "https://images.unsplash.com/photo-1506869640319-fe1a24fd76dc?w=600&h=400&fit=crop&auto=format",
  },
];

function OnboardingScreen() {
  const [current, setCurrent] = useState(0);
  const slide = onboardingSlides[current];

  const next = () => setCurrent((c) => (c + 1) % onboardingSlides.length);

  return (
    <MobileFrame label="Onboarding">
      <div className="flex flex-col h-full" style={{ background: slide.bg, transition: "background 0.4s" }}>
        <StatusBar />
        <div className="flex justify-end px-4 pt-1">
          <button onClick={() => setCurrent(0)} style={{ fontSize: 12, fontWeight: 500, color: "#8A93A6" }}>
            Skip
          </button>
        </div>
        {/* Illustration */}
        <div className="mx-4 mt-2 rounded-2xl overflow-hidden h-44 relative bg-white/40">
          <img src={slide.img} alt={slide.headline} className="w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-white/85 backdrop-blur-sm flex items-center justify-center" style={{ fontSize: 32 }}>
              {slide.emoji}
            </div>
          </div>
        </div>
        {/* Text */}
        <div className="flex-1 px-5 pt-5">
          <div style={{ fontWeight: 800, fontSize: 25, letterSpacing: "-0.03em", lineHeight: 1.15, color: "#16213E" }}>
            {slide.headline}
          </div>
          <div style={{ fontWeight: 800, fontSize: 25, letterSpacing: "-0.03em", lineHeight: 1.15, color: slide.accent }}>
            {slide.highlight}
          </div>
        </div>
        {/* Dots + CTA */}
        <div className="px-5 pb-7 space-y-4">
          <div className="flex items-center gap-2">
            {onboardingSlides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                style={{
                  height: 8,
                  width: i === current ? 24 : 8,
                  borderRadius: 999,
                  background: i === current ? "#16B364" : "#E7ECF4",
                  transition: "all 0.3s",
                  padding: 0,
                  border: "none",
                  cursor: "pointer",
                }}
              />
            ))}
          </div>
          <button
            onClick={next}
            className="w-full flex items-center justify-center gap-2 text-white rounded-2xl py-3.5"
            style={{ background: "#16B364", fontSize: 14, fontWeight: 700 }}
          >
            {current === onboardingSlides.length - 1 ? "Get started" : "Next"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </MobileFrame>
  );
}

// ─── Main export ─────────────────────────────────────────────────────

export function MobileScreens() {
  return (
    <div className="w-full h-full overflow-auto bg-background">
      <div className="flex gap-6 items-start justify-start px-8 py-8 min-w-max">
        <PlanHomeScreen />
        <AIChatScreen />
        <TripOverviewScreen />
        <OnboardingScreen />
      </div>
    </div>
  );
}
