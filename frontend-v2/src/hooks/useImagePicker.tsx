import { useRef } from "react";
import { toast } from "sonner";

// Mirrors backend/backend/images.py so bad files fail fast, before uploading.
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Opens the OS file dialog for a single image and hands a validated File to
 * `onPick`. Render the returned `input` anywhere in the component.
 */
export function useImagePicker(onPick: (file: File) => void) {
  const inputRef = useRef<HTMLInputElement>(null);

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept={ACCEPTED_TYPES.join(",")}
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0];
        // Reset so picking the same file again still fires onChange.
        e.target.value = "";
        if (!file) return;
        if (!ACCEPTED_TYPES.includes(file.type)) {
          toast.error("Choose a JPEG, PNG, or WebP image.");
          return;
        }
        if (file.size > MAX_BYTES) {
          toast.error("Image must be 5 MB or smaller.");
          return;
        }
        onPick(file);
      }}
    />
  );

  return { open: () => inputRef.current?.click(), input };
}
