"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import type { ChatMessage } from "@/lib/types";

type UnreadAction = { type: "increment"; amount: number } | { type: "reset" };

function unreadReducer(count: number, action: UnreadAction) {
  return action.type === "reset" ? 0 : count + action.amount;
}

export function useUnreadChatCount(messages: ChatMessage[], selfId: string, chatOpen: boolean) {
  const [unreadCount, dispatch] = useReducer(unreadReducer, 0);
  const seenMessageIds = useRef<Set<string> | null>(null);
  if (seenMessageIds.current === null) {
    seenMessageIds.current = new Set(messages.map((message) => message.id));
  }

  useEffect(() => {
    const seen = seenMessageIds.current;
    if (!seen) return;

    if (chatOpen) {
      messages.forEach((message) => seen.add(message.id));
      dispatch({ type: "reset" });
      return;
    }

    let incomingCount = 0;
    for (const message of messages) {
      if (seen.has(message.id)) continue;
      seen.add(message.id);
      if (message.type === "chat" && message.senderId !== selfId) incomingCount += 1;
    }
    if (incomingCount > 0) dispatch({ type: "increment", amount: incomingCount });
  }, [messages, selfId, chatOpen]);

  const markRead = useCallback(() => {
    const seen = seenMessageIds.current;
    messages.forEach((message) => seen?.add(message.id));
    dispatch({ type: "reset" });
  }, [messages]);

  return { unreadCount, markRead };
}
