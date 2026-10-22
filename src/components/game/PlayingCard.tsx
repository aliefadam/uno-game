"use client";

import { motion } from "framer-motion";
import type { Card, CardColor } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/Icon";

const COLOR_BG: Record<CardColor, string> = {
  red: "from-[#ff544f] via-[#f12d43] to-[#b91432]",
  blue: "from-[#54b6ff] via-[#2585ed] to-[#0750bd]",
  green: "from-[#62df7d] via-[#2bb65c] to-[#08763c]",
  yellow: "from-[#ffe06a] via-[#ffbd2f] to-[#dd7600]",
  wild: "from-[#343544] via-[#181923] to-[#090a10]",
};

const COLOR_INK: Record<CardColor, string> = {
  red: "text-[#b91432]",
  blue: "text-[#0750bd]",
  green: "text-[#08763c]",
  yellow: "text-[#a85600]",
  wild: "text-[#14151c]",
};

const SYMBOLS: Record<string, string> = {
  skip: "ban",
  reverse: "arrows-repeat",
  draw2: "+2",
  wild: "",
  wild4: "+4",
};

function CardFace({ card, compact }: { card: Card; compact?: boolean }) {
  const isNumber = /^[0-9]$/.test(card.value);
  const isWild = card.color === "wild";
  const cornerValue = isNumber ? card.value : SYMBOLS[card.value];
  const cornerIcon = card.value === "skip" ? "ban" : card.value === "reverse" ? "arrows-repeat" : null;
  const renderCornerMark = () => cornerIcon
    ? <Icon name={cornerIcon} solid className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]" size={compact ? 8 : 11} />
    : cornerValue;
  return (
    <div
      className={cn(
        "uno-card-art h-full w-full rounded-[16%] bg-gradient-to-br from-white via-[#f4f4f5] to-[#c9cbd2] p-[3px] shadow-[0_8px_18px_-6px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.9)]",
      )}
    >
      <div className={cn("relative flex h-full w-full flex-col items-center justify-center overflow-hidden rounded-[13%] bg-gradient-to-br", COLOR_BG[card.color])}>
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.22),transparent_32%,transparent_72%,rgba(0,0,0,0.18))]" />
        <div className="pointer-events-none absolute left-[-22%] top-[8%] h-[22%] w-[145%] rotate-[-24deg] rounded-full border border-white/10" />
        <div className="pointer-events-none absolute bottom-[6%] right-[-28%] h-[18%] w-[125%] rotate-[-24deg] rounded-full border border-black/10" />

        <span className={cn("absolute left-[9%] top-[6%] z-10 flex items-center justify-center font-black leading-none text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]", compact ? "text-[0.55rem]" : "text-[0.7rem]")}>{renderCornerMark()}</span>
        <span className={cn("absolute bottom-[6%] right-[9%] z-10 flex rotate-180 items-center justify-center font-black leading-none text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]", compact ? "text-[0.55rem]" : "text-[0.7rem]")}>{renderCornerMark()}</span>

        <div className="relative flex h-[68%] w-[82%] rotate-[-24deg] items-center justify-center rounded-[50%] border border-white/80 bg-white/90 shadow-[0_3px_7px_rgba(0,0,0,0.28),inset_0_1px_2px_rgba(255,255,255,0.9)]">
          {isWild ? (
            <div className="grid h-[55%] w-[43%] rotate-[24deg] grid-cols-2 grid-rows-2 overflow-hidden rounded-[22%] border-2 border-white shadow-[0_2px_5px_rgba(0,0,0,0.25)]">
              <span className="bg-[#f13b3b]" />
              <span className="bg-[#2585ed]" />
              <span className="bg-[#ffcb35]" />
              <span className="bg-[#25ad56]" />
            </div>
          ) : (
            <span className={cn("relative rotate-[24deg] font-black italic leading-none drop-shadow-[0_1px_0_rgba(255,255,255,0.65)]", COLOR_INK[card.color], compact ? "text-[1.35rem]" : "text-[2.25rem] sm:text-[2.6rem]")}>
              {isNumber ? card.value : card.value === "skip" ? <Icon name="ban" solid className="text-[0.78em]" /> : card.value === "reverse" ? <Icon name="arrows-repeat" solid className="text-[0.72em]" /> : SYMBOLS[card.value]}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function CardBack({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "uno-card-art rounded-[16%] bg-gradient-to-br from-white via-[#f4f4f5] to-[#c9cbd2] p-[3px] shadow-[0_8px_18px_-6px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.9)]",
        className,
      )}
    >
      <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[13%] bg-[radial-gradient(ellipse_at_35%_25%,#34343d_0%,#141419_55%,#08080b_100%)]">
        <div className="pointer-events-none absolute inset-[8%] rounded-[11%] border border-white/10" />
        <span className="relative flex aspect-[2.15/1] w-[84%] rotate-[-20deg] items-center justify-center rounded-[50%] border-2 border-[#fff7db] bg-gradient-to-br from-[#ff4e36] via-[#ed1b24] to-[#bd001c] shadow-[0_4px_8px_rgba(0,0,0,0.65),inset_0_1px_2px_rgba(255,255,255,0.5)]">
          <span className="text-[0.7em] font-black italic leading-none tracking-[-0.08em] text-[#ffd52c]" style={{ WebkitTextStroke: "1px #17110a", textShadow: "0 2px 0 #17110a, 0 3px 3px rgba(0,0,0,.7)" }}>
            UNO
          </span>
        </span>
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.16),transparent_30%,transparent_70%,rgba(0,0,0,0.28))]" />
      </div>
    </div>
  );
}

type PlayingCardProps = {
  card: Card;
  compact?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

export function PlayingCard({ card, compact, className, style }: PlayingCardProps) {
  return (
    <motion.div
      className={cn(compact ? "aspect-[2/3] w-14" : "aspect-[2/3] w-24 sm:w-28", className)}
      style={style}
    >
      <CardFace card={card} compact={compact} />
    </motion.div>
  );
}
