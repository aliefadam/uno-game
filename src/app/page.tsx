"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { Features, Footer } from "@/components/landing/Features";
import { CreateRoomModal } from "@/components/landing/CreateRoomModal";
import { JoinRoomModal } from "@/components/landing/JoinRoomModal";
import { useToast } from "@/components/ui/Toast";
import { getRealtimeClient } from "@/lib/realtime-client";
import { randomId } from "@/lib/utils";

export default function HomePage() {
  const toast = useToast();
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

  useEffect(() => {
    const supabase = getRealtimeClient();
    if (!supabase) {
      toast.show("Supabase belum dikonfigurasi. Room online belum tersedia.", "warning");
      return;
    }

    let finished = false;
    const channel = supabase.channel(`uno-connection-check-${randomId("check")}`);
    const timeout = window.setTimeout(() => {
      if (finished) return;
      finished = true;
      toast.show("Belum bisa terhubung ke Supabase Realtime. Periksa koneksi dan konfigurasi.", "error");
    }, 10000);

    channel.subscribe((status) => {
      if (finished) return;
      if (status === "SUBSCRIBED") {
        finished = true;
        window.clearTimeout(timeout);
        toast.show("Supabase Realtime terhubung. Room online siap digunakan.", "success");
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        finished = true;
        window.clearTimeout(timeout);
        toast.show("Supabase Realtime belum terhubung. Periksa URL, publishable key, dan pengaturan Realtime.", "error");
      }
    });

    return () => {
      finished = true;
      window.clearTimeout(timeout);
      void supabase.removeChannel(channel);
    };
  }, [toast]);

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
