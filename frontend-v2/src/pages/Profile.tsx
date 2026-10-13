import { useEffect, useState } from "react";
import { Camera, Loader2, MapPin, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import { Field, FieldRow } from "@/components/modals/FormModal";
import { UserAvatar } from "@/components/UserAvatar";
import { useAuth } from "@/contexts/AuthContext";
import { useImagePicker } from "@/hooks/useImagePicker";
import {
  INTEREST_MAX_LENGTH,
  INTEREST_SUGGESTIONS,
  INTERESTS_MAX,
} from "@/config";
import { formatDate, getErrorMessage } from "@/lib/utils";

/** Your own profile, backed by GET/PATCH /auth/me/. */
export default function Profile() {
  const { user, updateProfile, uploadAvatar, removeAvatar } = useAuth();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);

  const runAvatarAction = async (action: () => Promise<unknown>, success: string) => {
    setAvatarBusy(true);
    try {
      await action();
      toast.success(success);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not update your photo"));
    } finally {
      setAvatarBusy(false);
    }
  };

  const avatarPicker = useImagePicker((file) =>
    runAvatarAction(() => uploadAvatar(file), "Photo updated")
  );

  useEffect(() => {
    if (!user) return;
    setFirstName(user.first_name || "");
    setLastName(user.last_name || "");
    setPhone(user.phone || "");
    setBio(user.bio || "");
    setLocation(user.location || "");
    setInterests(Array.isArray(user.interests) ? user.interests : []);
    // Keyed on id so an avatar upload doesn't wipe unsaved field edits.
  }, [user?.id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        bio: bio.trim(),
        location: location.trim(),
        interests,
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
        {avatarPicker.input}
        <button
          type="button"
          onClick={avatarPicker.open}
          disabled={avatarBusy}
          className="group relative w-16 h-16 rounded-2xl shrink-0 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          aria-label="Change profile photo"
          title="Change profile photo"
        >
          <UserAvatar
            person={user}
            className="w-full h-full rounded-2xl"
            style={{ fontSize: 20, fontWeight: 800 }}
          />
          <span
            className={`absolute inset-0 rounded-2xl bg-black/45 flex items-center justify-center text-white transition-opacity ${
              avatarBusy ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"
            }`}
          >
            {avatarBusy ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Camera className="w-5 h-5" />
            )}
          </span>
          <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground border-2 border-background flex items-center justify-center shadow-sm">
            <Camera className="w-3 h-3" />
          </span>
        </button>
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
          <div className="flex items-center gap-3 mt-1.5" style={{ fontSize: 12, fontWeight: 600 }}>
            <button
              type="button"
              onClick={avatarPicker.open}
              disabled={avatarBusy}
              className="text-primary hover:underline disabled:opacity-50"
            >
              {user.avatar ? "Change photo" : "Upload photo"}
            </button>
            {user.avatar ? (
              <button
                type="button"
                onClick={() => runAvatarAction(removeAvatar, "Photo removed")}
                disabled={avatarBusy}
                className="text-muted-foreground hover:text-destructive disabled:opacity-50"
              >
                Remove
              </button>
            ) : null}
            <span className="text-muted-foreground" style={{ fontWeight: 400 }}>
              JPEG, PNG or WebP · max 5 MB
            </span>
          </div>
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

        <Field label="Location" htmlFor="pf-location">
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              id="pf-location"
              value={location}
              maxLength={100}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Jakarta, ID"
              className="pl-9"
            />
          </div>
        </Field>

        <Field
          label="Interests"
          htmlFor="pf-interests"
          hint={`Up to ${INTERESTS_MAX} — shown on your buddy card.`}
        >
          <InterestsInput
            id="pf-interests"
            value={interests}
            onChange={setInterests}
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

/** Chip input for profile interests: Enter/comma adds, Backspace removes. */
function InterestsInput({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const full = value.length >= INTERESTS_MAX;
  const has = (tag: string) =>
    value.some((v) => v.toLowerCase() === tag.toLowerCase());

  const add = (raw: string) => {
    const tag = raw.trim().slice(0, INTEREST_MAX_LENGTH);
    if (!tag || has(tag)) return;
    if (full) {
      toast.error(`You can pick up to ${INTERESTS_MAX} interests`);
      return;
    }
    onChange([...value, tag]);
  };

  const remove = (tag: string) => onChange(value.filter((v) => v !== tag));

  const suggestions = INTEREST_SUGGESTIONS.filter((s) => !has(s));

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-input-background px-2 py-1.5 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 transition-[color,box-shadow]">
        {value.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 bg-secondary text-secondary-foreground rounded-full pl-2.5 pr-1 py-0.5"
            style={{ fontSize: 12, fontWeight: 600 }}
          >
            {tag}
            <button
              type="button"
              onClick={() => remove(tag)}
              aria-label={`Remove ${tag}`}
              className="rounded-full p-0.5 hover:bg-primary/15"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          maxLength={INTEREST_MAX_LENGTH}
          disabled={full}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(draft);
              setDraft("");
            } else if (e.key === "Backspace" && !draft && value.length) {
              remove(value[value.length - 1]);
            }
          }}
          onBlur={() => {
            if (draft.trim()) {
              add(draft);
              setDraft("");
            }
          }}
          placeholder={
            full ? "Max reached" : value.length ? "Add another…" : "Type and press Enter"
          }
          className="flex-1 min-w-[120px] bg-transparent outline-none py-0.5 text-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed"
          style={{ fontSize: 14 }}
        />
      </div>
      {!full && suggestions.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="flex items-center gap-1 border border-dashed border-border text-muted-foreground rounded-full px-2.5 py-0.5 hover:border-primary hover:text-primary transition-colors"
              style={{ fontSize: 12, fontWeight: 500 }}
            >
              <Plus className="w-3 h-3" />
              {s}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
