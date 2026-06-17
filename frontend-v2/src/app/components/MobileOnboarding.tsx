import { useState } from "react";
import { ArrowRight } from "lucide-react";

const slides = [
  {
    headline: "Your journey,",
    highlight: "perfectly planned.",
    emoji: "🗺️",
    bg: "#E6F7EE",
    accent: "#16B364",
    img: "https://images.unsplash.com/photo-1659094438327-493ee9cc0c4c?w=600&h=400&fit=crop&auto=format",
  },
  {
    headline: "Plan with AI,",
    highlight: "or your own way.",
    emoji: "✨",
    bg: "#FFF4EE",
    accent: "#FF8A4C",
    img: "https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=600&h=400&fit=crop&auto=format",
  },
  {
    headline: "Travel together",
    highlight: "with friends.",
    emoji: "🤝",
    bg: "#EEF3FF",
    accent: "#6366f1",
    img: "https://images.unsplash.com/photo-1506869640319-fe1a24fd76dc?w=600&h=400&fit=crop&auto=format",
  },
];

export function MobileOnboarding() {
  const [current, setCurrent] = useState(0);
  const slide = slides[current];

  const next = () => {
    if (current < slides.length - 1) setCurrent((c) => c + 1);
    else setCurrent(0);
  };

  return (
    <MobileFrame label="Onboarding">
      <div className="flex flex-col h-full" style={{ background: slide.bg, transition: "background 0.4s" }}>
        {/* Status bar */}
        <div className="flex items-center justify-between px-5 pt-3 pb-1">
          <span style={{ fontSize: 12, fontWeight: 700, color: "#16213E" }}>9:41</span>
          <span style={{ fontSize: 10 }}>●●●</span>
        </div>

        {/* Skip */}
        <div className="flex justify-end px-5 pt-2">
          <button
            onClick={() => setCurrent(0)}
            className="text-muted-foreground"
            style={{ fontSize: 12, fontWeight: 500 }}
          >
            Skip
          </button>
        </div>

        {/* Illustration */}
        <div className="mx-5 mt-2 rounded-2xl overflow-hidden h-48 relative bg-white/40">
          <img
            src={slide.img}
            alt={slide.headline}
            className="w-full h-full object-cover"
            style={{ transition: "all 0.4s" }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-white/80 backdrop-blur-sm flex items-center justify-center" style={{ fontSize: 36 }}>
              {slide.emoji}
            </div>
          </div>
        </div>

        {/* Text */}
        <div className="flex-1 px-6 pt-6">
          <h2 style={{ fontWeight: 800, fontSize: 26, letterSpacing: "-0.03em", lineHeight: 1.15, color: "#16213E" }}>
            {slide.headline}
          </h2>
          <h2 style={{ fontWeight: 800, fontSize: 26, letterSpacing: "-0.03em", lineHeight: 1.15, color: slide.accent }}>
            {slide.highlight}
          </h2>
        </div>

        {/* Dots + button */}
        <div className="px-6 pb-8 space-y-5">
          {/* Dots */}
          <div className="flex items-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                style={{
                  height: 8,
                  width: i === current ? 24 : 8,
                  borderRadius: 999,
                  background: i === current ? "#16B364" : "#E7ECF4",
                  transition: "all 0.3s",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              />
            ))}
          </div>

          <button
            onClick={next}
            className="w-full flex items-center justify-center gap-2 text-white rounded-2xl py-4"
            style={{ background: "#16B364", fontSize: 15, fontWeight: 700 }}
          >
            {current === slides.length - 1 ? "Get started" : "Next"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </MobileFrame>
  );
}

function MobileFrame({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-muted-foreground" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</p>
      <div
        style={{
          width: 320,
          height: 620,
          borderRadius: 40,
          border: "8px solid #16213E",
          boxShadow: "0 20px 60px rgba(22,33,62,0.20), 0 4px 20px rgba(0,0,0,0.1)",
          overflow: "hidden",
        }}
      >
        {children}
      </div>
    </div>
  );
}
