"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Avatar, Badge, NumberStepper, SegmentedControl, Toggle } from "@/components/ui/Controls";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { useToast } from "@/components/ui/Toast";
import { sfx } from "@/lib/sound";
import { useUnreadChatCount } from "@/hooks/useUnreadChatCount";
import type { ChatMessage, ClientAction, HouseRules, Player, RoomRecord, RoomSettings } from "@/lib/types";
import { cn } from "@/lib/utils";

const HOUSE_RULE_INFO: { key: keyof HouseRules; label: string }[] = [
  { key: "crossStacking", label: "Cross Stacking" },
  { key: "jumpIn", label: "Jump-In" },
  { key: "drawUntilPlayable", label: "Draw Until Playable" },
];

function PlayerCard({ player, isSelf }: { player: Player; isSelf: boolean }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -14, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "flex items-center gap-3 rounded-2xl border p-3 transition",
        isSelf ? "border-[#ff4d6d]/40 bg-[#ff4d6d]/[0.07]" : "border-white/10 bg-white/[0.03]",
      )}
    >
      <div className="relative">
        <Avatar name={player.nickname} size={42} />
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0d0f1d]",
            player.connectionStatus === "connected" && "bg-emerald-400",
            player.connectionStatus === "reconnecting" && "animate-pulse bg-amber-400",
            player.connectionStatus === "disconnected" && "bg-rose-500",
          )}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="truncate text-sm font-bold text-white">
            {player.nickname} {isSelf && <span className="text-white/40">(Kamu)</span>}
          </p>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {player.isHost && <Badge tone="host">Host</Badge>}
          {player.isBot && <Badge>Bot</Badge>}
          {player.connectionStatus === "reconnecting" && <Badge tone="warning">Reconnecting</Badge>}
          <span className="flex items-center gap-1 text-[0.65rem] font-semibold text-amber-200/80"><Icon name="trophy" solid size={11} />{player.wins ?? 0} menang</span>
        </div>
      </div>
      <Badge tone={player.isReady ? "success" : "default"}>{player.isReady ? "Ready" : "Belum"}</Badge>
    </motion.div>
  );
}

export function LobbyView({
  room,
  players,
  chat,
  typingPlayers,
  onTyping,
  selfId,
  isHost,
  dispatch,
}: {
  room: RoomRecord;
  players: Player[];
  chat: ChatMessage[];
  typingPlayers: string[];
  onTyping: (typing: boolean) => void;
  selfId: string;
  isHost: boolean;
  dispatch: (action: ClientAction) => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [chatOpen, setChatOpen] = useState(false);
  const [resetScoresOpen, setResetScoresOpen] = useState(false);
  const { unreadCount, markRead } = useUnreadChatCount(chat, selfId, chatOpen);
  const self = players.find((p) => p.id === selfId);
  const typingNames = players.filter((player) => typingPlayers.includes(player.id) && !player.isBot).map((player) => player.nickname);
  const settings = room.settings;

  const connectedCount = players.filter((p) => p.connectionStatus !== "disconnected").length;
  const notReadyHumans = players.filter((p) => !p.isBot && !p.isReady);
  const canStart = isHost && connectedCount >= settings.minPlayers && notReadyHumans.length === 0;

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.show(`${label} disalin!`, "success");
    } catch {
      toast.show("Gagal menyalin, coba lagi.", "error");
    }
  };

  const updateSettings = (patch: Partial<RoomSettings>) => {
    dispatch({ kind: "room:update-settings", playerId: selfId, settings: patch });
  };

  const updateRule = (key: keyof HouseRules, value: boolean) => {
    const houseRules = { ...settings.houseRules, [key]: value };
    if (key === "crossStacking") {
      houseRules.stackingDrawTwo = value;
      houseRules.stackingDrawFour = value;
    }
    updateSettings({ houseRules });
  };

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 lg:flex-row lg:items-start lg:px-8">
      <div className="min-w-0 flex-1 space-y-5">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-white/40">Lobby Room</p>
              <h1 className="mt-1 text-xl font-extrabold text-white sm:text-2xl">{room.name}</h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => copy(room.code, "Kode room")}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm font-bold tracking-wider text-white transition hover:bg-white/10"
              >
                <Icon name="hashtag" size={14} className="text-[#ff8a6a]" />
                {room.code}
                <Icon name="copy" size={13} className="text-white/50" />
              </button>
              <button
                onClick={() => copy(`${window.location.origin}/room/${room.code}`, "Link undangan")}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10"
                aria-label="Salin link undangan"
              >
                <Icon name="share" size={15} />
              </button>
              <button
                onClick={() => {
                  dispatch({ kind: "room:leave", playerId: selfId });
                  router.push("/");
                }}
                className="flex h-10 items-center gap-2 rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 text-sm font-semibold text-rose-200 transition hover:border-rose-400/50 hover:bg-rose-500/20"
              >
                <Icon name="exit" size={14} />
                <span className="hidden sm:inline">Keluar Room</span>
                <span className="sm:hidden">Keluar</span>
              </button>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <p className="text-sm font-semibold text-white/60">
              Pemain ({players.length}/{settings.maxPlayers})
            </p>
            {isHost && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setResetScoresOpen(true)}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/70 transition hover:border-rose-300/30 hover:bg-rose-500/10 hover:text-rose-100"
                >
                  <Icon name="rotate-left" size={13} /> Reset Skor
                </button>
                {players.length < settings.maxPlayers && (
                  <button
                    onClick={() => dispatch({ kind: "room:add-bot", playerId: selfId })}
                    className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/70 transition hover:bg-white/10"
                  >
                    <Icon name="robot" size={13} /> Tambah Bot
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            <AnimatePresence initial={false}>
              {players.map((p) => (
                <div key={p.id} className="relative group">
                  <PlayerCard player={p} isSelf={p.id === selfId} />
                  {isHost && p.id !== selfId && (
                    <button
                      onClick={() => dispatch({ kind: "room:remove-player", playerId: selfId, targetId: p.id })}
                      className="absolute -right-1.5 -top-1.5 hidden h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-white shadow group-hover:flex"
                      aria-label={`Keluarkan ${p.nickname}`}
                    >
                      <Icon name="cross-small" size={12} />
                    </button>
                  )}
                </div>
              ))}
            </AnimatePresence>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {!self?.isBot && (
              <Button
                variant={self?.isReady ? "secondary" : "primary"}
                fullWidth
                icon={<Icon name={self?.isReady ? "cross-small" : "check"} size={16} />}
                onClick={() => {
                  dispatch({ kind: "room:ready", playerId: selfId, ready: !self?.isReady });
                  sfx.click();
                }}
              >
                {self?.isReady ? "Batal Ready" : "Ready"}
              </Button>
            )}
            {isHost ? (
              <Button
                fullWidth
                disabled={!canStart}
                icon={<Icon name="play" size={16} />}
                onClick={() => {
                  dispatch({ kind: "game:start", playerId: selfId });
                }}
              >
                Start Game
              </Button>
            ) : (
              <div className="flex flex-1 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/50">
                Menunggu host memulai permainan…
              </div>
            )}
          </div>
          {isHost && !canStart && (
            <p className="mt-2 text-center text-xs text-amber-300/80 sm:text-left">
              {connectedCount < settings.minPlayers
                ? `Minimal ${settings.minPlayers} pemain terhubung untuk memulai.`
                : "Semua pemain (bukan bot) harus Ready dulu."}
            </p>
          )}
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
          <p className="flex items-center gap-2 text-sm font-bold text-white">
            <Icon name="settings-sliders" size={15} className="text-[#ff8a6a]" /> Pengaturan Room
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <NumberStepper
              label="Kapasitas Pemain"
              value={settings.maxPlayers}
              min={Math.max(settings.minPlayers, players.length)}
              max={10}
              onChange={(v) => isHost && updateSettings({ maxPlayers: v })}
            />
            <div>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-white/50">Durasi Giliran</span>
              <SegmentedControl
                value={String(settings.turnDurationSeconds)}
                onChange={(v) => isHost && updateSettings({ turnDurationSeconds: Number(v) as RoomSettings["turnDurationSeconds"] })}
                options={[
                  { value: "15", label: "15s" },
                  { value: "30", label: "30s" },
                  { value: "45", label: "45s" },
                  { value: "60", label: "60s" },
                ]}
              />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
            <span className="text-sm font-semibold text-white">Room Chat</span>
            <Toggle checked={settings.chatEnabled} onChange={(v) => isHost && updateSettings({ chatEnabled: v })} />
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-white/40">House Rules</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {HOUSE_RULE_INFO.map((rule) => (
              <div key={rule.key} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5">
                <span className="text-xs font-semibold text-white/80">{rule.label}</span>
                <Toggle checked={settings.houseRules[rule.key]} disabled={!isHost} onChange={(v) => updateRule(rule.key, v)} />
              </div>
            ))}
          </div>
          {!isHost && <p className="mt-3 text-xs text-white/35">Hanya host yang dapat mengubah pengaturan room.</p>}
        </div>
      </div>

      <div className="hidden h-[calc(100dvh-7rem)] w-80 shrink-0 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] lg:sticky lg:top-20 lg:flex">
        <ChatPanel messages={chat} selfId={selfId} disabled={!settings.chatEnabled} typingNames={typingNames} onTyping={onTyping} onSend={(content) => dispatch({ kind: "chat:send", playerId: selfId, content })} />
      </div>

      <button
        onClick={() => {
          markRead();
          setChatOpen(true);
        }}
        className="fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#ff4d6d] to-[#ff8a3d] text-white shadow-[0_12px_30px_-8px_rgba(255,77,109,0.7)] lg:hidden"
        aria-label={unreadCount > 0 ? `Buka chat, ${unreadCount} pesan baru` : "Buka chat"}
      >
        <Icon name="comment-dots" size={20} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-[#111321] bg-rose-500 px-1 text-[0.6rem] font-extrabold leading-none text-white shadow-lg">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {chatOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/60" onClick={() => setChatOpen(false)} />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="relative flex h-[min(75dvh,42rem)] w-full flex-col overflow-hidden rounded-t-3xl border-t border-white/10 bg-[#13152a]"
            >
              <div className="mx-auto mt-2.5 h-1.5 w-12 rounded-full bg-white/20" />
              <ChatPanel messages={chat} selfId={selfId} disabled={!settings.chatEnabled} typingNames={typingNames} onTyping={onTyping} onSend={(content) => dispatch({ kind: "chat:send", playerId: selfId, content })} className="flex-1" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal
        open={resetScoresOpen}
        onClose={() => setResetScoresOpen(false)}
        title="Reset skor room?"
        subtitle="Skor kemenangan semua pemain di room ini akan kembali ke 0."
      >
        <div className="flex gap-2">
          <Button variant="secondary" fullWidth onClick={() => setResetScoresOpen(false)}>Batal</Button>
          <Button
            variant="danger"
            fullWidth
            icon={<Icon name="rotate-left" size={15} />}
            onClick={() => {
              dispatch({ kind: "room:reset-scores", playerId: selfId });
              setResetScoresOpen(false);
              toast.show("Skor semua pemain berhasil direset.", "success");
            }}
          >
            Reset Skor
          </Button>
        </div>
      </Modal>
    </div>
  );
}
