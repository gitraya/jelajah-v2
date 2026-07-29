import {
  Briefcase,
  ChevronRight,
  Compass,
  LogOut,
  Map,
  Sparkles,
  Users,
} from "lucide-react";
import { Outlet, useLocation, useNavigate } from "react-router";

import { useAuth } from "@/contexts/AuthContext";
import { useTrips } from "@/contexts/TripsContext";
import { getInitials } from "@/lib/utils";
import { useEffect } from "react";

const NAV = [
  { to: "/", label: "Plan a trip", icon: Sparkles },
  { to: "/explore", label: "Explore", icon: Map },
  { to: "/trips", label: "Trips", icon: Briefcase },
  { to: "/buddies", label: "Travel buddies", icon: Users },
];

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { myTrips, fetchMyTrips } = useTrips();

  useEffect(() => {
    if (user) fetchMyTrips();
  }, [user]);

  const isActive = (to: string) =>
    to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

  const userName =
    user && (`${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email);

  return (
    <aside className="w-[172px] shrink-0 h-full bg-card rounded-2xl border border-border flex flex-col py-5 px-3 shadow-sm">
      <div className="flex items-center gap-2 px-2 mb-7">
        <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shrink-0">
          <Compass className="w-4 h-4 text-white" strokeWidth={2} />
        </div>
        <span
          className="text-[#16213E]"
          style={{ fontWeight: 800, fontSize: 17, letterSpacing: "-0.02em" }}
        >
          Jelajah<span className="text-primary">.</span>
        </span>
      </div>

      <div className="mb-1">
        <p
          className="text-[10px] uppercase tracking-widest text-muted-foreground px-2 mb-1"
          style={{ fontWeight: 600 }}
        >
          Plan
        </p>
        {NAV.map(({ to, label, icon: Icon }) => {
          const active = isActive(to);
          return (
            <button
              key={to}
              onClick={() => navigate(to)}
              className={`w-full flex items-center gap-2 px-2 py-2 rounded-xl text-left transition-all mb-0.5 ${
                active
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              style={{ fontSize: 13, fontWeight: active ? 600 : 500 }}
            >
              <Icon className="w-4 h-4 shrink-0" strokeWidth={2} />
              {label}
            </button>
          );
        })}
      </div>

      {user && myTrips?.length > 0 && (
        <div className="mt-3 overflow-y-auto">
          <p
            className="text-[10px] uppercase tracking-widest text-muted-foreground px-2 mb-1"
            style={{ fontWeight: 600 }}
          >
            Your trips
          </p>
          {myTrips.slice(0, 6).map((t: any) => {
            const active = location.pathname === `/trips/${t.id}`;
            return (
              <button
                key={t.id}
                onClick={() => navigate(`/trips/${t.id}`)}
                className={`w-full flex items-center gap-2 px-2 py-2 rounded-xl text-left transition-all mb-0.5 group ${
                  active ? "bg-secondary text-secondary-foreground" : "hover:bg-muted"
                }`}
                style={{
                  fontSize: 13,
                  fontWeight: active ? 600 : 500,
                  color: active ? "#0B6B3A" : "#16213E",
                }}
              >
                <span className="text-sm">🧭</span>
                <span className="flex-1 truncate">{t.title}</span>
                <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            );
          })}
        </div>
      )}

      <div className="flex-1" />

      <div className="px-2 pt-3 border-t border-border mt-3">
        {user ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/profile")}
              title="Your profile"
              className="flex items-center gap-2 min-w-0 flex-1 text-left rounded-lg hover:bg-muted transition-colors py-1 px-1 -mx-1"
            >
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                <span className="text-white text-xs" style={{ fontWeight: 700 }}>
                  {getInitials(userName || "")}
                </span>
              </div>
              <div className="min-w-0">
                <p
                  className="text-foreground truncate"
                  style={{ fontSize: 12, fontWeight: 600 }}
                >
                  {userName}
                </p>
                <p
                  className="text-muted-foreground truncate"
                  style={{ fontSize: 10 }}
                >
                  {user.email}
                </p>
              </div>
            </button>
            <button
              onClick={() => logout()}
              title="Log out"
              className="ml-auto text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => navigate("/login")}
            className="w-full bg-primary text-white rounded-xl py-2"
            style={{ fontSize: 13, fontWeight: 600 }}
          >
            Sign in
          </button>
        )}
      </div>
    </aside>
  );
}

export default function AppShell() {
  return (
    <div
      className="size-full flex flex-col bg-background"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      <div className="flex-1 min-h-0">
        <div className="flex h-full gap-3 p-4">
          <Sidebar />
          <div
            className="flex-1 bg-card rounded-2xl overflow-hidden flex flex-col border border-border"
            style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.06)" }}
          >
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
