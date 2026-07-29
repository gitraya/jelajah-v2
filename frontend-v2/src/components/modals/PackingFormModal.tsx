import { useEffect, useState } from "react";

import { Input } from "@/app/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { useMembers } from "@/contexts/MembersContext";
import { usePackingItems } from "@/contexts/PackingItemsContext";
import { memberName } from "@/lib/adapters";
import { Field, FieldRow, FormModal } from "./FormModal";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: any;
}

/** Sentinel for "no assignee" — Radix Select can't hold an empty string value. */
const UNASSIGNED = "__unassigned__";

export function PackingFormModal({ open, onOpenChange, item }: Props) {
  const { categories, createPacking, updatePacking } = usePackingItems();
  const { acceptedMembers } = useMembers();

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [assignedTo, setAssignedTo] = useState(UNASSIGNED);

  const selectableCategories = (categories || []).filter(
    (c: any) => c.id !== "all"
  );

  useEffect(() => {
    if (!open) return;
    setName(item?.name || "");
    setCategoryId(item?.category?.id || "");
    setQuantity(String(item?.quantity ?? 1));
    setAssignedTo(item?.assigned_to?.id || UNASSIGNED);
  }, [open, item]);

  const validationError = !name.trim()
    ? "Name is required."
    : !categoryId
    ? "Please choose a category."
    : Number(quantity) < 1
    ? "Quantity must be at least 1."
    : null;

  const handleSubmit = async () => {
    const payload = {
      name: name.trim(),
      category_id: categoryId,
      quantity: Number(quantity),
      assigned_to_id: assignedTo === UNASSIGNED ? null : assignedTo,
    };
    return item ? updatePacking(item.id, payload) : createPacking(payload);
  };

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title={item ? "Edit packing item" : "Add packing item"}
      description="What the group needs to bring."
      submitLabel={item ? "Save changes" : "Add item"}
      onSubmit={handleSubmit}
      validationError={validationError}
    >
      <Field label="Item" htmlFor="pk-name" required>
        <Input
          id="pk-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Universal power adapter"
        />
      </Field>

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

        <Field label="Quantity" htmlFor="pk-qty">
          <Input
            id="pk-qty"
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </Field>
      </FieldRow>

      <Field label="Assigned to" hint="Only accepted travelers can be assigned.">
        <Select value={assignedTo} onValueChange={setAssignedTo}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNASSIGNED}>Nobody yet</SelectItem>
            {(acceptedMembers || []).map((m: any) => (
              <SelectItem key={m.id} value={m.id}>
                {memberName(m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </FormModal>
  );
}
