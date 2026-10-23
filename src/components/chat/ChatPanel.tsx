"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { ChatMessage } from "@/lib/types";
import { Icon } from "@/components/ui/Icon";
import { cn, formatTime } from "@/lib/utils";
import { sfx } from "@/lib/sound";

export function ChatPanel({
  messages,
  selfId,
  onSend,
  disabled,
  className,
  typingNames = [],
  onTyping,
}: {
  messages: ChatMessage[];
  selfId: string;
  onSend: (content: string) => void;
  disabled?: boolean;
  className?: string;
  typingNames?: string[];
  onTyping?: (typing: boolean) => void;
}) {
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastCount = useRef(0);
  const didInitialScroll = useRef(false);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSignal = useRef(0);

  useEffect(() => () => {
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    onTyping?.(false);
  }, [onTyping]);

  const updateDraft = (value: string) => {
    setDraft(value);
    if (!value.trim() || disabled) {
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      typingTimeout.current = null;
      onTyping?.(false);
      lastTypingSignal.current = 0;
      return;
    }
    const now = Date.now();
    if (now - lastTypingSignal.current > 1800) {
      onTyping?.(true);
      lastTypingSignal.current = now;
    }
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      onTyping?.(false);
      lastTypingSignal.current = 0;
      typingTimeout.current = null;
    }, 1400);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (messages.length > 0 && !didInitialScroll.current) {
      el.scrollTop = el.scrollHeight;
      didInitialScroll.current = true;
    } else if (isNearBottom || messages.length <= 1) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
    if (messages.length > lastCount.current && lastCount.current !== 0) {
      const latest = messages[messages.length - 1];
      if (latest?.type === "chat" && latest.senderId !== selfId) sfx.message();
    }
    lastCount.current = messages.length;
  }, [messages, selfId]);

  const submit = () => {
    const content = draft.trim();
    if (!content || disabled) return;
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = null;
    onTyping?.(false);
    lastTypingSignal.current = 0;
    onSend(content);
    setDraft("");
  };

  return (
    <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden", className)}>
      <div className="flex shrink-0 items-center gap-2 border-b border-white/10 px-4 py-3">
        <Icon name="comment-dots" size={16} className="text-[#ff8a6a]" />
        <span className="text-sm font-bold text-white">Room Chat</span>
      </div>
      <div ref={scrollRef} className="no-scrollbar min-h-0 min-w-0 flex-1 space-y-2.5 overflow-x-hidden overflow-y-auto px-4 py-3">
        <AnimatePresence initial={false}>
          {messages.map((m) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.16 }}
            >
              {m.type === "system" ? (
                <p className="break-words px-1 text-center text-[0.72rem] leading-relaxed italic text-white/40">{m.content}</p>
              ) : (
                <div className={cn("flex flex-col", m.senderId === selfId ? "items-end" : "items-start")}>
                  <span className="mb-0.5 px-1 text-[0.65rem] font-semibold text-white/40">
                    {m.senderId === selfId ? "Kamu" : m.senderName} · {formatTime(m.createdAt)}
                  </span>
                  <span
                    className={cn(
                      "max-w-[85%] break-words rounded-2xl px-3.5 py-2 text-sm",
                      m.senderId === selfId
                        ? "rounded-tr-sm bg-gradient-to-br from-[#ff4d6d] to-[#ff8a3d] text-white"
                        : "rounded-tl-sm bg-white/10 text-white/90",
                    )}
                  >
                    {m.content}
                  </span>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {messages.length === 0 && <p className="mt-6 text-center text-xs text-white/30">Belum ada obrolan. Sapa teman tongkronganmu!</p>}
      </div>
      <AnimatePresence>
        {typingNames.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex shrink-0 items-center gap-2 overflow-hidden px-4 py-2 text-xs text-white/65"
            aria-live="polite"
          >
            <span className="flex items-center gap-0.5" aria-hidden="true">
              {[0, 1, 2].map((dot) => (
                <motion.span
                  key={dot}
                  className="h-1 w-1 rounded-full bg-[#ff8a6a]"
                  animate={{ y: [0, -3, 0], opacity: [0.45, 1, 0.45] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay: dot * 0.15 }}
                />
              ))}
            </span>
            <span>{typingNames.length === 1 ? `${typingNames[0]} sedang mengetik` : `${typingNames.join(", ")} sedang mengetik`}</span>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="flex shrink-0 items-center gap-2 border-t border-white/10 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <input
          value={draft}
          disabled={disabled}
          onChange={(e) => updateDraft(e.target.value.slice(0, 300))}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder={disabled ? "Chat dinonaktifkan host" : "Ketik pesan..."}
          className="h-10 flex-1 rounded-xl border border-white/10 bg-white/5 px-3.5 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-[#ff4d6d]/60 disabled:opacity-40"
        />
        <button
          onClick={submit}
          disabled={disabled || !draft.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff4d6d] to-[#ff8a3d] text-white transition disabled:opacity-30"
        >
          <Icon name="paper-plane" size={15} />
        </button>
      </div>
    </div>
  );
}
