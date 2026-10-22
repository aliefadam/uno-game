"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Avatar, Badge } from "@/components/ui/Controls";
import { CardBack, PlayingCard } from "./PlayingCard";
import type { Card, Player } from "@/lib/types";
import { cn } from "@/lib/utils";

export function OpponentsBar({
  opponents,
  currentPlayerId,
  handCounts,
}: {
  opponents: Player[];
  currentPlayerId: string | null;
  handCounts: Record<string, number>;
}) {
  return (
    <div className="no-scrollbar flex shrink-0 gap-3 overflow-x-auto px-4 pb-1 pt-3 sm:justify-center sm:px-0">
      <AnimatePresence initial={false}>
        {opponents.map((p) => {
          const count = handCounts[p.id] ?? 0;
          const isTurn = p.id === currentPlayerId;
          return (
            <motion.div
              layout
              key={p.id}
              initial={{ opacity: 0, scale: 0.8, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className={cn(
                "relative flex shrink-0 flex-col items-center gap-1.5 rounded-2xl border px-4 py-3 transition",
                isTurn ? "border-[#ff4d6d]/80 bg-[#ff4d6d]/[0.14] shadow-[0_0_0_3px_rgba(255,77,109,0.18),0_0_24px_rgba(255,77,109,0.16)]" : "border-white/10 bg-white/[0.03]",
              )}
            >
              <div className="relative" data-player-avatar={p.id}>
                <Avatar name={p.nickname} size={46} />
                <span
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0d0f1d]",
                    p.connectionStatus === "connected" && "bg-emerald-400",
                    p.connectionStatus === "reconnecting" && "animate-pulse bg-amber-400",
                    p.connectionStatus === "disconnected" && "bg-rose-500",
                  )}
                />
                {isTurn && (
                  <motion.span
                    className="absolute -inset-1 rounded-full border-2 border-[#ff4d6d]"
                    animate={{ opacity: [0.8, 0.2, 0.8] }}
                    transition={{ duration: 1.1, repeat: Infinity }}
                  />
                )}
              </div>
              <p className="max-w-[96px] truncate text-xs font-bold text-white/90">{p.nickname}</p>
              <p className="whitespace-nowrap text-xs font-semibold text-white/75">
                Sisa kartu: <span className="font-extrabold text-white">{count}</span>
              </p>
              {isTurn && (
                <motion.span
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-full border border-rose-300/40 bg-rose-500/25 px-2 py-0.5 text-[0.6rem] font-extrabold uppercase tracking-wide text-rose-100"
                >
                  Giliran sekarang
                </motion.span>
              )}
              {count === 1 && <Badge tone="warning">UNO!</Badge>}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export function TableCenter({
  topCard,
  deckCount,
  pendingDraw,
  canDraw,
  highlightDraw,
  onDraw,
  lastAction,
  playHint,
  showHintOnMobile = false,
}: {
  topCard: Card | null;
  deckCount: number;
  pendingDraw: number;
  canDraw: boolean;
  highlightDraw: boolean;
  onDraw: () => void;
  lastAction: string | null;
  playHint: string;
  showHintOnMobile?: boolean;
}) {
  return (
    <div className="flex w-full min-w-0 flex-col items-center gap-3 px-2 py-4">
      {showHintOnMobile && (
        <p className="w-full max-w-[min(100%,42rem)] break-words rounded-xl border border-[#ff8a3d]/25 bg-[#ff8a3d]/[0.1] px-4 py-2.5 text-center text-xs font-semibold leading-relaxed text-white/85 sm:px-5 sm:text-sm md:hidden">
          {playHint}
        </p>
      )}

      <div className="flex items-center gap-5 sm:gap-8">
        <button
          onClick={onDraw}
          disabled={!canDraw}
          className={cn(
            "group relative rounded-[14%] transition disabled:cursor-not-allowed disabled:opacity-60",
            highlightDraw && canDraw && "animate-pulse drop-shadow-[0_0_20px_rgba(255,138,61,0.8)]",
          )}
        >
          <CardBack className="h-[clamp(3.75rem,15vw,6.75rem)] w-[clamp(2.5rem,10vw,4.5rem)] shadow-xl transition group-active:scale-95" />
          {highlightDraw && canDraw && (
            <motion.span
              aria-hidden="true"
              className="pointer-events-none absolute -inset-2 rounded-[18%] border-2 border-amber-300"
              animate={{ opacity: [0.35, 0.95, 0.35], scale: [0.97, 1.04, 0.97] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
          {highlightDraw && canDraw && (
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-amber-200/40 bg-amber-400 px-2.5 py-1 text-[0.62rem] font-extrabold uppercase tracking-wide text-[#221300] shadow-lg">
              Ambil
            </span>
          )}
          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-2 py-0.5 text-[0.65rem] font-bold text-white">
            {deckCount}
          </span>
          {pendingDraw > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-xs font-extrabold text-white shadow"
            >
              +{pendingDraw}
            </motion.span>
          )}
        </button>

        <div className="relative h-[clamp(3.75rem,15vw,6.75rem)] w-[clamp(2.5rem,10vw,4.5rem)]" data-discard-pile>
          <AnimatePresence mode="popLayout">
            {topCard && (
              <motion.div
                key={topCard.id}
                initial={{ opacity: 0, scale: 0.6, rotate: -8, y: -20 }}
                animate={{ opacity: 1, scale: 1, rotate: 0, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0"
              >
                <PlayingCard card={topCard} compact className="h-full w-full" style={{ height: "100%", width: "100%", aspectRatio: "auto" }} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      <div className="flex min-h-10 items-center justify-center" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          {lastAction && (
            <motion.p
              key={lastAction}
              initial={{ opacity: 0, y: 6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className={cn(
                "rounded-full border px-4 py-2 text-center text-xs font-bold shadow-lg sm:text-sm",
                lastAction.includes("mengambil")
                  ? "border-amber-300/35 bg-amber-400/15 text-amber-100 shadow-amber-950/30"
                  : "border-white/15 bg-[#171827]/90 text-white/90 shadow-black/30",
              )}
            >
              {lastAction}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
