"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { HowToPlayModal } from "./HowToPlayModal";

export function Header({ onlineHint }: { onlineHint: number }) {
  const [howToOpen, setHowToOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 shrink-0 border-b border-white/5 bg-[#07080f]/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2.5">
          <motion.span
            whileHover={{ rotate: -8, scale: 1.05 }}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff4d6d] to-[#ff8a3d] shadow-[0_8px_18px_-6px_rgba(255,77,109,0.6)]"
          >
            <Icon name="layers" solid size={18} className="text-white" />
          </motion.span>
          <span className="text-lg font-extrabold tracking-tight">
            UNO <span className="text-[#ff7a59]">GAME</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3">
          <div className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/70 sm:flex">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Server aktif · {onlineHint} room berjalan
          </div>

          <Button variant="secondary" size="sm" icon={<Icon name="interrogation" size={15} />} onClick={() => setHowToOpen(true)} className="hidden sm:inline-flex">
            Cara Main
          </Button>
          <button
            onClick={() => setHowToOpen(true)}
            aria-label="Cara bermain"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-white/80 transition hover:bg-white/10 sm:hidden"
          >
            <Icon name="interrogation" size={17} />
          </button>
        </div>
      </div>
      <HowToPlayModal open={howToOpen} onClose={() => setHowToOpen(false)} />
    </header>
  );
}
