// =========================================================================
// UNO GAME — Game Engine (pure functions, framework agnostic)
//
// Dipisahkan dari transport (room-channel.ts) supaya logic permainan bisa
// diuji dan dinalar secara independen, sesuai rekomendasi arsitektur PRD.
// Engine ini dijalankan oleh tab "Host" yang berperan sebagai otoritas
// (pengganti server) karena produk ini tidak memakai backend/database.
// =========================================================================
import type { Card, CardColor, CardValue, HouseRules, LastActionInfo, Player } from "./types";
import { randomId } from "./utils";

export const COLORS: CardColor[] = ["red", "blue", "green", "yellow"];

export type EngineState = {
  deck: Card[];
  discardPile: Card[];
  hands: Record<string, Card[]>;
  playerOrder: string[];
  currentIndex: number;
  direction: 1 | -1;
  activeColor: CardColor;
  pendingDraw: number;
  pendingDrawType: "draw2" | "wild4" | null;
  drawnCardId: string | null;
  status: "starting" | "playing" | "finished";
  winnerId: string | null;
  winOrder: string[];
  turnStartedAt: number;
  turnDurationMs: number;
  seq: number;
  lastAction: LastActionInfo | null;
  recentPlays: LastActionInfo[];
  version: number;
};

function makeCard(color: CardColor, value: CardValue): Card {
  return { id: randomId("card"), color, value };
}

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const color of COLORS) {
    deck.push(makeCard(color, "0"));
    for (let n = 1; n <= 9; n++) {
      deck.push(makeCard(color, String(n) as CardValue));
      deck.push(makeCard(color, String(n) as CardValue));
    }
    for (let i = 0; i < 2; i++) {
      deck.push(makeCard(color, "skip"));
      deck.push(makeCard(color, "reverse"));
      deck.push(makeCard(color, "draw2"));
    }
  }
  for (let i = 0; i < 4; i++) {
    deck.push(makeCard("wild", "wild"));
    deck.push(makeCard("wild", "wild4"));
  }
  return deck;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function isActionCard(card: Card): boolean {
  return ["skip", "reverse", "draw2", "wild", "wild4"].includes(card.value);
}

export function cardLabel(card: Card): string {
  const names: Record<string, string> = {
    skip: "Skip", reverse: "Reverse", draw2: "+2", wild: "Wild", wild4: "+4 Wild",
  };
  return names[card.value] ?? card.value;
}

function drawFromDeck(state: EngineState, count: number): Card[] {
  const drawn: Card[] = [];
  for (let i = 0; i < count; i++) {
    if (state.deck.length === 0) {
      // Reshuffle discard pile (except top card) back into deck.
      const top = state.discardPile[state.discardPile.length - 1];
      const rest = state.discardPile.slice(0, -1);
      if (rest.length === 0) break;
      state.deck = shuffle(rest.map((c) => ({ ...c, color: c.value === "wild" || c.value === "wild4" ? "wild" : c.color })));
      state.discardPile = top ? [top] : [];
    }
    const card = state.deck.pop();
    if (card) drawn.push(card);
  }
  return drawn;
}

export function initEngine(players: Player[], turnDurationSeconds: number): EngineState {
  let deck = shuffle(createDeck());
  const hands: Record<string, Card[]> = {};
  for (const p of players) {
    hands[p.id] = deck.slice(0, 7);
    deck = deck.slice(7);
  }
  // First card on discard pile must not be an action/wild card for a clean start.
  let firstIndex = deck.findIndex((c) => !isActionCard(c));
  if (firstIndex === -1) firstIndex = 0;
  const [firstCard] = deck.splice(firstIndex, 1);
  const discardPile = [firstCard];

  const state: EngineState = {
    deck,
    discardPile,
    hands,
    playerOrder: players.map((p) => p.id),
    currentIndex: 0,
    direction: 1,
    activeColor: firstCard.color === "wild" ? "red" : firstCard.color,
    pendingDraw: 0,
    pendingDrawType: null,
    drawnCardId: null,
    status: "playing",
    winnerId: null,
    winOrder: [],
    turnStartedAt: Date.now(),
    turnDurationMs: turnDurationSeconds * 1000,
    seq: 0,
    lastAction: null,
    recentPlays: [],
    version: 1,
  };
  return state;
}

export function topCard(state: EngineState): Card | null {
  return state.discardPile[state.discardPile.length - 1] ?? null;
}

export function currentPlayerId(state: EngineState): string | null {
  return state.playerOrder[state.currentIndex] ?? null;
}

export function isCardPlayable(card: Card, state: EngineState, houseRules: HouseRules): boolean {
  const top = topCard(state);
  if (!top) return true;
  if (state.pendingDraw > 0 && state.pendingDrawType) {
    // Must respond to a pending stack with a matching penalty card if stacking enabled.
    const canStackPenalty = houseRules.crossStacking && (card.value === "draw2" || card.value === "wild4");
    return canStackPenalty;
  }
  if (card.color === "wild") return true;
  if (card.color === state.activeColor) return true;
  if (card.value === top.value) return true;
  return false;
}

export function legalCardIds(hand: Card[], state: EngineState, houseRules: HouseRules): string[] {
  if (state.drawnCardId) {
    return hand.some((card) => card.id === state.drawnCardId && isCardPlayable(card, state, houseRules))
      ? [state.drawnCardId]
      : [];
  }
  return hand.filter((c) => isCardPlayable(c, state, houseRules)).map((c) => c.id);
}

function advance(state: EngineState, steps = 1) {
  const n = state.playerOrder.length;
  if (n === 0) return;
  for (let step = 0; step < steps; step++) {
    let attempts = 0;
    do {
      state.currentIndex = (((state.currentIndex + state.direction) % n) + n) % n;
      attempts += 1;
    } while ((state.hands[state.playerOrder[state.currentIndex]]?.length ?? 0) === 0 && attempts < n);
  }
}

function nextAlivePlayer(state: EngineState) {
  advance(state, 1);
}

export type PlayResult =
  | { ok: true; state: EngineState; events: LastActionInfo[] }
  | { ok: false; reason: string };

function pushEvent(state: EngineState, event: Omit<LastActionInfo, "seq" | "at">): LastActionInfo {
  state.seq += 1;
  const full: LastActionInfo = { ...event, seq: state.seq, at: Date.now() };
  state.lastAction = full;
  if (full.type === "play") {
    // Keep a short public event history so clients don't miss a throw when
    // a draw2/wild4 event immediately replaces lastAction in the same turn.
    state.recentPlays = [...(state.recentPlays ?? []), full].slice(-24);
  }
  return full;
}

function finishIfWinner(state: EngineState, playerId: string, events: LastActionInfo[]) {
  if (state.hands[playerId].length === 0) {
    if (!state.winOrder.includes(playerId)) state.winOrder.push(playerId);
    const remainingPlayers = state.playerOrder.filter((id) => (state.hands[id]?.length ?? 0) > 0);
    if (remainingPlayers.length <= 1) {
      state.status = "finished";
      state.winnerId = state.winOrder[0] ?? playerId;
      events.push(pushEvent(state, { type: "win", actorId: state.winnerId, message: "win" }));
    }
  }
}

export function playCard(
  prev: EngineState,
  playerId: string,
  cardId: string,
  houseRules: HouseRules,
  chosenColor?: CardColor,
  sevenSwapTargetId?: string,
  matchingCardIds?: string[],
): PlayResult {
  if (prev.status !== "playing") return { ok: false, reason: "Permainan tidak sedang berlangsung." };
  if (currentPlayerId(prev) !== playerId) return { ok: false, reason: "Bukan giliran kamu." };
  const hand = prev.hands[playerId];
  if (!hand) return { ok: false, reason: "Pemain tidak ditemukan." };
  const card = hand.find((c) => c.id === cardId);
  if (!card) return { ok: false, reason: "Kartu tidak ada di tanganmu." };

  const cardsToPlay = matchingCardIds?.length ? Array.from(new Set(matchingCardIds)) : [cardId];
  if (!cardsToPlay.includes(cardId)) cardsToPlay.unshift(cardId);
  const selectedCards = cardsToPlay.map((id) => hand.find((candidate) => candidate.id === id)).filter((selected): selected is Card => Boolean(selected));
  if (selectedCards.length !== cardsToPlay.length) return { ok: false, reason: "Kartu yang dipilih tidak ada di tanganmu." };
  if (cardsToPlay.length > 1) {
    if (!( /^[0-9]$/.test(card.value) || card.value === "skip") || selectedCards.some((selected) => selected.value !== card.value)) {
      return { ok: false, reason: "Pilih kartu dengan angka atau simbol Stop yang sama." };
    }
    if (!isCardPlayable(selectedCards[0], prev, houseRules)) {
      return { ok: false, reason: "Kartu pertama di tumpukan harus cocok dengan kartu di meja." };
    }
  } else if (!isCardPlayable(card, prev, houseRules)) {
    return { ok: false, reason: "Kartu tidak valid untuk dimainkan." };
  }
  if (card.color === "wild" && !chosenColor) return { ok: false, reason: "Pilih warna terlebih dahulu." };

  const state: EngineState = structuredCloneState(prev);
  const events: LastActionInfo[] = [];
  const myHand = state.hands[playerId];
  const cardIdsToPlay = new Set(cardsToPlay);
  if (prev.drawnCardId && !cardIdsToPlay.has(prev.drawnCardId)) {
    return { ok: false, reason: "Kamu hanya bisa memainkan kartu yang baru diambil." };
  }
  // Preserve selection order: the last selected card is pushed last and becomes the pile's top card.
  const playedCards = cardsToPlay.map((id) => myHand.find((c) => c.id === id)).filter((c): c is Card => Boolean(c));
  state.hands[playerId] = myHand.filter((c) => !cardIdsToPlay.has(c.id));
  state.drawnCardId = null;
  state.discardPile.push(...playedCards);
  state.version += 1;

  const finalCard = playedCards[playedCards.length - 1] ?? card;
  state.activeColor = finalCard.color === "wild" ? chosenColor as CardColor : finalCard.color;

  for (const playedCard of playedCards) events.push(pushEvent(state, { type: "play", actorId: playerId, card: playedCard }));
  if (state.hands[playerId].length === 1) {
    events.push(pushEvent(state, { type: "uno", actorId: playerId }));
  }

  // Empty-handed players leave the turn order, while the round continues until
  // only one player still has cards. First out remains the round winner.
  if (state.hands[playerId].length === 0) {
    finishIfWinner(state, playerId, events);
    if (state.status === "finished") return { ok: true, state, events };
  }

  switch (card.value) {
    case "skip": {
      for (let i = 0; i < playedCards.length; i += 1) {
        nextAlivePlayer(state);
        const skipped = currentPlayerId(state);
        events.push(pushEvent(state, { type: "skip", actorId: playerId, targetId: skipped ?? undefined }));
        nextAlivePlayer(state);
      }
      break;
    }
    case "reverse": {
      state.direction = state.direction === 1 ? -1 : 1;
      events.push(pushEvent(state, { type: "reverse", actorId: playerId }));
      if (state.playerOrder.filter((id) => (state.hands[id]?.length ?? 0) > 0).length === 2) {
        // Acts like skip in 2-player games.
        nextAlivePlayer(state);
      }
      nextAlivePlayer(state);
      break;
    }
    case "draw2": {
      if (houseRules.crossStacking) {
        state.pendingDraw += 2;
        state.pendingDrawType = "draw2";
        nextAlivePlayer(state);
      } else {
        nextAlivePlayer(state);
        const victim = currentPlayerId(state);
        if (victim) {
          const drawn = drawFromDeck(state, 2);
          state.hands[victim] = [...state.hands[victim], ...drawn];
          events.push(pushEvent(state, { type: "draw2", actorId: playerId, targetId: victim, count: 2 }));
        }
        nextAlivePlayer(state);
      }
      break;
    }
    case "wild4": {
      if (houseRules.crossStacking) {
        state.pendingDraw += 4;
        state.pendingDrawType = "wild4";
        nextAlivePlayer(state);
      } else {
        nextAlivePlayer(state);
        const victim = currentPlayerId(state);
        if (victim) {
          const drawn = drawFromDeck(state, 4);
          state.hands[victim] = [...state.hands[victim], ...drawn];
          events.push(pushEvent(state, { type: "wild4", actorId: playerId, targetId: victim, count: 4 }));
        }
        nextAlivePlayer(state);
      }
      break;
    }
    case "wild": {
      events.push(pushEvent(state, { type: "wild", actorId: playerId }));
      nextAlivePlayer(state);
      break;
    }
    default: {
      // Number cards + house rules (seven-swap / zero-rotation)
      nextAlivePlayer(state);
    }
  }

  state.turnStartedAt = Date.now();
  return { ok: true, state, events };
}

export function drawCard(prev: EngineState, playerId: string, houseRules: HouseRules): PlayResult {
  if (prev.status !== "playing") return { ok: false, reason: "Permainan tidak sedang berlangsung." };
  if (currentPlayerId(prev) !== playerId) return { ok: false, reason: "Bukan giliran kamu." };
  const state = structuredCloneState(prev);
  const events: LastActionInfo[] = [];

  if (state.pendingDraw > 0) {
    // Forced penalty draw (+2 / +4 not stacked further) ends the turn immediately.
    const count = state.pendingDraw;
    const drawn = drawFromDeck(state, count);
    state.drawnCardId = null;
    state.hands[playerId] = [...state.hands[playerId], ...drawn];
    state.pendingDraw = 0;
    state.pendingDrawType = null;
    events.push(pushEvent(state, { type: "draw", actorId: playerId, count }));
    nextAlivePlayer(state);
    state.turnStartedAt = Date.now();
    state.version += 1;
    return { ok: true, state, events };
  }
  if (state.drawnCardId) return { ok: false, reason: "Mainkan atau lewati kartu yang baru diambil terlebih dahulu." };

  // Voluntary draw: card(s) are added to hand but the turn stays with this
  // player so they get a chance to play a newly-drawn playable card, or
  // explicitly pass via `passTurn`.
  if (houseRules.drawUntilPlayable) {
    state.drawnCardId = null;
    let drawnCount = 0;
    let playableDrawnCardId: string | null = null;
    const maxDraw = 40;
    while (drawnCount < maxDraw) {
      const [card] = drawFromDeck(state, 1);
      if (!card) break;
      state.hands[playerId] = [...state.hands[playerId], card];
      drawnCount += 1;
      if (isCardPlayable(card, state, houseRules)) {
        playableDrawnCardId = card.id;
        break;
      }
    }
    state.drawnCardId = playableDrawnCardId;
    events.push(pushEvent(state, { type: "draw", actorId: playerId, count: drawnCount }));
  } else {
    const drawn = drawFromDeck(state, 1);
    state.hands[playerId] = [...state.hands[playerId], ...drawn];
    events.push(pushEvent(state, { type: "draw", actorId: playerId, count: drawn.length }));
    const drawnCard = drawn[0];
    if (drawnCard && isCardPlayable(drawnCard, state, houseRules)) {
      state.drawnCardId = drawnCard.id;
    } else {
      nextAlivePlayer(state);
      state.turnStartedAt = Date.now();
    }
  }

  state.version += 1;
  return { ok: true, state, events };
}

export function passTurn(prev: EngineState, playerId: string): PlayResult {
  if (prev.status !== "playing") return { ok: false, reason: "Permainan tidak sedang berlangsung." };
  if (currentPlayerId(prev) !== playerId) return { ok: false, reason: "Bukan giliran kamu." };
  const state = structuredCloneState(prev);
  state.drawnCardId = null;
  const events: LastActionInfo[] = [pushEvent(state, { type: "system", actorId: playerId, message: "pass" })];
  nextAlivePlayer(state);
  state.turnStartedAt = Date.now();
  state.version += 1;
  return { ok: true, state, events };
}

export function jumpIn(
  prev: EngineState,
  playerId: string,
  cardId: string,
  houseRules: HouseRules,
  chosenColor?: CardColor,
): PlayResult {
  if (!houseRules.jumpIn) return { ok: false, reason: "Jump-in tidak aktif di room ini." };
  if (prev.status !== "playing") return { ok: false, reason: "Permainan tidak sedang berlangsung." };
  const hand = prev.hands[playerId];
  if (!hand) return { ok: false, reason: "Pemain tidak ditemukan." };
  const card = hand.find((c) => c.id === cardId);
  const top = topCard(prev);
  if (!card || !top) return { ok: false, reason: "Kartu tidak valid." };
  if (card.color !== top.color || card.value !== top.value) {
    return { ok: false, reason: "Kartu harus identik (warna & nilai) dengan kartu teratas." };
  }
  const state: EngineState = structuredCloneState(prev);
  state.drawnCardId = null;
  const myHand = state.hands[playerId];
  state.hands[playerId] = myHand.filter((c) => c.id !== cardId);
  state.discardPile.push(card);
  state.activeColor = card.color === "wild" ? (chosenColor ?? state.activeColor) : card.color;
  const jumperIndex = state.playerOrder.indexOf(playerId);
  state.currentIndex = jumperIndex;
  state.version += 1;
  const events = [pushEvent(state, { type: "jump-in", actorId: playerId, card })];
  if (state.hands[playerId].length === 0) {
    finishIfWinner(state, playerId, events);
    if (state.status === "finished") return { ok: true, state, events };
    nextAlivePlayer(state);
    state.turnStartedAt = Date.now();
    return { ok: true, state, events };
  }
  if (state.hands[playerId].length === 1) {
    events.push(pushEvent(state, { type: "uno", actorId: playerId }));
  }
  nextAlivePlayer(state);
  state.turnStartedAt = Date.now();
  return { ok: true, state, events };
}

// Called when a player's turn timer expires: the match should never stall
// forever, so we force a draw (if there's a pending penalty it already ends
// the turn) and then explicitly pass to move on to the next player.
export function autoResolveTimeout(state: EngineState, houseRules: HouseRules): PlayResult {
  const pid = currentPlayerId(state);
  if (!pid) return { ok: false, reason: "Tidak ada giliran aktif." };
  if (state.drawnCardId) return passTurn(state, pid);
  const hadPendingDraw = state.pendingDraw > 0;
  const drawResult = drawCard(state, pid, houseRules);
  if (!drawResult.ok) return drawResult;
  if (hadPendingDraw || currentPlayerId(drawResult.state) !== pid) return drawResult; // draw already advanced the turn.
  return passTurn(drawResult.state, pid);
}

function structuredCloneState(state: EngineState): EngineState {
  return {
    ...state,
    deck: state.deck.slice(),
    discardPile: state.discardPile.slice(),
    hands: Object.fromEntries(Object.entries(state.hands).map(([k, v]) => [k, v.slice()])),
    playerOrder: state.playerOrder.slice(),
    winOrder: state.winOrder.slice(),
  };
}

export function buildPublicState(
  state: EngineState,
  forPlayerId: string,
): {
  status: EngineState["status"];
  playerOrder: string[];
  currentPlayerId: string | null;
  direction: 1 | -1;
  activeColor: CardColor;
  topCard: Card | null;
  deckCount: number;
  handCounts: Record<string, number>;
  unoFlags: Record<string, boolean>;
  pendingDraw: number;
  drawnCardId: string | null;
  turnDeadline: number | null;
  winnerId: string | null;
  winOrder: string[];
  myHand: Card[];
  lastAction: LastActionInfo | null;
  recentPlays: LastActionInfo[];
  version: number;
} {
  const handCounts: Record<string, number> = {};
  const unoFlags: Record<string, boolean> = {};
  for (const id of state.playerOrder) {
    handCounts[id] = state.hands[id]?.length ?? 0;
    unoFlags[id] = handCounts[id] === 1;
  }
  return {
    status: state.status,
    playerOrder: state.playerOrder,
    currentPlayerId: currentPlayerId(state),
    direction: state.direction,
    activeColor: state.activeColor,
    topCard: topCard(state),
    deckCount: state.deck.length,
    handCounts,
    unoFlags,
    pendingDraw: state.pendingDraw,
    drawnCardId: state.drawnCardId ?? null,
    turnDeadline: state.status === "playing" ? state.turnStartedAt + state.turnDurationMs : null,
    winnerId: state.winnerId,
    winOrder: state.winOrder,
    myHand: state.hands[forPlayerId] ? state.hands[forPlayerId].slice() : [],
    lastAction: state.lastAction,
    recentPlays: state.recentPlays ?? [],
    version: state.version,
  };
}
