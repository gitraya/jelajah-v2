import { useState } from "react";
import { CheckCircle, Clock, Pencil, Plus, Trash2 } from "lucide-react";

import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/app/components/ui/dropdown-menu";
import { useIsMobile } from "@/app/components/ui/use-mobile";

import { useExpenses } from "@/contexts/ExpensesContext";
import { useMembers } from "@/contexts/MembersContext";
import { ConfirmDialog } from "@/components/modals/ConfirmDialog";
import { ExpenseFormModal } from "@/components/modals/ExpenseFormModal";
import {
  colorFor,
  formatRp,
  formatRpShort,
  memberInitials,
  memberName,
} from "@/lib/adapters";
import { getExpenseCategoryColor } from "@/lib/colors";
import { formatDate } from "@/lib/utils";
import {
  AddButton,
  EmptyState,
  ItemActions,
  MOBILE_CARD,
  Pill,
  TapMenu,
  shortDate,
} from "./ItemActions";

/** Full IDR from md up, compact ("Rp 18.5M") on phones. */
function Rp({ value }: { value: number | string | undefined }) {
  return (
    <>
      <span className="md:hidden">{formatRpShort(value)}</span>
      <span className="hidden md:inline">{formatRp(value)}</span>
    </>
  );
}

export function BudgetTab({ trip, canEdit }: { trip: any; canEdit: boolean }) {
  const { expenses, statistics, deleteExpense } = useExpenses();
  const { members } = useMembers();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleting, setDeleting] = useState<any>(null);
  const isMobile = useIsMobile();

  const budget = Number(statistics?.trip_budget ?? trip?.budget ?? 0);
  const spent = Number(statistics?.amount_spent ?? 0);
  const remaining = Number(statistics?.budget_remaining ?? budget - spent);
  const spentPct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
  const travelerCount = members?.length || 0;

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <div>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4 mb-6">
        {[
          {
            label: "Total budget",
            value: budget,
            sub: `${travelerCount} travelers`,
            color: "var(--color-foreground)",
          },
          {
            label: "Per person",
            value: travelerCount ? budget / travelerCount : 0,
            sub: "estimated",
            color: "var(--color-foreground)",
          },
          {
            label: "Spent so far",
            value: spent,
            sub: `${spentPct}% of budget`,
            color: spentPct > 80 ? "#E5605B" : "#16B364",
          },
          {
            label: "Remaining",
            value: remaining,
            sub: remaining < 0 ? "over budget" : "left to spend",
            color: remaining < 0 ? "#E5605B" : "var(--color-foreground)",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-card border border-border rounded-2xl p-3 md:p-4 min-w-0"
          >
            <p className="text-muted-foreground mb-1 truncate" style={{ fontSize: 12 }}>
              {s.label}
            </p>
            <p
              className="truncate text-[17px] md:text-[20px]"
              style={{
                fontWeight: 800,
                color: s.color,
                letterSpacing: "-0.03em",
              }}
            >
              <Rp value={s.value} />
            </p>
            <p className="text-muted-foreground truncate" style={{ fontSize: 11 }}>
              {s.sub}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 md:p-5 mb-4">
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
            className="h-full rounded-full transition-all"
            style={{
              width: `${Math.min(100, spentPct)}%`,
              background: spentPct > 80 ? "#E5605B" : "#16B364",
            }}
          />
        </div>
      </div>

      {statistics?.category_stats?.length ? (
        <div className="bg-card border border-border rounded-2xl p-4 md:p-5 mb-4">
          <p
            className="text-foreground mb-3"
            style={{ fontWeight: 700, fontSize: 15 }}
          >
            By category
          </p>
          <div className="flex flex-wrap gap-2">
            {statistics.category_stats.map((c: any) => (
              <span
                key={c.category.id || c.category.name}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 md:px-3 py-1 md:py-1.5 max-w-full ${getExpenseCategoryColor(
                  c.category.name
                )}`}
                style={{ fontSize: 12, fontWeight: 600 }}
              >
                <span className="truncate">{c.category.name || "Uncategorized"}</span>
                <span className="shrink-0" style={{ fontWeight: 700 }}>
                  <Rp value={c.amount} />
                </span>
                <span style={{ opacity: 0.7 }}>({c.count})</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="bg-card border border-border rounded-2xl p-4 md:p-5 mb-4">
        <p
          className="text-foreground mb-3 md:mb-4"
          style={{ fontWeight: 700, fontSize: 15 }}
        >
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
              <p className="flex-1 min-w-0 truncate text-foreground text-[13px] md:text-[14px]">
                {memberName(m)}
              </p>
              <span
                className="text-foreground shrink-0 tabular-nums"
                style={{ fontSize: 13, fontWeight: 600 }}
              >
                <Rp value={m.expenses} />
              </span>
            </div>
          ))}
          {(!members || members.length === 0) && (
            <p className="text-muted-foreground" style={{ fontSize: 13 }}>
              No members yet.
            </p>
          )}
        </div>
      </div>

      {/* On phones the list sits bare, like the itinerary's compact cards. */}
      <div className="md:bg-card md:border md:border-border md:rounded-2xl md:p-5">
        <div className="flex items-center justify-between gap-3 mb-3 md:mb-4">
          <p className="text-foreground" style={{ fontWeight: 700, fontSize: 15 }}>
            Expenses
          </p>
          {canEdit ? (
            <AddButton onClick={openCreate}>
              <Plus className="w-4 h-4" />
              <span>
                Add<span className="hidden md:inline"> expense</span>
              </span>
            </AddButton>
          ) : null}
        </div>

        {expenses?.length && isMobile ? (
          <div className="space-y-2">
            {expenses.map((ex: any) => (
              <MobileExpenseCard
                key={ex.id}
                expense={ex}
                canEdit={canEdit}
                onEdit={() => {
                  setEditing(ex);
                  setFormOpen(true);
                }}
                onDelete={() => setDeleting(ex)}
              />
            ))}
          </div>
        ) : expenses?.length ? (
          <div className="space-y-2">
            {expenses.map((ex: any) => (
              <div
                key={ex.id}
                className="group flex items-center gap-3 rounded-xl border border-border px-4 py-3"
              >
                <div className="flex-1 min-w-0">
                  <p
                    className="text-foreground truncate"
                    style={{ fontWeight: 600, fontSize: 14 }}
                  >
                    {ex.title}
                  </p>
                  <p className="text-muted-foreground" style={{ fontSize: 12 }}>
                    {formatDate(ex.date)} · paid by{" "}
                    {ex.paid_by ? memberName(ex.paid_by) : "—"} ·{" "}
                    {ex.splits?.length || 0} way split
                  </p>
                </div>

                {ex.category?.name ? (
                  <span
                    className={`rounded-full px-2.5 py-1 shrink-0 ${getExpenseCategoryColor(
                      ex.category.name
                    )}`}
                    style={{ fontSize: 11, fontWeight: 600 }}
                  >
                    {ex.category.name}
                  </span>
                ) : null}

                <span
                  className="text-foreground shrink-0 tabular-nums"
                  style={{ fontWeight: 700, fontSize: 14 }}
                >
                  {formatRp(ex.amount)}
                </span>

                {canEdit ? (
                  <ItemActions
                    label={ex.title}
                    onEdit={() => {
                      setEditing(ex);
                      setFormOpen(true);
                    }}
                    onDelete={() => setDeleting(ex)}
                  />
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            message="No expenses recorded yet."
            action={
              canEdit ? (
                <AddButton onClick={openCreate}>
                  <Plus className="w-4 h-4" /> Add the first expense
                </AddButton>
              ) : undefined
            }
          />
        )}
      </div>

      <ExpenseFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        expense={editing}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this expense?"
        description={`"${deleting?.title}" and its splits will be removed. This can't be undone.`}
        onConfirm={() => deleteExpense(deleting.id)}
      />
    </div>
  );
}

/**
 * Compact mobile expense row: title + amount, then date · payer · split and the
 * category pill. Tapping it shows who has paid their share, plus edit/delete.
 */
function MobileExpenseCard({
  expense: ex,
  canEdit,
  onEdit,
  onDelete,
}: {
  expense: any;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const splits: any[] = ex.splits || [];
  const body = (
    <>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 min-w-0">
          <p
            className="flex-1 min-w-0 truncate"
            style={{ fontSize: 12, fontWeight: 600, color: "#16213E" }}
          >
            {ex.title}
          </p>
          <span
            className="shrink-0 tabular-nums"
            style={{ fontSize: 12, fontWeight: 700, color: "#16213E", whiteSpace: "nowrap" }}
          >
            {formatRpShort(ex.amount)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 min-w-0 mt-0.5">
          <span className="text-muted-foreground truncate" style={{ fontSize: 10 }}>
            {[
              shortDate(ex.date),
              ex.paid_by ? `paid by ${memberName(ex.paid_by)}` : null,
              splits.length > 1 ? `${splits.length}-way split` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </span>
          {ex.category?.name ? (
            <span
              className={`rounded-full px-1.5 py-0.5 shrink-0 ml-auto ${getExpenseCategoryColor(
                ex.category.name
              )}`}
              style={{ fontSize: 9, fontWeight: 600 }}
            >
              {ex.category.name}
            </span>
          ) : null}
        </div>
      </div>
    </>
  );

  const hasMenu = canEdit || splits.length > 0;
  return (
    <TapMenu
      label={ex.title}
      className={`w-full ${MOBILE_CARD} ${hasMenu ? "active:border-primary/40" : ""}`}
      body={body}
    >
      {hasMenu ? (
        <>
          <p className="px-2 pb-1 text-muted-foreground" style={{ fontSize: 11 }}>
            {formatRp(ex.amount)} · {formatDate(ex.date)}
          </p>
          {splits.length ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-muted-foreground" style={{ fontSize: 11 }}>
                Split
              </DropdownMenuLabel>
              {splits.map((sp: any) => (
                <div
                  key={sp.id || sp.member?.id}
                  className="flex items-center gap-2 px-2 py-1"
                  style={{ fontSize: 12 }}
                >
                  <span className="flex-1 min-w-0 truncate text-foreground">
                    {sp.member ? memberName(sp.member) : "—"}
                  </span>
                  <span className="shrink-0 tabular-nums text-foreground" style={{ fontWeight: 600 }}>
                    {formatRpShort(sp.amount)}
                  </span>
                  <Pill tone={sp.paid ? "green" : "amber"}>
                    {sp.paid ? (
                      <>
                        <CheckCircle className="w-2.5 h-2.5" /> Paid
                      </>
                    ) : (
                      <>
                        <Clock className="w-2.5 h-2.5" /> Pending
                      </>
                    )}
                  </Pill>
                </div>
              ))}
            </>
          ) : null}
          {canEdit ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={onEdit}>
                <Pencil className="w-4 h-4" /> Edit expense
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                <Trash2 className="w-4 h-4" /> Delete
              </DropdownMenuItem>
            </>
          ) : null}
        </>
      ) : null}
    </TapMenu>
  );
}
