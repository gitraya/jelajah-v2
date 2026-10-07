import { useState } from "react";
import { ArrowLeft, CalendarDays, MapPin, Pencil, Sparkles } from "lucide-react";
import { useNavigate } from "react-router";

import { TripFormModal } from "@/components/modals/TripFormModal";
import { useAuth } from "@/contexts/AuthContext";
import { useTrips } from "@/contexts/TripsContext";

interface Props {
  initialQuery: string;
  onSave: (trip: any) => void;
}

export function DesktopAIBuilder({ initialQuery, onSave }: Props) {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { createTrip, uploadTripCover, removeTripCover } = useTrips();
  const [formOpen, setFormOpen] = useState(false);

  const startManualPlanning = () => {
    if (!isAuthenticated) {
      navigate("/login?redirect=%2Fai-builder");
      return;
    }
    setFormOpen(true);
  };

  return (
    <div className="flex-1 min-w-0 overflow-y-auto px-4 py-5 md:px-8 md:py-8">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
        style={{ fontSize: 13, fontWeight: 600 }}
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 bg-secondary rounded-2xl flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-foreground" style={{ fontWeight: 800, fontSize: 22 }}>
              Start planning your trip
            </p>
            <p className="text-muted-foreground" style={{ fontSize: 13 }}>
              Your idea is ready to become a trip in Jelajah.
            </p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 mb-4">
          <p className="text-muted-foreground mb-2" style={{ fontSize: 12, fontWeight: 600 }}>
            YOUR IDEA
          </p>
          <p className="text-foreground" style={{ fontSize: 16, lineHeight: 1.6 }}>
            {initialQuery}
          </p>
        </div>

        <div className="bg-secondary/60 border border-primary/10 rounded-2xl p-6 mb-6">
          <p className="text-foreground mb-2" style={{ fontWeight: 700, fontSize: 15 }}>
            Create the trip with the current planning tools
          </p>
          <p className="text-muted-foreground" style={{ fontSize: 14, lineHeight: 1.6 }}>
            Jelajah’s current API can save trip details and let you add itinerary stops,
            travelers, expenses, packing items, and checklists. Automatic itinerary
            generation and chat edits are not available yet, so this page won’t invent
            a plan or save sample data.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-7">
          {[
            { icon: MapPin, label: "Destination and dates" },
            { icon: CalendarDays, label: "Plan stops by day" },
            { icon: Pencil, label: "Invite your travelers" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
              <Icon className="w-4 h-4 text-primary shrink-0" />
              <span className="text-foreground" style={{ fontSize: 12, fontWeight: 600 }}>{label}</span>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={startManualPlanning}
          className="bg-primary text-primary-foreground rounded-xl px-5 py-3 hover:bg-primary/90 transition-colors"
          style={{ fontSize: 14, fontWeight: 700 }}
        >
          Create trip manually
        </button>
      </div>

      <TripFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        onSave={createTrip}
        onCoverUpload={uploadTripCover}
        onCoverRemove={removeTripCover}
        onSaved={onSave}
      />
    </div>
  );
}
