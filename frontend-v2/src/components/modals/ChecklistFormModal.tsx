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
import { CHECKLIST_PRIORITY } from "@/config";
import { useChecklist } from "@/contexts/ChecklistContext";
import { useMembers } from "@/contexts/MembersContext";
import { memberName } from "@/lib/adapters";
import { Field, FieldRow, FormModal } from "./FormModal";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: any;
}

export function ChecklistFormModal({ open, onOpenChange, item }: Props) {
  const { createChecklist, updateChecklist } = useChecklist();
  const { acceptedMembers } = useMembers();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [dueDate, setDueDate] = useState("");
  const [assignedTo, setAssignedTo] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle(item?.title || "");
    setDescription(item?.description || "");
    setPriority(item?.priority || "MEDIUM");
    setDueDate(item?.due_date || "");
    setAssignedTo(item?.assigned_to?.id || "");
  }, [open, item]);

  // assigned_to_id is required by ChecklistItemSerializer, unlike packing.
  const validationError = !title.trim()
    ? "Title is required."
    : !assignedTo
    ? "Please assign this task to a traveler."
    : null;

  const handleSubmit = async () => {
    const payload = {
      title: title.trim(),
      description: description.trim(),
      priority,
      due_date: dueDate || null,
      assigned_to_id: assignedTo,
    };
    return item ? updateChecklist(item.id, payload) : createChecklist(payload);
  };

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title={item ? "Edit task" : "Add task"}
      description="Things to do before, during, or after the trip."
      submitLabel={item ? "Save changes" : "Add task"}
      onSubmit={handleSubmit}
      validationError={validationError}
    >
      <Field label="Task" htmlFor="cl-title" required>
        <Input
          id="cl-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Renew passport"
        />
      </Field>

      <FieldRow>
        <Field label="Priority">
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CHECKLIST_PRIORITY).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field
          label="Due date"
          htmlFor="cl-due"
          hint="Sorts the task into pre-, during-, or post-trip."
        >
          <Input
            id="cl-due"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </Field>
      </FieldRow>

      <Field label="Assigned to" required>
        <Select value={assignedTo} onValueChange={setAssignedTo}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a traveler" />
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

      <Field label="Description" htmlFor="cl-desc">
        <Textarea
          id="cl-desc"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>
    </FormModal>
  );
}
