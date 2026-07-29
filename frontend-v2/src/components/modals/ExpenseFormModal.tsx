import { useEffect, useMemo, useState } from "react";

import { Checkbox } from "@/app/components/ui/checkbox";
import { Input } from "@/app/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Textarea } from "@/app/components/ui/textarea";
import { EXPENSE_SPLIT_TYPES } from "@/config";
import { useExpenses } from "@/contexts/ExpensesContext";
import { useMembers } from "@/contexts/MembersContext";
import { colorFor, formatRp, memberInitials, memberName } from "@/lib/adapters";
import { Field, FieldRow, FormModal } from "./FormModal";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: any;
}

/**
 * Money is handled in integer cents throughout this form. The API rejects an
 * expense whose splits don't sum to the total *exactly*, so float arithmetic
 * (0.1 + 0.2) would produce server-side validation errors that look random.
 */
const toCents = (value: string | number) =>
  Math.round(Number(value || 0) * 100);
const fromCents = (cents: number) => (cents / 100).toFixed(2);

/**
 * Split `totalCents` across `n` people. The remainder cents are handed out one
 * each from the front so the parts always add back up to the total.
 */
const splitEvenly = (totalCents: number, n: number) => {
  if (n <= 0) return [];
  const base = Math.floor(totalCents / n);
  const remainder = totalCents - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < remainder ? 1 : 0));
};

export function ExpenseFormModal({ open, onOpenChange, expense }: Props) {
  const { categories, createExpense, updateExpense } = useExpenses();
  const { acceptedMembers } = useMembers();

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [paidById, setPaidById] = useState("");
  const [notes, setNotes] = useState("");
  const [splitType, setSplitType] = useState("EQUAL");
  const [participants, setParticipants] = useState<string[]>([]);
  /** Raw per-member input for CUSTOM (currency) and PERCENTAGE (percent). */
  const [shares, setShares] = useState<Record<string, string>>({});

  const selectableCategories = (categories || []).filter(
    (c: any) => c.id !== "all"
  );

  useEffect(() => {
    if (!open) return;
    if (expense) {
      setTitle(expense.title || "");
      setAmount(String(expense.amount ?? ""));
      setDate(expense.date || "");
      setCategoryId(expense.category?.id || "");
      setPaidById(expense.paid_by?.id || "");
      setNotes(expense.notes || "");
      const ids = (expense.splits || []).map((s: any) => s.member?.id);
      setParticipants(ids.filter(Boolean));
      setShares(
        Object.fromEntries(
          (expense.splits || [])
            .filter((s: any) => s.member?.id)
            .map((s: any) => [s.member.id, String(s.amount)])
        )
      );
      // Existing splits are already concrete amounts; editing them as CUSTOM
      // preserves whatever uneven arrangement was saved.
      setSplitType("CUSTOM");
    } else {
      setTitle("");
      setAmount("");
      setDate(new Date().toISOString().slice(0, 10));
      setCategoryId("");
      setPaidById("");
      setNotes("");
      setSplitType("EQUAL");
      setParticipants((acceptedMembers || []).map((m: any) => m.id));
      setShares({});
    }
    // Deliberately not keyed on acceptedMembers: the members list gets a new
    // array identity on every refetch, which would reset a half-filled form.
  }, [open, expense]);

  // If the members list is still loading when the dialog opens, seed the
  // default "everyone splits it" selection once it arrives.
  useEffect(() => {
    if (!open || expense || participants.length > 0) return;
    if (acceptedMembers?.length) {
      setParticipants(acceptedMembers.map((m: any) => m.id));
    }
  }, [open, expense, acceptedMembers, participants.length]);

  // The payer must always be part of the split — the serializer requires it.
  useEffect(() => {
    if (paidById && !participants.includes(paidById)) {
      setParticipants((prev) => [...prev, paidById]);
    }
  }, [paidById]);

  const totalCents = toCents(amount);

  /** Final per-member cent amounts, derived from the chosen split mode. */
  const computedSplits = useMemo(() => {
    if (participants.length === 0) return {} as Record<string, number>;

    if (splitType === "EQUAL") {
      const parts = splitEvenly(totalCents, participants.length);
      return Object.fromEntries(participants.map((id, i) => [id, parts[i]]));
    }

    if (splitType === "PERCENTAGE") {
      const pcts = participants.map((id) => Number(shares[id] || 0));
      const sum = pcts.reduce((a, b) => a + b, 0);
      if (sum === 0) return Object.fromEntries(participants.map((id) => [id, 0]));
      // Largest-remainder allocation so the cents always total exactly.
      const raw = pcts.map((p) => (totalCents * p) / sum);
      const floored = raw.map(Math.floor);
      let left = totalCents - floored.reduce((a, b) => a + b, 0);
      const order = raw
        .map((v, i) => ({ i, frac: v - Math.floor(v) }))
        .sort((a, b) => b.frac - a.frac);
      for (let k = 0; k < order.length && left > 0; k++, left--) {
        floored[order[k].i] += 1;
      }
      return Object.fromEntries(participants.map((id, i) => [id, floored[i]]));
    }

    return Object.fromEntries(
      participants.map((id) => [id, toCents(shares[id] || 0)])
    );
  }, [splitType, participants, shares, totalCents]);

  const splitSum = Object.values(computedSplits).reduce(
    (a: number, b: number) => a + b,
    0
  );
  const difference = totalCents - splitSum;

  const validationError = !title.trim()
    ? "Title is required."
    : totalCents <= 0
    ? "Enter an amount greater than zero."
    : !categoryId
    ? "Please choose a category."
    : !paidById
    ? "Please choose who paid."
    : participants.length === 0
    ? "Select at least one person to split with."
    : difference !== 0
    ? `Splits must add up to ${formatRp(totalCents / 100)} — ${
        difference > 0 ? "short by" : "over by"
      } ${formatRp(Math.abs(difference) / 100)}.`
    : null;

  const toggleParticipant = (id: string) => {
    // The payer is locked in; unchecking them would fail server validation.
    if (id === paidById) return;
    setParticipants((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    const payload = {
      title: title.trim(),
      amount: Number(fromCents(totalCents)),
      date,
      category_id: categoryId,
      paid_by_id: paidById,
      notes: notes.trim(),
      splits: participants.map((id) => ({
        member_id: id,
        amount: Number(fromCents(computedSplits[id] || 0)),
        paid: id === paidById,
      })),
    };
    return expense ? updateExpense(expense.id, payload) : createExpense(payload);
  };

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title={expense ? "Edit expense" : "Add expense"}
      description="Record what was spent and how it's shared."
      submitLabel={expense ? "Save changes" : "Add expense"}
      onSubmit={handleSubmit}
      validationError={validationError}
    >
      <Field label="Title" htmlFor="ex-title" required>
        <Input
          id="ex-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Dinner at Dotonbori"
        />
      </Field>

      <FieldRow>
        <Field label="Amount" htmlFor="ex-amount" required>
          <Input
            id="ex-amount"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="250000"
          />
        </Field>
        <Field label="Date" htmlFor="ex-date" required>
          <Input
            id="ex-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </Field>
      </FieldRow>

      <FieldRow>
        <Field label="Category" required>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a category" />
            </SelectTrigger>
            <SelectContent>
              {selectableCategories.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Paid by" required>
          <Select value={paidById} onValueChange={setPaidById}>
            <SelectTrigger>
              <SelectValue placeholder="Who paid?" />
            </SelectTrigger>
            <SelectContent>
              {(acceptedMembers || []).map((m: any) => (
                <SelectItem key={m.id} value={m.id}>
                  {memberName(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </FieldRow>

      <Field label="Split">
        <div className="flex gap-1 bg-muted rounded-xl p-1 w-fit">
          {EXPENSE_SPLIT_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setSplitType(t.value)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                splitType === t.value
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              style={{ fontSize: 12, fontWeight: splitType === t.value ? 600 : 500 }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </Field>

      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
        {(acceptedMembers || []).map((m: any) => {
          const active = participants.includes(m.id);
          const isPayer = m.id === paidById;
          return (
            <div
              key={m.id}
              className="flex items-center gap-3 rounded-xl border border-border px-3 py-2"
            >
              <Checkbox
                checked={active}
                disabled={isPayer}
                onCheckedChange={() => toggleParticipant(m.id)}
              />
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white shrink-0"
                style={{
                  background: colorFor(m.user?.email || String(m.id)),
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                {memberInitials(m)}
              </div>
              <span className="flex-1 truncate" style={{ fontSize: 13 }}>
                {memberName(m)}
                {isPayer ? (
                  <span className="text-muted-foreground" style={{ fontSize: 11 }}>
                    {" "}
                    · payer
                  </span>
                ) : null}
              </span>

              {active && splitType !== "EQUAL" ? (
                <Input
                  className="w-28 h-8"
                  type="number"
                  min="0"
                  step={splitType === "PERCENTAGE" ? "0.01" : "0.01"}
                  value={shares[m.id] ?? ""}
                  placeholder={splitType === "PERCENTAGE" ? "%" : "amount"}
                  onChange={(e) =>
                    setShares((prev) => ({ ...prev, [m.id]: e.target.value }))
                  }
                />
              ) : null}

              <span
                className="text-muted-foreground tabular-nums"
                style={{ fontSize: 12, minWidth: 84, textAlign: "right" }}
              >
                {active ? formatRp((computedSplits[m.id] || 0) / 100) : "—"}
              </span>
            </div>
          );
        })}
        {(!acceptedMembers || acceptedMembers.length === 0) && (
          <p className="text-muted-foreground" style={{ fontSize: 13 }}>
            No accepted members yet — invite travelers before adding expenses.
          </p>
        )}
      </div>

      <div
        className="flex items-center justify-between rounded-xl bg-secondary px-3 py-2"
        style={{ fontSize: 13 }}
      >
        <span className="text-muted-foreground">Split total</span>
        <span
          style={{ fontWeight: 700 }}
          className={difference === 0 ? "text-foreground" : "text-destructive"}
        >
          {formatRp(splitSum / 100)} / {formatRp(totalCents / 100)}
        </span>
      </div>

      <Field label="Notes" htmlFor="ex-notes">
        <Textarea
          id="ex-notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>
    </FormModal>
  );
}
