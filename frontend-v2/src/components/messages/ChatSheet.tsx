import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/app/components/ui/sheet";
import { ChatPanel, type Conversation } from "@/components/messages/ChatPanel";
import { useApi } from "@/hooks/useApi";
import { memberName } from "@/lib/adapters";
import { getErrorMessage } from "@/lib/utils";

interface Props {
  /** The person to chat with (needs `id`); null closes the sheet. */
  user: any | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * Right-side chat drawer. Opening it get-or-creates the conversation via
 * POST /messages/conversations/ {user_id}, then hands off to ChatPanel.
 */
export function ChatSheet({ user, onOpenChange }: Props) {
  const { postRequest } = useApi();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const userId = user?.id;

  // On close (userId -> null) keep the last thread so the slide-out animation
  // doesn't flash a spinner; Radix unmounts the content (and its polling) after.
  useEffect(() => {
    if (!userId) return;
    setConversation(null);
    setError(null);
    let cancelled = false;
    postRequest("/messages/conversations/", { user_id: userId })
      .then((res) => !cancelled && setConversation(res.data))
      .catch(
        (err) =>
          !cancelled && setError(getErrorMessage(err, "Could not open this chat"))
      );
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <Sheet open={Boolean(user)} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="p-0 gap-0 w-full sm:max-w-md">
        <SheetTitle className="sr-only">
          Chat with {memberName(conversation?.other_user || user || {})}
        </SheetTitle>
        <SheetDescription className="sr-only">Direct messages</SheetDescription>
        {conversation ? (
          <ChatPanel conversation={conversation} headerInset />
        ) : (
          <div className="flex-1 flex items-center justify-center px-6 text-center">
            {error ? (
              <p className="text-destructive" style={{ fontSize: 13 }}>
                {error}
              </p>
            ) : (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
