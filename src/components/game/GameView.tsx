"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Controls";
import { Modal } from "@/components/ui/Modal";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { useToast } from "@/components/ui/Toast";
import { OpponentsBar, TableCenter } from "./TableArea";
import { PlayerHand } from "./PlayerHand";
import { PlayingCard } from "./PlayingCard";
import { ColorPickerModal } from "./ColorPickerModal";
import { WinModal } from "./WinModal";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useUnreadChatCount } from "@/hooks/useUnreadChatCount";
import { sfx } from "@/lib/sound";
import { cardLabel } from "@/lib/uno-engine";
import { cn } from "@/lib/utils";
import type { Card, CardColor, ChatMessage, ClientAction, GamePublicState, Player, RoomRecord } from "@/lib/types";

const COLOR_NAME: Record<CardColor, string> = {
  red: "Merah",
  blue: "Biru",
  green: "Hijau",
  yellow: "Kuning",
  wild: "Wild",
};

function cardMatchName(value: string) {
  const names: Record<string, string> = { skip: "Skip", reverse: "Reverse", draw2: "+2", wild4: "Wild +4" };
  return names[value] ?? `angka ${value}`;
}

function TurnTimerBar({ deadline, durationSeconds, isMyTurn }: { deadline: number | null; durationSeconds: number; isMyTurn: boolean }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  if (!deadline) return null;
  const totalMs = durationSeconds * 1000;
  const remain = Math.max(0, deadline - now);
  const pct = Math.max(0, Math.min(100, (remain / totalMs) * 100));
  const seconds = Math.ceil(remain / 1000);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10 sm:w-32">
        <motion.div
          className={cn("h-full rounded-full", pct < 25 ? "bg-rose-500" : "bg-gradient-to-r from-[#ff4d6d] to-[#ff8a3d]")}
          animate={{ width: `${pct}%` }}
          transition={{ ease: "linear", duration: 0.25 }}
        />
      </div>
      <span className={cn("w-5 text-xs font-bold tabular-nums", isMyTurn ? "text-white" : "text-white/40")}>{seconds}</span>
    </div>
  );
}

export function GameView({
  room,
  players,
  game,
  legalCardIds,
  chat,
  typingPlayers,
  onTyping,
  selfId,
  isHost,
  dispatch,
}: {
  room: RoomRecord;
  players: Player[];
  game: GamePublicState;
  legalCardIds: string[];
  chat: ChatMessage[];
  typingPlayers: string[];
  onTyping: (typing: boolean) => void;
  selfId: string;
  isHost: boolean;
  dispatch: (action: ClientAction) => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const reducedMotion = useReducedMotion();
  const [chatOpen, setChatOpen] = useState(false);
  const { unreadCount, markRead } = useUnreadChatCount(chat, selfId, chatOpen);
  const typingNames = players.filter((player) => typingPlayers.includes(player.id) && !player.isBot).map((player) => player.nickname);
  const [pendingWildCard, setPendingWildCard] = useState<Card | null>(null);
  const [unoNotice, setUnoNotice] = useState<string | null>(null);
  const [pendingMatchCard, setPendingMatchCard] = useState<Card | null>(null);
  const [matchPlayMode, setMatchPlayMode] = useState<"choice" | "matching">("choice");
  const [matchingCardIds, setMatchingCardIds] = useState<string[]>([]);
  const [flyingCard, setFlyingCard] = useState<{
    seq: number;
    card: Card;
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
  } | null>(null);
  const [queuedFlyingCards, setQueuedFlyingCards] = useState<{
    seq: number;
    card: Card;
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
  }[]>([]);
  const lastAnimatedPlaySeq = useRef<number | null>(null);
  const previousHandCounts = useRef<Record<string, number> | null>(null);
  const unoNoticeTimer = useRef<number | null>(null);
  const prevTurnRef = useState({ id: game.currentPlayerId })[0];
  const [lastActionLabel, setLastActionLabel] = useState<string | null>(null);

  const me = players.find((p) => p.id === selfId);
  const opponents = useMemo(() => players.filter((p) => p.id !== selfId), [players, selfId]);
  const isMyTurn = game.currentPlayerId === selfId;
  const currentPlayer = players.find((p) => p.id === game.currentPlayerId);
  const playHint = !isMyTurn
    ? `Giliran ${currentPlayer?.nickname ?? "pemain"}.`
    : game.drawnCardId
      ? "Kartu cocok. Mainkan atau lewati."
    : game.pendingDraw > 0
      ? room.settings.houseRules.crossStacking && legalCardIds.length > 0
        ? `Tumpuk +${game.pendingDraw} atau ambil kartu.`
        : `Ambil ${game.pendingDraw} kartu penalti.`
      : !room.settings.houseRules.drawUntilPlayable && legalCardIds.length === 0
        ? "Tak ada kartu cocok. Ambil 1 kartu."
      : `Cocokkan ${game.topCard && game.topCard.value !== "wild" && game.topCard.value !== "wild4" ? cardMatchName(game.topCard.value) : COLOR_NAME[game.activeColor]}, atau ambil kartu.`;

  useEffect(() => {
    if (isMyTurn && prevTurnRef.id !== selfId) sfx.turn();
    prevTurnRef.id = game.currentPlayerId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.currentPlayerId]);

  useEffect(() => {
    const a = game.lastAction;
    if (!a) return;
    const actor = players.find((p) => p.id === a.actorId)?.nickname ?? "Pemain";
    const target = players.find((p) => p.id === a.targetId)?.nickname;
    const map: Record<string, string> = {
      play: `${actor} memainkan ${a.card ? cardLabel(a.card) : "kartu"}`,
      draw: `${actor} mengambil ${a.count ?? 1} kartu`,
      skip: `${target ?? "Pemain"} dilewati`,
      reverse: `${actor} membalik arah permainan`,
      draw2: `${target ?? "Pemain"} mengambil 2 kartu`,
      wild4: `${target ?? "Pemain"} mengambil 4 kartu`,
      wild: `${actor} mengubah warna`,
      uno: `${actor} tersisa satu kartu: UNO!`,
      win: `${actor} memenangkan pertandingan!`,
      "seven-swap": `${actor} menukar kartu dengan ${target ?? "pemain lain"}`,
      "zero-rotation": `${actor} memutar semua kartu pemain`,
      "jump-in": `${actor} nyelak pakai kartu identik!`,
    };
    const label = map[a.type];
    if (label) setLastActionLabel(label);
    if (["skip", "reverse", "draw2", "wild4"].includes(a.type)) sfx.action();
  }, [game.lastAction, players]);

  useEffect(() => {
    const previous = previousHandCounts.current;
    previousHandCounts.current = game.handCounts;
    if (!previous) return;

    for (const player of players) {
      if (previous[player.id] !== 1 && game.handCounts[player.id] === 1) {
        setUnoNotice(player.nickname);
        if (unoNoticeTimer.current !== null) window.clearTimeout(unoNoticeTimer.current);
        unoNoticeTimer.current = window.setTimeout(() => setUnoNotice(null), 2600);
        sfx.uno();
      }
    }
  }, [game.handCounts, players]);

  useEffect(() => () => {
    if (unoNoticeTimer.current !== null) window.clearTimeout(unoNoticeTimer.current);
  }, []);

  useEffect(() => {
    const plays = game.recentPlays ?? [];
    if (lastAnimatedPlaySeq.current === null) {
      lastAnimatedPlaySeq.current = plays.at(-1)?.seq ?? game.lastAction?.seq ?? 0;
      return;
    }
    const discard = document.querySelector<HTMLElement>("[data-discard-pile]");
    const unseen = plays.filter((play) => play.seq > (lastAnimatedPlaySeq.current ?? 0));
    if (!unseen.length) return;
    lastAnimatedPlaySeq.current = unseen[unseen.length - 1].seq;
    if (!discard) return;

    const to = discard.getBoundingClientRect();
    const animations = unseen.flatMap((action) => {
      if (action.actorId === selfId || !action.actorId || !action.card) return [];
      const opponent = Array.from(document.querySelectorAll<HTMLElement>("[data-player-avatar]"))
        .find((element) => element.dataset.playerAvatar === action.actorId);
      if (!opponent) return [];
      const from = opponent.getBoundingClientRect();
      return [{
        seq: action.seq,
        card: action.card,
        fromX: from.left + from.width / 2 - 32,
        fromY: from.top + from.height / 2 - 48,
        toX: to.left + to.width / 2 - 32,
        toY: to.top + to.height / 2 - 48,
      }];
    });
    if (animations.length) setQueuedFlyingCards((current) => [...current, ...animations]);
  }, [game.recentPlays, game.lastAction?.seq, selfId]);

  useEffect(() => {
    if (flyingCard || queuedFlyingCards.length === 0) return;
    const [next, ...remaining] = queuedFlyingCards;
    setFlyingCard(next);
    setQueuedFlyingCards(remaining);
  }, [flyingCard, queuedFlyingCards]);

  useEffect(() => {
    if (!flyingCard) return;
    const seq = flyingCard.seq;
    const timeout = window.setTimeout(() => {
      setFlyingCard((current) => current?.seq === seq ? null : current);
    }, 820);
    return () => window.clearTimeout(timeout);
  }, [flyingCard?.seq]);

  const finishPlay = (card: Card, chosenColor?: CardColor, matchingIds?: string[]) => {
    sfx.play();
    dispatch({ kind: "game:play-card", playerId: selfId, cardId: card.id, chosenColor, matchingCardIds: matchingIds });
  };

  const handlePlay = (card: Card) => {
    const isLegal = legalCardIds.includes(card.id);
    const isNumberCard = /^[0-9]$/.test(card.value);
    const matchingCards = isNumberCard ? game.myHand.filter((handCard) => handCard.value === card.value) : [];
    const matchingGroupHasLegalCard = matchingCards.some((matchingCard) => legalCardIds.includes(matchingCard.id));
    if (!isLegal && !(matchingCards.length > 1 && matchingGroupHasLegalCard)) {
      sfx.invalid();
      toast.show("Kartu tidak valid untuk dimainkan.", "warning");
      return;
    }
    if (matchingCards.length > 1 && matchingGroupHasLegalCard) {
      const legalBaseCard = matchingCards.find((matchingCard) => legalCardIds.includes(matchingCard.id));
      setPendingMatchCard(card);
      setMatchPlayMode("choice");
      setMatchingCardIds(legalBaseCard && legalBaseCard.id !== card.id
        ? [legalBaseCard.id, card.id]
        : [card.id]);
      return;
    }
    if (card.color === "wild") {
      setPendingWildCard(card);
      return;
    }
    finishPlay(card);
  };

  const handleDraw = () => {
    sfx.draw();
    dispatch({ kind: "game:draw-card", playerId: selfId });
  };

  const showPassButton = isMyTurn && game.pendingDraw === 0 && (room.settings.houseRules.drawUntilPlayable || Boolean(game.drawnCardId));
  const singleLegalMatch = game.myHand.find((card) => matchingCardIds.includes(card.id) && legalCardIds.includes(card.id));
  const winner = players.find((p) => p.id === game.winnerId);

  return (
    <div className="relative flex h-[calc(100dvh-4rem)] min-h-0 flex-col overflow-hidden">
      <AnimatePresence>
        {unoNotice && (
          <div className="pointer-events-none absolute inset-0 z-[100] flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.72, y: 16, rotate: -3 }}
              animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -8 }}
              transition={{ type: "spring", stiffness: 360, damping: 24 }}
              className="relative flex min-w-[min(18rem,90vw)] flex-col items-center overflow-hidden rounded-3xl border border-amber-200/50 bg-[#171522]/95 px-8 py-5 text-center shadow-[0_20px_70px_rgba(0,0,0,0.6),0_0_42px_rgba(255,183,56,0.28)] backdrop-blur-md"
            >
              <motion.span
                aria-hidden="true"
                className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-amber-200 to-transparent"
                animate={{ opacity: [0.35, 1, 0.35] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
              <span className="rounded-full border border-amber-200/40 bg-amber-300/15 px-3 py-1 text-xs font-black tracking-[0.28em] text-amber-200">UNO</span>
              <p className="mt-2 text-4xl font-black italic tracking-tight text-white drop-shadow-[0_3px_14px_rgba(255,191,64,0.65)] sm:text-5xl">{unoNotice}!</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-white/75">Tersisa satu kartu</p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <div className="z-20 shrink-0 border-b border-white/5 bg-[#07080f]/80 px-4 py-2.5 backdrop-blur-xl sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="rounded-lg bg-white/5 px-2.5 py-1 text-xs font-bold tracking-wide text-white/70">{room.code}</span>
            <span
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2 py-1 text-[0.65rem] font-bold sm:px-2.5 sm:text-xs",
                isMyTurn ? "border-rose-300/30 bg-[#ff4d6d]/20 text-rose-100" : "border-white/10 bg-white/5 text-white/65",
              )}
            >
              <Icon name="hourglass-end" size={12} />
              {isMyTurn ? "Giliranmu!" : `Giliran: ${currentPlayer?.nickname ?? "?"}`}
            </span>
          </div>
          <TurnTimerBar deadline={game.turnDeadline} durationSeconds={game.turnDurationSeconds} isMyTurn={isMyTurn} />
          <button
            onClick={() => {
              dispatch({ kind: "room:leave", playerId: selfId });
              router.push("/");
            }}
            className="flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-white/60 transition hover:bg-rose-500/20 hover:text-rose-300"
          >
            <Icon name="exit" size={13} /> <span className="hidden sm:inline">Keluar</span>
          </button>
        </div>
      </div>

      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 gap-4 overflow-hidden px-2 pb-2 sm:px-6 lg:px-8">
        <aside className="hidden w-36 shrink-0 flex-col gap-3 pt-5 md:flex lg:w-44" aria-label="Info permainan">
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-white/40">Arah permainan</p>
            <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-white/85">
              <motion.span animate={{ rotate: game.direction === 1 ? 0 : 180 }} transition={{ duration: 0.3 }}>
                <Icon name="arrow-right" size={15} />
              </motion.span>
              <span className="capitalize">{game.direction === 1 ? "Searah" : "Berlawanan"}</span>
              <span
                className={cn(
                  "ml-auto h-3 w-3 shrink-0 rounded-full ring-2 ring-white/25",
                  game.activeColor === "red" && "bg-[#ff4d4d]",
                  game.activeColor === "blue" && "bg-[#3fa8ff]",
                  game.activeColor === "green" && "bg-[#4ad66d]",
                  game.activeColor === "yellow" && "bg-[#ffd24a]",
                  game.activeColor === "wild" && "bg-gradient-to-br from-[#ff4d4d] via-[#ffd24a] to-[#3fa8ff]",
                )}
                aria-label={`Warna aktif ${COLOR_NAME[game.activeColor]}`}
              />
            </div>
            <p className="mt-1 text-xs text-white/50">Warna {COLOR_NAME[game.activeColor]}</p>
          </div>
          <div className="rounded-2xl border border-[#ff8a3d]/20 bg-[#ff8a3d]/[0.08] p-3 text-xs font-medium leading-relaxed text-white/80">
            <span className="mb-1 block text-[0.62rem] font-bold uppercase tracking-[0.14em] text-amber-200/70">Petunjuk</span>
            {playHint}
          </div>
        </aside>
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="absolute left-3 top-3 z-10 flex items-center gap-2 text-xs font-semibold text-white/65 sm:left-4 sm:top-4 md:hidden">
            <motion.span animate={{ rotate: game.direction === 1 ? 0 : 180 }} transition={{ duration: 0.3 }}>
              <Icon name="arrow-right" size={14} />
            </motion.span>
            Arah Permainan
            <span
              className={cn(
                "ml-1 h-3 w-3 rounded-full ring-2 ring-white/30",
                game.activeColor === "red" && "bg-[#ff4d4d]",
                game.activeColor === "blue" && "bg-[#3fa8ff]",
                game.activeColor === "green" && "bg-[#4ad66d]",
                game.activeColor === "yellow" && "bg-[#ffd24a]",
                game.activeColor === "wild" && "bg-gradient-to-br from-[#ff4d4d] via-[#ffd24a] to-[#3fa8ff]",
              )}
            />
          </div>
          <OpponentsBar
            opponents={opponents}
            currentPlayerId={game.currentPlayerId}
            handCounts={game.handCounts}
          />

          <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden">
            <TableCenter
              topCard={game.topCard}
              deckCount={game.deckCount}
              pendingDraw={game.pendingDraw}
              canDraw={isMyTurn && !game.drawnCardId}
              highlightDraw={isMyTurn && !game.drawnCardId && (game.pendingDraw > 0 || legalCardIds.length === 0)}
              onDraw={handleDraw}
              lastAction={lastActionLabel}
              playHint={playHint}
              showHintOnMobile
            />
          </div>

          <div className="relative shrink-0">
            <div className="mb-2 flex items-center justify-center gap-2 px-2">
              <div className="flex items-center gap-2">
                <Avatar name={me?.nickname ?? "?"} size={28} />
                <span className="text-sm font-bold text-white/80">{me?.nickname}</span>
                {isMyTurn && (
                  <span className="rounded-full border border-emerald-300/30 bg-emerald-400/15 px-2 py-1 text-[0.6rem] font-extrabold uppercase tracking-wide text-emerald-200">
                    Giliranmu
                  </span>
                )}
              </div>
              {showPassButton && (
                <button
                  onClick={() => dispatch({ kind: "game:pass-turn", playerId: selfId })}
                  className="ml-2 flex items-center gap-1 rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-white/60 transition hover:bg-white/15"
                >
                  <Icon name="fast-forward" size={12} /> Lewati Giliran
                </button>
              )}
            </div>

            <PlayerHand hand={game.myHand} legalCardIds={legalCardIds} isMyTurn={isMyTurn} onPlay={handlePlay} />
          </div>
        </div>

        <div className="hidden min-h-0 w-72 shrink-0 rounded-3xl border border-white/10 bg-white/[0.03] lg:flex xl:w-80">
          <ChatPanel messages={chat} selfId={selfId} disabled={!room.settings.chatEnabled} typingNames={typingNames} onTyping={onTyping} onSend={(content) => dispatch({ kind: "chat:send", playerId: selfId, content })} />
        </div>
      </div>

      <button
        onClick={() => {
          markRead();
          setChatOpen(true);
        }}
        className="fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#ff4d6d] to-[#ff8a3d] text-white shadow-[0_12px_30px_-8px_rgba(255,77,109,0.7)] lg:hidden"
        aria-label={unreadCount > 0 ? `Buka chat, ${unreadCount} pesan baru` : "Buka chat"}
      >
        <Icon name="comment-dots" size={18} />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-[#111321] bg-rose-500 px-1 text-[0.6rem] font-extrabold leading-none text-white shadow-lg">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {chatOpen && (
          <motion.div className="fixed inset-0 z-50 flex items-end lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/60" onClick={() => setChatOpen(false)} />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="relative flex h-[min(70dvh,42rem)] w-full flex-col overflow-hidden rounded-t-3xl border-t border-white/10 bg-[#13152a]"
            >
              <div className="mx-auto mt-2.5 h-1.5 w-12 rounded-full bg-white/20" />
              <ChatPanel messages={chat} selfId={selfId} disabled={!room.settings.chatEnabled} typingNames={typingNames} onTyping={onTyping} onSend={(content) => dispatch({ kind: "chat:send", playerId: selfId, content })} className="flex-1" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ColorPickerModal
        open={!!pendingWildCard}
        onClose={() => setPendingWildCard(null)}
        onPick={(color) => {
          if (pendingWildCard) finishPlay(pendingWildCard, color);
          setPendingWildCard(null);
        }}
      />

      <Modal
        open={!!pendingMatchCard}
        onClose={() => setPendingMatchCard(null)}
        title={`Kartu ${pendingMatchCard?.value ?? ""} kembar`}
        subtitle={`Ada kartu angka ${pendingMatchCard?.value ?? ""} lain di tanganmu. Mau melempar satu atau beberapa sekaligus?`}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                if (singleLegalMatch) finishPlay(singleLegalMatch);
                setPendingMatchCard(null);
              }}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm font-bold text-white transition hover:bg-white/10"
            >
              Lempar satu kartu{singleLegalMatch ? ` (${COLOR_NAME[singleLegalMatch.color]})` : ""}
            </button>
            <button
              type="button"
              onClick={() => setMatchPlayMode("matching")}
              className={cn(
                "rounded-xl border px-3 py-3 text-sm font-bold transition",
                matchPlayMode === "matching" ? "border-[#ff8a3d]/60 bg-[#ff8a3d]/15 text-white" : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10",
              )}
            >
              Pilih kartu kembar
            </button>
          </div>

          {matchPlayMode === "matching" && pendingMatchCard && (
            <>
              <p className="text-xs text-white/60">Urutan pertama harus kartu yang cocok dengan meja (paling bawah). Kartu yang diklik terakhir berada paling atas.</p>
              <div
                className="grid max-h-[32dvh] justify-center gap-2 overflow-y-auto rounded-xl border border-white/10 bg-black/10 p-2"
                style={{ gridTemplateColumns: "repeat(auto-fit, minmax(2.5rem, 3.75rem))" }}
              >
                {game.myHand.filter((card) => card.value === pendingMatchCard.value).map((card) => {
                  const selected = matchingCardIds.includes(card.id);
                  return (
                    <button
                      key={card.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => {
                        if (card.id === pendingMatchCard.id) return;
                        setMatchingCardIds((selectedIds) => {
                          if (selected) return selectedIds.filter((id) => id !== card.id);
                          const isPlayableBase = legalCardIds.includes(card.id);
                          const alreadyHasPlayableBase = selectedIds.some((id) => legalCardIds.includes(id));
                          return isPlayableBase && !alreadyHasPlayableBase
                            ? [card.id, ...selectedIds]
                            : [...selectedIds, card.id];
                        });
                      }}
                      className={cn(
                        "relative rounded-xl transition",
                        selected ? "scale-105 ring-2 ring-[#ff8a3d] ring-offset-2 ring-offset-[#13152a]" : "opacity-60 hover:opacity-100",
                      )}
                    >
                      <PlayingCard card={card} compact className="w-full" style={{ width: "100%" }} />
                      {selected && (
                        <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ff8a3d] px-1 text-[0.6rem] font-extrabold text-white shadow">
                          {matchingCardIds.indexOf(card.id) + 1}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-1.5">
                  <span className="text-xs font-bold text-white/75">Urutan pilihan</span>
                  <span className="text-[0.65rem] text-white/40">Pertama = bawah · terakhir = atas</span>
                </div>
                <ol className="space-y-1.5">
                  {matchingCardIds.map((id, index) => {
                    const card = game.myHand.find((handCard) => handCard.id === id);
                    if (!card) return null;
                    return (
                      <li key={id} className="flex items-center gap-2 rounded-lg bg-black/10 px-2 py-1.5">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ff8a3d]/20 text-[0.65rem] font-bold text-[#ffb174]">{index + 1}</span>
                        <span className="min-w-0 flex-1 truncate text-xs font-semibold text-white/75">{COLOR_NAME[card.color]} {card.value}</span>
                      </li>
                    );
                  })}
                </ol>
              </div>
              <Button
                fullWidth
                disabled={matchingCardIds.length < 2 || !matchingCardIds[0] || !legalCardIds.includes(matchingCardIds[0])}
                onClick={() => {
                  if (pendingMatchCard) finishPlay(pendingMatchCard, undefined, matchingCardIds);
                  setPendingMatchCard(null);
                }}
              >
                Lempar {matchingCardIds.length} kartu angka {pendingMatchCard.value}
              </Button>
            </>
          )}
        </div>
      </Modal>

      <WinModal
        open={game.status === "finished"}
        winner={winner}
        players={players}
        handCounts={game.handCounts}
        winOrder={game.winOrder}
        isHost={isHost}
        isWinnerSelf={winner?.id === selfId}
        reducedMotion={reducedMotion}
        onRematch={() => dispatch({ kind: "game:rematch", playerId: selfId })}
        onLeave={() => {
          dispatch({ kind: "room:leave", playerId: selfId });
          router.push("/");
        }}
      />

      {flyingCard && typeof document !== "undefined" && createPortal(
        <motion.div
          key={flyingCard.seq}
          className="pointer-events-none fixed left-0 top-0 z-[120]"
          initial={{ x: flyingCard.fromX, y: flyingCard.fromY, scale: 0.65, rotate: -18, opacity: 0 }}
          animate={{ x: flyingCard.toX, y: flyingCard.toY, scale: 1, rotate: 0, opacity: [0, 1, 1, 0.9] }}
          transition={{ duration: 0.72, ease: [0.2, 0.75, 0.25, 1], times: [0, 0.15, 0.82, 1] }}
        >
          <PlayingCard card={flyingCard.card} className="w-16 drop-shadow-[0_12px_24px_rgba(0,0,0,0.55)]" />
        </motion.div>,
        document.body,
      )}
    </div>
  );
}
