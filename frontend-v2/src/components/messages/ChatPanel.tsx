import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2, MessageCircle, RotateCw, Send } from "lucide-react";

import { UserAvatar } from "@/components/UserAvatar";
import { MESSAGE_MAX_LENGTH, MESSAGE_POLL_MS } from "@/config";
import { useAuth } from "@/contexts/AuthContext";
import { useMessages } from "@/contexts/MessagesContext";
import { useApi } from "@/hooks/useApi";
import {
  PRESENCE_COLORS,
  dayKey,
  dayLabel,
  memberName,
  messageTime,
  presenceLabel,
} from "@/lib/adapters";
import { cn, getErrorMessage } from "@/lib/utils";

/** A conversation as returned by GET/POST /messages/conversations/. */
export interface Conversation {
  id: string;
  other_user: any;
  last_message: { id: string; body: string; sender_id: string; created_at: string } | null;
  unread_count: number;
  updated_at: string;
}

interface Message {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
  /** Client-only: optimistic send state. */
  pending?: boolean;
  failed?: boolean;
}

interface Props {
  conversation: Conversation;
  /** Shows a back arrow in the header (list-or-chat layout on small screens). */
  onBack?: () => void;
  /** Called after a send succeeds or new messages arrive, so lists can refresh. */
  onActivity?: () => void;
  /** Leaves room on the header's right for an overlay close button (Sheet). */
  headerInset?: boolean;
  className?: string;
}

const isTemp = (m: Message) => m.id.startsWith("tmp-");

/** Merge server messages into the list by id, keeping ascending order. */
const mergeMessages = (current: Message[], incoming: Message[]) => {
  if (!incoming.length) return current;
  const byId = new Map(current.map((m) => [m.id, m]));
  incoming.forEach((m) => byId.set(m.id, m));
  return [...byId.values()].sort((a, b) => {
    // Unsent optimistic messages stay at the end.
    if (isTemp(a) !== isTemp(b)) return isTemp(a) ? 1 : -1;
    return a.created_at.localeCompare(b.created_at);
  });
};

/**
 * One direct-message thread. Loads the last 100 messages, then polls
 * `?after=<last created_at>` every 5 s while mounted and the tab is visible.
 */
export function ChatPanel({
  conversation,
  onBack,
  onActivity,
  headerInset,
  className,
}: Props) {
  const { user } = useAuth();
  const { refreshUnread } = useMessages();
  const { getRequest, postRequest } = useApi();
  const other = conversation.other_user || {};
  const base = `/messages/conversations/${conversation.id}/messages/`;

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const stickToBottom = useRef(true);
  const messagesRef = useRef<Message[]>([]);
  messagesRef.current = messages;
  // Latest closures for the interval without re-arming it every render.
  const apiRef = useRef({ getRequest, postRequest, refreshUnread, onActivity });
  apiRef.current = { getRequest, postRequest, refreshUnread, onActivity };

  const lastServerTimestamp = () => {
    const server = messagesRef.current.filter((m) => !isTemp(m));
    return server.length ? server[server.length - 1].created_at : null;
  };

  const poll = useCallback(async () => {
    const after = lastServerTimestamp();
    if (!after) return;
    try {
      const res = await apiRef.current.getRequest(base, { params: { after } });
      const incoming: Message[] = res.data || [];
      if (incoming.length) {
        setMessages((prev) => mergeMessages(prev, incoming));
        // The fetch marked the other person's messages as read.
        if (incoming.some((m) => m.sender_id !== user?.id)) {
          apiRef.current.refreshUnread();
          apiRef.current.onActivity?.();
        }
      }
    } catch {
      // Transient poll failures are retried on the next tick.
    }
  }, [base, user?.id]);

  // Initial load whenever the conversation changes.
  useEffect(() => {
    let cancelled = false;
    setMessages([]);
    setLoading(true);
    setLoadError(null);
    stickToBottom.current = true;
    apiRef.current
      .getRequest(base)
      .then((res: any) => {
        if (cancelled) return;
        setMessages(mergeMessages([], res.data || []));
        apiRef.current.refreshUnread();
        apiRef.current.onActivity?.();
      })
      .catch((error: any) => {
        if (!cancelled) setLoadError(getErrorMessage(error, "Could not load messages"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    inputRef.current?.focus();
    return () => {
      cancelled = true;
    };
  }, [base]);

  // Poll for new messages while open and visible. With an empty thread there
  // is no `after` cursor yet, so fall back to a full reload.
  useEffect(() => {
    if (loading || loadError) return;
    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      if (lastServerTimestamp()) return poll();
      try {
        const res = await apiRef.current.getRequest(base);
        if (res.data?.length) setMessages((prev) => mergeMessages(prev, res.data));
      } catch {
        /* next tick */
      }
    };
    const timer = setInterval(tick, MESSAGE_POLL_MS);
    const onVisibility = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [base, loading, loadError, poll]);

  // Keep the newest message in view unless the user scrolled up to read.
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const deliver = async (temp: Message) => {
    try {
      const res = await apiRef.current.postRequest(base, { body: temp.body });
      setMessages((prev) =>
        mergeMessages(
          prev.filter((m) => m.id !== temp.id),
          [res.data]
        )
      );
      apiRef.current.onActivity?.();
    } catch (error) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === temp.id ? { ...m, pending: false, failed: true } : m
        )
      );
      if (import.meta.env.DEV) console.error(getErrorMessage(error));
    }
  };

  const send = () => {
    const body = draft.trim().slice(0, MESSAGE_MAX_LENGTH);
    if (!body) return;
    const temp: Message = {
      id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sender_id: user?.id,
      body,
      created_at: new Date().toISOString(),
      read_at: null,
      pending: true,
    };
    stickToBottom.current = true;
    setMessages((prev) => [...prev, temp]);
    setDraft("");
    deliver(temp);
  };

  const retry = (m: Message) => {
    const again = { ...m, pending: true, failed: false };
    setMessages((prev) => prev.map((x) => (x.id === m.id ? again : x)));
    deliver(again);
  };

  // Grow the textarea with its content, up to ~5 lines.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [draft]);

  const name = memberName(other);

  return (
    <div className={cn("flex flex-col h-full min-h-0 bg-card", className)}>
      {/* Header */}
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-3 border-b border-border shrink-0",
          headerInset && "pr-12"
        )}
      >
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to conversations"
            className="p-1.5 -ml-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        ) : null}
        <div className="relative shrink-0">
          <UserAvatar
            person={other}
            className="w-10 h-10 rounded-full"
            style={{ fontSize: 13 }}
          />
          <span
            className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card"
            style={{
              background: other.is_online ? PRESENCE_COLORS.online : PRESENCE_COLORS.offline,
            }}
          />
        </div>
        <div className="min-w-0">
          <p className="text-foreground truncate" style={{ fontWeight: 700, fontSize: 15 }}>
            {name}
          </p>
          <p
            className={other.is_online ? "text-primary" : "text-muted-foreground"}
            style={{ fontSize: 12 }}
          >
            {presenceLabel(other)}
          </p>
        </div>
      </div>

      {/* Thread */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 min-h-0 overflow-y-auto px-4 py-4"
        aria-live="polite"
      >
        {loading ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : loadError ? (
          <div className="h-full flex items-center justify-center text-center">
            <p className="text-destructive" style={{ fontSize: 13 }}>
              {loadError}
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <div className="w-14 h-14 bg-secondary rounded-2xl flex items-center justify-center mb-3">
              <MessageCircle className="w-6 h-6 text-primary" />
            </div>
            <p className="text-foreground mb-1" style={{ fontWeight: 700, fontSize: 15 }}>
              Say hi to {other.first_name || name} 👋
            </p>
            <p className="text-muted-foreground" style={{ fontSize: 13 }}>
              Plan your next trip together — messages appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {messages.map((m, i) => {
              const mine = m.sender_id === user?.id;
              const prev = messages[i - 1];
              const newDay = !prev || dayKey(prev.created_at) !== dayKey(m.created_at);
              return (
                <Fragment key={m.id}>
                  {newDay ? (
                    <div className="flex items-center gap-3 py-2">
                      <div className="flex-1 h-px bg-border" />
                      <span
                        className="text-muted-foreground"
                        style={{ fontSize: 11, fontWeight: 600 }}
                      >
                        {dayLabel(m.created_at)}
                      </span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                  ) : null}
                  <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-3.5 py-2",
                        mine
                          ? "bg-primary text-white rounded-br-md"
                          : "bg-muted text-foreground rounded-bl-md",
                        m.pending && "opacity-70",
                        m.failed && "bg-destructive/90"
                      )}
                    >
                      <p
                        className="whitespace-pre-wrap break-words"
                        style={{ fontSize: 14, lineHeight: 1.45 }}
                      >
                        {m.body}
                      </p>
                      <p
                        className={cn(
                          "text-right mt-0.5",
                          mine ? "text-white/75" : "text-muted-foreground"
                        )}
                        style={{ fontSize: 10 }}
                      >
                        {m.failed ? (
                          <button
                            type="button"
                            onClick={() => retry(m)}
                            className="inline-flex items-center gap-1 underline"
                          >
                            <RotateCw className="w-3 h-3" /> Not sent · Retry
                          </button>
                        ) : m.pending ? (
                          "Sending…"
                        ) : (
                          messageTime(m.created_at)
                        )}
                      </p>
                    </div>
                  </div>
                </Fragment>
              );
            })}
          </div>
        )}
      </div>

      {/* Composer */}
      <form
        className="flex items-end gap-2 px-3 py-3 border-t border-border shrink-0"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <textarea
          ref={inputRef}
          rows={1}
          value={draft}
          maxLength={MESSAGE_MAX_LENGTH}
          disabled={loading || Boolean(loadError)}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={`Message ${other.first_name || name}…`}
          aria-label="Message"
          className="flex-1 resize-none bg-muted border border-transparent rounded-2xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary focus:bg-card transition-colors disabled:opacity-60"
          style={{ fontSize: 14, lineHeight: 1.4 }}
        />
        <button
          type="submit"
          disabled={!draft.trim() || loading || Boolean(loadError)}
          aria-label="Send message"
          className="w-10 h-10 shrink-0 rounded-full bg-primary text-white flex items-center justify-center hover:bg-[#13a058] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
