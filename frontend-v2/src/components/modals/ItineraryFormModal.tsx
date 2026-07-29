import { useEffect, useState } from "react";

import { Input } from "@/app/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Textarea } from "@/app/components/ui/textarea";
import { ITINERARY_STATUSES } from "@/config";
import { useItineraries } from "@/contexts/ItinerariesContext";
import { Field, FieldRow, FormModal } from "./FormModal";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Existing item to edit; omit to create. */
  item?: any;
}

/**
 * `visit_time` is a DateTimeField on the API but <input type="datetime-local">
 * speaks local wall-clock strings, so convert in both directions.
 */
const toLocalInput = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
};

const emptyForm = {
  name: "",
  type_id: "",
  visit_time: "",
  estimated_time: "",
  address: "",
  status: "PLANNED",
  description: "",
  notes: "",
  latitude: "",
  longitude: "",
};

export function ItineraryFormModal({ open, onOpenChange, item }: Props) {
  const { types, createItinerary, updateItinerary } = useItineraries();
  const [form, setForm] = useState(emptyForm);

  // Selectable types exclude the synthetic "All" entry the context prepends
  // for filter chips.
  const selectableTypes = (types || []).filter((t: any) => t.id !== "all");

  useEffect(() => {
    if (!open) return;
    setForm(
      item
        ? {
            name: item.name || "",
            type_id: item.type?.id || "",
            visit_time: toLocalInput(item.visit_time),
            estimated_time: item.estimated_time || "",
            address: item.address || "",
            status: item.status || "PLANNED",
            description: item.description || "",
            notes: item.notes || "",
            latitude: item.latitude ?? "",
            longitude: item.longitude ?? "",
          }
        : emptyForm
    );
  }, [open, item]);

  const set = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const validationError = !form.name.trim()
    ? "Name is required."
    : !form.type_id
    ? "Please choose a type."
    : null;

  const handleSubmit = async () => {
    const payload: Record<string, any> = {
      name: form.name.trim(),
      type_id: form.type_id,
      status: form.status,
      address: form.address.trim(),
      description: form.description.trim(),
      notes: form.notes.trim(),
      estimated_time: form.estimated_time.trim() || null,
      visit_time: form.visit_time ? new Date(form.visit_time).toISOString() : null,
      latitude: form.latitude === "" ? null : form.latitude,
      longitude: form.longitude === "" ? null : form.longitude,
    };
    return item
      ? updateItinerary(item.id, payload)
      : createItinerary(payload);
  };

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title={item ? "Edit stop" : "Add stop"}
      description="Places and activities on this trip's itinerary."
      submitLabel={item ? "Save changes" : "Add stop"}
      onSubmit={handleSubmit}
      validationError={validationError}
    >
      <Field label="Name" htmlFor="it-name" required>
        <Input
          id="it-name"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Fushimi Inari Shrine"
        />
      </Field>

      <FieldRow>
        <Field label="Type" required>
          <Select value={form.type_id} onValueChange={(v) => set("type_id", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a type" />
            </SelectTrigger>
            <SelectContent>
              {selectableTypes.map((t: any) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Status">
          <Select value={form.status} onValueChange={(v) => set("status", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ITINERARY_STATUSES).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </FieldRow>

      <FieldRow>
        <Field
          label="Visit time"
          htmlFor="it-visit"
          hint="Must fall within the trip dates."
        >
          <Input
            id="it-visit"
            type="datetime-local"
            value={form.visit_time}
            onChange={(e) => set("visit_time", e.target.value)}
          />
        </Field>

        <Field label="Estimated duration" htmlFor="it-est">
          <Input
            id="it-est"
            value={form.estimated_time}
            onChange={(e) => set("estimated_time", e.target.value)}
            placeholder="2-3 hours"
          />
        </Field>
      </FieldRow>

      <Field label="Address" htmlFor="it-address">
        <Input
          id="it-address"
          value={form.address}
          onChange={(e) => set("address", e.target.value)}
          placeholder="68 Fukakusa Yabunouchicho, Kyoto"
        />
      </Field>

      <FieldRow>
        <Field label="Latitude" htmlFor="it-lat">
          <Input
            id="it-lat"
            type="number"
            step="any"
            value={form.latitude}
            onChange={(e) => set("latitude", e.target.value)}
            placeholder="34.9671"
          />
        </Field>
        <Field label="Longitude" htmlFor="it-lng">
          <Input
            id="it-lng"
            type="number"
            step="any"
            value={form.longitude}
            onChange={(e) => set("longitude", e.target.value)}
            placeholder="135.7727"
          />
        </Field>
      </FieldRow>

      <Field label="Description" htmlFor="it-desc">
        <Textarea
          id="it-desc"
          rows={2}
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </Field>

      <Field label="Notes" htmlFor="it-notes">
        <Textarea
          id="it-notes"
          rows={2}
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
        />
      </Field>
    </FormModal>
  );
}
