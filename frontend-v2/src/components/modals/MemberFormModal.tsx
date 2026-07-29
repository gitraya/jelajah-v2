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
import { TRIP_MEMBER_ROLES, TRIP_MEMBER_STATUSES } from "@/config";
import { useMembers } from "@/contexts/MembersContext";
import { memberName } from "@/lib/adapters";
import { Field, FieldRow, FormModal } from "./FormModal";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Existing membership to edit; omit to invite someone new. */
  member?: any;
}

/**
 * Invite (create) and manage (edit) a TripMember.
 *
 * On invite the backend resolves the email to an existing user or creates a
 * passwordless one and emails a set-password link, so email is the only
 * required field. On edit the user is fixed — only role, status, and the
 * traveler details are writable.
 */
export function MemberFormModal({ open, onOpenChange, member }: Props) {
  const { createMember, updateMember } = useMembers();

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("MEMBER");
  const [status, setStatus] = useState("PENDING");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [dietary, setDietary] = useState("");

  const isEdit = Boolean(member);

  useEffect(() => {
    if (!open) return;
    setEmail(member?.user?.email || "");
    setFirstName(member?.user?.first_name || "");
    setLastName(member?.user?.last_name || "");
    setPhone(member?.user?.phone || "");
    setRole(member?.role || "MEMBER");
    setStatus(member?.status || "PENDING");
    setEmergencyName(member?.emergency_contact_name || "");
    setEmergencyPhone(member?.emergency_contact_phone || "");
    setDietary(member?.dietary_restrictions || "");
  }, [open, member]);

  const validationError =
    !isEdit && !email.trim() ? "An email address is required to invite." : null;

  const handleSubmit = async () => {
    if (isEdit) {
      return updateMember(member.id, {
        role,
        status,
        emergency_contact_name: emergencyName.trim(),
        emergency_contact_phone: emergencyPhone.trim(),
        dietary_restrictions: dietary.trim(),
      });
    }
    // These write-only fields reject blank strings, so send only what's filled.
    const payload: Record<string, any> = { email: email.trim(), role };
    if (firstName.trim()) payload.first_name = firstName.trim();
    if (lastName.trim()) payload.last_name = lastName.trim();
    if (phone.trim()) payload.phone = phone.trim();
    return createMember(payload);
  };

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? `Manage ${memberName(member)}` : "Invite traveler"}
      description={
        isEdit
          ? "Update this traveler's role, status, and trip details."
          : "They'll get an email invite. New users receive a link to set their password."
      }
      submitLabel={isEdit ? "Save changes" : "Send invite"}
      onSubmit={handleSubmit}
      validationError={validationError}
    >
      {isEdit ? null : (
        <>
          <Field label="Email" htmlFor="mb-email" required>
            <Input
              id="mb-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="traveler@example.com"
            />
          </Field>

          <FieldRow>
            <Field label="First name" htmlFor="mb-first">
              <Input
                id="mb-first"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </Field>
            <Field label="Last name" htmlFor="mb-last">
              <Input
                id="mb-last"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </Field>
          </FieldRow>

          <Field
            label="Phone"
            htmlFor="mb-phone"
            hint="Use a country code (e.g. +62) for non-local numbers."
          >
            <Input
              id="mb-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </Field>
        </>
      )}

      <FieldRow>
        <Field label="Role">
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TRIP_MEMBER_ROLES).map(([key, [value, label]]) => (
                <SelectItem key={key} value={value}>
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
                {Object.entries(TRIP_MEMBER_STATUSES).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        ) : null}
      </FieldRow>

      {isEdit ? (
        <>
          <FieldRow>
            <Field label="Emergency contact" htmlFor="mb-ec-name">
              <Input
                id="mb-ec-name"
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
              />
            </Field>
            <Field label="Emergency phone" htmlFor="mb-ec-phone">
              <Input
                id="mb-ec-phone"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
              />
            </Field>
          </FieldRow>

          <Field label="Dietary restrictions" htmlFor="mb-diet">
            <Textarea
              id="mb-diet"
              rows={2}
              value={dietary}
              onChange={(e) => setDietary(e.target.value)}
              placeholder="Vegetarian, no shellfish…"
            />
          </Field>
        </>
      ) : null}
    </FormModal>
  );
}
