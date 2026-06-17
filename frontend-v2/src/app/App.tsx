import { useState } from "react";
import { Monitor, Smartphone, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "./components/ui/sonner";
import { DesktopSidebar } from "./components/DesktopSidebar";
import { DesktopPlanHome } from "./components/DesktopPlanHome";
import { DesktopAIBuilder } from "./components/DesktopAIBuilder";
import { DesktopExplore } from "./components/DesktopExplore";
import { DesktopTrips } from "./components/DesktopTrips";
import { DesktopBuddies } from "./components/DesktopBuddies";
import { DesktopTripDetail } from "./components/DesktopTripDetail";
import { MobileScreens } from "./components/MobileScreens";
import { Onboarding } from "./components/Onboarding";
import { DialogDemo } from "./components/DialogDemo";

type ViewMode = "desktop" | "mobile" | "onboarding";
type DesktopScreen = "plan" | "ai-builder" | "explore" | "trips" | "buddies" | `trip-${string}`;

export default function App() {
  const [viewMode, setViewMode] = useState<ViewMode>("desktop");
  const [desktopScreen, setDesktopScreen] = useState<DesktopScreen>("plan");
  const [activeNav, setActiveNav] = useState("plan");
  const [aiQuery, setAiQuery] = useState("");
  const [savedTrip, setSavedTrip] = useState(false);

  const handlePlanIt = (query: string) => {
    setAiQuery(query);
    setDesktopScreen("ai-builder");
  };

  const handleSaveTrip = () => {
    setSavedTrip(true);
    setDesktopScreen("trips");
    setActiveNav("plan");
    setTimeout(() => setSavedTrip(false), 4000);
    toast.success("Osaka Foodie saved!", {
      description: "Your trip has been saved to your trips list.",
      duration: 3000,
    });
  };

  const handleNavChange = (nav: string) => {
    setActiveNav(nav);
    if (nav === "plan") setDesktopScreen("plan");
    else if (nav === "explore") setDesktopScreen("explore");
    else if (nav === "buddies") setDesktopScreen("buddies");
    else if (nav === "trips") setDesktopScreen("trips");
    else if (nav.startsWith("trip-")) setDesktopScreen(nav as DesktopScreen);
  };

  const tripId = desktopScreen.startsWith("trip-") ? desktopScreen.replace("trip-", "") : "";

  return (
    <div className="size-full flex flex-col bg-background" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Top mode switcher */}
      <div className="shrink-0 flex items-center justify-between px-5 py-3 bg-card border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-primary flex items-center justify-center">
            <span style={{ fontSize: 14 }}>🧭</span>
          </div>
          <span style={{ fontWeight: 800, fontSize: 16, color: "#16213E", letterSpacing: "-0.02em" }}>
            Jelajah<span style={{ color: "#16B364" }}>.</span>
          </span>
        </div>

        {/* Mode tabs */}
        <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
          {([
            { id: "desktop", label: "Desktop", icon: Monitor },
            { id: "mobile", label: "Mobile", icon: Smartphone },
            { id: "onboarding", label: "Onboarding", icon: PlayCircle },
          ] as { id: ViewMode; label: string; icon: React.ElementType }[]).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setViewMode(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                viewMode === id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              style={{ fontSize: 13, fontWeight: viewMode === id ? 600 : 500 }}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        <div className="w-44 flex justify-end">
          <DialogDemo />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 min-h-0">
        {viewMode === "desktop" && (
          <div className="flex h-full gap-3 p-4">
            <DesktopSidebar
              activeNav={activeNav}
              onNavChange={handleNavChange}
            />
            <div
              className="flex-1 bg-card rounded-2xl overflow-hidden flex flex-col border border-border"
              style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
            >
              {desktopScreen === "plan" && (
                <DesktopPlanHome onPlanIt={handlePlanIt} />
              )}
              {desktopScreen === "ai-builder" && (
                <DesktopAIBuilder
                  initialQuery={aiQuery || "5 days in Osaka with my 3 friends, food-focused, mid budget"}
                  onSave={handleSaveTrip}
                />
              )}
              {desktopScreen === "explore" && <DesktopExplore />}
              {desktopScreen === "trips" && (
                <DesktopTrips onOpenTrip={(id) => { setDesktopScreen(`trip-${id}` as DesktopScreen); setActiveNav(`trip-${id}`); }} />
              )}
              {desktopScreen === "buddies" && <DesktopBuddies />}
              {desktopScreen.startsWith("trip-") && (
                <DesktopTripDetail
                  tripId={tripId}
                  onBack={() => {
                    setDesktopScreen("trips");
                    setActiveNav("trips");
                  }}
                />
              )}
            </div>
          </div>
        )}

        {viewMode === "mobile" && <MobileScreens />}

        {viewMode === "onboarding" && (
          <Onboarding onFinish={() => setViewMode("desktop")} />
        )}
      </div>
      <Toaster />
    </div>
  );
}
