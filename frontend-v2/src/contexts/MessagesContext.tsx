import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { UNREAD_POLL_MS } from "@/config";
import { useAuth } from "@/contexts/AuthContext";
import { useApi } from "@/hooks/useApi";

interface MessagesContextValue {
  /** Unread direct messages across all conversations. */
  unreadCount: number;
  /** Re-reads GET /messages/unread-count/ now (e.g. after opening a chat). */
  refreshUnread: () => Promise<void>;
}

const MessagesContext = createContext<MessagesContextValue | null>(null);

export const useMessages = () => {
  const context = useContext(MessagesContext);
  if (!context) {
    throw new Error("useMessages must be used within a MessagesProvider");
  }
  return context;
};

/**
 * Polls the unread DM count every 30 s while signed in and the tab is
 * visible. There are no websockets; ChatPanel polls its own conversation.
 */
export const MessagesProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const { getRequest } = useApi();
  const [unreadCount, setUnreadCount] = useState(0);

  // useApi returns fresh closures each render; keep the latest in a ref so the
  // interval doesn't restart every render.
  const getRef = useRef(getRequest);
  getRef.current = getRequest;

  const refreshUnread = useCallback(async () => {
    try {
      const res = await getRef.current("/messages/unread-count/");
      setUnreadCount(Number(res.data?.unread || 0));
    } catch {
      // A failed poll just keeps the last known count.
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return;
    }

    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (timer) return;
      refreshUnread();
      timer = setInterval(refreshUnread, UNREAD_POLL_MS);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const onVisibility = () =>
      document.visibilityState === "visible" ? start() : stop();

    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [isAuthenticated, refreshUnread]);

  return (
    <MessagesContext.Provider value={{ unreadCount, refreshUnread }}>
      {children}
    </MessagesContext.Provider>
  );
};
