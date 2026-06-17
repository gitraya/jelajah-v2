import { useMemo, useState } from "react";
import {
  ArrowLeft,
  MapPin,
  Users,
  Calendar,
  Wallet,
  Plus,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";

import { ITINERARY_TYPES_ICONS } from "@/config";
import { useTrip } from "@/contexts/TripContext";
import { useMembers } from "@/contexts/MembersContext";
import { useItineraries } from "@/contexts/ItinerariesContext";
import { useExpenses } from "@/contexts/ExpensesContext";
import { colorFor, formatRp, memberInitials } from "@/lib/adapters";
import { getMemberRoleColor, getMemberStatusColor } from "@/lib/colors";
import { formatDate, getInitials } from "@/lib/utils";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface Props {
  tripId: string;
  onBack: () => void;
}

const statusIcon: Record<string, { icon: any; color: string }> = {
  VISITED: { icon: CheckCircle, color: "#16B364" },
  PLANNED: { icon: Clock, color: "#F5A623" },
  SKIPPED: { icon: AlertCircle, color: "#E5605B" },
};

type DetailTab = "itinerary" | "budget" | "travelers";

const memberName = (m: any) => {
  const u = m.user || m;
  return `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email || "Traveler";
};

const COVER = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&h=400&fit=crop&auto=format";

export function DesktopTripDetail({ onBack }: Props) {
  const [activeTab, setActiveTab] = useState<DetailTab>("itinerary");
  const { trip, isLoading } = useTrip();
  const { members, types: _t } = useMembers() as any;
  const { types, locations } = useItineraries();
  const { statistics: expenseStats, expenses } = useExpenses();

  const typeName = (typeId: any) =>
    types?.find((t: any) => t.id === typeId)?.name || "Other";

  // Group itinerary items by calendar day.
  const days = useMemo(() => {
    const groups: Record<string, any[]> = {};
    (locations || []).forEach((item: any) => {
      const key = item.visit_time
        ? new Date(item.visit_time).toDateString()
        : "Unscheduled";
      (groups[key] = groups[key] || []).push(item);
    });
    return Object.entries(groups)
      .sort(
        (a, b) =>
          new Date(a[0]).getTime() - new Date(b[0]).getTime() || 0
      )
      .map(([date, items], i) => ({ num: i + 1, date, items }));
  }, [locations]);

  const budget = Number(trip?.budget || 0);
  const spent = Number(
    expenseStats?.amount_spent ?? trip?.spent_budget ?? 0
  );
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
          src={COVER}
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

        <div className="absolute bottom-5 left-6">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="bg-white/90 text-foreground rounded-full px-2.5 py-1"
              style={{ fontSize: 12, fontWeight: 600 }}
            >
              🧭 {trip.destination}
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
          { icon: Calendar, label: "Dates", value: trip.dates || formatDate(trip.start_date) },
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
        {(["itinerary", "budget", "travelers"] as DetailTab[]).map((t) => (
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
        {/* ITINERARY */}
        {activeTab === "itinerary" && (
          <div className="space-y-6">
            {days.length === 0 && (
              <p className="text-muted-foreground" style={{ fontSize: 14 }}>
                No itinerary items yet.
              </p>
            )}
            {days.map((day) => (
              <div key={day.num}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-7 h-7 rounded-xl bg-primary flex items-center justify-center shrink-0">
                    <span className="text-white" style={{ fontWeight: 800, fontSize: 12 }}>
                      {day.num}
                    </span>
                  </div>
                  <div>
                    <p className="text-foreground" style={{ fontWeight: 700, fontSize: 14 }}>
                      Day {day.num}
                    </p>
                    <p className="text-muted-foreground" style={{ fontSize: 12 }}>
                      {day.date === "Unscheduled"
                        ? "Unscheduled"
                        : formatDate(day.items[0]?.visit_time)}
                    </p>
                  </div>
                </div>
                <div className="space-y-2 ml-10">
                  {day.items.map((stop: any) => {
                    const si = statusIcon[stop.status] || statusIcon.PLANNED;
                    const SIcon = si.icon;
                    const tName = typeName(stop.type);
                    return (
                      <div
                        key={stop.id}
                        className="bg-card border border-border rounded-xl px-4 py-3 flex items-start gap-3 hover:border-primary/20 transition-colors"
                      >
                        <span
                          className="text-primary shrink-0 mt-0.5"
                          style={{ fontSize: 12, fontWeight: 600, minWidth: 52 }}
                        >
                          {stop.visit_time
                            ? new Date(stop.visit_time).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </span>
                        <span className="text-lg shrink-0">
                          {ITINERARY_TYPES_ICONS[tName] || "📍"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground" style={{ fontWeight: 600, fontSize: 14 }}>
                            {stop.name}
                          </p>
                          <p className="text-muted-foreground" style={{ fontSize: 12 }}>
                            {stop.address || stop.estimated_time || tName}
                          </p>
                        </div>
                        <SIcon className="w-4 h-4 shrink-0 mt-0.5" style={{ color: si.color }} />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* BUDGET */}
        {activeTab === "budget" && (
          <div>
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: "Total budget", value: formatRp(budget), sub: `${travelerCount} travelers`, color: "#16213E" },
                {
                  label: "Per person",
                  value: formatRp(travelerCount ? budget / travelerCount : 0),
                  sub: "estimated",
                  color: "#16213E",
                },
                {
                  label: "Spent so far",
                  value: formatRp(spent),
                  sub: `${spentPct}% of budget`,
                  color: spentPct > 80 ? "#E5605B" : "#16B364",
                },
              ].map((s) => (
                <div key={s.label} className="bg-card border border-border rounded-2xl p-4">
                  <p className="text-muted-foreground mb-1" style={{ fontSize: 12 }}>
                    {s.label}
                  </p>
                  <p style={{ fontWeight: 800, fontSize: 20, color: s.color, letterSpacing: "-0.03em" }}>
                    {s.value}
                  </p>
                  <p className="text-muted-foreground" style={{ fontSize: 11 }}>
                    {s.sub}
                  </p>
                </div>
              ))}
            </div>

            <div className="bg-card border border-border rounded-2xl p-5 mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-foreground" style={{ fontWeight: 600, fontSize: 14 }}>
                  Budget usage
                </p>
                <p className="text-muted-foreground" style={{ fontSize: 13 }}>
                  {spentPct}% used
                </p>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, spentPct)}%`,
                    background: spentPct > 80 ? "#E5605B" : "#16B364",
                  }}
                />
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-5">
              <p className="text-foreground mb-4" style={{ fontWeight: 700, fontSize: 15 }}>
                Spending by member
              </p>
              <div className="space-y-3">
                {(members || []).map((m: any) => (
                  <div key={m.id} className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0"
                      style={{
                        background: colorFor(m.user?.email || String(m.id)),
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    >
                      {memberInitials(m)}
                    </div>
                    <p className="flex-1 text-foreground" style={{ fontSize: 14 }}>
                      {memberName(m)}
                    </p>
                    <span className="text-foreground" style={{ fontSize: 13, fontWeight: 600 }}>
                      {formatRp(m.expenses)}
                    </span>
                  </div>
                ))}
                {(!members || members.length === 0) && (
                  <p className="text-muted-foreground" style={{ fontSize: 13 }}>
                    No members yet.
                  </p>
                )}
              </div>
              {expenses?.length > 0 && (
                <p className="text-muted-foreground mt-4" style={{ fontSize: 12 }}>
                  {expenses.length} expense{expenses.length > 1 ? "s" : ""} recorded
                </p>
              )}
            </div>
          </div>
        )}

        {/* TRAVELERS */}
        {activeTab === "travelers" && (
          <div>
            <div className="grid grid-cols-2 gap-4 mb-5">
              {(members || []).map((m: any) => (
                <div
                  key={m.id}
                  className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3"
                >
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0"
                    style={{
                      background: colorFor(m.user?.email || String(m.id)),
                      fontSize: 14,
                      fontWeight: 800,
                    }}
                  >
                    {getInitials(memberName(m)).slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground truncate" style={{ fontWeight: 600, fontSize: 14 }}>
                      {memberName(m)}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 ${getMemberRoleColor(
                          m.role
                        )}`}
                        style={{ fontSize: 10, fontWeight: 600 }}
                      >
                        {m.role}
                      </span>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 ${getMemberStatusColor(
                          m.status
                        )}`}
                        style={{ fontSize: 10, fontWeight: 600 }}
                      >
                        {m.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {(!members || members.length === 0) && (
                <p className="text-muted-foreground" style={{ fontSize: 14 }}>
                  No travelers yet.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
