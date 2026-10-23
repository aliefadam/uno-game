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
    const supabase = getRealtimeClient();
    if (!supabase) {
      setRoomCount(0);
      return;
    }

    const updateRoomCount = () => {
      const presence = channel.presenceState<{ roomCode?: string }>();
      const activeRoomCodes = new Set(
        Object.values(presence).flat().map((entry) => entry.roomCode).filter((code): code is string => Boolean(code)),
      );
      setRoomCount(activeRoomCodes.size);
    };
    const channel = supabase
      .channel("uno-active-rooms", { config: { presence: { key: `monitor:${randomId("home")}` } } })
      .on("presence", { event: "sync" }, updateRoomCount)
      .on("presence", { event: "join" }, updateRoomCount)
      .on("presence", { event: "leave" }, updateRoomCount);
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") updateRoomCount();
    });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const supabase = getRealtimeClient();
    if (!supabase) {
      toast.show("Room Online belum siap dimainkan", "warning");
      return;
    }

    let finished = false;
    const channel = supabase.channel(`uno-connection-check-${randomId("check")}`);
    const timeout = window.setTimeout(() => {
      if (finished) return;
      finished = true;
      toast.show("Room Online belum siap dimainkan", "error");
    }, 10000);

    channel.subscribe((status) => {
      if (finished) return;
      if (status === "SUBSCRIBED") {
        finished = true;
        window.clearTimeout(timeout);
        toast.show("Room Online Siap Dimainkan", "success");
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        finished = true;
        window.clearTimeout(timeout);
        toast.show("Room Online belum siap dimainkan", "error");
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
