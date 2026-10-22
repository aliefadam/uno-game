"use client";

import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { PlayingCard } from "@/components/game/PlayingCard";
import type { Card } from "@/lib/types";

const STEPS = [
  { icon: "user", title: "Masukkan Nama", desc: "Pakai nickname, tanpa perlu daftar akun." },
  { icon: "door-open", title: "Buat / Gabung Room", desc: "Buat room baru atau masukkan kode dari teman." },
  { icon: "users-alt", title: "Tunggu & Ready", desc: "Kumpul di lobby, obrol, lalu tekan tombol Ready." },
  { icon: "cards", title: "Main UNO!", desc: "Mainkan kartu valid sampai ada yang menang." },
];

const RULES = [
  { icon: "ban", title: "Skip", desc: "Lewati giliran pemain berikutnya." },
  { icon: "arrows-repeat", title: "Reverse", desc: "Membalik arah permainan." },
  { icon: "square-plus", title: "+2 / +4", desc: "Pemain berikutnya wajib mengambil kartu tambahan." },
  { icon: "palette", title: "Wild", desc: "Ubah warna aktif sesuka hati." },
];

const previewCards: Card[] = [
  { id: "p1", color: "red", value: "7" },
  { id: "p2", color: "wild", value: "wild4" },
  { id: "p3", color: "green", value: "reverse" },
];

export function HowToPlayModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Cara Bermain" subtitle="Simpel, cepat, dan seru buat tongkrongan." maxWidth="max-w-2xl">
      <div className="grid gap-3 sm:grid-cols-2">
        {STEPS.map((s, i) => (
          <div key={s.title} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff4d6d] to-[#ff8a3d] text-sm font-extrabold">
              {i + 1}
            </span>
            <div>
              <p className="flex items-center gap-1.5 text-sm font-bold text-white">
                <Icon name={s.icon} size={14} className="text-[#ff8a3d]" /> {s.title}
              </p>
              <p className="mt-0.5 text-xs text-white/55">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-center gap-3">
        {previewCards.map((c, i) => (
          <PlayingCard key={c.id} card={c} compact className="drop-shadow-xl" style={{ transform: `rotate(${(i - 1) * 8}deg)` }} />
        ))}
      </div>

      <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-white/40">Kartu Aksi</p>
      <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
        {RULES.map((r) => (
          <div key={r.title} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5">
            <Icon name={r.icon} size={16} className="text-[#ff4d6d]" />
            <div>
              <p className="text-sm font-semibold text-white">{r.title}</p>
              <p className="text-xs text-white/50">{r.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-5 rounded-xl border border-white/10 bg-white/5 p-3.5 text-xs leading-relaxed text-white/50">
        Pemain wajib menekan tombol <b className="text-white/80">UNO</b> saat tersisa 1 kartu. Host juga bisa mengaktifkan
        <b className="text-white/80"> House Rules</b> seperti Cross Stacking, Jump-In, dan Draw Until Playable saat membuat room.
      </p>
    </Modal>
  );
}
