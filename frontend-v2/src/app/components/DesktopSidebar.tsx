import { Compass, Sparkles, Map, Users, Briefcase, ChevronRight } from "lucide-react";

interface Props {
  activeNav: string;
  onNavChange: (nav: string) => void;
}

const sidebarTrips = [
  { flag: "🇹🇭", name: "Bangkok", id: "trip-bangkok" },
  { flag: "🇲🇾", name: "Kuala Lumpur", id: "trip-kl" },
  { flag: "🇯🇵", name: "Osaka", id: "trip-osaka" },
  { flag: "🇨🇦", name: "Canada", id: "trip-canada" },
];

export function DesktopSidebar({ activeNav, onNavChange }: Props) {
  return (
    <aside className="w-[172px] shrink-0 h-full bg-card rounded-2xl border border-border flex flex-col py-5 px-3 shadow-sm">
      {/* Logo */}
      <div className="flex items-center gap-2 px-2 mb-7">
        <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shrink-0">
          <Compass className="w-4 h-4 text-white" strokeWidth={2} />
        </div>
        <span className="text-[#16213E]" style={{ fontWeight: 800, fontSize: 17, letterSpacing: "-0.02em" }}>
          Jelajah<span className="text-primary">.</span>
        </span>
      </div>

      {/* Nav: Plan */}
      <div className="mb-1">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground px-2 mb-1" style={{ fontWeight: 600 }}>Plan</p>
        {[
          { id: "plan", label: "Plan a trip", icon: Sparkles },
          { id: "explore", label: "Explore", icon: Map },
          { id: "trips", label: "Trips", icon: Briefcase },
          { id: "buddies", label: "Travel buddies", icon: Users },
        ].map(({ id, label, icon: Icon }) => {
          const isActive = activeNav === id || (id === "trips" && activeNav.startsWith("trip-"));
          return (
            <button
              key={id}
              onClick={() => onNavChange(id)}
              className={`w-full flex items-center gap-2 px-2 py-2 rounded-xl text-left transition-all mb-0.5 ${
                isActive
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              style={{ fontSize: 13, fontWeight: isActive ? 600 : 500 }}
            >
              <Icon className="w-4 h-4 shrink-0" strokeWidth={2} />
              {label}
            </button>
          );
        })}
      </div>

      {/* Nav: Your trips */}
      <div className="mt-3">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground px-2 mb-1" style={{ fontWeight: 600 }}>Your trips</p>
        {sidebarTrips.map((t) => {
          const isActive = activeNav === t.id;
          return (
            <button
              key={t.id}
              onClick={() => onNavChange(t.id)}
              className={`w-full flex items-center gap-2 px-2 py-2 rounded-xl text-left transition-all mb-0.5 group ${
                isActive ? "bg-secondary text-secondary-foreground" : "hover:bg-muted"
              }`}
              style={{ fontSize: 13, fontWeight: isActive ? 600 : 500, color: isActive ? "#0B6B3A" : "#16213E" }}
            >
              <span className="text-sm">{t.flag}</span>
              <span className="flex-1 truncate">{t.name}</span>
              <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          );
        })}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* User profile chip */}
      <div className="px-2 pt-3 border-t border-border mt-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
            <span className="text-white text-xs" style={{ fontWeight: 700 }}>RA</span>
          </div>
          <div className="min-w-0">
            <p className="text-foreground truncate" style={{ fontSize: 12, fontWeight: 600 }}>Raya</p>
            <p className="text-muted-foreground truncate" style={{ fontSize: 10 }}>raya@gmail.com</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
