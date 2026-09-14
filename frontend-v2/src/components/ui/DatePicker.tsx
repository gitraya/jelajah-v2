import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  addDays,
  addMonths,
  addYears,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  isValid,
  parseISO,
  setMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, X } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/app/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { cn } from "@/lib/utils";

/**
 * Values stay in the same string formats the native inputs used
 * (`yyyy-MM-dd` for dates, `yyyy-MM-ddTHH:mm` for date-times), so swapping a
 * `<input type="date">` for these pickers doesn't touch any payload code.
 */
const DATE_FMT = "yyyy-MM-dd";
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = Array.from({ length: 12 }, (_, i) => format(setMonth(new Date(2000, 0, 1), i), "MMM"));
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

const parseDate = (value?: string | null) => {
  if (!value) return null;
  const d = parseISO(value.slice(0, 10));
  return isValid(d) ? d : null;
};

const toDateString = (d: Date) => format(d, DATE_FMT);

interface CalendarPanelProps {
  selected: Date | null;
  onSelect: (date: Date) => void;
  min?: Date | null;
  max?: Date | null;
  /** Tints a span of days, e.g. the trip's dates or the other end of a range. */
  highlight?: { from?: Date | null; to?: Date | null };
}

function CalendarPanel({ selected, onSelect, min, max, highlight }: CalendarPanelProps) {
  const today = startOfDay(new Date());
  const [view, setView] = useState<"days" | "months">("days");
  const [focused, setFocused] = useState<Date>(
    () => selected ?? (min && isBefore(today, min) ? min : today)
  );
  const gridRef = useRef<HTMLDivElement>(null);
  // Only steal focus after keyboard navigation, not on first open.
  const keyboardNav = useRef(false);

  const isDisabled = (d: Date) =>
    Boolean((min && isBefore(d, min)) || (max && isAfter(d, max)));

  const inHighlight = (d: Date) => {
    const { from, to } = highlight || {};
    if (!from || !to) return false;
    return !isBefore(d, from) && !isAfter(d, to);
  };

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(focused), { weekStartsOn: 1 });
    // Always six rows so the popover doesn't jump in height between months.
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [focused]);

  useEffect(() => {
    if (!keyboardNav.current) return;
    keyboardNav.current = false;
    gridRef.current
      ?.querySelector<HTMLButtonElement>(`[data-day="${toDateString(focused)}"]`)
      ?.focus();
  }, [focused]);

  const handleKeyDown = (e: KeyboardEvent) => {
    const moves: Record<string, (d: Date) => Date> = {
      ArrowLeft: (d) => addDays(d, -1),
      ArrowRight: (d) => addDays(d, 1),
      ArrowUp: (d) => addDays(d, -7),
      ArrowDown: (d) => addDays(d, 7),
      PageUp: (d) => (e.shiftKey ? addYears(d, -1) : addMonths(d, -1)),
      PageDown: (d) => (e.shiftKey ? addYears(d, 1) : addMonths(d, 1)),
      Home: (d) => startOfWeek(d, { weekStartsOn: 1 }),
      End: (d) => endOfWeek(d, { weekStartsOn: 1 }),
    };
    const move = moves[e.key];
    if (!move) return;
    e.preventDefault();
    keyboardNav.current = true;
    setFocused(move);
  };

  const navButton =
    "size-8 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40 disabled:pointer-events-none";

  if (view === "months") {
    return (
      <div className="w-[17.5rem]">
        <div className="flex items-center justify-between mb-3">
          <button type="button" className={navButton} onClick={() => setFocused((d) => addYears(d, -1))} aria-label="Previous year">
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setView("days")}
            className="rounded-lg px-2 py-1 hover:bg-muted transition-colors"
            style={{ fontSize: 14, fontWeight: 700 }}
          >
            {format(focused, "yyyy")}
          </button>
          <button type="button" className={navButton} onClick={() => setFocused((d) => addYears(d, 1))} aria-label="Next year">
            <ChevronRight className="size-4" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {MONTHS.map((label, i) => {
            const month = setMonth(focused, i);
            const active = selected && isSameMonth(month, selected);
            const outOfRange =
              (min && isBefore(endOfMonth(month), min)) || (max && isAfter(startOfMonth(month), max));
            return (
              <button
                key={label}
                type="button"
                disabled={Boolean(outOfRange)}
                onClick={() => {
                  setFocused(month);
                  setView("days");
                }}
                className={cn(
                  "h-10 rounded-xl transition-colors disabled:opacity-40 disabled:pointer-events-none",
                  active
                    ? "bg-primary text-primary-foreground"
                    : isSameMonth(month, today)
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted"
                )}
                style={{ fontSize: 13, fontWeight: 600 }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="w-[17.5rem]">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          className={navButton}
          onClick={() => setFocused((d) => addMonths(d, -1))}
          disabled={Boolean(min && isBefore(endOfMonth(addMonths(focused, -1)), min))}
          aria-label="Previous month"
        >
          <ChevronLeft className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => setView("months")}
          className="rounded-lg px-2 py-1 hover:bg-muted transition-colors"
          style={{ fontSize: 14, fontWeight: 700 }}
          aria-label="Choose month and year"
        >
          {format(focused, "MMMM yyyy")}
        </button>
        <button
          type="button"
          className={navButton}
          onClick={() => setFocused((d) => addMonths(d, 1))}
          disabled={Boolean(max && isAfter(startOfMonth(addMonths(focused, 1)), max))}
          aria-label="Next month"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((w) => (
          <span
            key={w}
            className="h-8 flex items-center justify-center text-muted-foreground"
            style={{ fontSize: 11, fontWeight: 600 }}
          >
            {w}
          </span>
        ))}
      </div>

      <div ref={gridRef} role="grid" className="grid grid-cols-7 gap-y-1" onKeyDown={handleKeyDown}>
        {days.map((day) => {
          const key = toDateString(day);
          const isSelected = selected ? isSameDay(day, selected) : false;
          const isToday = isSameDay(day, today);
          const outside = !isSameMonth(day, focused);
          const disabled = isDisabled(day);
          const tinted = !isSelected && inHighlight(day);
          return (
            <button
              key={key}
              type="button"
              data-day={key}
              role="gridcell"
              aria-selected={isSelected}
              aria-label={format(day, "EEEE, d MMMM yyyy")}
              tabIndex={isSameDay(day, focused) ? 0 : -1}
              disabled={disabled}
              onClick={() => onSelect(day)}
              className={cn(
                "relative mx-auto size-9 rounded-xl flex items-center justify-center transition-colors outline-none",
                "focus-visible:ring-[3px] focus-visible:ring-ring/50",
                "disabled:opacity-30 disabled:pointer-events-none",
                isSelected
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : tinted
                  ? "bg-accent text-accent-foreground hover:bg-primary/20"
                  : "hover:bg-muted",
                outside && !isSelected && "text-muted-foreground/60"
              )}
              style={{ fontSize: 13, fontWeight: isSelected || isToday ? 700 : 500 }}
            >
              {format(day, "d")}
              {isToday && !isSelected ? (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 size-1 rounded-full bg-primary" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const triggerClass =
  "flex h-9 w-full items-center gap-2 rounded-md border border-input bg-input-background px-3 text-left transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[state=open]:border-ring data-[state=open]:ring-[3px] data-[state=open]:ring-ring/50";

function ClearButton({ onClear }: { onClear: () => void }) {
  return (
    <span
      role="button"
      tabIndex={-1}
      aria-label="Clear date"
      // Keep the click from also toggling the popover open.
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onClear();
      }}
      className="ml-auto -mr-1 size-6 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      <X className="size-3.5" />
    </span>
  );
}

function FooterButton({ onClick, children, primary }: { onClick: () => void; children: string; primary?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg px-2.5 py-1.5 transition-colors",
        primary ? "text-primary hover:bg-accent" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
      style={{ fontSize: 12, fontWeight: 600 }}
    >
      {children}
    </button>
  );
}

interface DatePickerProps {
  id?: string;
  /** `yyyy-MM-dd`, or empty. */
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Inclusive bounds, `yyyy-MM-dd`. */
  min?: string;
  max?: string;
  highlight?: { from?: string; to?: string };
  clearable?: boolean;
  disabled?: boolean;
  className?: string;
}

export function DatePicker({
  id,
  value,
  onChange,
  placeholder = "Pick a date",
  min,
  max,
  highlight,
  clearable = false,
  disabled,
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = parseDate(value);
  const minDate = parseDate(min);
  const maxDate = parseDate(max);
  const today = startOfDay(new Date());
  const todayAllowed = !(minDate && isBefore(today, minDate)) && !(maxDate && isAfter(today, maxDate));

  const pick = (d: Date) => {
    onChange(toDateString(d));
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button id={id} type="button" className={cn(triggerClass, className)}>
          <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
          <span
            className={cn("truncate", !selected && "text-muted-foreground")}
            style={{ fontSize: 14 }}
          >
            {selected ? format(selected, "EEE, d MMM yyyy") : placeholder}
          </span>
          {clearable && selected && !disabled ? <ClearButton onClear={() => onChange("")} /> : null}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto rounded-2xl p-3 shadow-lg">
        <CalendarPanel
          // Remount per open so the view starts on the current value.
          key={String(open)}
          selected={selected}
          onSelect={pick}
          min={minDate}
          max={maxDate}
          highlight={{ from: parseDate(highlight?.from), to: parseDate(highlight?.to) }}
        />
        <div className="flex items-center justify-between border-t border-border mt-3 pt-2">
          {clearable ? (
            <FooterButton
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              Clear
            </FooterButton>
          ) : (
            <span />
          )}
          {todayAllowed ? (
            <FooterButton primary onClick={() => pick(today)}>
              Today
            </FooterButton>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface DateTimePickerProps extends Omit<DatePickerProps, "value" | "onChange"> {
  /** `yyyy-MM-ddTHH:mm` local wall-clock time, or empty. */
  value: string;
  onChange: (value: string) => void;
}

export function DateTimePicker({
  id,
  value,
  onChange,
  placeholder = "Pick date & time",
  min,
  max,
  highlight,
  clearable = true,
  disabled,
  className,
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = parseDate(value);
  const [hour, minute] = value && value.length >= 16 ? value.slice(11, 16).split(":") : ["09", "00"];
  // Keep an off-grid minute (e.g. 07) selectable instead of silently rounding it.
  const minuteOptions = MINUTES.includes(minute) ? MINUTES : [...MINUTES, minute].sort();

  const emit = (date: Date | null, h = hour, m = minute) =>
    onChange(date ? `${toDateString(date)}T${h}:${m}` : "");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button id={id} type="button" className={cn(triggerClass, className)}>
          <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
          <span
            className={cn("truncate", !selected && "text-muted-foreground")}
            style={{ fontSize: 14 }}
          >
            {selected ? `${format(selected, "d MMM yyyy")} · ${hour}:${minute}` : placeholder}
          </span>
          {clearable && selected && !disabled ? <ClearButton onClear={() => onChange("")} /> : null}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto rounded-2xl p-3 shadow-lg">
        <CalendarPanel
          key={String(open)}
          selected={selected}
          onSelect={(d) => emit(d)}
          min={parseDate(min)}
          max={parseDate(max)}
          highlight={{ from: parseDate(highlight?.from), to: parseDate(highlight?.to) }}
        />
        <div className="flex items-center gap-2 border-t border-border mt-3 pt-3">
          <Clock className="size-4 text-muted-foreground" />
          <Select value={hour} onValueChange={(h) => emit(selected ?? startOfDay(new Date()), h, minute)}>
            <SelectTrigger size="sm" className="w-[4.25rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-56">
              {HOURS.map((h) => (
                <SelectItem key={h} value={h}>
                  {h}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-muted-foreground" style={{ fontWeight: 700 }}>
            :
          </span>
          <Select value={minute} onValueChange={(m) => emit(selected ?? startOfDay(new Date()), hour, m)}>
            <SelectTrigger size="sm" className="w-[4.25rem]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-56">
              {minuteOptions.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={!selected}
            className="ml-auto rounded-lg bg-primary text-primary-foreground px-3 py-1.5 hover:bg-primary/90 transition-colors disabled:opacity-50"
            style={{ fontSize: 12, fontWeight: 600 }}
          >
            Done
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
