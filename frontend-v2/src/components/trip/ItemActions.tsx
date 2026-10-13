import { Pencil, Trash2 } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";

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
      className="flex items-center gap-1.5 shrink-0 whitespace-nowrap bg-primary text-primary-foreground rounded-xl px-3.5 py-2 hover:bg-primary/90 transition-colors"
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

/** Compact mobile list card (matches the itinerary tab's mobile stop rows). */
export const MOBILE_CARD =
  "bg-card border border-border rounded-xl px-3 py-2.5 flex items-center gap-2.5 min-w-0";

/** "21 Oct" — short date for 10px mobile meta lines. */
export const shortDate = (date?: string | null) =>
  date
    ? new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    : "";

const PILL_TONES = {
  green: { color: "#16B364", background: "#E6F7EE" },
  amber: { color: "#F5A623", background: "#FFF8E6" },
  red: { color: "#E5605B", background: "#FDECEC" },
  muted: { color: "#8A93A6", background: "var(--color-muted)" },
} as const;

export type PillTone = keyof typeof PILL_TONES;

/** Small status pill: green Done/Paid/Accepted, amber Pending, soft red Declined. */
export function Pill({
  tone = "muted",
  className = "",
  children,
}: {
  tone?: PillTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 shrink-0 whitespace-nowrap ${className}`}
      style={{ fontSize: 9, fontWeight: 600, ...PILL_TONES[tone] }}
    >
      {children}
    </span>
  );
}

/**
 * Mobile tap-a-card pattern: the whole card body opens a menu of actions.
 * Without `children` (no actions available) it renders a plain block.
 */
export function TapMenu({
  label,
  className = "",
  body,
  children,
}: {
  label: string;
  className?: string;
  body: React.ReactNode;
  children?: React.ReactNode;
}) {
  if (!children) return <div className={className}>{body}</div>;
  return (
    // Non-modal so the dialogs opened from it get focus cleanly.
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`text-left ${className}`}
          aria-label={`${label} actions`}
        >
          {body}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-xl min-w-[200px] max-w-[calc(100vw-2rem)]">
        <DropdownMenuLabel className="truncate max-w-[260px]">{label}</DropdownMenuLabel>
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
