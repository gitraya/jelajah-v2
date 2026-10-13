import { useState } from "react";
import {
  ArrowLeft,
  Calendar,
  Camera,
  ImageUp,
  Loader2,
  MapPin,
  MoreHorizontal,
  Pencil,
  Star,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";

import { BudgetTab } from "@/components/trip/BudgetTab";
import { ChecklistTab } from "@/components/trip/ChecklistTab";
import { ItineraryTab } from "@/components/trip/ItineraryTab";
import { PackingTab } from "@/components/trip/PackingTab";
import { ReviewsTab } from "@/components/trip/ReviewsTab";
import { TravelersTab } from "@/components/trip/TravelersTab";
import { UserAvatar } from "@/components/UserAvatar";
import { TripFormModal } from "@/components/modals/TripFormModal";
import { useChecklist } from "@/contexts/ChecklistContext";
import { useExpenses } from "@/contexts/ExpensesContext";
import { useItineraries } from "@/contexts/ItinerariesContext";
import { useMembers } from "@/contexts/MembersContext";
import { useTrip } from "@/contexts/TripContext";
import {
  coverImage,
  formatDateRange,
  formatRating,
  formatRp,
  formatRpShort,
  reviewsLabel,
  tripDays,
} from "@/lib/adapters";
import { getTripDifficultyColor, getTripStatusColor } from "@/lib/colors";
import { formatDate, getErrorMessage } from "@/lib/utils";
import { useImagePicker } from "@/hooks/useImagePicker";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { useIsMobile } from "./ui/use-mobile";

interface Props {
  tripId: string;
  onBack: () => void;
}

const TABS = [
  "itinerary",
  "budget",
  "packing",
  "checklist",
  "travelers",
  "reviews",
] as const;
type DetailTab = (typeof TABS)[number];

export function DesktopTripDetail({ onBack }: Props) {
  const [activeTab, setActiveTab] = useState<DetailTab>("itinerary");
  const [editOpen, setEditOpen] = useState(false);

  const [coverBusy, setCoverBusy] = useState(false);

  const { trip, isLoading, updateTrip, uploadCover, removeCover, fetchTripDetails } =
    useTrip();
  const { members } = useMembers();
  const { statistics: expenseStats } = useExpenses();
  const { statistics: checklistStats } = useChecklist();
  const { statistics: itineraryStats, locations } = useItineraries();
  const isMobile = useIsMobile();

  // `is_editable` is computed server-side from ownership + role, so trust it
  // rather than re-deriving permissions in the client.
  const canEdit = Boolean(trip?.is_editable);
  // Reviews only make sense once a trip is shared or has been reviewed.
  const showReviews = Boolean(trip?.is_public) || Number(trip?.reviews_count || 0) > 0;
  const tabs = TABS.filter((t) => t !== "reviews" || showReviews);
  const rating = formatRating(trip?.rating_avg);

  const runCoverAction = async (action: () => Promise<unknown>, success: string) => {
    setCoverBusy(true);
    try {
      await action();
      toast.success(success);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not update the cover"));
    } finally {
      setCoverBusy(false);
    }
  };

  const coverPicker = useImagePicker((file) =>
    runCoverAction(() => uploadCover(file), "Cover updated")
  );

  const budget = Number(trip?.budget || 0);
  const spent = Number(expenseStats?.amount_spent ?? trip?.spent_budget ?? 0);
  const spentPct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
  const travelerCount = members?.length || trip?.members_count || 0;

  // Mobile "Ready": checklist completion, else share of visited stops.
  const checklistTotal = Number(checklistStats?.total_items || 0);
  const stopsTotal = Number(itineraryStats?.total ?? locations?.length ?? 0);
  const readyPct = checklistTotal
    ? Math.round((Number(checklistStats?.completed_items || 0) / checklistTotal) * 100)
    : stopsTotal
    ? Math.round((Number(itineraryStats?.visited || 0) / stopsTotal) * 100)
    : 0;

  if (isLoading && !trip) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Loading trip…
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <p className="text-foreground" style={{ fontWeight: 700 }}>
          Trip not found
        </p>
        <button onClick={onBack} className="text-primary" style={{ fontSize: 13 }}>
          ← Back to trips
        </button>
      </div>
    );
  }

  const dateText =
    trip.dates || formatDateRange(trip.start_date, trip.end_date) || formatDate(trip.start_date);
  const days = tripDays(trip);

  const mobileTop = (
    <>
      {coverPicker.input}
      {/* Header: back, title, more actions */}
      <div className="flex items-center gap-3 px-4 py-2">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to trips"
          className="w-8 h-8 bg-muted rounded-xl flex items-center justify-center shrink-0"
        >
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <p
          className="flex-1 min-w-0 text-center truncate"
          style={{ fontWeight: 700, fontSize: 15, color: "#16213E" }}
        >
          {trip.title}
        </p>
        {canEdit ? (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild disabled={coverBusy}>
              <button
                type="button"
                aria-label="Trip actions"
                className="w-8 h-8 bg-muted rounded-xl flex items-center justify-center shrink-0 disabled:opacity-60"
              >
                {coverBusy ? (
                  <Loader2 className="w-4 h-4 animate-spin text-foreground" />
                ) : (
                  <MoreHorizontal className="w-4 h-4 text-foreground" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-xl">
              <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                <Pencil className="w-4 h-4" /> Edit trip
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={coverPicker.open}>
                <ImageUp className="w-4 h-4" />
                {trip.cover_image ? "Upload new cover" : "Add cover"}
              </DropdownMenuItem>
              {trip.cover_image ? (
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={() => runCoverAction(removeCover, "Cover removed")}
                >
                  <Trash2 className="w-4 h-4" /> Remove cover
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="w-8 h-8 shrink-0" />
        )}
      </div>

      {/* Cover card */}
      <div className="mx-4 relative rounded-2xl overflow-hidden h-40 mb-3 bg-[#1a3a5c]">
        <ImageWithFallback
          key={coverImage(trip)}
          src={coverImage(trip)}
          alt={trip.title}
          className="w-full h-full object-cover opacity-85"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
        <div
          className="absolute top-3 left-3 max-w-[calc(100%-1.5rem)] truncate bg-white/90 rounded-full px-2 py-1"
          style={{ fontSize: 11, fontWeight: 600, color: "#16213E" }}
        >
          🧭 {trip.destination}
        </div>
        <div className="absolute bottom-3 left-3 right-20 min-w-0">
          <p className="text-white truncate" style={{ fontWeight: 700, fontSize: 15 }}>
            {days ? `${days} ${days === 1 ? "day" : "days"} in ${trip.destination}` : trip.destination}
          </p>
          <p className="text-white/80 truncate" style={{ fontSize: 11 }}>
            {[dateText, `${travelerCount} ${travelerCount === 1 ? "traveler" : "travelers"}`]
              .filter(Boolean)
              .join(" · ")}
            {rating ? (
              <button
                type="button"
                onClick={() => setActiveTab("reviews")}
                className="inline-flex items-center gap-0.5 ml-1"
              >
                · <Star className="w-3 h-3" style={{ color: "#FF8A4C" }} fill="#FF8A4C" />
                <span className="text-white" style={{ fontWeight: 700 }}>{rating}</span>
              </button>
            ) : null}
          </p>
        </div>
        <div className="absolute bottom-3 right-3 flex -space-x-1.5">
          {(members || []).slice(0, 3).map((m: any) => (
            <UserAvatar
              key={m.id}
              person={m}
              className="w-6 h-6 rounded-full border-2 border-white"
              style={{ fontSize: 8 }}
            />
          ))}
        </div>
      </div>

      {/* Stat tiles */}
      <div className="mx-4 grid grid-cols-3 gap-2">
        {[
          { icon: "✅", value: `${readyPct}%`, label: "Ready" },
          { icon: "💳", value: formatRpShort(spent), label: "Spent" },
          { icon: "📍", value: String(stopsTotal), label: "Stops" },
        ].map((t) => (
          <div key={t.label} className="bg-card border border-border rounded-xl p-2.5 text-center min-w-0">
            <p style={{ fontSize: 15 }}>{t.icon}</p>
            <p className="truncate" style={{ fontWeight: 800, fontSize: 13, color: "#16213E" }}>
              {t.value}
            </p>
            <p className="text-muted-foreground" style={{ fontSize: 10 }}>
              {t.label}
            </p>
          </div>
        ))}
      </div>
    </>
  );

  return (
    <div className="flex-1 overflow-y-auto">
      {isMobile ? mobileTop : (
      <>
      {/* Cover */}
      <div className="relative h-52 overflow-hidden bg-slate-700">
        <ImageWithFallback
          // Remount on change so a previously failed image doesn't stick.
          key={coverImage(trip)}
          src={coverImage(trip)}
          alt={trip.title}
          className="w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

        <button
          onClick={onBack}
          className="absolute top-5 left-6 flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white rounded-xl px-3 py-2 hover:bg-white/30 transition-colors"
          style={{ fontSize: 13, fontWeight: 600 }}
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {canEdit ? (
          <div className="absolute top-5 right-6 flex items-center gap-2">
            {coverPicker.input}
            {trip.cover_image ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild disabled={coverBusy}>
                  <button
                    className="flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white rounded-xl px-3 py-2 hover:bg-white/30 transition-colors disabled:opacity-70"
                    style={{ fontSize: 13, fontWeight: 600 }}
                  >
                    {coverBusy ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Camera className="w-3.5 h-3.5" />
                    )}
                    Cover
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl">
                  <DropdownMenuItem onSelect={coverPicker.open}>
                    <ImageUp className="w-4 h-4" /> Upload new cover
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() => runCoverAction(removeCover, "Cover removed")}
                  >
                    <Trash2 className="w-4 h-4" /> Remove cover
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <button
                onClick={coverPicker.open}
                disabled={coverBusy}
                className="flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white rounded-xl px-3 py-2 hover:bg-white/30 transition-colors disabled:opacity-70"
                style={{ fontSize: 13, fontWeight: 600 }}
              >
                {coverBusy ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Camera className="w-3.5 h-3.5" />
                )}
                {coverBusy ? "Uploading…" : "Add cover"}
              </button>
            )}
            <button
              onClick={() => setEditOpen(true)}
              className="flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white rounded-xl px-3 py-2 hover:bg-white/30 transition-colors"
              style={{ fontSize: 13, fontWeight: 600 }}
            >
              <Pencil className="w-3.5 h-3.5" /> Edit trip
            </button>
          </div>
        ) : null}

        <div className="absolute bottom-5 left-6">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="bg-white/90 text-foreground rounded-full px-2.5 py-1"
              style={{ fontSize: 12, fontWeight: 600 }}
            >
              🧭 {trip.destination}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 ${getTripStatusColor(
                trip.status
              )}`}
              style={{ fontSize: 11, fontWeight: 600 }}
            >
              {trip.status}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 ${getTripDifficultyColor(
                trip.difficulty
              )}`}
              style={{ fontSize: 11, fontWeight: 600 }}
            >
              {trip.difficulty}
            </span>
          </div>
          <h1
            className="text-white mb-0.5"
            style={{ fontWeight: 800, fontSize: 28, letterSpacing: "-0.03em" }}
          >
            {trip.title}
          </h1>
          <p className="text-white/80 flex flex-wrap items-center gap-x-1" style={{ fontSize: 13 }}>
            {trip.dates} · {travelerCount} travelers
            {rating ? (
              <button
                type="button"
                onClick={() => setActiveTab("reviews")}
                className="inline-flex items-center gap-1 hover:text-white"
              >
                {" "}·{" "}
                <Star className="w-3.5 h-3.5" style={{ color: "#FF8A4C" }} fill="#FF8A4C" />
                <span className="text-white" style={{ fontWeight: 700 }}>{rating}</span>
                <span>({reviewsLabel(trip.reviews_count)})</span>
              </button>
            ) : null}
          </p>
        </div>

        <div className="absolute bottom-5 right-3 md:right-6 flex -space-x-2">
          {(members || []).slice(0, 6).map((m: any) => (
            <UserAvatar
              key={m.id}
              person={m}
              className="w-8 h-8 rounded-full border-2 border-white"
              style={{ fontSize: 10 }}
            />
          ))}
        </div>
      </div>

      {/* Stats strip */}
      <div className="mx-3 md:mx-6 mt-5 bg-secondary rounded-2xl px-3 md:px-6 py-4 grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {[
          {
            icon: Calendar,
            label: "Dates",
            value: trip.dates || formatDate(trip.start_date),
          },
          { icon: Users, label: "Travelers", value: `${travelerCount} people` },
          { icon: Wallet, label: "Budget", value: formatRp(budget) },
          { icon: MapPin, label: "Spent", value: `${spentPct}% of budget` },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
              <s.icon className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p
                className="text-muted-foreground"
                style={{ fontSize: 11, fontWeight: 500 }}
              >
                {s.label}
              </p>
              <p
                className="text-secondary-foreground"
                style={{ fontWeight: 700, fontSize: 13 }}
              >
                {s.value}
              </p>
            </div>
          </div>
        ))}
      </div>
      </>
      )}

      {/* Tabs */}
      <div
        className="flex gap-1 mx-4 md:mx-6 mt-4 md:mt-5 bg-muted rounded-xl p-1 w-fit max-w-[calc(100%-2rem)] md:max-w-[calc(100%-1.5rem)] overflow-x-auto"
        style={{ scrollbarWidth: "none" }}
      >
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-3 md:px-4 py-1.5 rounded-lg capitalize transition-all shrink-0 ${
              activeTab === t
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            style={{ fontSize: 13, fontWeight: activeTab === t ? 600 : 500 }}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="px-4 md:px-6 py-4 md:py-5">
        {activeTab === "itinerary" && <ItineraryTab canEdit={canEdit} />}
        {activeTab === "budget" && <BudgetTab trip={trip} canEdit={canEdit} />}
        {activeTab === "packing" && <PackingTab canEdit={canEdit} />}
        {activeTab === "checklist" && <ChecklistTab canEdit={canEdit} />}
        {activeTab === "travelers" && (
          <TravelersTab trip={trip} canEdit={canEdit} />
        )}
        {activeTab === "reviews" && showReviews && (
          <ReviewsTab trip={trip} onChanged={() => fetchTripDetails(trip.id)} />
        )}
      </div>

      <TripFormModal
        open={editOpen}
        onOpenChange={setEditOpen}
        trip={trip}
        onSave={(payload) => updateTrip(payload)}
        onCoverUpload={(tripId, file) => uploadCover(file, tripId)}
        onCoverRemove={(tripId) => removeCover(tripId)}
      />
    </div>
  );
}
