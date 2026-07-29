import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle, Clock, Plus } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { ITINERARY_STATUSES, ITINERARY_TYPES_ICONS } from "@/config";
import { useItineraries } from "@/contexts/ItinerariesContext";
import { ConfirmDialog } from "@/components/modals/ConfirmDialog";
import { ItineraryFormModal } from "@/components/modals/ItineraryFormModal";
import { formatDate } from "@/lib/utils";
import { AddButton, EmptyState, ItemActions } from "./ItemActions";

const statusIcon: Record<string, { icon: any; color: string }> = {
  VISITED: { icon: CheckCircle, color: "#16B364" },
  PLANNED: { icon: Clock, color: "#F5A623" },
  SKIPPED: { icon: AlertCircle, color: "#E5605B" },
};

export function ItineraryTab({ canEdit }: { canEdit: boolean }) {
  const {
    locations,
    types,
    statistics,
    selectedType,
    selectedStatus,
    setSelectedType,
    setSelectedStatus,
    deleteLocation,
    updateStatus,
  } = useItineraries();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleting, setDeleting] = useState<any>(null);

  const typeName = (item: any) => item.type?.name || "Other";

  // Group stops into calendar days; unscheduled stops collect at the end.
  const days = useMemo(() => {
    const groups: Record<string, any[]> = {};
    (locations || []).forEach((item: any) => {
      const key = item.visit_time
        ? new Date(item.visit_time).toDateString()
        : "Unscheduled";
      (groups[key] = groups[key] || []).push(item);
    });
    return Object.entries(groups)
      .sort(([a], [b]) => {
        if (a === "Unscheduled") return 1;
        if (b === "Unscheduled") return -1;
        return new Date(a).getTime() - new Date(b).getTime();
      })
      .map(([date, items], i) => ({
        key: date,
        num: i + 1,
        date,
        items: items.sort(
          (x: any, y: any) =>
            new Date(x.visit_time || 0).getTime() -
            new Date(y.visit_time || 0).getTime()
        ),
      }));
  }, [locations]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            {(types || []).map((t: any) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(ITINERARY_STATUSES).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        {statistics?.total ? (
          <p className="text-muted-foreground" style={{ fontSize: 12 }}>
            {statistics.visited ?? 0} visited · {statistics.planned ?? 0} planned
            · {statistics.skipped ?? 0} skipped
          </p>
        ) : null}

        {canEdit ? (
          <AddButton onClick={openCreate}>
            <Plus className="w-4 h-4" /> Add stop
          </AddButton>
        ) : null}
      </div>

      {days.length === 0 ? (
        <EmptyState
          message="No itinerary items yet."
          action={
            canEdit ? (
              <AddButton onClick={openCreate}>
                <Plus className="w-4 h-4" /> Add the first stop
              </AddButton>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-6">
          {days.map((day) => (
            <div key={day.key}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-7 h-7 rounded-xl bg-primary flex items-center justify-center shrink-0">
                  <span
                    className="text-primary-foreground"
                    style={{ fontWeight: 800, fontSize: 12 }}
                  >
                    {day.num}
                  </span>
                </div>
                <div>
                  <p
                    className="text-foreground"
                    style={{ fontWeight: 700, fontSize: 14 }}
                  >
                    {day.date === "Unscheduled" ? "Unscheduled" : `Day ${day.num}`}
                  </p>
                  <p className="text-muted-foreground" style={{ fontSize: 12 }}>
                    {day.date === "Unscheduled"
                      ? "No visit time set"
                      : formatDate(day.items[0]?.visit_time)}
                  </p>
                </div>
              </div>

              <div className="space-y-2 ml-10">
                {day.items.map((stop: any) => {
                  const si = statusIcon[stop.status] || statusIcon.PLANNED;
                  const SIcon = si.icon;
                  const tName = typeName(stop);
                  return (
                    <div
                      key={stop.id}
                      className="group bg-card border border-border rounded-xl px-4 py-3 flex items-start gap-3 hover:border-primary/20 transition-colors"
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
                        <p
                          className="text-foreground"
                          style={{ fontWeight: 600, fontSize: 14 }}
                        >
                          {stop.name}
                        </p>
                        <p
                          className="text-muted-foreground truncate"
                          style={{ fontSize: 12 }}
                        >
                          {stop.address || stop.estimated_time || tName}
                        </p>
                      </div>

                      {canEdit ? (
                        <ItemActions
                          label={stop.name}
                          onEdit={() => {
                            setEditing(stop);
                            setFormOpen(true);
                          }}
                          onDelete={() => setDeleting(stop)}
                        />
                      ) : null}

                      {/* Clicking the status icon cycles Planned → Visited → Skipped. */}
                      <button
                        type="button"
                        disabled={!canEdit}
                        aria-label={`Status: ${stop.status}`}
                        onClick={() => {
                          const order = ["PLANNED", "VISITED", "SKIPPED"];
                          const next =
                            order[(order.indexOf(stop.status) + 1) % order.length];
                          updateStatus(stop.id, next);
                        }}
                        className="shrink-0 mt-0.5 disabled:cursor-default"
                      >
                        <SIcon className="w-4 h-4" style={{ color: si.color }} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <ItineraryFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        item={editing}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this stop?"
        description={`"${deleting?.name}" will be removed from the itinerary. This can't be undone.`}
        onConfirm={() => deleteLocation(deleting.id)}
      />
    </div>
  );
}
