import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ImageUp, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";

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
import { DatePicker } from "@/components/ui/DatePicker";
import { DIFFICULTY_LEVELS, TRIP_STATUSES } from "@/config";
import { useTags } from "@/contexts/TagsContext";
import { useImagePicker } from "@/hooks/useImagePicker";
import { coverImage } from "@/lib/adapters";
import { calculateDuration, getErrorMessage } from "@/lib/utils";
import { Field, FieldRow, FormModal } from "./FormModal";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip?: any;
  /** Create or update; supplied by the calling screen's context. Resolves to the saved trip. */
  onSave: (payload: Record<string, any>) => Promise<any>;
  /** Cover calls run after onSave, since a new trip needs its id first. */
  onCoverUpload: (tripId: string, file: File) => Promise<unknown>;
  onCoverRemove: (tripId: string) => Promise<unknown>;
  /** Runs once the trip and its cover are both saved (e.g. to navigate). */
  onSaved?: (trip: any) => void;
}

export function TripFormModal({
  open,
  onOpenChange,
  trip,
  onSave,
  onCoverUpload,
  onCoverRemove,
  onSaved,
}: Props) {
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
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverRemoved, setCoverRemoved] = useState(false);
  const coverPicker = useImagePicker((file) => {
    setCoverFile(file);
    setCoverRemoved(false);
  });

  const isEdit = Boolean(trip);
  const todayString = format(new Date(), "yyyy-MM-dd");

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
    setCoverFile(null);
    setCoverRemoved(false);
  }, [open, trip]);

  const coverPreview = useMemo(
    () => (coverFile ? URL.createObjectURL(coverFile) : null),
    [coverFile]
  );
  useEffect(
    () => () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    },
    [coverPreview]
  );

  const hasCustomCover = Boolean(coverFile || (trip?.cover_image && !coverRemoved));
  // Without a custom cover, preview the stock photo the destination will get.
  const coverSrc =
    coverPreview ||
    (hasCustomCover ? trip.cover_image : coverImage({ destination, title }));

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
    // A failure here rejects and keeps the dialog open, as before.
    const saved = await onSave(payload);

    // The trip is already saved, so a cover failure only warns; the cover can
    // be retried from the trip page.
    try {
      if (coverFile) await onCoverUpload(saved.id, coverFile);
      else if (coverRemoved && trip?.cover_image) await onCoverRemove(saved.id);
    } catch (error) {
      toast.error("Trip saved, but the cover didn't upload", {
        description: getErrorMessage(error),
      });
    }
    onSaved?.(saved);
    return saved;
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
      <Field label="Cover" hint="JPEG, PNG or WebP · max 5 MB">
        {coverPicker.input}
        <div className="relative h-36 rounded-xl overflow-hidden bg-muted border border-border">
          <img
            key={coverSrc}
            src={coverSrc}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
          {!hasCustomCover ? (
            <span
              className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 rounded-full bg-black/40 backdrop-blur-sm text-white px-2 py-0.5"
              style={{ fontSize: 11, fontWeight: 600 }}
            >
              <Sparkles className="w-3 h-3" /> Auto from destination
            </span>
          ) : null}
          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5">
            {hasCustomCover ? (
              <button
                type="button"
                onClick={() => {
                  setCoverFile(null);
                  setCoverRemoved(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/20 backdrop-blur-sm text-white px-2.5 py-1.5 hover:bg-white/30 transition-colors"
                style={{ fontSize: 12, fontWeight: 600 }}
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove
              </button>
            ) : null}
            <button
              type="button"
              onClick={coverPicker.open}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white text-foreground px-2.5 py-1.5 hover:bg-white/90 transition-colors shadow-sm"
              style={{ fontSize: 12, fontWeight: 600 }}
            >
              <ImageUp className="w-3.5 h-3.5" />
              {hasCustomCover ? "Change" : "Upload cover"}
            </button>
          </div>
        </div>
      </Field>

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
          <DatePicker
            id="tr-start"
            value={startDate}
            onChange={setStartDate}
            placeholder="Departure"
            min={isEdit ? undefined : todayString}
            max={endDate || undefined}
            highlight={{ from: startDate, to: endDate }}
          />
        </Field>
        <Field
          label="End date"
          htmlFor="tr-end"
          required
          hint={duration ? `${duration} days` : undefined}
        >
          <DatePicker
            id="tr-end"
            value={endDate}
            onChange={setEndDate}
            placeholder="Return"
            min={startDate || (isEdit ? undefined : todayString)}
            highlight={{ from: startDate, to: endDate }}
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
