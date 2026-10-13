import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Input } from "@/app/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { useTrips } from "@/contexts/TripsContext";
import { useApi } from "@/hooks/useApi";
import { Field, FormModal } from "./FormModal";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Invite this specific buddy: the email is prefilled and locked. */
  email?: string;
  /** Display name for the toast when inviting a known buddy. */
  name?: string;
  /** Trips the invitee already belongs to; hidden from the picker. */
  excludeTripIds?: string[];
  /** Called with the trip id after a successful invite. */
  onInvited?: (tripId: string) => void;
}

/**
 * Invite someone to one of your trips from outside the trip page.
 *
 * MembersContext is per-trip (it reads the trip id from the route), so this
 * posts the same payload as MemberFormModal's invite — `{ email, role }` to
 * `/trips/<id>/members/items/` — directly through useApi with the chosen trip.
 */
export function InviteBuddyModal({
  open,
  onOpenChange,
  email: fixedEmail,
  name,
  excludeTripIds = [],
  onInvited,
}: Props) {
  const { myTrips } = useTrips();
  const { postRequest } = useApi();
  const [email, setEmail] = useState("");
  const [tripId, setTripId] = useState("");

  // Only trips you can manage, minus the ones the buddy is already on.
  const trips = useMemo(
    () =>
      (myTrips || []).filter(
        (t: any) => t.is_editable && !excludeTripIds.includes(t.id)
      ),
    [myTrips, excludeTripIds]
  );

  useEffect(() => {
    if (!open) return;
    setEmail(fixedEmail || "");
    setTripId("");
  }, [open, fixedEmail]);

  const validationError = !email.trim()
    ? "An email address is required to invite."
    : !tripId
    ? "Choose a trip to invite them to."
    : null;

  const handleSubmit = async () => {
    await postRequest(`/trips/${tripId}/members/items/`, {
      email: email.trim(),
      role: "MEMBER",
    });
    const trip = trips.find((t: any) => t.id === tripId);
    toast.success("Invite sent", {
      description: `${name || email.trim()} was invited to ${trip?.title || "your trip"}.`,
    });
    onInvited?.(tripId);
  };

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title={name ? `Invite ${name} to a trip` : "Invite a buddy"}
      description="They'll get an email invite. New users receive a link to set their password."
      submitLabel="Send invite"
      onSubmit={handleSubmit}
      validationError={validationError}
    >
      <Field label="Email" htmlFor="ib-email" required>
        <Input
          id="ib-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          readOnly={Boolean(fixedEmail)}
          disabled={Boolean(fixedEmail)}
          placeholder="traveler@example.com"
        />
      </Field>

      <Field
        label="Trip"
        required
        hint={
          trips.length === 0
            ? fixedEmail
              ? "They're already on every trip you can invite to."
              : "You don't organize any trips yet — create one first."
            : undefined
        }
      >
        <Select value={tripId} onValueChange={setTripId} disabled={trips.length === 0}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a trip" />
          </SelectTrigger>
          <SelectContent>
            {trips.map((t: any) => (
              <SelectItem key={t.id} value={t.id}>
                {t.title}
                {t.destination ? ` · ${t.destination}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </FormModal>
  );
}
