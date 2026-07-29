import { useEffect, useRef, useState } from "react";

import { Button } from "@/app/components/ui/button";
import { GOOGLE_CLIENT_ID, IS_DEVELOPMENT } from "@/config";

const GSI_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
// `openid` is what makes Google return an ID token when the backend redeems the code.
const GSI_SCOPE = "openid email profile";

let gsiScriptPromise: Promise<void> | null = null;

/** Load the Google Identity Services script once per page. */
function loadGoogleScript(): Promise<void> {
  if (gsiScriptPromise) return gsiScriptPromise;

  gsiScriptPromise = new Promise<void>((resolve, reject) => {
    const fail = () => {
      gsiScriptPromise = null;
      reject(new Error("Failed to load Google Identity Services"));
    };

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GSI_SCRIPT_SRC}"]`
    );
    if (existing) {
      if (window.google) resolve();
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", fail);
      return;
    }

    const script = document.createElement("script");
    script.src = GSI_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = fail;
    document.head.appendChild(script);
  });

  return gsiScriptPromise;
}

/** The Google "G", so the button reads as a Google action without Google's own iframe. */
function GoogleLogo() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true" className="w-4 h-4">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

/**
 * "Continue with Google" using the popup authorization-code flow, so the button is
 * an ordinary app `Button` instead of Google's unstyleable rendered iframe. The code
 * it returns goes to the backend through `useAuth().loginWithGoogle`, which is where
 * the session cookies actually come from.
 *
 * Renders nothing when `VITE_GOOGLE_CLIENT_ID` is unset, so the auth pages keep
 * working on environments without Google credentials.
 */
export default function GoogleSignInButton({
  onCode,
  label = "Continue with Google",
  disabled = false,
}: {
  onCode: (code: string) => void | Promise<void>;
  label?: string;
  disabled?: boolean;
}) {
  const clientRef = useRef<GoogleCodeClient | null>(null);
  // The callback given to Google is registered once; keep it pointing at the
  // latest props so a re-render never fires a stale handler.
  const onCodeRef = useRef(onCode);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    onCodeRef.current = onCode;
  }, [onCode]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;

    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !window.google) return;

        clientRef.current = window.google.accounts.oauth2.initCodeClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: GSI_SCOPE,
          ux_mode: "popup",
          callback: (response) => {
            if (response.code) onCodeRef.current(response.code);
          },
          error_callback: (error) => {
            // Closing the popup lands here too, so this is not surfaced to the user.
            if (IS_DEVELOPMENT) console.error("Google sign-in cancelled:", error);
          },
        });
        setReady(true);
      })
      .catch((error) => {
        if (IS_DEVELOPMENT) console.error("Google sign-in unavailable:", error);
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!GOOGLE_CLIENT_ID) return null;

  if (failed) {
    return (
      <p className="text-xs text-muted-foreground text-center">
        Google sign-in is unavailable right now.
      </p>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      disabled={disabled || !ready}
      onClick={() => clientRef.current?.requestCode()}
    >
      <GoogleLogo />
      {label}
    </Button>
  );
}
