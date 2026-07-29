import { useState } from "react";
import { Plus } from "lucide-react";

import { Checkbox } from "@/app/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { CHECKLIST_CATEGORIES, CHECKLIST_PRIORITY } from "@/config";
import { useChecklist } from "@/contexts/ChecklistContext";
import { ChecklistFormModal } from "@/components/modals/ChecklistFormModal";
import { ConfirmDialog } from "@/components/modals/ConfirmDialog";
import { memberName } from "@/lib/adapters";
import { getItineraryPriorityColor } from "@/lib/colors";
import { formatDate, isOverdue } from "@/lib/utils";
import { AddButton, EmptyState, ItemActions } from "./ItemActions";

export function ChecklistTab({ canEdit }: { canEdit: boolean }) {
  const {
    checklistItems,
    statistics,
    selectedCategory,
    setSelectedCategory,
    toggleCompleted,
    deleteItem,
  } = useChecklist();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleting, setDeleting] = useState<any>(null);

  const total = statistics?.total_items ?? 0;
  const done = statistics?.completed_items ?? 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <div>
      <div className="bg-card border border-border rounded-2xl p-5 mb-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-foreground" style={{ fontWeight: 700, fontSize: 15 }}>
            Checklist progress
          </p>
          <p className="text-muted-foreground" style={{ fontSize: 13 }}>
            {done} of {total} done
          </p>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All stages</SelectItem>
            {Object.entries(CHECKLIST_CATEGORIES).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        {canEdit ? (
          <AddButton onClick={openCreate}>
            <Plus className="w-4 h-4" /> Add task
          </AddButton>
        ) : null}
      </div>

      {checklistItems?.length ? (
        <div className="space-y-2">
          {checklistItems.map((item: any) => {
            const overdue =
              item.due_date && isOverdue(item.due_date, item.is_completed);
            return (
              <div
                key={item.id}
                className="group flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3"
              >
                <Checkbox
                  className="mt-0.5"
                  checked={Boolean(item.is_completed)}
                  disabled={!canEdit}
                  onCheckedChange={() => toggleCompleted(item.id)}
                  aria-label={`Mark ${item.title} complete`}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={`truncate ${
                      item.is_completed
                        ? "text-muted-foreground line-through"
                        : "text-foreground"
                    }`}
                    style={{ fontWeight: 600, fontSize: 14 }}
                  >
                    {item.title}
                  </p>
                  {item.description ? (
                    <p
                      className="text-muted-foreground truncate"
                      style={{ fontSize: 12 }}
                    >
                      {item.description}
                    </p>
                  ) : null}
                  <p
                    className={overdue ? "text-destructive" : "text-muted-foreground"}
                    style={{ fontSize: 12 }}
                  >
                    {item.assigned_to ? memberName(item.assigned_to) : "Unassigned"}
                    {item.due_date
                      ? ` · due ${formatDate(item.due_date)}${
                          overdue ? " (overdue)" : ""
                        }`
                      : ""}
                  </p>
                </div>

                <span
                  className={`rounded-full px-2.5 py-1 shrink-0 ${getItineraryPriorityColor(
                    item.priority
                  )}`}
                  style={{ fontSize: 11, fontWeight: 600 }}
                >
                  {CHECKLIST_PRIORITY[
                    item.priority as keyof typeof CHECKLIST_PRIORITY
                  ] || item.priority}
                </span>

                {canEdit ? (
                  <ItemActions
                    label={item.title}
                    onEdit={() => {
                      setEditing(item);
                      setFormOpen(true);
                    }}
                    onDelete={() => setDeleting(item)}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          message="No tasks on the checklist yet."
          action={
            canEdit ? (
              <AddButton onClick={openCreate}>
                <Plus className="w-4 h-4" /> Add the first task
              </AddButton>
            ) : undefined
          }
        />
      )}

      <ChecklistFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        item={editing}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this task?"
        description={`"${deleting?.title}" will be removed from the checklist.`}
        onConfirm={() => deleteItem(deleting.id)}
      />
    </div>
  );
}
