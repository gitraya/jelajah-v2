import { useState, useEffect } from "react";
import { Sparkles, Send, Plus, ExternalLink, Check, Pencil } from "lucide-react";

interface Props {
  initialQuery: string;
  onSave: () => void;
}

const avatarColors = ["#16B364", "#FF8A4C", "#0B6B3A", "#F5A623", "#1a7aaa"];
const members = ["RA", "CY", "VW", "SF"];

const days = [
  {
    num: 1,
    title: "Arrival & Dotonbori",
    date: "Fri 12 Sep",
    stops: [
      { time: "14:00", icon: "🏨", name: "Check-in – Cross Hotel Osaka", meta: "Near Dotonbori · 2 nights", price: "Rp 2.800.000", booking: true, type: "hotel" },
      { time: "18:00", icon: "🍜", name: "Ichiran Ramen Dotonbori", meta: "Solo booth ramen · must try", price: "Rp 120.000", booking: false, type: "food" },
      { time: "20:00", icon: "🚶", name: "Dotonbori canal walk", meta: "Glico man + street snacks", price: "Free", booking: false, type: "walk" },
    ],
  },
  {
    num: 2,
    title: "Kuromon Market & Namba",
    date: "Sat 13 Sep",
    stops: [
      { time: "09:00", icon: "🛒", name: "Kuromon Ichiba Market", meta: "Fresh seafood & local produce", price: "Rp 200.000", booking: false, type: "food" },
      { time: "12:00", icon: "🍣", name: "Hariju Wagyu lunch", meta: "Legendary wagyu beef", price: "Rp 850.000", booking: true, type: "food" },
      { time: "15:00", icon: "🏯", name: "Osaka Castle", meta: "Historic landmark · 45 min walk", price: "Rp 85.000", booking: true, type: "landmark" },
      { time: "19:30", icon: "🍻", name: "Namba craft beer crawl", meta: "3 local bars · guided", price: "Rp 350.000", booking: true, type: "activity" },
    ],
  },
  {
    num: 3,
    title: "Shinsekai & Street Snacks",
    date: "Sun 14 Sep",
    stops: [
      { time: "10:00", icon: "🦀", name: "Tsuruhashi Korean Town", meta: "Yakiniku & tteokbokki", price: "Rp 180.000", booking: false, type: "food" },
      { time: "13:00", icon: "🐡", name: "Fugu at Zuboraya", meta: "Pufferfish — famous Shinsekai spot", price: "Rp 420.000", booking: true, type: "food" },
      { time: "16:00", icon: "🎠", name: "Shinsekai sightseeing", meta: "Tsutenkaku Tower area", price: "Rp 65.000", booking: false, type: "landmark" },
    ],
  },
];

interface ChatMsg {
  role: "user" | "ai";
  text: string;
}

export function DesktopAIBuilder({ initialQuery, onSave }: Props) {
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: "user", text: initialQuery },
    { role: "ai", text: "Nice! I put together a 5-day Osaka food trip for 4 people 🍜 Here's the full itinerary — every stop has a time, price in IDR, and booking links where available." },
    { role: "ai", text: "Total comes to about Rp 8.4M per person (Rp 33.6M group total). Want me to find hotels near Dotonbori or adjust day 3 to be more relaxed?" },
  ]);
  const [thinking, setThinking] = useState(false);
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((m) => [...m, { role: "user", text: userMsg }]);
    setThinking(true);
    setTimeout(() => {
      setThinking(false);
      setMessages((m) => [
        ...m,
        { role: "ai", text: "Got it! I've updated day 3 to include more leisurely stops with extra downtime. The budget stays around Rp 8.4M per person." },
      ]);
    }, 1800);
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left chat panel */}
      <div className="w-[300px] shrink-0 bg-card border-r border-border flex flex-col h-full">
        {/* Chat header */}
        <div className="px-5 py-4 border-b border-border flex items-center gap-3">
          <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-white" strokeWidth={2} />
          </div>
          <div>
            <p className="text-foreground" style={{ fontWeight: 700, fontSize: 14 }}>Jelajah AI</p>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-primary" style={{ fontSize: 11, fontWeight: 500 }}>Building your trip</span>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "ai" && (
                <div className="w-6 h-6 bg-secondary rounded-lg flex items-center justify-center mr-2 mt-0.5 shrink-0">
                  <Sparkles className="w-3 h-3 text-primary" strokeWidth={2} />
                </div>
              )}
              <div
                className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 ${
                  msg.role === "user"
                    ? "bg-secondary text-secondary-foreground rounded-tr-sm"
                    : "bg-muted text-foreground rounded-tl-sm"
                }`}
                style={{ fontSize: 13, lineHeight: 1.5 }}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {thinking && (
            <div className="flex items-center gap-2 px-1">
              <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
              <span className="text-muted-foreground" style={{ fontSize: 11 }}>Finding options…</span>
            </div>
          )}
        </div>

        {/* Chat input */}
        <div className="px-4 py-3 border-t border-border">
          <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Make day 3 more relaxed…"
              className="flex-1 bg-transparent border-none outline-none text-foreground placeholder-muted-foreground"
              style={{ fontSize: 13 }}
            />
            <button
              onClick={handleSend}
              className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center hover:bg-[#13a058] transition-colors"
            >
              <Send className="w-3.5 h-3.5 text-white" strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>

      {/* Right canvas */}
      <div className="flex-1 overflow-y-auto">
        {/* Canvas header */}
        <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border px-8 py-4 flex items-center justify-between z-10">
          <div>
            <p className="text-foreground" style={{ fontWeight: 800, fontSize: 20, letterSpacing: "-0.02em" }}>
              Osaka Foodie 🇯🇵
            </p>
            <p className="text-muted-foreground" style={{ fontSize: 13 }}>
              12–16 Sep 2026 · 4 travelers · draft by AI
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Member avatars */}
            <div className="flex -space-x-2 mr-2">
              {members.map((m, i) => (
                <div
                  key={m}
                  className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center"
                  style={{ background: avatarColors[i], fontSize: 10, fontWeight: 700, color: "#fff" }}
                >
                  {m}
                </div>
              ))}
            </div>
            <button className="border border-border bg-card text-foreground rounded-xl px-4 py-2 hover:bg-muted transition-colors flex items-center gap-1.5" style={{ fontSize: 13, fontWeight: 500 }}>
              <Pencil className="w-3.5 h-3.5" />
              Edit manually
            </button>
            <button
              onClick={onSave}
              className="bg-primary text-white rounded-xl px-4 py-2 hover:bg-[#13a058] transition-colors flex items-center gap-1.5"
              style={{ fontSize: 13, fontWeight: 600 }}
            >
              <Check className="w-3.5 h-3.5" />
              Save trip
            </button>
          </div>
        </div>

        {/* Summary strip */}
        <div className="mx-8 mt-6 bg-secondary rounded-2xl px-6 py-4 grid grid-cols-4 gap-4">
          {[
            { label: "Days", value: "5" },
            { label: "Stops", value: "14" },
            { label: "Per person", value: "Rp 8.4M" },
            { label: "Group total", value: "Rp 33.6M" },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-secondary-foreground" style={{ fontWeight: 800, fontSize: 22, letterSpacing: "-0.03em" }}>{s.value}</p>
              <p className="text-secondary-foreground/70" style={{ fontSize: 12, fontWeight: 500 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Itinerary */}
        <div className="px-8 py-6 space-y-7">
          {days.map((day) => (
            <div key={day.num}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shrink-0">
                  <span className="text-white" style={{ fontWeight: 800, fontSize: 14 }}>{day.num}</span>
                </div>
                <div>
                  <p className="text-foreground" style={{ fontWeight: 700, fontSize: 15 }}>{day.title}</p>
                  <p className="text-muted-foreground" style={{ fontSize: 12 }}>{day.date}</p>
                </div>
              </div>
              <div className="space-y-2 ml-11">
                {day.stops.map((stop, i) => (
                  <div key={i} className="bg-card border border-border rounded-xl px-4 py-3 flex items-start gap-3 hover:border-primary/30 transition-colors">
                    <span className="text-primary shrink-0 mt-0.5" style={{ fontSize: 13, fontWeight: 600, minWidth: 44 }}>{stop.time}</span>
                    <span className="text-lg shrink-0">{stop.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground" style={{ fontWeight: 600, fontSize: 14 }}>{stop.name}</p>
                      <p className="text-muted-foreground" style={{ fontSize: 12 }}>{stop.meta}</p>
                      {stop.booking && (
                        <div className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 mt-1">
                          <ExternalLink className="w-2.5 h-2.5" />
                          <span style={{ fontSize: 10, fontWeight: 600 }}>Booking link added</span>
                        </div>
                      )}
                    </div>
                    <span
                      className={stop.price === "Free" ? "text-primary" : "text-foreground"}
                      style={{ fontWeight: 700, fontSize: 13, whiteSpace: "nowrap" }}
                    >
                      {stop.price}
                    </span>
                  </div>
                ))}
                {/* Add stop */}
                <button className="w-full border-2 border-dashed border-border rounded-xl py-2.5 text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1.5" style={{ fontSize: 13 }}>
                  <Plus className="w-4 h-4" />
                  Add a stop to day {day.num}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
