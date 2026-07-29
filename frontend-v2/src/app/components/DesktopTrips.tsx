import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Calendar,
  Users,
  MapPin,
  MoreHorizontal,
  CheckCircle,
  Clock,
} from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import { ImageWithFallback } from "./figma/ImageWithFallback";

import { ConfirmDialog } from "@/components/modals/ConfirmDialog";
import { TripFormModal } from "@/components/modals/TripFormModal";
import { useTrips } from "@/contexts/TripsContext";
import { tripToCard } from "@/lib/adapters";

type TripFilter = "all" | "upcoming" | "planning" | "past";

const statusConfig: Record<
  string,
  { icon: React.ElementType; color: string; bg: string }
> = {
  upcoming: { icon: Calendar, color: "#16B364", bg: "#E6F7EE" },
  planning: { icon: Clock, color: "#F5A623", bg: "#FFF8E6" },
  past: { icon: CheckCircle, color: "#8A93A6", bg: "#F4F8F5" },
};

export function DesktopTrips() {
  const navigate = useNavigate();
  const { myTrips, fetchMyTrips, createTrip, updateTrip, deleteTrip } =
    useTrips();

  const [filter, setFilter] = useState<TripFilter>("all");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  /** The raw trip being edited; null means the form is in create mode. */
  const [editing, setEditing] = useState<any>(null);
  const [deleting, setDeleting] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetchMyTrips().finally(() => setIsLoading(false));
  }, [fetchMyTrips]);

  const trips = useMemo(() => (myTrips || []).map(tripToCard), [myTrips]);
  const filtered = trips.filter(
    (t: any) => filter === "all" || t.status === filter
  );

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleMenuAction = (action: string, trip: any) => {
    setOpenMenu(null);
    switch (action) {
      case "Edit trip":
        // Cards are display projections; the form needs the raw API object.
        setEditing(trip.raw);
        setFormOpen(true);
        break;
      case "Open":
        navigate(`/trips/${trip.id}`);
        break;
      case "Delete":
        setDeleting(trip);
        break;
    }
  };

  const handleSave = async (payload: Record<string, any>) => {
    const saved = editing
      ? await updateTrip(editing.id, payload)
      : await createTrip(payload);
    toast.success(editing ? "Trip updated" : "Trip created", {
      description: saved?.title,
    });
    return saved;
  };

  const handleDelete = async () => {
    await deleteTrip(deleting.id);
    toast.success("Trip deleted", {
      description: `"${deleting.name}" has been removed`,
    });
  };

  return (
    <div className="flex-1 overflow-y-auto px-10 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className="text-foreground mb-1"
            style={{ fontWeight: 800, fontSize: 30, letterSpacing: "-0.03em" }}
          >
            Your <span className="text-primary">trips</span>
          </h1>
          <p className="text-muted-foreground" style={{ fontSize: 14 }}>
            {trips.length} trips ·{" "}
            {trips.filter((t: any) => t.status !== "past").length} active
          </p>
        </div>
        <button
          onClick={openCreate}
          className="bg-primary text-white rounded-2xl px-5 py-2.5 flex items-center gap-2 hover:bg-[#13a058] transition-colors"
          style={{ fontSize: 14, fontWeight: 600 }}
        >
          <Plus className="w-4 h-4" /> New trip
        </button>
      </div>

      <div className="flex gap-1 bg-muted rounded-xl p-1 w-fit mb-7">
        {(["all", "upcoming", "planning", "past"] as TripFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg capitalize transition-all ${
              filter === f
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
            style={{ fontSize: 13, fontWeight: filter === f ? 600 : 500 }}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filtered.map((trip: any) => {
          const sc = statusConfig[trip.status];
          const StatusIcon = sc.icon;
          return (
            <div
              key={trip.id}
              className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-md hover:border-primary/20 transition-all group"
            >
              <div className="flex">
                <div className="relative w-56 shrink-0 overflow-hidden bg-slate-200">
                  <ImageWithFallback
                    src={trip.img}
                    alt={trip.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/20" />
                  <div
                    className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1"
                    style={{ fontSize: 11, fontWeight: 600 }}
                  >
                    {trip.flag} {trip.country}
                  </div>
                </div>

                <div className="flex-1 p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3
                          className="text-foreground"
                          style={{ fontWeight: 700, fontSize: 17 }}
                        >
                          {trip.name}
                        </h3>
                        <span
                          className="flex items-center gap-1 rounded-full px-2.5 py-1"
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: sc.color,
                            background: sc.bg,
                          }}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {trip.statusLabel}
                        </span>
                      </div>
                      <p
                        className="text-muted-foreground"
                        style={{ fontSize: 13 }}
                      >
                        {trip.dates}
                      </p>
                    </div>
                    <div className="relative">
                      <button
                        onClick={() =>
                          setOpenMenu(openMenu === trip.id ? null : trip.id)
                        }
                        className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center hover:bg-border transition-colors"
                      >
                        <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                      </button>
                      {openMenu === trip.id && (
                        <div className="absolute right-0 top-10 bg-card border border-border rounded-xl shadow-lg z-20 py-1 w-36">
                          {["Open", "Edit trip", "Delete"].map((item) => (
                            <button
                              key={item}
                              onClick={() => handleMenuAction(item, trip)}
                              className={`w-full text-left px-4 py-2 hover:bg-muted transition-colors ${
                                item === "Delete"
                                  ? "text-destructive"
                                  : "text-foreground"
                              }`}
                              style={{ fontSize: 13 }}
                            >
                              {item}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div
                    className="flex items-center gap-5 mb-4 text-muted-foreground"
                    style={{ fontSize: 13 }}
                  >
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" /> {trip.travelers} travelers
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" /> {trip.country}
                    </span>
                    <span
                      className="flex items-center gap-1.5 text-foreground"
                      style={{ fontWeight: 600 }}
                    >
                      Budget: {trip.budget}
                    </span>
                    <span className="flex items-center gap-1.5">
                      Spent:{" "}
                      <span style={{ fontWeight: 600 }}>{trip.spent}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${trip.progress}%`, background: "#16B364" }}
                      />
                    </div>
                    <span
                      className="text-muted-foreground shrink-0"
                      style={{ fontSize: 12, fontWeight: 600 }}
                    >
                      {trip.progress}% of budget
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {trip.members.map((m: string, i: number) => (
                        <div
                          key={i}
                          className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center"
                          style={{
                            background: trip.memberColors[i],
                            fontSize: 10,
                            fontWeight: 700,
                            color: "#fff",
                          }}
                        >
                          {m}
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => navigate(`/trips/${trip.id}`)}
                      className="bg-secondary text-secondary-foreground rounded-xl px-4 py-1.5 hover:bg-primary hover:text-white transition-colors"
                      style={{ fontSize: 13, fontWeight: 600 }}
                    >
                      {trip.status === "past"
                        ? "View memories"
                        : "Continue planning →"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mb-4 text-3xl">
            ✈️
          </div>
          <p
            className="text-foreground mb-2"
            style={{ fontWeight: 700, fontSize: 18 }}
          >
            No trips here yet
          </p>
          <p className="text-muted-foreground mb-5" style={{ fontSize: 14 }}>
            Start planning your next adventure
          </p>
          <button
            onClick={openCreate}
            className="bg-primary text-white rounded-2xl px-6 py-3 flex items-center gap-2"
            style={{ fontSize: 14, fontWeight: 600 }}
          >
            <Plus className="w-4 h-4" /> Plan a trip
          </button>
        </div>
      )}

      <TripFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        trip={editing}
        onSave={handleSave}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete trip?"
        confirmLabel="Delete trip"
        description={`This permanently deletes "${deleting?.name}" along with its itineraries, expenses, and shared access.`}
        onConfirm={handleDelete}
      />
    </div>
  );
}
