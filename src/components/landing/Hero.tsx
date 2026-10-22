"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { PlayingCard } from "@/components/game/PlayingCard";
import type { Card } from "@/lib/types";

const FLOAT_CARDS: { card: Card; className: string; rotate: number; delay: number }[] = [
  { card: { id: "f1", color: "red", value: "5" }, className: "left-[2%] top-[18%] sm:left-[8%]", rotate: -14, delay: 0 },
  { card: { id: "f2", color: "yellow", value: "skip" }, className: "right-[0%] top-[8%] sm:right-[10%]", rotate: 10, delay: 0.6 },
  { card: { id: "f3", color: "wild", value: "wild4" }, className: "right-[4%] bottom-[6%] sm:right-[14%]", rotate: -8, delay: 1.1 },
  { card: { id: "f4", color: "green", value: "reverse" }, className: "left-[0%] bottom-[12%] sm:left-[14%]", rotate: 16, delay: 1.6 },
];

export function Hero({ onCreate, onJoin }: { onCreate: () => void; onJoin: () => void }) {
  return (
    <section className="relative mx-auto max-w-7xl overflow-hidden px-4 pb-16 pt-14 sm:px-6 sm:pt-20 lg:px-8">
      <div className="pointer-events-none absolute inset-0 hidden sm:block">
        {FLOAT_CARDS.map((f, i) => (
          <motion.div
            key={i}
            className={`absolute animate-float-slow ${f.className}`}
            style={{ ["--rot" as string]: `${f.rotate}deg` }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: f.delay * 0.3, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <PlayingCard card={f.card} className="w-20 opacity-90 drop-shadow-2xl sm:w-24" />
          </motion.div>
        ))}
      </div>

      <div className="relative mx-auto max-w-3xl text-center">
        <motion.span
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold text-white/70"
        >
          <Icon name="sparkles" size={14} className="text-[#ff8a3d]" />
          Tanpa install, tanpa akun, langsung main
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08 }}
          className="text-balance text-[clamp(2.1rem,6vw,3.6rem)] font-extrabold leading-[1.08] tracking-tight"
        >
          UNO <span className="text-[#ff8a3d]">GAME</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.16 }}
          className="mx-auto mt-5 max-w-xl text-balance text-base text-white/60 sm:text-lg"
        >
          Main UNO bareng teman, adu strategi, dan bikin tongkrongan makin seru. Buka room, undang teman, langsung main!
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.24 }}
          className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Button size="lg" fullWidth icon={<Icon name="plus" size={17} />} onClick={onCreate} className="sm:w-auto">
            Create Room
          </Button>
          <Button size="lg" variant="secondary" fullWidth icon={<Icon name="door-open" size={17} />} onClick={onJoin} className="sm:w-auto">
            Join Room
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
