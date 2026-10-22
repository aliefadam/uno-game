"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { PlayingCard } from "./PlayingCard";
import { Icon } from "@/components/ui/Icon";
import type { Card } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PlayerHand({
  hand,
  legalCardIds,
  isMyTurn,
  onPlay,
}: {
  hand: Card[];
  legalCardIds: string[];
  isMyTurn: boolean;
  onPlay: (card: Card) => void;
}) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const legalSet = new Set(legalCardIds);
  const n = hand.length;
  const playableNumberValues = new Set(
    hand.filter((card) => legalSet.has(card.id) && /^[0-9]$/.test(card.value)).map((card) => card.value),
  );

  return (
    <div
      className={cn(
        "no-scrollbar relative max-h-[36dvh] w-full max-w-full overflow-x-clip overflow-y-auto overscroll-contain px-2 pb-3 pt-8",
      )}
      aria-label={`Kartu di tangan: ${n}`}
    >
      <span className="absolute left-2 top-0 z-20 rounded-full border border-white/10 bg-[#121422]/90 px-2.5 py-1 text-[0.65rem] font-bold text-white/65 backdrop-blur">
        Kartu kamu: {n}
      </span>
      <div
        className="relative grid w-full justify-center justify-items-center gap-1 overflow-visible px-1 pb-2 pt-2"
        style={{ gridTemplateColumns: "repeat(auto-fit, clamp(2.5rem, 10vw, 4.5rem))" }}
      >
          <AnimatePresence initial={false}>
            {hand.map((card, i) => {
              const isLegal = isMyTurn && legalSet.has(card.id);
              const isPairable = isMyTurn && !isLegal && /^[0-9]$/.test(card.value) && playableNumberValues.has(card.value);
              const isHovered = hoveredId === card.id;

              return (
                <motion.button
                  key={card.id}
                  layout
                  initial={{ opacity: 0, y: 40, scale: 0.7 }}
                  animate={{
                    opacity: isMyTurn && !isLegal && !isPairable ? 0.28 : isPairable ? 0.78 : 1,
                    y: isHovered ? -5 : 0,
                    scale: isHovered ? 1.015 : 1,
                    rotate: 0,
                  }}
                  exit={{ opacity: 0, y: -40, scale: 0.6, transition: { duration: 0.22 } }}
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                  style={{ zIndex: isHovered ? 50 : i }}
                  onMouseEnter={() => setHoveredId(card.id)}
                  onMouseLeave={() => setHoveredId((h) => (h === card.id ? null : h))}
                  onClick={() => (isLegal || isPairable) && onPlay(card)}
                  className={cn(
                    "relative w-full max-w-[4.5rem] origin-bottom cursor-pointer disabled:cursor-not-allowed",
                    isLegal ? "drop-shadow-[0_0_12px_rgba(255,138,61,0.65)]" : isPairable ? "drop-shadow-[0_0_8px_rgba(99,193,255,0.45)]" : "",
                  )}
                  disabled={!isMyTurn}
                >
                  <PlayingCard
                    card={card}
                    compact
                    className="w-full"
                    style={{ width: "100%" }}
                  />
                  {isLegal && (
                    <motion.span
                      className="pointer-events-none absolute inset-0 rounded-[14%] ring-2 ring-[#ffad55]"
                      animate={{ opacity: [0.7, 1, 0.7] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                    />
                  )}
                  {isPairable && (
                    <span className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 rounded-full border border-sky-200/40 bg-[#142536] px-1.5 py-0.5 text-[0.55rem] font-extrabold leading-none text-sky-100 shadow-lg">
                      Kembar
                    </span>
                  )}
                </motion.button>
              );
            })}
          </AnimatePresence>
          {hand.length === 0 && (
            <p className="pb-6 text-sm text-white/40 flex items-center gap-1.5">
              <Icon name="check-circle" size={14} /> Kartu habis!
            </p>
          )}
      </div>
    </div>
  );
}
