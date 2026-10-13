import { useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { useIsMobile } from "@/app/components/ui/use-mobile";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { ITINERARY_STATUSES } from "@/config";
import { useItineraries } from "@/contexts/ItinerariesContext";
import { ConfirmDialog } from "@/components/modals/ConfirmDialog";
import { ItineraryFormModal } from "@/components/modals/ItineraryFormModal";
import { formatRp, stopIcon, stopPrice } from "@/lib/adapters";
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
  const isMobile = useIsMobile();

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
          <SelectTrigger className="w-[calc(50%-0.375rem)] md:w-40">
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
          <SelectTrigger className="w-[calc(50%-0.375rem)] md:w-40">
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
            {Number(statistics.total_cost || 0) > 0 ? (
              <>
                {" · "}
                <span className="text-foreground" style={{ fontWeight: 700 }}>
                  {formatRp(statistics.total_cost)}
                </span>{" "}
                per person
              </>
            ) : null}
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
      ) : isMobile ? (
        <div className="space-y-4">
          {days.map((day) => (
            <div key={day.key}>
              <div
                className={`inline-flex items-center rounded-full px-3 py-1.5 mb-2 ${
                  day.date === "Unscheduled"
                    ? "bg-muted text-muted-foreground"
                    : "bg-primary text-white"
                }`}
                style={{ fontSize: 12, fontWeight: 700 }}
              >
                {day.date === "Unscheduled"
                  ? "Unscheduled"
                  : `Day ${day.num} · ${new Date(day.items[0]?.visit_time).toLocaleDateString(
                      "en-GB",
                      { weekday: "short", day: "numeric", month: "short" }
                    )}`}
              </div>
              <div className="space-y-2">
                {day.items.map((stop: any) => (
                  <MobileStopCard
                    key={stop.id}
                    stop={stop}
                    typeName={typeName(stop)}
                    canEdit={canEdit}
                    onEdit={() => {
                      setEditing(stop);
                      setFormOpen(true);
                    }}
                    onDelete={() => setDeleting(stop)}
                    onStatus={(next) => updateStatus(stop.id, next)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
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
                  const price = stopPrice(stop.cost);
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
                        {stopIcon(tName)}
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
                        {stop.booking_url ? (
                          <a
                            href={stop.booking_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground rounded-full px-2 py-0.5 mt-1 hover:bg-primary hover:text-white transition-colors"
                          >
                            <ExternalLink className="w-2.5 h-2.5" />
                            <span style={{ fontSize: 10, fontWeight: 600 }}>
                              Booking link added
                            </span>
                          </a>
                        ) : null}
                      </div>

                      {price ? (
                        <span
                          className={`shrink-0 mt-0.5 ${
                            price.free ? "text-primary" : "text-foreground"
                          }`}
                          style={{ fontWeight: 700, fontSize: 13, whiteSpace: "nowrap" }}
                        >
                          {price.label}
                        </span>
                      ) : null}

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

/**
 * Compact mobile stop row (icon, name, type + "Linked" pill, price). For
 * editors, tapping it opens the edit / status / delete actions.
 */
function MobileStopCard({
  stop,
  typeName,
  canEdit,
  onEdit,
  onDelete,
  onStatus,
}: {
  stop: any;
  typeName: string;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onStatus: (status: string) => void;
}) {
  const si = statusIcon[stop.status] || statusIcon.PLANNED;
  const SIcon = si.icon;
  const price = stopPrice(stop.cost, true);
  const time = stop.visit_time
    ? new Date(stop.visit_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  const body = (
    <>
      <span className="shrink-0" style={{ fontSize: 17 }}>
        {stopIcon(typeName)}
      </span>
      <div className="flex-1 min-w-0">
        <p className="truncate" style={{ fontSize: 12, fontWeight: 600, color: "#16213E" }}>
          {stop.name}
        </p>
        <div className="flex items-center gap-1.5 min-w-0">
          <SIcon className="w-3 h-3 shrink-0" style={{ color: si.color }} aria-label={stop.status} />
          <span className="text-muted-foreground truncate" style={{ fontSize: 10 }}>
            {[time, typeName].filter(Boolean).join(" · ")}
          </span>
          {stop.booking_url ? (
            <span className="inline-flex items-center gap-0.5 bg-secondary rounded-full px-1.5 py-0.5 shrink-0">
              <ExternalLink className="w-2 h-2 text-secondary-foreground" />
              <span style={{ fontSize: 9, fontWeight: 600, color: "#0B6B3A" }}>Linked</span>
            </span>
          ) : null}
        </div>
      </div>
      {price ? (
        <span
          className="shrink-0"
          style={{
            fontSize: 11,
            fontWeight: 700,
            whiteSpace: "nowrap",
            color: price.free ? "#16B364" : "#16213E",
          }}
        >
          {price.label}
        </span>
      ) : null}
    </>
  );
  const cls =
    "w-full text-left bg-card border border-border rounded-xl px-3 py-2.5 flex items-center gap-2";

  if (!canEdit) {
    return stop.booking_url ? (
      <a href={stop.booking_url} target="_blank" rel="noopener noreferrer" className={cls}>
        {body}
      </a>
    ) : (
      <div className={cls}>{body}</div>
    );
  }

  return (
    // Non-modal so the dialogs opened from it get focus cleanly.
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button type="button" className={`${cls} active:border-primary/40`} aria-label={`${stop.name} actions`}>
          {body}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-xl min-w-[200px]">
        <DropdownMenuLabel className="truncate max-w-[240px]">{stop.name}</DropdownMenuLabel>
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil className="w-4 h-4" /> Edit stop
        </DropdownMenuItem>
        {stop.booking_url ? (
          <DropdownMenuItem asChild>
            <a href={stop.booking_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4" /> Open booking link
            </a>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        {Object.entries(ITINERARY_STATUSES)
          .filter(([value]) => value !== stop.status)
          .map(([value, label]) => {
            const Icon = (statusIcon[value] || statusIcon.PLANNED).icon;
            return (
              <DropdownMenuItem key={value} onSelect={() => onStatus(value)}>
                <Icon className="w-4 h-4" style={{ color: statusIcon[value]?.color }} />
                Mark as {String(label).toLowerCase()}
              </DropdownMenuItem>
            );
          })}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          <Trash2 className="w-4 h-4" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
