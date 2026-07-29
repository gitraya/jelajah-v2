import { useState } from "react";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Pencil,
  Users,
  Wallet,
} from "lucide-react";

import { BudgetTab } from "@/components/trip/BudgetTab";
import { ChecklistTab } from "@/components/trip/ChecklistTab";
import { ItineraryTab } from "@/components/trip/ItineraryTab";
import { PackingTab } from "@/components/trip/PackingTab";
import { TravelersTab } from "@/components/trip/TravelersTab";
import { TripFormModal } from "@/components/modals/TripFormModal";
import { useExpenses } from "@/contexts/ExpensesContext";
import { useMembers } from "@/contexts/MembersContext";
import { useTrip } from "@/contexts/TripContext";
import { coverImage, colorFor, formatRp, memberInitials } from "@/lib/adapters";
import { getTripDifficultyColor, getTripStatusColor } from "@/lib/colors";
import { formatDate } from "@/lib/utils";
import { ImageWithFallback } from "./figma/ImageWithFallback";

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
] as const;
type DetailTab = (typeof TABS)[number];

export function DesktopTripDetail({ onBack }: Props) {
  const [activeTab, setActiveTab] = useState<DetailTab>("itinerary");
  const [editOpen, setEditOpen] = useState(false);

  const { trip, isLoading, updateTrip } = useTrip();
  const { members } = useMembers();
  const { statistics: expenseStats } = useExpenses();

  // `is_editable` is computed server-side from ownership + role, so trust it
  // rather than re-deriving permissions in the client.
  const canEdit = Boolean(trip?.is_editable);

  const budget = Number(trip?.budget || 0);
  const spent = Number(expenseStats?.amount_spent ?? trip?.spent_budget ?? 0);
  const spentPct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
  const travelerCount = members?.length || trip?.members_count || 0;

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

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Cover */}
      <div className="relative h-52 overflow-hidden bg-slate-700">
        <ImageWithFallback
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
          <button
            onClick={() => setEditOpen(true)}
            className="absolute top-5 right-6 flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white rounded-xl px-3 py-2 hover:bg-white/30 transition-colors"
            style={{ fontSize: 13, fontWeight: 600 }}
          >
            <Pencil className="w-3.5 h-3.5" /> Edit trip
          </button>
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
          <p className="text-white/80" style={{ fontSize: 13 }}>
            {trip.dates} · {travelerCount} travelers
          </p>
        </div>

        <div className="absolute bottom-5 right-6 flex -space-x-2">
          {(members || []).slice(0, 6).map((m: any) => (
            <div
              key={m.id}
              className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center"
              style={{
                background: colorFor(m.user?.email || String(m.id)),
                fontSize: 10,
                fontWeight: 700,
                color: "#fff",
              }}
            >
              {memberInitials(m)}
            </div>
          ))}
        </div>
      </div>

      {/* Stats strip */}
      <div className="mx-6 mt-5 bg-secondary rounded-2xl px-6 py-4 grid grid-cols-4 gap-4">
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

      {/* Tabs */}
      <div className="flex gap-1 mx-6 mt-5 bg-muted rounded-xl p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-1.5 rounded-lg capitalize transition-all ${
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

      <div className="px-6 py-5">
        {activeTab === "itinerary" && <ItineraryTab canEdit={canEdit} />}
        {activeTab === "budget" && <BudgetTab trip={trip} canEdit={canEdit} />}
        {activeTab === "packing" && <PackingTab canEdit={canEdit} />}
        {activeTab === "checklist" && <ChecklistTab canEdit={canEdit} />}
        {activeTab === "travelers" && (
          <TravelersTab trip={trip} canEdit={canEdit} />
        )}
      </div>

      <TripFormModal
        open={editOpen}
        onOpenChange={setEditOpen}
        trip={trip}
        onSave={(payload) => updateTrip(payload)}
      />
    </div>
  );
}
