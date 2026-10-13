import { useEffect, useMemo, useState } from "react";
import {
  Search,
  MapPin,
  Users,
  Clock,
  ArrowRight,
  Bookmark,
  Copy,
  Loader2,
  Star,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { toast } from "sonner";

import { useTrips } from "@/contexts/TripsContext";
import { useAuth } from "@/contexts/AuthContext";
import { getErrorMessage } from "@/lib/utils";
import { reviewsLabel, tripToDestination, tripToTemplate } from "@/lib/adapters";
import { UserAvatar } from "@/components/UserAvatar";
import { getTripDifficultyColor } from "@/lib/colors";
import { ImageWithFallback } from "./figma/ImageWithFallback";

const categories = ["All", "Saved", "Easy", "Moderate", "Challenging"];

const LOGIN_REDIRECT = "/login?redirect=%2Fexplore";

export function DesktopExplore() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const { publicTrips, fetchPublicTrips, joinTrip, toggleBookmark, duplicateTrip } =
    useTrips();
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [copyingId, setCopyingId] = useState<string | null>(null);

  const handleJoin = async (dest: any) => {
    if (!isAuthenticated) {
      navigate(LOGIN_REDIRECT);
      return;
    }
    setJoiningId(dest.id);
    try {
      await joinTrip(dest.id);
      toast.success("Join request sent", {
        description: `The organizer of "${dest.name}" will review your request.`,
      });
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not join this trip"));
    } finally {
      setJoiningId(null);
    }
  };

  const handleBookmark = async (dest: { id: string; isSaved: boolean }) => {
    if (!isAuthenticated) {
      navigate(LOGIN_REDIRECT);
      return;
    }
    try {
      await toggleBookmark(dest.id, !dest.isSaved);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not update your saved trips"));
    }
  };

  // "Use as template" = duplicate the trip into your own, then open it.
  const handleUseTemplate = async (tpl: { id: string; title: string }) => {
    if (!isAuthenticated) {
      navigate("/login?redirect=%2Fexplore%23templates");
      return;
    }
    setCopyingId(tpl.id);
    try {
      const trip = await duplicateTrip(tpl.id);
      toast.success("Template copied", {
        description: `"${trip?.title || tpl.title}" is now one of your trips.`,
      });
      navigate(`/trips/${trip.id}`);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not copy this itinerary"));
    } finally {
      setCopyingId(null);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchPublicTrips().finally(() => setIsLoading(false));
  }, [fetchPublicTrips]);

  // Plan home links to /explore#templates; scroll once the list has rendered.
  useEffect(() => {
    if (isLoading || location.hash !== "#templates") return;
    document
      .getElementById("templates")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [isLoading, location.hash]);

  const destinations = useMemo(
    () => (publicTrips || []).map(tripToDestination),
    [publicTrips]
  );

  // Most-saved first; these double as copyable templates.
  const templates = useMemo(
    () =>
      (publicTrips || [])
        .map(tripToTemplate)
        .sort((a: any, b: any) => b.saves - a.saves)
        .slice(0, 6),
    [publicTrips]
  );

  const filtered = destinations.filter((d: any) => {
    const matchesCategory =
      activeCategory === "All" ||
      (activeCategory === "Saved" ? d.isSaved : d.tag === activeCategory);
    const matchesSearch =
      !searchQuery ||
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.country || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex-1 min-w-0 overflow-y-auto px-4 py-5 md:px-10 md:py-8">
      <div className="flex items-start justify-between mb-5 md:mb-6">
        <div className="min-w-0">
          <h1
            className="text-foreground mb-1 text-[24px] md:text-[30px]"
            style={{ fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.25 }}
          >
            Explore <span className="text-primary">trips</span>
          </h1>
          <p className="text-muted-foreground text-[13px] md:text-[14px]">
            Browse public trips shared by the community
          </p>
        </div>
      </div>

      <div className="relative mb-5">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search trips…"
          className="w-full bg-card border border-input rounded-2xl pl-11 pr-4 py-3 text-foreground placeholder-muted-foreground outline-none focus:border-primary transition-colors"
          style={{ fontSize: 14 }}
        />
      </div>

      <div className="flex gap-2 flex-wrap mb-5 md:mb-7">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setActiveCategory(c)}
            className={`px-4 py-1.5 rounded-full border transition-all ${
              activeCategory === c
                ? "bg-primary text-white border-primary"
                : "bg-card border-border text-foreground hover:border-primary/50"
            }`}
            style={{ fontSize: 13, fontWeight: 500 }}
          >
            {c}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground" style={{ fontSize: 14 }}>
          Loading trips…
        </p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mb-4 text-3xl">
            🌏
          </div>
          <p
            className="text-foreground mb-2"
            style={{ fontWeight: 700, fontSize: 18 }}
          >
            {activeCategory === "Saved" ? "No saved trips yet" : "No public trips found"}
          </p>
          <p className="text-muted-foreground" style={{ fontSize: 14 }}>
            {activeCategory === "Saved"
              ? "Tap the bookmark on any trip to keep it here"
              : "Try a different search or category"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mb-10">
          {filtered.map((dest: any) => (
            <div
              key={dest.id}
              onClick={() => navigate(`/trips/${dest.id}`)}
              className="bg-card rounded-2xl overflow-hidden border border-border hover:shadow-md hover:border-primary/20 transition-all group cursor-pointer"
            >
              <div className="relative h-44 overflow-hidden bg-slate-200">
                <ImageWithFallback
                  src={dest.img}
                  alt={dest.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div
                  className="absolute top-3 left-3 rounded-full px-2.5 py-1"
                  style={{ fontSize: 10, fontWeight: 700 }}
                >
                  <span
                    className={`rounded-full px-2 py-0.5 ${getTripDifficultyColor(
                      dest.raw.difficulty
                    )}`}
                  >
                    {dest.tag}
                  </span>
                </div>
                <button
                  type="button"
                  aria-label={dest.isSaved ? "Remove from saved" : "Save trip"}
                  aria-pressed={dest.isSaved}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBookmark(dest);
                  }}
                  className="absolute top-3 right-3 w-8 h-8 rounded-xl bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors"
                >
                  <Bookmark
                    className="w-4 h-4"
                    style={{ color: dest.isSaved ? "#16B364" : "#8A93A6" }}
                    fill={dest.isSaved ? "#16B364" : "none"}
                    strokeWidth={2}
                  />
                </button>
                <div
                  className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1"
                  style={{ fontSize: 10, fontWeight: 600, color: "#16213E" }}
                >
                  {dest.country}
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3
                    className="text-foreground"
                    style={{ fontWeight: 700, fontSize: 15 }}
                  >
                    {dest.name}
                  </h3>
                  <RatingBadge rating={dest.rating} />
                </div>
                <div
                  className="flex items-center gap-3 text-muted-foreground mb-3"
                  style={{ fontSize: 12 }}
                >
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {dest.duration}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {dest.members}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {dest.country}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span
                      className="text-muted-foreground"
                      style={{ fontSize: 11 }}
                    >
                      Budget{" "}
                    </span>
                    <span
                      className="text-foreground"
                      style={{ fontSize: 13, fontWeight: 700 }}
                    >
                      {dest.budget}
                    </span>
                    <p className="text-muted-foreground" style={{ fontSize: 11 }}>
                      {dest.reviewsCount > 0 ? reviewsLabel(dest.reviewsCount) : "No reviews yet"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {dest.raw.is_member ? (
                      <span
                        className="text-muted-foreground"
                        style={{ fontSize: 12, fontWeight: 600 }}
                      >
                        Joined
                      </span>
                    ) : dest.raw.join_requested ? (
                      <span
                        className="text-muted-foreground"
                        style={{ fontSize: 12, fontWeight: 600 }}
                      >
                        Requested
                      </span>
                    ) : dest.raw.is_joinable ? (
                      <button
                        type="button"
                        disabled={joiningId === dest.id}
                        onClick={(e) => {
                          // The whole card navigates; keep the click here.
                          e.stopPropagation();
                          handleJoin(dest);
                        }}
                        className="bg-secondary text-secondary-foreground rounded-lg px-3 py-1 hover:bg-primary hover:text-white transition-colors disabled:opacity-50"
                        style={{ fontSize: 12, fontWeight: 600 }}
                      >
                        {joiningId === dest.id ? "Joining…" : "Join"}
                      </button>
                    ) : null}
                    <span
                      className="text-primary flex items-center gap-1"
                      style={{ fontSize: 12, fontWeight: 600 }}
                    >
                      View <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Community itineraries — copy one as a starting point */}
      <section id="templates" className="scroll-mt-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-foreground" style={{ fontWeight: 700, fontSize: 17 }}>
            Community itineraries
          </p>
        </div>
        {isLoading ? (
          <p className="text-muted-foreground" style={{ fontSize: 14 }}>
            Loading itineraries…
          </p>
        ) : templates.length === 0 ? (
          <p className="text-muted-foreground" style={{ fontSize: 14 }}>
            No community itineraries yet — make one of your trips public to share it.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {templates.map((tpl: any) => (
              <div
                key={tpl.id}
                onClick={() => navigate(`/trips/${tpl.id}`)}
                className="bg-card border border-border rounded-2xl p-4 hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer flex flex-col"
              >
                <div className="flex items-center gap-3 mb-3">
                  <UserAvatar
                    person={tpl.owner}
                    className="w-8 h-8 rounded-full"
                    style={{ fontSize: 11 }}
                  />
                  <div className="min-w-0">
                    <p
                      className="text-foreground truncate"
                      style={{ fontSize: 13, fontWeight: 600 }}
                    >
                      {tpl.title}
                    </p>
                    <p className="text-muted-foreground truncate" style={{ fontSize: 11 }}>
                      by {tpl.author}
                    </p>
                  </div>
                </div>
                <div
                  className="flex items-center gap-4 text-muted-foreground border-t border-border pt-3 mb-3"
                  style={{ fontSize: 12 }}
                >
                  <span>
                    {tpl.days} {tpl.days === 1 ? "day" : "days"}
                  </span>
                  <span className="text-foreground" style={{ fontWeight: 600 }}>
                    {tpl.budget}
                  </span>
                  {tpl.rating ? (
                    <span
                      className="flex items-center gap-1"
                      title={reviewsLabel(tpl.reviewsCount)}
                    >
                      <Star className="w-3 h-3" style={{ color: "#FF8A4C" }} fill="#FF8A4C" />
                      <span className="text-foreground" style={{ fontWeight: 700 }}>
                        {tpl.rating}
                      </span>
                    </span>
                  ) : null}
                  <span className="ml-auto flex items-center gap-1">
                    <Bookmark
                      className="w-3 h-3"
                      style={{ color: tpl.isSaved ? "#16B364" : undefined }}
                      fill={tpl.isSaved ? "#16B364" : "none"}
                    />
                    {tpl.saves}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={copyingId === tpl.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUseTemplate(tpl);
                  }}
                  className="mt-auto w-full flex items-center justify-center gap-1.5 bg-secondary text-secondary-foreground rounded-xl py-2 hover:bg-primary hover:text-white transition-colors disabled:opacity-50"
                  style={{ fontSize: 12, fontWeight: 600 }}
                >
                  {copyingId === tpl.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {copyingId === tpl.id ? "Copying…" : "Use as template"}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/** ★ 4.8 in the reference's orange, or a "New" pill for an unreviewed trip. */
function RatingBadge({ rating }: { rating: string | null }) {
  if (!rating) {
    return (
      <span
        className="shrink-0 bg-[#FF8A4C]/10 text-[#FF8A4C] rounded-full px-2 py-0.5"
        style={{ fontSize: 11, fontWeight: 700 }}
      >
        New
      </span>
    );
  }
  return (
    <div className="flex items-center gap-1 shrink-0">
      <Star className="w-3.5 h-3.5" style={{ color: "#FF8A4C" }} fill="#FF8A4C" />
      <span style={{ fontSize: 13, fontWeight: 700, color: "#16213E" }}>{rating}</span>
    </div>
  );
}
