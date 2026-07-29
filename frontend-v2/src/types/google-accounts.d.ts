// Minimal typings for the slice of Google Identity Services we use.
// Loaded at runtime from https://accounts.google.com/gsi/client.
interface GoogleCodeResponse {
  code?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

interface GoogleCodeClientConfig {
  client_id: string;
  scope: string;
  ux_mode?: "popup" | "redirect";
  callback: (response: GoogleCodeResponse) => void;
  error_callback?: (error: { type?: string; message?: string }) => void;
}

interface GoogleCodeClient {
  requestCode: () => void;
}

interface Window {
  google?: {
    accounts: {
      oauth2: {
        initCodeClient: (config: GoogleCodeClientConfig) => GoogleCodeClient;
      };
    };
  };
}
