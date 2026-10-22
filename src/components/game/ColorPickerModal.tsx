"use client";

import { motion } from "framer-motion";
import { Modal } from "@/components/ui/Modal";
import type { CardColor } from "@/lib/types";

const COLOR_META: { value: CardColor; label: string; className: string }[] = [
  { value: "red", label: "Merah", className: "from-[#ff4d4d] to-[#c81e3a]" },
  { value: "blue", label: "Biru", className: "from-[#3fa8ff] to-[#0f5bd6]" },
  { value: "green", label: "Hijau", className: "from-[#4ad66d] to-[#148a3f]" },
  { value: "yellow", label: "Kuning", className: "from-[#ffd24a] to-[#f29400]" },
];

export function ColorPickerModal({ open, onPick, onClose }: { open: boolean; onPick: (color: CardColor) => void; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Pilih Warna" subtitle="Tentukan warna aktif berikutnya." maxWidth="max-w-sm">
      <div className="grid grid-cols-2 gap-3">
        {COLOR_META.map((c) => (
          <motion.button
            key={c.value}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onPick(c.value)}
            className={`flex h-24 flex-col items-center justify-center gap-2 rounded-2xl bg-gradient-to-br font-extrabold text-white shadow-lg ${c.className}`}
          >
            <span className="h-6 w-6 rounded-full bg-white/30" />
            {c.label}
          </motion.button>
        ))}
      </div>
    </Modal>
  );
}
