import { useState } from "react";
import { Plus, Calendar, Users, MapPin, MoreHorizontal, CheckCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

interface Props { onOpenTrip?: (id: string) => void; }
type TripFilter = "all" | "upcoming" | "planning" | "past";

const trips = [
  {
    id: "canada",
    name: "Canada Trip",
    flag: "🇨🇦",
    country: "Canada",
    dates: "24–30 Jul 2026",
    travelers: 5,
    stops: 8,
    budget: "Rp 18.500.000",
    spent: "Rp 1.200.000",
    progress: 72,
    status: "upcoming",
    statusLabel: "Upcoming",
    img: "https://images.unsplash.com/photo-1517935706615-2717063c2225?w=600&h=400&fit=crop&auto=format",
    members: ["RA", "CY", "VW", "SF", "WY"],
    memberColors: ["#16B364", "#FF8A4C", "#0B6B3A", "#F5A623", "#1a7aaa"],
  },
  {
    id: "osaka",
    name: "Osaka Foodie",
    flag: "🇯🇵",
    country: "Japan",
    dates: "12–16 Sep 2026",
    travelers: 4,
    stops: 14,
    budget: "Rp 33.600.000",
    spent: "Rp 0",
    progress: 45,
    status: "planning",
    statusLabel: "Planning",
    img: "https://images.unsplash.com/photo-1659094438327-493ee9cc0c4c?w=600&h=400&fit=crop&auto=format",
    members: ["RA", "CY", "VW", "SF"],
    memberColors: ["#16B364", "#FF8A4C", "#0B6B3A", "#F5A623"],
  },
  {
    id: "bangkok",
    name: "Bangkok Getaway",
    flag: "🇹🇭",
    country: "Thailand",
    dates: "5–10 Oct 2026",
    travelers: 3,
    stops: 6,
    budget: "Rp 9.000.000",
    spent: "Rp 0",
    progress: 20,
    status: "planning",
    statusLabel: "Planning",
    img: "https://images.unsplash.com/photo-1563492065599-3520f775eeed?w=600&h=400&fit=crop&auto=format",
    members: ["RA", "VW", "WY"],
    memberColors: ["#16B364", "#0B6B3A", "#1a7aaa"],
  },
  {
    id: "kl",
    name: "KL Long Weekend",
    flag: "🇲🇾",
    country: "Malaysia",
    dates: "15–18 Mar 2026",
    travelers: 4,
    stops: 10,
    budget: "Rp 12.000.000",
    spent: "Rp 12.000.000",
    progress: 100,
    status: "past",
    statusLabel: "Completed",
    img: "https://images.unsplash.com/photo-1470217957101-da7150b9b681?w=600&h=400&fit=crop&auto=format",
    members: ["RA", "CY", "SF", "WY"],
    memberColors: ["#16B364", "#FF8A4C", "#F5A623", "#1a7aaa"],
  },
];

const statusConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  upcoming: { icon: Calendar, color: "#16B364", bg: "#E6F7EE" },
  planning: { icon: Clock, color: "#F5A623", bg: "#FFF8E6" },
  past: { icon: CheckCircle, color: "#8A93A6", bg: "#F4F8F5" },
};

export function DesktopTrips({ onOpenTrip }: Props) {
  const [filter, setFilter] = useState<TripFilter>("all");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [editDialog, setEditDialog] = useState<{ open: boolean; trip: typeof trips[0] | null }>({ open: false, trip: null });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; trip: typeof trips[0] | null }>({ open: false, trip: null });
  const [tripName, setTripName] = useState("");

  const filtered = trips.filter((t) => filter === "all" || t.status === filter);

  const handleMenuAction = (action: string, trip: typeof trips[0]) => {
    setOpenMenu(null);

    switch (action) {
      case "Edit trip":
        setTripName(trip.name);
        setEditDialog({ open: true, trip });
        break;
      case "Duplicate":
        toast.success("Trip duplicated!", {
          description: `Created a copy of "${trip.name}"`,
        });
        break;
      case "Share":
        toast.success("Share link copied!", {
          description: "Trip link has been copied to clipboard",
        });
        break;
      case "Delete":
        setDeleteDialog({ open: true, trip });
        break;
    }
  };

  const handleEditSave = () => {
    if (tripName.trim() && editDialog.trip) {
      toast.success("Trip updated!", {
        description: `"${editDialog.trip.name}" has been updated to "${tripName}"`,
      });
      setEditDialog({ open: false, trip: null });
      setTripName("");
    }
  };

  const handleDelete = () => {
    if (deleteDialog.trip) {
      toast.success("Trip deleted", {
        description: `"${deleteDialog.trip.name}" has been permanently removed`,
      });
      setDeleteDialog({ open: false, trip: null });
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-10 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-foreground mb-1" style={{ fontWeight: 800, fontSize: 30, letterSpacing: "-0.03em" }}>
            Your <span className="text-primary">trips</span>
          </h1>
          <p className="text-muted-foreground" style={{ fontSize: 14 }}>
            {trips.length} trips · {trips.filter((t) => t.status !== "past").length} active
          </p>
        </div>
        <button
          onClick={() => toast.success("Creating new trip...", { description: "Opening trip builder" })}
          className="bg-primary text-white rounded-2xl px-5 py-2.5 flex items-center gap-2 hover:bg-[#13a058] transition-colors"
          style={{ fontSize: 14, fontWeight: 600 }}
        >
          <Plus className="w-4 h-4" /> New trip
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-muted rounded-xl p-1 w-fit mb-7">
        {(["all", "upcoming", "planning", "past"] as TripFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-lg capitalize transition-all ${
              filter === f ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
            style={{ fontSize: 13, fontWeight: filter === f ? 600 : 500 }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Trip cards */}
      <div className="space-y-4">
        {filtered.map((trip) => {
          const sc = statusConfig[trip.status];
          const StatusIcon = sc.icon;
          return (
            <div
              key={trip.id}
              className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-md hover:border-primary/20 transition-all group"
            >
              <div className="flex">
                {/* Cover image */}
                <div className="relative w-56 shrink-0 overflow-hidden bg-slate-200">
                  <img
                    src={trip.img}
                    alt={trip.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/20" />
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1" style={{ fontSize: 11, fontWeight: 600 }}>
                    {trip.flag} {trip.country}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-foreground" style={{ fontWeight: 700, fontSize: 17 }}>{trip.name}</h3>
                        <span
                          className="flex items-center gap-1 rounded-full px-2.5 py-1"
                          style={{ fontSize: 11, fontWeight: 600, color: sc.color, background: sc.bg }}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {trip.statusLabel}
                        </span>
                      </div>
                      <p className="text-muted-foreground" style={{ fontSize: 13 }}>
                        {trip.dates}
                      </p>
                    </div>
                    <div className="relative">
                      <button
                        onClick={() => setOpenMenu(openMenu === trip.id ? null : trip.id)}
                        className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center hover:bg-border transition-colors"
                      >
                        <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                      </button>
                      {openMenu === trip.id && (
                        <div className="absolute right-0 top-10 bg-card border border-border rounded-xl shadow-lg z-20 py-1 w-36">
                          {["Edit trip", "Duplicate", "Share", "Delete"].map((item) => (
                            <button
                              key={item}
                              onClick={() => handleMenuAction(item, trip)}
                              className={`w-full text-left px-4 py-2 hover:bg-muted transition-colors ${item === "Delete" ? "text-destructive" : "text-foreground"}`}
                              style={{ fontSize: 13 }}
                            >
                              {item}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-5 mb-4 text-muted-foreground" style={{ fontSize: 13 }}>
                    <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> {trip.travelers} travelers</span>
                    <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" /> {trip.stops} stops</span>
                    <span className="flex items-center gap-1.5 text-foreground" style={{ fontWeight: 600 }}>
                      Budget: {trip.budget}
                    </span>
                    {trip.spent !== "Rp 0" && (
                      <span className="flex items-center gap-1.5">
                        Spent: <span style={{ fontWeight: 600, color: trip.status === "past" ? "#16B364" : "#16213E" }}>{trip.spent}</span>
                      </span>
                    )}
                  </div>

                  {/* Progress bar */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${trip.progress}%`, background: trip.progress === 100 ? "#16B364" : "#16B364" }}
                      />
                    </div>
                    <span className="text-muted-foreground shrink-0" style={{ fontSize: 12, fontWeight: 600 }}>
                      {trip.progress}% ready
                    </span>
                  </div>

                  {/* Member avatars + CTA */}
                  <div className="flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {trip.members.map((m, i) => (
                        <div
                          key={m}
                          className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center"
                          style={{ background: trip.memberColors[i], fontSize: 10, fontWeight: 700, color: "#fff" }}
                        >
                          {m}
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => onOpenTrip?.(trip.id)}
                      className="bg-secondary text-secondary-foreground rounded-xl px-4 py-1.5 hover:bg-primary hover:text-white transition-colors"
                      style={{ fontSize: 13, fontWeight: 600 }}
                    >
                      {trip.status === "past" ? "View memories" : "Continue planning →"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state prompt */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mb-4 text-3xl">✈️</div>
          <p className="text-foreground mb-2" style={{ fontWeight: 700, fontSize: 18 }}>No trips here yet</p>
          <p className="text-muted-foreground mb-5" style={{ fontSize: 14 }}>Start planning your next adventure</p>
          <button className="bg-primary text-white rounded-2xl px-6 py-3 flex items-center gap-2" style={{ fontSize: 14, fontWeight: 600 }}>
            <Plus className="w-4 h-4" /> Plan a trip
          </button>
        </div>
      )}

      {/* Edit Trip Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ open, trip: editDialog.trip })}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Trip</DialogTitle>
            <DialogDescription>
              Update your trip details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">Trip Name</label>
              <input
                type="text"
                value={tripName}
                onChange={(e) => setTripName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg mt-1 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Enter trip name"
                onKeyDown={(e) => e.key === "Enter" && handleEditSave()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, trip: null })}>
              Cancel
            </Button>
            <Button onClick={handleEditSave}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Trip Alert Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, trip: deleteDialog.trip })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete trip?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete "{deleteDialog.trip?.name}"
              and remove all associated bookings, itineraries, and shared access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete Trip
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
