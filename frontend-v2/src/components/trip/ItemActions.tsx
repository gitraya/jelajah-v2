import { Pencil, Trash2 } from "lucide-react";

/**
 * Edit/delete affordance shared by every list row in the trip detail tabs.
 * Hidden until the row is hovered so dense lists stay readable.
 */
export function ItemActions({
  onEdit,
  onDelete,
  label,
}: {
  onEdit: () => void;
  onDelete: () => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
      <button
        type="button"
        onClick={onEdit}
        aria-label={`Edit ${label}`}
        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <Pencil className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Delete ${label}`}
        className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/** Consistent "+ Add …" button used as each tab's primary action. */
export function AddButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 bg-primary text-primary-foreground rounded-xl px-3.5 py-2 hover:bg-primary/90 transition-colors"
      style={{ fontSize: 13, fontWeight: 600 }}
    >
      {children}
    </button>
  );
}

/** Empty-state copy + call to action for a tab with no rows yet. */
export function EmptyState({
  message,
  action,
}: {
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-12">
      <p className="text-muted-foreground" style={{ fontSize: 14 }}>
        {message}
      </p>
      {action}
    </div>
  );
}
