"use client";

import { motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";

const FEATURES = [
  { icon: "bolt", title: "Real-Time Multiplayer", desc: "Setiap aksi kartu, giliran, dan chat tersinkron langsung ke semua pemain di room." },
  { icon: "shield-check", title: "Server Jadi Wasit", desc: "Semua aksi divalidasi secara otoritatif — tidak ada celah curang kartu lawan." },
  { icon: "users-alt", title: "2–10 Pemain", desc: "Main berdua santai atau rame-rame sampai 10 orang dalam satu room." },
  { icon: "comment-dots", title: "Room Chat", desc: "Obrolan terisolasi per room, lengkap dengan notifikasi sistem." },
  { icon: "settings-sliders", title: "House Rules", desc: "Cross Stacking, Jump-In, dan Draw Until Playable." },
  { icon: "device-mobile", title: "Mobile Friendly", desc: "Nyaman dimainkan dari HP maupun desktop dengan animasi yang ringan." },
];

export function Features() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto mb-10 max-w-xl text-center">
        <h2 className="text-2xl font-extrabold sm:text-3xl">Buat Seru-Seruan Bareng Teman</h2>
        <p className="mt-2 text-sm text-white/55 sm:text-base">Fitur inti yang bikin tongkrongan online tetap hidup.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.45, delay: i * 0.05 }}
            className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition hover:border-white/20 hover:bg-white/[0.06]"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff4d6d]/20 to-[#ff8a3d]/20 text-[#ff8a6a] transition group-hover:scale-105">
              {f.icon === "device-mobile" ? (
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <rect x="6.5" y="2.5" width="11" height="19" rx="2.2" />
                  <path d="M10 5h4M11 18.5h2" />
                </svg>
              ) : (
                <Icon name={f.icon} size={20} />
              )}
            </span>
            <h3 className="mt-4 text-base font-bold text-white">{f.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-white/55">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-white/5 px-4 py-8 text-center text-xs text-white/35 sm:px-6">
      <p>UNO GAME — Made by aliefadam</p>
    </footer>
  );
}
