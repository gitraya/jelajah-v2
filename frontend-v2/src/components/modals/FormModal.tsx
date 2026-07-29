import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Label } from "@/app/components/ui/label";
import { getErrorMessage } from "@/lib/utils";

interface FormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  submitLabel?: string;
  /** Return a rejected promise to keep the dialog open and surface the error. */
  onSubmit: () => Promise<unknown>;
  /** Blocks submission with this message when set. */
  validationError?: string | null;
  children: ReactNode;
}

/**
 * Dialog + form shell shared by every CRUD modal: owns the submitting state,
 * keeps the dialog open when the API rejects, and renders the server error
 * (DRF field errors included, via getErrorMessage) above the footer.
 */
export function FormModal({
  open,
  onOpenChange,
  title,
  description,
  submitLabel = "Save",
  onSubmit,
  validationError,
  children,
}: FormModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A reopened dialog should never show the previous attempt's error.
  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit();
      onOpenChange(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {children}

          {error ? (
            <p
              className="rounded-lg bg-destructive/10 text-destructive px-3 py-2"
              style={{ fontSize: 13 }}
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : null}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Label + control + optional hint, so every modal field lines up the same. */
export function Field({
  label,
  htmlFor,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} style={{ fontSize: 13 }}>
        {label}
        {required ? <span className="text-destructive ml-0.5">*</span> : null}
      </Label>
      {children}
      {hint ? (
        <p className="text-muted-foreground" style={{ fontSize: 11 }}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Two fields side by side; collapses to one column on narrow dialogs. */
export function FieldRow({ children }: { children: ReactNode }) {
  return <div className="grid sm:grid-cols-2 gap-3">{children}</div>;
}
