import { useState } from "react";
import { ArrowRight } from "lucide-react";

const slides = [
  {
    headline: "Your journey,",
    highlight: "perfectly planned.",
    sub: "From a single prompt to a full itinerary — flights, hotels, activities, and group budget.",
    emoji: "🗺️",
    bg: "from-[#E6F7EE] to-[#d0f0e0]",
    img: "https://images.unsplash.com/photo-1659094438327-493ee9cc0c4c?w=600&h=500&fit=crop&auto=format",
  },
  {
    headline: "Plan with AI,",
    highlight: "or your own way.",
    sub: "Tell the AI where you want to go, or build it step by step. Your trip, your rules.",
    emoji: "✨",
    bg: "from-[#fff8f4] to-[#ffe8d6]",
    img: "https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=600&h=500&fit=crop&auto=format",
  },
  {
    headline: "Travel together",
    highlight: "with friends.",
    sub: "Invite your crew, split costs, and keep everyone on the same page — no group chat chaos.",
    emoji: "👯",
    bg: "from-[#f0f4ff] to-[#dde6ff]",
    img: "https://images.unsplash.com/photo-1517935706615-2717063c2225?w=600&h=500&fit=crop&auto=format",
  },
];

interface Props {
  onFinish: () => void;
}

export function Onboarding({ onFinish }: Props) {
  const [current, setCurrent] = useState(0);

  const next = () => {
    if (current < slides.length - 1) setCurrent((c) => c + 1);
    else onFinish();
  };

  const slide = slides[current];

  return (
    <div className="w-full h-full flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-8 max-w-4xl w-full px-8">
        <p className="text-muted-foreground" style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>
          {current + 1} of {slides.length}
        </p>

        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Image */}
          <div className={`rounded-3xl overflow-hidden h-80 bg-gradient-to-br ${slide.bg} relative`}>
            <img
              src={slide.img}
              alt={slide.headline}
              className="w-full h-full object-cover opacity-90 mix-blend-multiply"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span style={{ fontSize: 64 }}>{slide.emoji}</span>
            </div>
          </div>

          {/* Content */}
          <div className="flex flex-col gap-5">
            <div>
              <h1 className="text-foreground" style={{ fontWeight: 800, fontSize: 42, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
                {slide.headline}
              </h1>
              <h1 className="text-primary" style={{ fontWeight: 800, fontSize: 42, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
                {slide.highlight}
              </h1>
            </div>
            <p className="text-muted-foreground" style={{ fontSize: 16, lineHeight: 1.6, maxWidth: 360 }}>
              {slide.sub}
            </p>

            {/* Dots */}
            <div className="flex items-center gap-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className="transition-all"
                  style={{
                    height: 8,
                    width: i === current ? 28 : 8,
                    borderRadius: 999,
                    background: i === current ? "#16B364" : "#E7ECF4",
                  }}
                />
              ))}
            </div>

            <div className="flex items-center gap-4 mt-2">
              <button
                onClick={next}
                className="bg-primary text-white rounded-2xl px-8 py-4 flex items-center gap-2 hover:bg-[#13a058] transition-colors"
                style={{ fontSize: 15, fontWeight: 700 }}
              >
                {current === slides.length - 1 ? "Get started" : "Next"}
                <ArrowRight className="w-4 h-4" />
              </button>
              {current < slides.length - 1 && (
                <button onClick={onFinish} className="text-muted-foreground hover:text-foreground transition-colors" style={{ fontSize: 14 }}>
                  Skip
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
