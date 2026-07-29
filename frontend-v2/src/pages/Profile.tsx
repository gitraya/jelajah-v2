import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { Field, FieldRow } from "@/components/modals/FormModal";
import { useAuth } from "@/contexts/AuthContext";
import { colorFor, memberInitials } from "@/lib/adapters";
import { formatDate, getErrorMessage } from "@/lib/utils";

/** Your own profile, backed by GET/PATCH /auth/me/. */
export default function Profile() {
  const { user, updateProfile } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFirstName(user.first_name || "");
    setLastName(user.last_name || "");
    setPhone(user.phone || "");
    setBio(user.bio || "");
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        bio: bio.trim(),
      });
      toast.success("Profile updated");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not save your profile"));
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Loading profile…
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-10 py-8">
      <div className="flex items-center gap-4 mb-7">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shrink-0"
          style={{
            background: colorFor(user.email || user.id),
            fontSize: 20,
            fontWeight: 800,
          }}
        >
          {memberInitials(user)}
        </div>
        <div>
          <h1
            className="text-foreground mb-0.5"
            style={{ fontWeight: 800, fontSize: 26, letterSpacing: "-0.03em" }}
          >
            {`${user.first_name || ""} ${user.last_name || ""}`.trim() ||
              user.email}
          </h1>
          <p className="text-muted-foreground" style={{ fontSize: 13 }}>
            {user.email}
            {user.date_joined ? ` · joined ${formatDate(user.date_joined)}` : ""}
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 max-w-2xl space-y-4">
        <FieldRow>
          <Field label="First name" htmlFor="pf-first">
            <Input
              id="pf-first"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </Field>
          <Field label="Last name" htmlFor="pf-last">
            <Input
              id="pf-last"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </Field>
        </FieldRow>

        <Field label="Email" htmlFor="pf-email" hint="Email can't be changed.">
          <Input id="pf-email" value={user.email || ""} disabled />
        </Field>

        <Field
          label="Phone"
          htmlFor="pf-phone"
          hint="Use a country code (e.g. +62) for non-local numbers."
        >
          <Input
            id="pf-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </Field>

        <Field label="Bio" htmlFor="pf-bio">
          <Textarea
            id="pf-bio"
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Solo traveler turned group trip addict 🌏"
          />
        </Field>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save profile"}
          </Button>
        </div>
      </div>
    </div>
  );
}
