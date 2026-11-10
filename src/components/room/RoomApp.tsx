"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useRoom } from "@/hooks/useRoom";
import { Header } from "@/components/landing/Header";
import { LobbyView } from "@/components/lobby/LobbyView";
import { GameView } from "@/components/game/GameView";
import { Button } from "@/components/ui/Button";
import { Avatar, TextField } from "@/components/ui/Controls";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "@/components/ui/Toast";
import { getStoredNickname, setStoredNickname } from "@/lib/session";
import type { GamePublicState, Player } from "@/lib/types";

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

function StatusScreen({ icon, title, desc, onReconnect, reconnecting, reconnectAvailable }: { icon: string; title: string; desc: string; onReconnect?: () => void; reconnecting?: boolean; reconnectAvailable?: boolean }) {
  const router = useRouter();
  return (
    <CenteredCard>
      <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
        <Icon name={icon} solid size={24} className="text-white/70" />
      </span>
      <h1 className="text-xl font-extrabold text-white">{title}</h1>
      <p className="mt-1.5 text-sm text-white/55">{reconnecting ? "Mencoba menyambungkan kembali ke room..." : desc}</p>
      {reconnectAvailable && onReconnect && (
        <Button
          fullWidth
          size="lg"
          className="mt-6"
          disabled={reconnecting}
          icon={reconnecting ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Icon name="refresh" size={16} />}
          onClick={onReconnect}
        >
          {reconnecting ? "Menyambungkan Ulang..." : "Coba Sambungkan Ulang"}
        </Button>
      )}
      <Button fullWidth size="lg" className={reconnectAvailable ? "mt-3" : "mt-6"} icon={<Icon name="home" size={16} />} onClick={() => router.push("/")}>
        Kembali ke Beranda
      </Button>
    </CenteredCard>
  );
}

function SpectatorLobby({
  roomName,
  roomCode,
  players,
  game,
  onWatch,
  onLeave,
}: {
  roomName: string;
  roomCode: string;
  players: Player[];
  game: GamePublicState | null;
  onWatch: () => void;
  onLeave: () => void;
}) {
  const currentPlayer = players.find((player) => player.id === game?.currentPlayerId);
  const gameFinished = game?.status === "finished";

  return (
    <main className="mx-auto flex min-h-[calc(100dvh-5rem)] w-full max-w-3xl items-center px-4 py-8 sm:px-6">
      <section className="w-full rounded-3xl border border-white/10 bg-[#111321] p-6 shadow-[0_30px_80px_-24px_rgba(0,0,0,0.7)] sm:p-9">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[#ff8a3d]/25 bg-[#ff8a3d]/10 text-[#ffb174]">
          <Icon name="eye" solid size={24} />
        </div>
        <p className="mt-5 text-center text-[0.65rem] font-extrabold uppercase tracking-[0.24em] text-amber-200/70">LOBBY PENONTON · {roomCode}</p>
        <h1 className="mt-2 text-center text-2xl font-extrabold text-white sm:text-3xl">
          {gameFinished ? "Pertandingan selesai" : game ? "Pertandingan sedang berlangsung" : "Menunggu pertandingan dimulai"}
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-center text-sm leading-relaxed text-white/55">
          Kamu masuk ke <span className="font-semibold text-white/75">{roomName}</span> saat permainan berlangsung. Tunggu di sini atau tonton pertandingan langsung.
        </p>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-bold text-white/80">Pemain dalam pertandingan</span>
            <span className="rounded-full border border-white/10 bg-black/15 px-2.5 py-1 text-xs font-semibold text-white/55">{players.length} pemain</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {players.map((player) => (
              <div key={player.id} className="flex items-center gap-2 rounded-full border border-white/10 bg-black/15 py-1 pl-1 pr-3">
                <Avatar name={player.nickname} size={28} />
                <span className="max-w-32 truncate text-xs font-semibold text-white/75">{player.nickname}</span>
              </div>
            ))}
          </div>
          {game && !gameFinished && currentPlayer && (
            <p className="mt-4 border-t border-white/10 pt-3 text-center text-xs text-white/50">
              Sekarang giliran <span className="font-bold text-white/80">{currentPlayer.nickname}</span>. Meja terus diperbarui selama kamu menonton.
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button fullWidth size="lg" disabled={!game} icon={<Icon name="play" size={16} />} onClick={onWatch}>
            {gameFinished ? "Lihat Hasil Pertandingan" : game ? "Tonton Pertandingan" : "Menunggu pertandingan dimulai"}
          </Button>
          <Button fullWidth size="lg" variant="secondary" icon={<Icon name="exit" size={16} />} onClick={onLeave}>
            Keluar Room
          </Button>
        </div>
      </section>
    </main>
  );
}

export function RoomApp({ code }: { code: string }) {
  const router = useRouter();
  const toast = useToast();
  const [nickname, setNickname] = useState<string | null>(null);
  const [watchingGame, setWatchingGame] = useState(false);
  useEffect(() => {
    const stored = getStoredNickname();
    if (stored) setNickname(stored);
  }, [code]);

  const { snapshot, dispatch, setTyping, reconnect, selfId } = useRoom(code, nickname);

  useEffect(() => {
    setWatchingGame(false);
  }, [code]);

  useEffect(() => {
    if (snapshot.room?.status === "waiting" || snapshot.room?.status === "ready" || !snapshot.game) {
      setWatchingGame(false);
    }
  }, [snapshot.room?.status, snapshot.game]);

  useEffect(() => {
    if (snapshot.notices.length > 0) {
      snapshot.notices.forEach((n) => toast.show(n, "default"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.notices.length]);

  if (snapshot.error) {
    const connectionIssue = snapshot.reconnectAvailable;
    return (
      <StatusScreen
        icon={connectionIssue ? "wifi" : "triangle-warning"}
        title={connectionIssue ? "Koneksi Terputus" : "Room Bermasalah"}
        desc={snapshot.error}
        reconnectAvailable={connectionIssue}
        reconnecting={snapshot.reconnecting}
        onReconnect={reconnect}
      />
    );
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

  const isGameActive = snapshot.room.status === "playing" || (snapshot.room.status === "finished" && Boolean(snapshot.game));
  const spectator = snapshot.spectators.find((player) => player.id === selfId);

  if (spectator) {
    const showGame = watchingGame && isGameActive && Boolean(snapshot.game);
    const leaveRoom = () => {
      dispatch({ kind: "room:leave", playerId: selfId });
      router.push("/");
    };

    return (
      <div className={showGame ? "flex h-dvh min-h-0 flex-col overflow-hidden" : "min-h-screen"}>
        <Header onlineHint={1} roomLayout={showGame} />
        {showGame && snapshot.game ? (
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
            isSpectator
            onStopWatching={() => setWatchingGame(false)}
            dispatch={dispatch}
          />
        ) : (
          <SpectatorLobby
            roomName={snapshot.room.name}
            roomCode={snapshot.room.code}
            players={snapshot.players}
            game={snapshot.game}
            onWatch={() => setWatchingGame(true)}
            onLeave={leaveRoom}
          />
        )}
      </div>
    );
  }

  const self = snapshot.players.find((p) => p.id === selfId);
  if (!self) {
    if (snapshot.error) {
      return <StatusScreen icon="triangle-warning" title="Tidak Bisa Bergabung" desc={snapshot.error} />;
    }
    if (isGameActive) return <CenteredCard>Menyiapkan lobby penonton…</CenteredCard>;
    if (snapshot.players.length >= snapshot.room.settings.maxPlayers) {
      return <StatusScreen icon="users-alt" title="Room Penuh" desc="Kapasitas pemain room ini sudah tercapai." />;
    }
    return <CenteredCard>Bergabung ke room…</CenteredCard>;
  }

  return (
    <div className={isGameActive ? "flex h-dvh min-h-0 flex-col overflow-hidden" : "min-h-screen"}>
      <Header onlineHint={1} roomLayout={isGameActive} />
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
