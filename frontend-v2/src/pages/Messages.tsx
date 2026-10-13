import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, MessageCircle, Search, Users } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";

import { ChatPanel, type Conversation } from "@/components/messages/ChatPanel";
import { UserAvatar } from "@/components/UserAvatar";
import { useAuth } from "@/contexts/AuthContext";
import { useMessages } from "@/contexts/MessagesContext";
import { useApi } from "@/hooks/useApi";
import { PRESENCE_COLORS, memberName, timeAgo } from "@/lib/adapters";
import { cn, getErrorMessage } from "@/lib/utils";

/**
 * Direct messages: conversation list + the selected thread. The selection
 * lives in `?c=<conversation id>` so the browser back button returns to the
 * list on small screens; `?user=<user id>` get-or-creates a conversation.
 */
export default function Messages() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { unreadCount } = useMessages();
  const { getRequest, postRequest } = useApi();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get("c");
  const startWith = searchParams.get("user");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchConversations = useCallback(async () => {
    try {
      const res = await getRequest("/messages/conversations/");
      setConversations(res.data || []);
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not load your messages"));
    } finally {
      setLoading(false);
    }
  }, []);

  // Refresh the list on mount and whenever the global unread count moves
  // (that poll is how new incoming messages are noticed outside the thread).
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations, unreadCount]);

  // /messages?user=<id> → get-or-create, then select it.
  useEffect(() => {
    if (!startWith) return;
    let cancelled = false;
    postRequest("/messages/conversations/", { user_id: startWith })
      .then((res) => {
        if (cancelled) return;
        const convo: Conversation = res.data;
        setConversations((prev) => [convo, ...prev.filter((c) => c.id !== convo.id)]);
        setSearchParams({ c: convo.id }, { replace: true });
      })
      .catch((error) => {
        if (cancelled) return;
        toast.error(getErrorMessage(error, "Could not start this conversation"));
        setSearchParams({}, { replace: true });
      });
    return () => {
      cancelled = true;
    };
  }, [startWith]);

  const selected = conversations.find((c) => c.id === selectedId) || null;

  const select = (id: string | null) => {
    if (id) {
      // Opening a thread marks it read server-side; reflect that right away.
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, unread_count: 0 } : c))
      );
      setSearchParams({ c: id }, { replace: Boolean(selectedId) });
    } else {
      setSearchParams({});
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) =>
      memberName(c.other_user || {}).toLowerCase().includes(q)
    );
  }, [conversations, search]);

  return (
    <div className="flex-1 min-h-0 flex">
      {/* Conversation list */}
      <aside
        className={cn(
          "w-full md:w-[320px] md:shrink-0 md:border-r border-border flex flex-col min-h-0",
          selectedId && "hidden md:flex"
        )}
      >
        <div className="px-4 pt-3 pb-3 md:px-5 md:pt-5 shrink-0">
          <h1
            className="text-foreground mb-3 text-[24px] md:text-[26px]"
            style={{ fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.25 }}
          >
            Messages
          </h1>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations…"
              className="w-full bg-muted border border-transparent rounded-xl pl-10 pr-3 py-2 text-foreground placeholder-muted-foreground outline-none focus:border-primary focus:bg-card transition-colors"
              style={{ fontSize: 13 }}
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-2 pb-3">
          {loading ? (
            <div className="flex justify-center py-10 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center text-center px-6 py-12">
              <div className="w-14 h-14 bg-secondary rounded-2xl flex items-center justify-center mb-3">
                <MessageCircle className="w-6 h-6 text-primary" />
              </div>
              <p className="text-foreground mb-1" style={{ fontWeight: 700, fontSize: 15 }}>
                {conversations.length ? "No matches" : "No conversations yet"}
              </p>
              <p className="text-muted-foreground mb-4" style={{ fontSize: 13 }}>
                {conversations.length
                  ? "Try a different name"
                  : "Message a travel buddy to get started"}
              </p>
              {!conversations.length && (
                <button
                  type="button"
                  onClick={() => navigate("/buddies")}
                  className="bg-primary text-white rounded-xl px-4 py-2 flex items-center gap-2 hover:bg-[#13a058] transition-colors"
                  style={{ fontSize: 13, fontWeight: 600 }}
                >
                  <Users className="w-4 h-4" /> Find buddies
                </button>
              )}
            </div>
          ) : (
            filtered.map((c) => (
              <ConversationRow
                key={c.id}
                conversation={c}
                active={c.id === selectedId}
                ownId={user?.id}
                onClick={() => select(c.id)}
              />
            ))
          )}
        </div>
      </aside>

      {/* Thread */}
      <section className={cn("flex-1 min-w-0 min-h-0 flex flex-col", !selectedId && "hidden md:flex")}>
        {selected ? (
          <ChatPanel
            key={selected.id}
            conversation={selected}
            onBack={() => select(null)}
            onActivity={fetchConversations}
          />
        ) : selectedId && (loading || startWith) ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <div className="w-16 h-16 bg-secondary rounded-2xl flex items-center justify-center mb-4">
              <MessageCircle className="w-7 h-7 text-primary" />
            </div>
            <p className="text-foreground mb-1" style={{ fontWeight: 700, fontSize: 17 }}>
              {selectedId ? "Conversation not found" : "Pick a conversation"}
            </p>
            <p className="text-muted-foreground" style={{ fontSize: 13 }}>
              Chat with your travel buddies about upcoming trips.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function ConversationRow({
  conversation: c,
  active,
  ownId,
  onClick,
}: {
  conversation: Conversation;
  active: boolean;
  ownId?: string;
  onClick: () => void;
}) {
  const other = c.other_user || {};
  const last = c.last_message;
  const unread = c.unread_count || 0;
  const preview = last
    ? `${last.sender_id === ownId ? "You: " : ""}${last.body}`
    : "No messages yet";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors mb-0.5",
        active ? "bg-secondary" : "hover:bg-muted"
      )}
    >
      <div className="relative shrink-0">
        <UserAvatar person={other} className="w-11 h-11 rounded-full" style={{ fontSize: 13 }} />
        <span
          className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card"
          style={{
            background: other.is_online ? PRESENCE_COLORS.online : PRESENCE_COLORS.offline,
          }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <p
            className="flex-1 text-foreground truncate"
            style={{ fontSize: 14, fontWeight: unread ? 700 : 600 }}
          >
            {memberName(other)}
          </p>
          <span
            className={unread ? "text-primary" : "text-muted-foreground"}
            style={{ fontSize: 11, fontWeight: unread ? 600 : 400 }}
          >
            {timeAgo(last?.created_at || c.updated_at)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <p
            className={cn("flex-1 truncate", unread ? "text-foreground" : "text-muted-foreground")}
            style={{ fontSize: 12, fontWeight: unread ? 600 : 400 }}
          >
            {preview}
          </p>
          {unread > 0 && (
            <span
              className="min-w-5 h-5 px-1.5 rounded-full bg-primary text-white flex items-center justify-center"
              style={{ fontSize: 10, fontWeight: 700 }}
            >
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
