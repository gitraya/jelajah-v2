import { useState } from "react";
import { Plus } from "lucide-react";

import { useExpenses } from "@/contexts/ExpensesContext";
import { useMembers } from "@/contexts/MembersContext";
import { ConfirmDialog } from "@/components/modals/ConfirmDialog";
import { ExpenseFormModal } from "@/components/modals/ExpenseFormModal";
import { colorFor, formatRp, memberInitials, memberName } from "@/lib/adapters";
import { getExpenseCategoryColor } from "@/lib/colors";
import { formatDate } from "@/lib/utils";
import { AddButton, EmptyState, ItemActions } from "./ItemActions";

export function BudgetTab({ trip, canEdit }: { trip: any; canEdit: boolean }) {
  const { expenses, statistics, deleteExpense } = useExpenses();
  const { members } = useMembers();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [deleting, setDeleting] = useState<any>(null);

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
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          {
            label: "Total budget",
            value: formatRp(budget),
            sub: `${travelerCount} travelers`,
            color: "var(--color-foreground)",
          },
          {
            label: "Per person",
            value: formatRp(travelerCount ? budget / travelerCount : 0),
            sub: "estimated",
            color: "var(--color-foreground)",
          },
          {
            label: "Spent so far",
            value: formatRp(spent),
            sub: `${spentPct}% of budget`,
            color: spentPct > 80 ? "#E5605B" : "#16B364",
          },
          {
            label: "Remaining",
            value: formatRp(remaining),
            sub: remaining < 0 ? "over budget" : "left to spend",
            color: remaining < 0 ? "#E5605B" : "var(--color-foreground)",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-card border border-border rounded-2xl p-4"
          >
            <p className="text-muted-foreground mb-1" style={{ fontSize: 12 }}>
              {s.label}
            </p>
            <p
              style={{
                fontWeight: 800,
                fontSize: 20,
                color: s.color,
                letterSpacing: "-0.03em",
              }}
            >
              {s.value}
            </p>
            <p className="text-muted-foreground" style={{ fontSize: 11 }}>
              {s.sub}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 mb-4">
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
        <div className="bg-card border border-border rounded-2xl p-5 mb-4">
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
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 ${getExpenseCategoryColor(
                  c.category.name
                )}`}
                style={{ fontSize: 12, fontWeight: 600 }}
              >
                {c.category.name || "Uncategorized"}
                <span style={{ fontWeight: 700 }}>{formatRp(c.amount)}</span>
                <span style={{ opacity: 0.7 }}>({c.count})</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="bg-card border border-border rounded-2xl p-5 mb-4">
        <p
          className="text-foreground mb-4"
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
              <p className="flex-1 text-foreground" style={{ fontSize: 14 }}>
                {memberName(m)}
              </p>
              <span
                className="text-foreground"
                style={{ fontSize: 13, fontWeight: 600 }}
              >
                {formatRp(m.expenses)}
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

      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-foreground" style={{ fontWeight: 700, fontSize: 15 }}>
            Expenses
          </p>
          {canEdit ? (
            <AddButton onClick={openCreate}>
              <Plus className="w-4 h-4" /> Add expense
            </AddButton>
          ) : null}
        </div>

        {expenses?.length ? (
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
