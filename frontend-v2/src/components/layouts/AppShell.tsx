import {
  Briefcase,
  ChevronRight,
  Compass,
  LogOut,
  Map,
  MessageCircle,
  Sparkles,
  Users,
} from "lucide-react";
import { Outlet, useLocation, useNavigate, useSearchParams } from "react-router";

import { UserAvatar } from "@/components/UserAvatar";
import { useAuth } from "@/contexts/AuthContext";
import { useMessages } from "@/contexts/MessagesContext";
import { useTrips } from "@/contexts/TripsContext";
import { useEffect } from "react";

const NAV = [
  { to: "/", label: "Plan a trip", icon: Sparkles },
  { to: "/explore", label: "Explore", icon: Map },
  { to: "/trips", label: "Trips", icon: Briefcase },
  { to: "/buddies", label: "Travel buddies", icon: Users },
  { to: "/messages", label: "Messages", icon: MessageCircle },
];

/** Small count pill for nav items (unread messages). */
function NavBadge({ count, className = "" }: { count: number; className?: string }) {
  if (!count) return null;
  return (
    <span
      className={`min-w-[18px] h-[18px] px-1 rounded-full bg-[#FF8A4C] text-white flex items-center justify-center ${className}`}
      style={{ fontSize: 10, fontWeight: 700, lineHeight: 1 }}
      aria-label={`${count} unread`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { myTrips, fetchMyTrips } = useTrips();
  const { unreadCount } = useMessages();

  useEffect(() => {
    if (user) fetchMyTrips();
  }, [user, fetchMyTrips]);

  const isActive = (to: string) =>
    to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

  const userName =
    user && (`${user.first_name || ""} ${user.last_name || ""}`.trim() || user.email);

  return (
    <aside className="hidden md:flex w-[172px] shrink-0 h-full bg-card rounded-2xl border border-border flex-col py-5 px-3 shadow-sm">
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
              <span className="flex-1 truncate">{label}</span>
              {to === "/messages" ? <NavBadge count={unreadCount} /> : null}
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
              <UserAvatar
                person={user}
                className="w-8 h-8 rounded-full"
                style={{ fontSize: 12 }}
              />
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

/**
 * Routes that draw their own header on mobile: the AI builder, a trip's
 * detail page, and an open conversation (?c= / ?user= on /messages).
 */
function hasOwnMobileHeader(pathname: string, search: URLSearchParams) {
  if (pathname.startsWith("/ai-builder")) return true;
  if (/^\/trips\/[^/]+/.test(pathname)) return true;
  if (pathname.startsWith("/messages") && (search.get("c") || search.get("user")))
    return true;
  return false;
}

export default function AppShell() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const ownHeader = hasOwnMobileHeader(location.pathname, searchParams);
  // The AI chat has its own bottom input + save bar on mobile.
  const showTabBar = !location.pathname.startsWith("/ai-builder");

  return (
    <div
      className="size-full flex flex-col bg-background"
      // viewport-fit=cover: keep content clear of the notch (0 on desktop).
      style={{
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      {!ownHeader && <MobileHeader />}
      <div className="flex-1 min-h-0">
        {/* Mobile: full-bleed page. md+: sidebar + rounded card. */}
        <div className="flex h-full md:gap-3 md:p-4">
          <Sidebar />
          <div className="flex-1 min-w-0 overflow-hidden flex flex-col md:bg-card md:rounded-2xl md:border md:border-border md:shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
            <Outlet />
          </div>
        </div>
      </div>
      {showTabBar && <MobileTabBar />}
    </div>
  );
}

/** Mobile-only top bar: logo, messages (with unread badge), avatar. */
function MobileHeader() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { unreadCount } = useMessages();

  return (
    <header className="md:hidden shrink-0 flex items-center justify-between px-4 pt-3 pb-2 bg-background">
      <button
        type="button"
        onClick={() => navigate("/")}
        className="flex items-center gap-2"
        aria-label="Jelajah home"
      >
        <div className="w-7 h-7 rounded-xl bg-primary flex items-center justify-center">
          <Compass className="w-3.5 h-3.5 text-white" strokeWidth={2} />
        </div>
        <span
          className="text-[#16213E]"
          style={{ fontWeight: 800, fontSize: 15, letterSpacing: "-0.02em" }}
        >
          Jelajah<span className="text-primary">.</span>
        </span>
      </button>
      {user ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/messages")}
            aria-label={unreadCount ? `Messages, ${unreadCount} unread` : "Messages"}
            className="relative w-8 h-8 rounded-full bg-muted flex items-center justify-center text-foreground"
          >
            <MessageCircle className="w-4 h-4" strokeWidth={2} />
            <NavBadge count={unreadCount} className="absolute -top-1 -right-1.5" />
          </button>
          <button
            type="button"
            onClick={() => navigate("/profile")}
            aria-label="Your profile"
            className="rounded-full"
          >
            <UserAvatar
              person={user}
              className="w-8 h-8 rounded-full"
              style={{ fontSize: 11 }}
            />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => navigate("/login")}
          className="bg-primary text-white rounded-xl px-3 py-1.5"
          style={{ fontSize: 12, fontWeight: 600 }}
        >
          Sign in
        </button>
      )}
    </header>
  );
}

const TABS = [
  { to: "/", label: "Plan", icon: Sparkles },
  { to: "/explore", label: "Explore", icon: Map },
  { to: "/trips", label: "Trips", icon: Briefcase },
  { to: "/buddies", label: "Buddies", icon: Users },
];

/** Mobile-only bottom tab bar (Plan / Explore / Trips / Buddies). */
function MobileTabBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (to: string) =>
    to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

  return (
    <nav
      className="md:hidden shrink-0 flex border-t border-border bg-card"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Main navigation"
    >
      {TABS.map(({ to, label, icon: Icon }) => {
        const active = isActive(to);
        const color = active ? "#16B364" : "#8A93A6";
        return (
          <button
            key={to}
            type="button"
            onClick={() => navigate(to)}
            aria-current={active ? "page" : undefined}
            className="flex-1 flex flex-col items-center gap-0.5 pt-2 pb-1.5"
          >
            <Icon className="w-5 h-5" style={{ color }} strokeWidth={active ? 2.5 : 2} />
            <span style={{ fontSize: 10, fontWeight: active ? 700 : 500, color, lineHeight: 1.3 }}>
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
