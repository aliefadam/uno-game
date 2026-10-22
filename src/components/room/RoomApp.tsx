"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useRoom } from "@/hooks/useRoom";
import { Header } from "@/components/landing/Header";
import { LobbyView } from "@/components/lobby/LobbyView";
import { GameView } from "@/components/game/GameView";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Controls";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { getStoredNickname, setStoredNickname } from "@/lib/session";

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.03] p-7 text-center shadow-[0_30px_80px_-24px_rgba(0,0,0,0.6)]"
      >
        {children}
      </motion.div>
    </main>
  );
}

function NicknameGate({ code, onSubmit }: { code: string; onSubmit: (name: string) => void }) {
  const [name, setName] = useState(getStoredNickname());
  const toast = useToast();
  return (
    <CenteredCard>
      <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff4d6d] to-[#ff8a3d]">
        <Icon name="door-open" solid size={24} className="text-white" />
      </span>
      <h1 className="text-xl font-extrabold text-white">Gabung ke {code}</h1>
      <p className="mt-1.5 text-sm text-white/55">Masukkan nickname untuk masuk ke room ini.</p>
      <div className="mt-5 text-left">
        <TextField
          label="Nickname"
          icon="user"
          placeholder="Contoh: Budi"
          value={name}
          maxLength={18}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (name.trim().length < 2) {
                toast.show("Nama minimal 2 karakter.", "warning");
                return;
              }
              setStoredNickname(name.trim());
              onSubmit(name.trim());
            }
          }}
        />
      </div>
      <Button
        fullWidth
        size="lg"
        className="mt-5"
        icon={<Icon name="arrow-right" size={16} />}
        onClick={() => {
          if (name.trim().length < 2) {
            toast.show("Nama minimal 2 karakter.", "warning");
            return;
          }
          setStoredNickname(name.trim());
          onSubmit(name.trim());
        }}
      >
        Masuk Room
      </Button>
    </CenteredCard>
  );
}

function StatusScreen({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  const router = useRouter();
  return (
    <CenteredCard>
      <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
        <Icon name={icon} solid size={24} className="text-white/70" />
      </span>
      <h1 className="text-xl font-extrabold text-white">{title}</h1>
      <p className="mt-1.5 text-sm text-white/55">{desc}</p>
      <Button fullWidth size="lg" className="mt-6" icon={<Icon name="home" size={16} />} onClick={() => router.push("/")}>
        Kembali ke Beranda
      </Button>
    </CenteredCard>
  );
}

export function RoomApp({ code }: { code: string }) {
  const toast = useToast();
  const [nickname, setNickname] = useState<string | null>(null);
  useEffect(() => {
    const stored = getStoredNickname();
    if (stored) setNickname(stored);
  }, [code]);

  const { snapshot, dispatch, setTyping, selfId } = useRoom(code, nickname);

  useEffect(() => {
    if (snapshot.notices.length > 0) {
      snapshot.notices.forEach((n) => toast.show(n, "default"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.notices.length]);

  if (snapshot.error) {
    return <StatusScreen icon="triangle-warning" title="Koneksi Room Bermasalah" desc={snapshot.error} />;
  }

  if (!nickname) {
    return (
      <NicknameGate
        code={code}
        onSubmit={(name) => {
          setNickname(name);
        }}
      />
    );
  }

  if (!snapshot.room) {
    if (snapshot.error) {
      return <StatusScreen icon="triangle-warning" title="Tidak Bisa Terhubung ke Room" desc={snapshot.error} />;
    }
    return <CenteredCard>Memuat room…</CenteredCard>;
  }

  if (snapshot.room.status === "closed") {
    return <StatusScreen icon="lock" title="Room Ditutup" desc="Host telah menutup room ini." />;
  }

  const self = snapshot.players.find((p) => p.id === selfId);
  if (!self) {
    if (snapshot.error) {
      return <StatusScreen icon="triangle-warning" title="Tidak Bisa Bergabung" desc={snapshot.error} />;
    }
    if (snapshot.room.status !== "waiting" && snapshot.room.status !== "ready") {
      return <StatusScreen icon="hourglass-end" title="Permainan Sudah Dimulai" desc="Kamu tidak bisa bergabung karena permainan sedang berlangsung." />;
    }
    if (snapshot.players.length >= snapshot.room.settings.maxPlayers) {
      return <StatusScreen icon="users-alt" title="Room Penuh" desc="Kapasitas pemain room ini sudah tercapai." />;
    }
    return <CenteredCard>Bergabung ke room…</CenteredCard>;
  }

  const isGameActive = snapshot.room.status === "playing" || (snapshot.room.status === "finished" && snapshot.game);

  return (
    <div className={isGameActive ? "flex h-dvh min-h-0 flex-col overflow-hidden" : "min-h-screen"}>
      <Header onlineHint={1} />
      {isGameActive && snapshot.game ? (
        <GameView
          room={snapshot.room}
          players={snapshot.players}
          game={snapshot.game}
          legalCardIds={snapshot.legalCardIds}
          chat={snapshot.chat}
          typingPlayers={snapshot.typingPlayers}
          onTyping={setTyping}
          selfId={selfId}
          isHost={snapshot.isHost}
          dispatch={dispatch}
        />
      ) : (
        <LobbyView
          room={snapshot.room}
          players={snapshot.players}
          chat={snapshot.chat}
          typingPlayers={snapshot.typingPlayers}
          onTyping={setTyping}
          selfId={selfId}
          isHost={snapshot.isHost}
          dispatch={dispatch}
        />
      )}
    </div>
  );
}
