import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

import { Input } from "@/app/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Switch } from "@/app/components/ui/switch";
import { Textarea } from "@/app/components/ui/textarea";
import { DIFFICULTY_LEVELS, TRIP_STATUSES } from "@/config";
import { useTags } from "@/contexts/TagsContext";
import { calculateDuration } from "@/lib/utils";
import { Field, FieldRow, FormModal } from "./FormModal";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip?: any;
  /** Create or update; supplied by the calling screen's context. */
  onSave: (payload: Record<string, any>) => Promise<unknown>;
}

export function TripFormModal({ open, onOpenChange, trip, onSave }: Props) {
  const { tags } = useTags();

  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState("");
  const [memberSpots, setMemberSpots] = useState("1");
  const [difficulty, setDifficulty] = useState("EASY");
  const [status, setStatus] = useState("PLANNING");
  const [isPublic, setIsPublic] = useState(false);
  const [isJoinable, setIsJoinable] = useState(true);
  const [notes, setNotes] = useState("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState("");
  const [newTagNames, setNewTagNames] = useState<string[]>([]);

  const isEdit = Boolean(trip);

  useEffect(() => {
    if (!open) return;
    setTitle(trip?.title || "");
    setDestination(trip?.destination || "");
    setDescription(trip?.description || "");
    setStartDate(trip?.start_date || "");
    setEndDate(trip?.end_date || "");
    setBudget(trip?.budget != null ? String(trip.budget) : "");
    setMemberSpots(String(trip?.member_spots ?? 1));
    setDifficulty(trip?.difficulty || "EASY");
    setStatus(trip?.status || "PLANNING");
    setIsPublic(Boolean(trip?.is_public));
    setIsJoinable(trip?.is_joinable ?? true);
    setNotes(trip?.notes || "");
    setTagIds((trip?.tags || []).map((t: any) => t.id));
    setNewTagNames([]);
    setNewTagInput("");
  }, [open, trip]);

  const duration = useMemo(
    () => (startDate && endDate ? calculateDuration(startDate, endDate) : 0),
    [startDate, endDate]
  );

  const validationError = !title.trim()
    ? "Title is required."
    : !destination.trim()
    ? "Destination is required."
    : !startDate || !endDate
    ? "Both start and end dates are required."
    : new Date(startDate) >= new Date(endDate)
    ? "The start date must be before the end date."
    : Number(memberSpots) < 1
    ? "There must be at least one member spot."
    : null;

  const toggleTag = (id: string) =>
    setTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );

  const addNewTag = () => {
    const name = newTagInput.trim();
    if (!name || newTagNames.includes(name)) return;
    setNewTagNames((prev) => [...prev, name]);
    setNewTagInput("");
  };

  const handleSubmit = async () => {
    const originalTagIds: string[] = (trip?.tags || []).map((t: any) => t.id);
    const payload: Record<string, any> = {
      title: title.trim(),
      destination: destination.trim(),
      description: description.trim(),
      start_date: startDate,
      end_date: endDate,
      duration: duration || 1,
      budget: budget === "" ? null : Number(budget),
      member_spots: Number(memberSpots),
      difficulty,
      is_public: isPublic,
      is_joinable: isJoinable,
      notes: notes.trim(),
      // The API takes tag deltas, not the full set.
      new_tag_ids: tagIds.filter((id) => !originalTagIds.includes(id)),
      new_tag_names: newTagNames,
    };
    if (isEdit) {
      // Status is server-managed on create (always PLANNING).
      payload.status = status;
      // Only TripSerializer.update() pops remove_tag_ids; sending it on create
      // reaches Trip(**validated_data) and raises a 500.
      payload.remove_tag_ids = originalTagIds.filter((id) => !tagIds.includes(id));
    }
    return onSave(payload);
  };

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Edit trip" : "New trip"}
      description="Where you're going, when, and who can join."
      submitLabel={isEdit ? "Save changes" : "Create trip"}
      onSubmit={handleSubmit}
      validationError={validationError}
    >
      <Field label="Title" htmlFor="tr-title" required>
        <Input
          id="tr-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Osaka food crawl"
        />
      </Field>

      <Field label="Destination" htmlFor="tr-dest" required>
        <Input
          id="tr-dest"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="Osaka, Japan"
        />
      </Field>

      <FieldRow>
        <Field
          label="Start date"
          htmlFor="tr-start"
          required
          hint={isEdit ? undefined : "Cannot be in the past."}
        >
          <Input
            id="tr-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </Field>
        <Field
          label="End date"
          htmlFor="tr-end"
          required
          hint={duration ? `${duration} days` : undefined}
        >
          <Input
            id="tr-end"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </Field>
      </FieldRow>

      <FieldRow>
        <Field label="Budget" htmlFor="tr-budget">
          <Input
            id="tr-budget"
            type="number"
            min="0"
            step="0.01"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="15000000"
          />
        </Field>
        <Field
          label="Member spots"
          htmlFor="tr-spots"
          hint="Can't be fewer than the accepted travelers."
        >
          <Input
            id="tr-spots"
            type="number"
            min="1"
            value={memberSpots}
            onChange={(e) => setMemberSpots(e.target.value)}
          />
        </Field>
      </FieldRow>

      <FieldRow>
        <Field label="Difficulty">
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(DIFFICULTY_LEVELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {isEdit ? (
          <Field label="Status">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TRIP_STATUSES).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        ) : null}
      </FieldRow>

      <Field label="Tags">
        <div className="flex flex-wrap gap-1.5">
          {(tags || []).map((t: any) => (
            <button
              key={t.id}
              type="button"
              onClick={() => toggleTag(t.id)}
              className={`rounded-full px-2.5 py-1 border transition-colors ${
                tagIds.includes(t.id)
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
              style={{ fontSize: 12, fontWeight: 500 }}
            >
              {t.name}
            </button>
          ))}
          {newTagNames.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 bg-primary text-primary-foreground"
              style={{ fontSize: 12, fontWeight: 500 }}
            >
              {name}
              <button
                type="button"
                onClick={() =>
                  setNewTagNames((prev) => prev.filter((n) => n !== name))
                }
                aria-label={`Remove ${name}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      </Field>

      <div className="flex gap-2">
        <Input
          value={newTagInput}
          onChange={(e) => setNewTagInput(e.target.value)}
          placeholder="Add a new tag"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              // Don't let Enter in the tag field submit the whole form.
              e.preventDefault();
              addNewTag();
            }
          }}
        />
        <button
          type="button"
          onClick={addNewTag}
          className="shrink-0 rounded-lg border border-border px-3 hover:bg-muted transition-colors"
          style={{ fontSize: 13, fontWeight: 600 }}
        >
          Add
        </button>
      </div>

      <div className="rounded-xl border border-border divide-y divide-border">
        <label className="flex items-center justify-between px-3 py-2.5 cursor-pointer">
          <span>
            <span className="block" style={{ fontSize: 13, fontWeight: 600 }}>
              Public trip
            </span>
            <span className="text-muted-foreground" style={{ fontSize: 11 }}>
              Listed on Explore for anyone to find.
            </span>
          </span>
          <Switch checked={isPublic} onCheckedChange={setIsPublic} />
        </label>
        <label className="flex items-center justify-between px-3 py-2.5 cursor-pointer">
          <span>
            <span className="block" style={{ fontSize: 13, fontWeight: 600 }}>
              Open to join
            </span>
            <span className="text-muted-foreground" style={{ fontSize: 11 }}>
              Travelers can join without an invite.
            </span>
          </span>
          <Switch checked={isJoinable} onCheckedChange={setIsJoinable} />
        </label>
      </div>

      <Field label="Description" htmlFor="tr-desc">
        <Textarea
          id="tr-desc"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>

      <Field label="Notes" htmlFor="tr-notes">
        <Textarea
          id="tr-notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>
    </FormModal>
  );
}
