"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { Features, Footer } from "@/components/landing/Features";
import { CreateRoomModal } from "@/components/landing/CreateRoomModal";
import { JoinRoomModal } from "@/components/landing/JoinRoomModal";

export default function HomePage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [roomCount, setRoomCount] = useState(0);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("uno-tongkrongan:rooms-index");
      const codes: string[] = raw ? JSON.parse(raw) : [];
      let active = 0;
      for (const code of codes) {
        const data = window.localStorage.getItem(`uno-tongkrongan:room:${code}`);
        if (!data) continue;
        try {
          const parsed = JSON.parse(data);
          if (parsed?.room?.status && parsed.room.status !== "closed") active += 1;
        } catch {
          /* ignore */
        }
      }
      setRoomCount(active);
    } catch {
      setRoomCount(0);
    }
  }, []);

  return (
    <main className="min-h-screen overflow-x-hidden">
      <Header onlineHint={roomCount} />
      <Hero onCreate={() => setCreateOpen(true)} onJoin={() => setJoinOpen(true)} />
      <Features />
      <Footer />
      <CreateRoomModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <JoinRoomModal open={joinOpen} onClose={() => setJoinOpen(false)} />
    </main>
  );
}
