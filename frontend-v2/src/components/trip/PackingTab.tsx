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
import { usePackingItems } from "@/contexts/PackingItemsContext";
import { ConfirmDialog } from "@/components/modals/ConfirmDialog";
import { PackingFormModal } from "@/components/modals/PackingFormModal";
import { memberName } from "@/lib/adapters";
import { getPackingCategoryColor } from "@/lib/colors";
import { AddButton, EmptyState, ItemActions } from "./ItemActions";

export function PackingTab({ canEdit }: { canEdit: boolean }) {
  const {
    packingItems,
    categories,
    statistics,
    selectedCategory,
    setSelectedCategory,
    togglePacking,
    deletePacking,
  } = usePackingItems();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleting, setDeleting] = useState<any>(null);

  const total = statistics?.total_items ?? 0;
  const packed = statistics?.packed_items ?? 0;
  const pct = total > 0 ? Math.round((packed / total) * 100) : 0;

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <div>
      <div className="bg-card border border-border rounded-2xl p-5 mb-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-foreground" style={{ fontWeight: 700, fontSize: 15 }}>
            Packing progress
          </p>
          <p className="text-muted-foreground" style={{ fontSize: 13 }}>
            {packed} of {total} packed
          </p>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>

        {statistics?.category_stats?.length ? (
          <div className="flex flex-wrap gap-2 mt-4">
            {statistics.category_stats.map((c: any) => (
              <span
                key={c.category.id || c.category.name}
                className={`rounded-full px-3 py-1.5 ${getPackingCategoryColor(
                  c.category.name
                )}`}
                style={{ fontSize: 12, fontWeight: 600 }}
              >
                {c.category.name || "Uncategorized"} {c.packed}/{c.total}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {(categories || []).map((c: any) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        {canEdit ? (
          <AddButton onClick={openCreate}>
            <Plus className="w-4 h-4" /> Add item
          </AddButton>
        ) : null}
      </div>

      {packingItems?.length ? (
        <div className="space-y-2">
          {packingItems.map((item: any) => (
            <div
              key={item.id}
              className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
            >
              <Checkbox
                checked={Boolean(item.packed)}
                disabled={!canEdit}
                onCheckedChange={() => togglePacking(item.id)}
                aria-label={`Mark ${item.name} packed`}
              />
              <div className="flex-1 min-w-0">
                <p
                  className={`truncate ${
                    item.packed
                      ? "text-muted-foreground line-through"
                      : "text-foreground"
                  }`}
                  style={{ fontWeight: 600, fontSize: 14 }}
                >
                  {item.name}
                  {item.quantity > 1 ? (
                    <span
                      className="text-muted-foreground"
                      style={{ fontWeight: 500 }}
                    >
                      {" "}
                      ×{item.quantity}
                    </span>
                  ) : null}
                </p>
                <p className="text-muted-foreground" style={{ fontSize: 12 }}>
                  {item.assigned_to
                    ? memberName(item.assigned_to)
                    : "Unassigned"}
                </p>
              </div>

              {item.category?.name ? (
                <span
                  className={`rounded-full px-2.5 py-1 shrink-0 ${getPackingCategoryColor(
                    item.category.name
                  )}`}
                  style={{ fontSize: 11, fontWeight: 600 }}
                >
                  {item.category.name}
                </span>
              ) : null}

              {canEdit ? (
                <ItemActions
                  label={item.name}
                  onEdit={() => {
                    setEditing(item);
                    setFormOpen(true);
                  }}
                  onDelete={() => setDeleting(item)}
                />
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          message="Nothing on the packing list yet."
          action={
            canEdit ? (
              <AddButton onClick={openCreate}>
                <Plus className="w-4 h-4" /> Add the first item
              </AddButton>
            ) : undefined
          }
        />
      )}

      <PackingFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        item={editing}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this item?"
        description={`"${deleting?.name}" will be removed from the packing list.`}
        onConfirm={() => deletePacking(deleting.id)}
      />
    </div>
  );
}
