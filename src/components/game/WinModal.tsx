"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Controls";
import { sfx } from "@/lib/sound";
import type { Player } from "@/lib/types";

const CONFETTI_COLORS = ["#ff4d6d", "#ff8a3d", "#ffd24a", "#4ad66d", "#3fa8ff", "#a855f7"];

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 60 }).map((_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        duration: 2.2 + Math.random() * 1.6,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rotate: Math.random() * 360,
        size: 6 + Math.random() * 6,
      })),
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          initial={{ y: -40, x: 0, opacity: 1, rotate: 0 }}
          animate={{ y: "110vh", x: (Math.random() - 0.5) * 120, opacity: [1, 1, 0], rotate: p.rotate }}
          transition={{ duration: p.duration, delay: p.delay, ease: "easeIn" }}
          className="absolute top-0 block rounded-sm"
          style={{ left: `${p.left}%`, width: p.size, height: p.size * 1.6, background: p.color }}
        />
      ))}
    </div>
  );
}

export function WinModal({
  open,
  winner,
  players,
  handCounts,
  isHost,
  isWinnerSelf,
  onRematch,
  onLeave,
  reducedMotion,
}: {
  open: boolean;
  winner: Player | undefined;
  players: Player[];
  handCounts: Record<string, number>;
  isHost: boolean;
  isWinnerSelf: boolean;
  onRematch: () => void;
  onLeave: () => void;
  reducedMotion: boolean;
}) {
  const [skip, setSkip] = useState(false);

  useEffect(() => {
    if (open) {
      setSkip(false);
      if (isWinnerSelf) sfx.win();
      else sfx.lose();
    }
  }, [open, isWinnerSelf]);

  if (!open || typeof document === "undefined") return null;

  const ranking = players
    .slice()
    .sort((a, b) => (handCounts[a.id] ?? 0) - (handCounts[b.id] ?? 0));

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {!reducedMotion && !skip && <Confetti />}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md rounded-3xl border border-white/10 bg-[#13152a] p-7 text-center shadow-[0_40px_90px_-20px_rgba(0,0,0,0.8)]"
      >
        <button onClick={() => setSkip(true)} className="absolute right-4 top-4 text-xs font-semibold text-white/40 hover:text-white/70">
          Lewati
        </button>
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-orange-400 text-[#2a1800] shadow-lg">
          <Icon name="trophy" solid size={30} />
        </span>
        <p className="mt-4 text-xs font-bold uppercase tracking-widest text-white/40">
          {isWinnerSelf ? "Selamat!" : "Pertandingan Selesai"}
        </p>
        <h2 className="mt-1 text-2xl font-extrabold text-white">{winner ? `${winner.nickname} Menang!` : "Permainan Selesai"}</h2>
        <div className="mx-auto mt-3 flex items-center justify-center">
          <Avatar name={winner?.nickname ?? "?"} size={56} />
        </div>

        <div className="mt-6 space-y-1.5 rounded-2xl border border-white/10 bg-white/5 p-3 text-left">
          {ranking.map((p, i) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm">
              <span className="flex items-center gap-2 text-white/80">
                <span className="w-5 text-center font-bold text-white/40">{i + 1}</span>
                <Avatar name={p.nickname} size={24} />
                {p.nickname}
              </span>
              <span className="text-xs font-semibold text-white/50">{handCounts[p.id] ?? 0} kartu</span>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
          {isHost ? (
            <Button fullWidth icon={<Icon name="refresh" size={15} />} onClick={onRematch}>
              Main Lagi
            </Button>
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-white/45">
              Menunggu host memulai ulang…
            </div>
          )}
          <Button fullWidth variant="secondary" icon={<Icon name="exit" size={15} />} onClick={onLeave}>
            Kembali ke Beranda
          </Button>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}
