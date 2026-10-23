"use client";

// =========================================================================
// UNO GAME — Room Channel
//
// Karena produk ini TIDAK memakai backend/database, "server authority" PRD
// disimulasikan secara lokal di browser:
//  - Semua state room (pemain, pengaturan, chat, state game & kartu)
//    disimpan di localStorage sehingga tahan refresh dan bisa dibaca oleh
//    tab lain pada browser yang sama (mis. untuk simulasi multi-pemain).
//  - BroadcastChannel dipakai sebagai "jaringan real-time" antar tab untuk
//    menyiarkan state terbaru & menerima aksi, menggantikan Socket.IO.
//  - Tab yang berperan sebagai HOST menjalankan game engine (otoritatif):
//    memvalidasi aksi, menjalankan bot, menjalankan timer giliran.
//  - Identitas host tetap melekat pada pembuat room; heartbeat yang terlambat
//    tidak memindahkan host secara otomatis.
// =========================================================================
import type {
  ChatMessage,
  ClientAction,
  ConnectionStatus,
  GamePublicState,
  HouseRules,
  Player,
  RoomRecord,
  RoomSettings,
  RoomStatus,
} from "./types";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getRealtimeClient } from "./realtime-client";
import {
  autoResolveTimeout,
  buildPublicState,
  drawCard,
  initEngine,
  jumpIn,
  legalCardIds,
  passTurn,
  playCard,
  type EngineState,
} from "./uno-engine";
import { generateRoomCode, randomId } from "./utils";

export const DEFAULT_HOUSE_RULES: HouseRules = {
  stackingDrawTwo: true,
  stackingDrawFour: true,
  crossStacking: true,
  jumpIn: true,
  sevenSwap: false,
  zeroRotation: false,
  drawUntilPlayable: false,
};

export const DEFAULT_SETTINGS: RoomSettings = {
  minPlayers: 2,
  maxPlayers: 4,
  turnDurationSeconds: 30,
  chatEnabled: true,
  houseRules: DEFAULT_HOUSE_RULES,
};

type PersistedState = {
  room: RoomRecord;
  players: Player[];
  chat: ChatMessage[];
  engine: EngineState | null;
  winsByPlayerId?: Record<string, number>;
  scoresResetAt?: number;
  updatedAt: number;
};

type WireMessage =
  | { type: "action"; action: ClientAction; nonce: string }
  | { type: "state"; payload: PersistedState }
  | { type: "presence"; playerId: string; nickname: string; ts: number }
  | { type: "request-sync"; playerId: string }
  | { type: "join"; playerId: string; nickname: string }
  | { type: "join-error"; playerId: string; reason: string }
  | { type: "typing"; playerId: string; typing: boolean };

export type RoomSnapshot = {
  room: RoomRecord | null;
  players: Player[];
  chat: ChatMessage[];
  game: GamePublicState | null;
  legalCardIds: string[];
  isHost: boolean;
  selfId: string;
  error: string | null;
  reconnectAvailable: boolean;
  reconnecting: boolean;
  notices: string[];
  typingPlayers: string[];
};

const STORAGE_PREFIX = "uno-tongkrongan:room:";
const ROOMS_INDEX_KEY = "uno-tongkrongan:rooms-index";
const PRESENCE_TIMEOUT_MS = 9000;
const BOT_THINK_MS = 950;
const ROOM_SYNC_TIMEOUT_MS = 8000;

function storageKey(code: string) {
  return `${STORAGE_PREFIX}${code.toUpperCase()}`;
}

function loadIndex(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ROOMS_INDEX_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function saveIndex(codes: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ROOMS_INDEX_KEY, JSON.stringify(Array.from(new Set(codes))));
  } catch {
    /* ignore */
  }
}

function readPersisted(code: string): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(code));
    if (!raw) return null;
    const persisted = JSON.parse(raw) as PersistedState;
    persisted.winsByPlayerId ??= {};
    for (const player of persisted.players) {
      const historyWins = persisted.chat.filter(
        (message) => message.type === "system" && message.content === `${player.nickname} memenangkan pertandingan!` && (!persisted.scoresResetAt || message.createdAt > persisted.scoresResetAt),
      ).length;
      const wins = Math.max(persisted.winsByPlayerId[player.id] ?? 0, player.wins ?? 0, historyWins);
      persisted.winsByPlayerId[player.id] = wins;
      player.wins = wins;
    }
    return persisted;
  } catch {
    return null;
  }
}

function writePersisted(code: string, state: PersistedState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(code), JSON.stringify(state));
    const idx = loadIndex();
    if (!idx.includes(code.toUpperCase())) saveIndex([...idx, code.toUpperCase()]);
  } catch {
    /* ignore quota errors */
  }
}

export function roomCodeExists(code: string): boolean {
  return readPersisted(code) !== null;
}

function systemMessage(roomId: string, content: string): ChatMessage {
  return {
    id: randomId("msg"),
    roomId,
    senderId: null,
    senderName: "Sistem",
    content,
    type: "system",
    createdAt: Date.now(),
  };
}

export class RoomChannel {
  readonly code: string;
  readonly selfId: string;
  private bc: BroadcastChannel | null = null;
  private realtime: RealtimeChannel | null = null;
  private realtimeReady = false;
  private pendingNickname: string | null = null;
  private pendingJoinSent = false;
  private requestTimer: ReturnType<typeof setTimeout> | null = null;
  private transportError: string | null = null;
  private reconnectAvailable = false;
  private reconnecting = false;
  private listeners = new Set<(snap: RoomSnapshot) => void>();
  private presenceMap = new Map<string, number>();
  private presenceTimer: ReturnType<typeof setInterval> | null = null;
  private watchdogTimer: ReturnType<typeof setInterval> | null = null;
  private botTimer: ReturnType<typeof setTimeout> | null = null;
  private turnWatchTimer: ReturnType<typeof setInterval> | null = null;
  private destroyed = false;
  private processedNonces = new Set<string>();
  private noticeQueue: string[] = [];
  private typingPlayers = new Set<string>();
  private typingTimers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(code: string, selfId: string) {
    this.code = code.toUpperCase();
    this.selfId = selfId;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      this.bc = new BroadcastChannel(`uno-tongkrongan:${this.code}`);
      this.bc.onmessage = (ev: MessageEvent<WireMessage>) => this.handleMessage(ev.data);
    }
    this.connectRealtime();
    this.presenceTimer = setInterval(() => this.announcePresence(), 3500);
    this.watchdogTimer = setInterval(() => this.checkWatchdog(), 2500);
    this.turnWatchTimer = setInterval(() => this.checkTurnTimeout(), 1000);
    window.addEventListener("storage", this.handleStorage);
    window.addEventListener("offline", this.handleOffline);
    window.addEventListener("online", this.handleOnline);
    this.announcePresence();
  }

  private connectRealtime() {
    const supabase = getRealtimeClient();
    if (!supabase) {
      this.realtimeReady = false;
      this.reconnecting = false;
      this.reconnectAvailable = true;
      this.transportError = "Room online belum dikonfigurasi. Periksa koneksi dan konfigurasi Supabase.";
      this.emit();
      return;
    }
    this.realtime = supabase
      .channel(`uno-tongkrongan:${this.code}`, { config: { broadcast: { self: false } } })
      .on("broadcast", { event: "room-message" }, ({ payload }) => this.handleMessage(payload as WireMessage))
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          this.realtimeReady = true;
          this.reconnecting = false;
          this.reconnectAvailable = false;
          this.transportError = null;
          const persisted = readPersisted(this.code);
          if (persisted?.room.hostPlayerId === this.selfId) {
            this.sendMessage({ type: "state", payload: persisted });
          } else if (persisted && this.pendingNickname) {
            this.pendingJoinSent = true;
            this.sendMessage({ type: "join", playerId: this.selfId, nickname: this.pendingNickname });
          } else {
            this.requestRoomSync();
          }
          this.emit();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          this.realtimeReady = false;
          this.reconnecting = false;
          this.reconnectAvailable = true;
          this.transportError = "Koneksi ke room terputus. Periksa internet lalu coba sambungkan ulang.";
          this.emit();
        }
      });
  }

  reconnect() {
    if (this.destroyed) return;
    this.transportError = "Mencoba menyambungkan kembali ke room...";
    this.reconnecting = true;
    this.reconnectAvailable = true;
    this.realtimeReady = false;
    this.emit();
    const previous = this.realtime;
    this.realtime = null;
    const supabase = getRealtimeClient();
    if (previous && supabase) {
      void supabase.removeChannel(previous).finally(() => {
        if (!this.destroyed) this.connectRealtime();
      });
    } else {
      this.connectRealtime();
    }
  }

  private handleOffline = () => {
    this.realtimeReady = false;
    this.reconnecting = false;
    this.reconnectAvailable = true;
    this.transportError = "Internet terputus. Menunggu koneksi kembali.";
    this.emit();
  };

  private handleOnline = () => {
    if (this.reconnectAvailable) this.reconnect();
  };

  private handleStorage = (ev: StorageEvent) => {
    if (ev.key === storageKey(this.code)) this.emit();
  };

  // ---------------------------------------------------------------------
  // Room creation / joining
  // ---------------------------------------------------------------------

  static createRoom(nickname: string, name: string, settings: RoomSettings, selfId: string): string {
    let code = generateRoomCode();
    const idx = loadIndex();
    while (idx.includes(code)) code = generateRoomCode();

    const host: Player = {
      id: selfId,
      nickname,
      isHost: true,
      isReady: true,
      isBot: false,
      connectionStatus: "connected",
      joinedAt: Date.now(),
      lastSeen: Date.now(),
    };
    const room: RoomRecord = {
      id: randomId("room"),
      code,
      name: name.trim() || `Tongkrongan ${code.replace("UNO-", "")}`,
      hostPlayerId: selfId,
      status: "waiting",
      settings,
      createdAt: Date.now(),
    };
    const persisted: PersistedState = {
      room,
      players: [host],
      chat: [systemMessage(room.id, `${nickname} membuat room ini.`)],
      engine: null,
      winsByPlayerId: { [selfId]: 0 },
      updatedAt: Date.now(),
    };
    writePersisted(code, persisted);
    return code;
  }

  join(nickname: string): { ok: true; pending?: boolean } | { ok: false; reason: string } {
    const persisted = readPersisted(this.code);
    if (!persisted) {
      this.pendingNickname = nickname;
      this.requestRoomSync();
      return { ok: true, pending: true };
    }
    if (persisted.room.hostPlayerId !== this.selfId) {
      this.pendingNickname = nickname;
      this.pendingJoinSent = this.realtimeReady || this.bc !== null;
      this.sendMessage({ type: "join", playerId: this.selfId, nickname });
      if (this.requestTimer) clearTimeout(this.requestTimer);
      this.requestTimer = setTimeout(() => {
        if (!readPersisted(this.code)?.players.some((player) => player.id === this.selfId)) {
          this.transportError = "Host tidak merespons. Pastikan host masih berada di room.";
          this.emit();
        }
      }, ROOM_SYNC_TIMEOUT_MS);
      return { ok: true, pending: true };
    }
    const { room, players } = persisted;
    const existing = players.find((p) => p.id === this.selfId);
    if (existing) {
      existing.connectionStatus = "connected";
      existing.lastSeen = Date.now();
      this.persistAndBroadcast(persisted, null);
      return { ok: true };
    }
    if (room.status !== "waiting" && room.status !== "ready") {
      if (room.status === "closed") return { ok: false, reason: "Room sudah ditutup oleh host." };
      return { ok: false, reason: "Permainan sudah dimulai. Kamu tidak bisa masuk ke room ini." };
    }
    const humanCount = players.filter((p) => !p.isBot).length + players.filter((p) => p.isBot).length;
    if (humanCount >= room.settings.maxPlayers) return { ok: false, reason: "Room sudah penuh." };

    const player: Player = {
      id: this.selfId,
      nickname,
      isHost: false,
      isReady: false,
      isBot: false,
      connectionStatus: "connected",
      joinedAt: Date.now(),
      lastSeen: Date.now(),
    };
    persisted.players.push(player);
    persisted.chat.push(systemMessage(room.id, `${nickname} bergabung ke room.`));
    this.persistAndBroadcast(persisted, null);
    return { ok: true };
  }

  getRoomStatus(): RoomStatus | null {
    return readPersisted(this.code)?.room.status ?? null;
  }

  // ---------------------------------------------------------------------
  // Pub/sub
  // ---------------------------------------------------------------------

  subscribe(fn: (snap: RoomSnapshot) => void): () => void {
    this.listeners.add(fn);
    fn(this.buildSnapshot());
    return () => this.listeners.delete(fn);
  }

  private emit() {
    if (this.destroyed) return;
    const snap = this.buildSnapshot();
    this.listeners.forEach((l) => l(snap));
  }

  private buildSnapshot(): RoomSnapshot {
    const persisted = readPersisted(this.code);
    const notices = this.noticeQueue;
    this.noticeQueue = [];
    if (!persisted) {
      return { room: null, players: [], chat: [], game: null, legalCardIds: [], isHost: false, selfId: this.selfId, error: this.transportError, reconnectAvailable: this.reconnectAvailable, reconnecting: this.reconnecting, notices, typingPlayers: [...this.typingPlayers] };
    }
    const isHost = persisted.room.hostPlayerId === this.selfId;
    let game: GamePublicState | null = null;
    let legal: string[] = [];
    if (persisted.engine) {
      const pub = buildPublicState(persisted.engine, this.selfId);
      game = { ...pub, turnDurationSeconds: persisted.room.settings.turnDurationSeconds };
      if (game.currentPlayerId === this.selfId) {
        legal = legalCardIds(persisted.engine.hands[this.selfId] ?? [], persisted.engine, persisted.room.settings.houseRules);
      }
    }
    return {
      room: persisted.room,
      players: persisted.players,
      chat: persisted.chat,
      game,
      legalCardIds: legal,
      isHost,
      selfId: this.selfId,
      error: this.transportError,
      reconnectAvailable: this.reconnectAvailable,
      reconnecting: this.reconnecting,
      notices,
      typingPlayers: [...this.typingPlayers],
    };
  }

  setTyping(typing: boolean) {
    this.sendMessage({ type: "typing", playerId: this.selfId, typing });
  }

  // ---------------------------------------------------------------------
  // Presence & host migration
  // ---------------------------------------------------------------------

  private announcePresence() {
    this.sendMessage({ type: "presence", playerId: this.selfId, nickname: "", ts: Date.now() });
    const persisted = readPersisted(this.code);
    if (persisted?.room.hostPlayerId === this.selfId) {
      const me = persisted.players.find((p) => p.id === this.selfId);
      if (me && me.connectionStatus !== "connected") {
        me.connectionStatus = "connected";
        this.persistAndBroadcast(persisted, null);
      }
    } else {
      const me = persisted?.players.find((p) => p.id === this.selfId);
      if (me) {
        me.lastSeen = Date.now();
        if (persisted) writePersisted(this.code, persisted);
      }
    }
  }

  private checkWatchdog() {
    const persisted = readPersisted(this.code);
    if (!persisted) return;
    const now = Date.now();
    let dirty = false;
    const isHostTab = persisted.room.hostPlayerId === this.selfId;

    // Only the host tab is allowed to persist connection-status changes —
    // every other tab is a read-only observer of the canonical state so we
    // never end up with two tabs racing to write localStorage.
    if (!isHostTab) return;

    // Update connection status of players based on their presence heartbeat.
    for (const p of persisted.players) {
      if (p.isBot) continue;
      const lastSeen = p.id === this.selfId ? now : (this.presenceMap.get(p.id) ?? p.lastSeen);
      const gap = now - lastSeen;
      let status: ConnectionStatus = "connected";
      if (gap > PRESENCE_TIMEOUT_MS * 2) status = "disconnected";
      else if (gap > PRESENCE_TIMEOUT_MS) status = "reconnecting";
      if (p.connectionStatus !== status) {
        p.connectionStatus = status;
        dirty = true;
      }
    }

    if (dirty) this.persistAndBroadcast(persisted, null);
  }

  private handleMessage(msg: WireMessage) {
    if (!msg) return;
    if (msg.type === "typing") {
      if (msg.playerId === this.selfId) return;
      const previousTimer = this.typingTimers.get(msg.playerId);
      if (previousTimer) clearTimeout(previousTimer);
      if (msg.typing) {
        this.typingPlayers.add(msg.playerId);
        this.typingTimers.set(msg.playerId, setTimeout(() => {
          this.typingPlayers.delete(msg.playerId);
          this.typingTimers.delete(msg.playerId);
          this.emit();
        }, 4500));
      } else {
        this.typingPlayers.delete(msg.playerId);
        this.typingTimers.delete(msg.playerId);
      }
      this.emit();
      return;
    }
    if (msg.type === "presence") {
      this.presenceMap.set(msg.playerId, msg.ts);
      return;
    }
    if (msg.type === "action") {
      const persisted = readPersisted(this.code);
      if (persisted?.room.hostPlayerId === this.selfId) {
        if (this.processedNonces.has(msg.nonce)) return;
        this.processedNonces.add(msg.nonce);
        this.applyAction(msg.action);
      }
      return;
    }
    if (msg.type === "request-sync") {
      const persisted = readPersisted(this.code);
      if (persisted?.room.hostPlayerId === this.selfId) this.sendMessage({ type: "state", payload: persisted });
      return;
    }
    if (msg.type === "join") {
      const persisted = readPersisted(this.code);
      if (persisted?.room.hostPlayerId !== this.selfId) return;
      const existing = persisted.players.find((player) => player.id === msg.playerId);
      if (existing) {
        existing.connectionStatus = "connected";
        existing.lastSeen = Date.now();
        this.persistAndBroadcast(persisted, null);
        return;
      }
      if (persisted.room.status !== "waiting" && persisted.room.status !== "ready") {
        this.sendMessage({ type: "join-error", playerId: msg.playerId, reason: "Permainan sudah dimulai. Kamu tidak bisa masuk ke room ini." });
        return;
      }
      if (persisted.players.length >= persisted.room.settings.maxPlayers) {
        this.sendMessage({ type: "join-error", playerId: msg.playerId, reason: "Room sudah penuh." });
        return;
      }
      persisted.players.push({
        id: msg.playerId,
        nickname: msg.nickname,
        isHost: false,
        isReady: false,
        isBot: false,
        connectionStatus: "connected",
        joinedAt: Date.now(),
        lastSeen: Date.now(),
      });
      persisted.chat.push(systemMessage(persisted.room.id, `${msg.nickname} bergabung ke room.`));
      this.persistAndBroadcast(persisted, null);
      return;
    }
    if (msg.type === "join-error") {
      if (msg.playerId !== this.selfId) return;
      this.transportError = msg.reason;
      this.reconnectAvailable = false;
      this.reconnecting = false;
      this.pendingNickname = null;
      this.pendingJoinSent = false;
      if (this.requestTimer) clearTimeout(this.requestTimer);
      this.emit();
      return;
    }
    if (msg.type === "state") {
      const previous = readPersisted(this.code);
      if (!previous || msg.payload.updatedAt >= previous.updatedAt) writePersisted(this.code, msg.payload);
      const persisted = readPersisted(this.code);
      if (persisted?.players.some((player) => player.id === this.selfId)) {
        this.pendingNickname = null;
        this.pendingJoinSent = false;
        this.transportError = null;
        this.reconnectAvailable = false;
        this.reconnecting = false;
        if (this.requestTimer) clearTimeout(this.requestTimer);
      } else if (persisted && this.pendingNickname && !this.pendingJoinSent) {
        this.pendingJoinSent = true;
        this.sendMessage({ type: "join", playerId: this.selfId, nickname: this.pendingNickname });
      }
      this.emit();
      return;
    }
  }

  private sendMessage(message: WireMessage) {
    this.bc?.postMessage(message satisfies WireMessage);
    if (this.realtimeReady) {
      void this.realtime?.send({ type: "broadcast", event: "room-message", payload: message });
    }
  }

  private requestRoomSync() {
    if (!this.realtimeReady) return;
    this.sendMessage({ type: "request-sync", playerId: this.selfId });
    if (this.requestTimer) clearTimeout(this.requestTimer);
    this.requestTimer = setTimeout(() => {
      if (!readPersisted(this.code)?.players.some((player) => player.id === this.selfId)) {
        this.transportError = "Room tidak ditemukan atau host sedang offline.";
        this.reconnectAvailable = true;
        this.emit();
      }
    }, ROOM_SYNC_TIMEOUT_MS);
  }

  private recordRoundWinner(persisted: PersistedState, previousWinnerId?: string, winnerId?: string) {
    if (previousWinnerId || !winnerId) return;
    const winner = persisted.players.find((player) => player.id === winnerId);
    if (!winner) return;
    persisted.winsByPlayerId ??= {};
    const wins = Math.max(winner.wins ?? 0, persisted.winsByPlayerId[winnerId] ?? 0) + 1;
    persisted.winsByPlayerId[winnerId] = wins;
    winner.wins = wins;
  }

  private persistAndBroadcast(state: PersistedState, _nonceIgnored: null) {
    state.updatedAt = Date.now();
    writePersisted(this.code, state);
    this.sendMessage({ type: "state", payload: state });
    this.emit();
  }

  // ---------------------------------------------------------------------
  // Dispatch (called by UI)
  // ---------------------------------------------------------------------

  dispatch(action: ClientAction) {
    const persisted = readPersisted(this.code);
    if (persisted?.room.hostPlayerId === this.selfId) {
      this.applyAction(action);
    } else {
      const nonce = randomId("nonce");
      this.processedNonces.add(nonce);
      this.sendMessage({ type: "action", action, nonce });
    }
  }

  private pushNotice(message: string) {
    this.noticeQueue.push(message);
  }

  private applyAction(action: ClientAction) {
    const persisted = readPersisted(this.code);
    if (!persisted) return;
    const { room, players } = persisted;

    switch (action.kind) {
      case "room:ready": {
        const p = players.find((pl) => pl.id === action.playerId);
        if (p) p.isReady = action.ready;
        break;
      }
      case "room:update-settings": {
        if (room.hostPlayerId !== action.playerId) return;
        if (room.status !== "waiting" && room.status !== "ready") return;
        room.settings = {
          ...room.settings,
          ...action.settings,
          houseRules: { ...room.settings.houseRules, ...(action.settings.houseRules ?? {}) },
        };
        break;
      }
      case "room:reset-scores": {
        if (room.hostPlayerId !== action.playerId) return;
        if (room.status !== "waiting" && room.status !== "ready") return;
        persisted.scoresResetAt = Date.now();
        persisted.winsByPlayerId = {};
        for (const player of players) {
          player.wins = 0;
          persisted.winsByPlayerId[player.id] = 0;
        }
        persisted.chat.push(systemMessage(room.id, "Host mereset skor room."));
        break;
      }
      case "room:add-bot": {
        if (room.hostPlayerId !== action.playerId) return;
        if (players.length >= room.settings.maxPlayers) return;
        const botNames = ["Bot Riko", "Bot Sinta", "Bot Jaka", "Bot Mira", "Bot Dedi", "Bot Lina", "Bot Agus", "Bot Wati"];
        const used = new Set(players.filter((p) => p.isBot).map((p) => p.nickname));
        const name = botNames.find((n) => !used.has(n)) ?? `Bot ${players.length}`;
        players.push({
          id: randomId("bot"),
          nickname: name,
          isHost: false,
          isReady: true,
          isBot: true,
          connectionStatus: "connected",
          joinedAt: Date.now(),
          lastSeen: Date.now(),
        });
        persisted.chat.push(systemMessage(room.id, `${name} ditambahkan ke room.`));
        break;
      }
      case "room:remove-player": {
        if (room.hostPlayerId !== action.playerId) return;
        const idx = players.findIndex((p) => p.id === action.targetId);
        if (idx >= 0) {
          const [removed] = players.splice(idx, 1);
          persisted.chat.push(systemMessage(room.id, `${removed.nickname} dikeluarkan dari room.`));
        }
        break;
      }
      case "room:leave": {
        const idx = players.findIndex((p) => p.id === action.playerId);
        if (idx === -1) break;
        const [leaving] = players.splice(idx, 1);
        persisted.chat.push(systemMessage(room.id, `${leaving.nickname} meninggalkan room.`));
        if (players.filter((p) => !p.isBot).length === 0) {
          room.status = "closed";
        } else if (leaving.isHost) {
          const next = players.filter((p) => !p.isBot).sort((a, b) => a.joinedAt - b.joinedAt)[0] ?? players[0];
          if (next) {
            next.isHost = true;
            room.hostPlayerId = next.id;
            persisted.chat.push(systemMessage(room.id, `${next.nickname} menjadi host baru.`));
          }
        }
        break;
      }
      case "game:start": {
        if (room.hostPlayerId !== action.playerId) return;
        if (room.status !== "waiting" && room.status !== "ready") return;
        const activePlayers = players.filter((p) => p.connectionStatus !== "disconnected");
        if (activePlayers.length < room.settings.minPlayers) {
          this.pushNotice(`Minimal ${room.settings.minPlayers} pemain untuk memulai.`);
          return;
        }
        const notReady = activePlayers.filter((p) => !p.isBot && !p.isReady);
        if (notReady.length > 0) {
          this.pushNotice("Semua pemain harus Ready sebelum memulai.");
          return;
        }
        room.status = "starting";
        this.persistAndBroadcast(persisted, null);
        const order = shuffleOrder(activePlayers.map((p) => p.id));
        persisted.engine = initEngine(
          activePlayers.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id)),
          room.settings.turnDurationSeconds,
        );
        room.status = "playing";
        persisted.chat.push(systemMessage(room.id, "Permainan dimulai! Semoga beruntung."));
        this.persistAndBroadcast(persisted, null);
        this.scheduleBotTurnIfNeeded(persisted);
        return;
      }
      case "game:play-card": {
        if (!persisted.engine) return;
        const result = playCard(persisted.engine, action.playerId, action.cardId, room.settings.houseRules, action.chosenColor, action.sevenSwapTargetId, action.matchingCardIds);
        if (!result.ok) {
          this.pushNotice(result.reason);
          return;
        }
        const previousWinnerId = persisted.engine.winOrder[0];
        persisted.engine = result.state;
        this.recordRoundWinner(persisted, previousWinnerId, persisted.engine.winOrder[0]);
        this.annotateEvents(persisted, players, result.events);
        if (persisted.engine.status === "finished") {
          room.status = "finished";
          const winner = players.find((p) => p.id === persisted.engine!.winnerId);
          persisted.chat.push(systemMessage(room.id, `${winner?.nickname ?? "Pemain"} memenangkan pertandingan!`));
        }
        break;
      }
      case "game:draw-card": {
        if (!persisted.engine) return;
        const result = drawCard(persisted.engine, action.playerId, room.settings.houseRules);
        if (!result.ok) {
          this.pushNotice(result.reason);
          return;
        }
        persisted.engine = result.state;
        break;
      }
      case "game:pass-turn": {
        if (!persisted.engine) return;
        const result = passTurn(persisted.engine, action.playerId);
        if (!result.ok) return;
        persisted.engine = result.state;
        break;
      }
      case "game:jump-in": {
        if (!persisted.engine) return;
        const result = jumpIn(persisted.engine, action.playerId, action.cardId, room.settings.houseRules, action.chosenColor);
        if (!result.ok) {
          this.pushNotice(result.reason);
          return;
        }
        const previousWinnerId = persisted.engine.winOrder[0];
        persisted.engine = result.state;
        this.recordRoundWinner(persisted, previousWinnerId, persisted.engine.winOrder[0]);
        this.annotateEvents(persisted, players, result.events);
        if (persisted.engine.status === "finished") {
          room.status = "finished";
          const winner = players.find((p) => p.id === persisted.engine!.winnerId);
          persisted.chat.push(systemMessage(room.id, `${winner?.nickname ?? "Pemain"} memenangkan pertandingan!`));
        }
        break;
      }
      case "game:rematch": {
        if (room.hostPlayerId !== action.playerId) return;
        room.status = "waiting";
        persisted.engine = null;
        for (const p of players) p.isReady = p.isBot ? true : p.id === room.hostPlayerId;
        persisted.chat.push(systemMessage(room.id, "Kembali ke lobby untuk pertandingan baru."));
        break;
      }
      case "chat:send": {
        if (!room.settings.chatEnabled) return;
        const p = players.find((pl) => pl.id === action.playerId);
        if (!p) return;
        const content = action.content.trim().slice(0, 300);
        if (!content) return;
        persisted.chat.push({
          id: randomId("msg"),
          roomId: room.id,
          senderId: p.id,
          senderName: p.nickname,
          content,
          type: "chat",
          createdAt: Date.now(),
        });
        if (persisted.chat.length > 200) persisted.chat = persisted.chat.slice(-200);
        break;
      }
    }

    this.persistAndBroadcast(persisted, null);
    this.scheduleBotTurnIfNeeded(persisted);
  }

  private annotateEvents(persisted: PersistedState, players: Player[], events: { type: string; actorId?: string }[]) {
    for (const event of events) {
      if (event.type !== "uno" || !event.actorId) continue;
      const player = players.find((candidate) => candidate.id === event.actorId);
      persisted.chat.push(systemMessage(persisted.room.id, `${player?.nickname ?? "Pemain"} UNO!`));
    }
  }

  private checkTurnTimeout() {
    const persisted = readPersisted(this.code);
    if (!persisted || persisted.room.hostPlayerId !== this.selfId) return;
    const engine = persisted.engine;
    if (!engine || engine.status !== "playing") return;
    const deadline = engine.turnStartedAt + engine.turnDurationMs;
    if (Date.now() < deadline) return;
    const result = autoResolveTimeout(engine, persisted.room.settings.houseRules);
    if (result.ok) {
      persisted.engine = result.state;
      this.persistAndBroadcast(persisted, null);
      this.scheduleBotTurnIfNeeded(persisted);
    }
  }

  private scheduleBotTurnIfNeeded(persisted: PersistedState) {
    if (this.botTimer) {
      clearTimeout(this.botTimer);
      this.botTimer = null;
    }
    if (persisted.room.hostPlayerId !== this.selfId) return;
    const engine = persisted.engine;
    if (!engine || engine.status !== "playing") return;
    const currentId = engine.playerOrder[engine.currentIndex];
    const bot = persisted.players.find((p) => p.id === currentId && p.isBot);
    if (!bot) return;
    this.botTimer = setTimeout(() => this.runBotTurn(bot.id), BOT_THINK_MS);
  }

  private runBotTurn(botId: string) {
    const persisted = readPersisted(this.code);
    if (!persisted || persisted.room.hostPlayerId !== this.selfId || !persisted.engine) return;
    let engine = persisted.engine;
    const previousWinnerId = engine.winOrder[0];
    if (engine.status !== "playing" || engine.playerOrder[engine.currentIndex] !== botId) return;
    const houseRules = persisted.room.settings.houseRules;

    const tryPlayLegalCard = (): boolean => {
      const hand = engine.hands[botId] ?? [];
      const legal = legalCardIds(hand, engine, houseRules);
      if (legal.length === 0) return false;
      const cardId = legal[Math.floor(Math.random() * legal.length)];
      const card = hand.find((c) => c.id === cardId)!;
      let chosenColor;
      if (card.color === "wild") {
        const counts: Record<string, number> = { red: 0, blue: 0, green: 0, yellow: 0 };
        for (const c of hand) if (c.color !== "wild") counts[c.color] += 1;
        chosenColor = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "red") as "red" | "blue" | "green" | "yellow";
      }
      const result = playCard(engine, botId, cardId, houseRules, chosenColor);
      if (!result.ok) return false;
      engine = result.state;
      this.annotateEvents(persisted, persisted.players, result.events);
      return true;
    };

    // Bots never stall forever: try to play, otherwise draw once, try again,
    // otherwise explicitly pass the turn.
    if (!tryPlayLegalCard()) {
      const hadPendingDraw = engine.pendingDraw > 0;
      const drawResult = drawCard(engine, botId, houseRules);
      if (drawResult.ok) {
        engine = drawResult.state;
        if (!hadPendingDraw && !tryPlayLegalCard()) {
          const passResult = passTurn(engine, botId);
          if (passResult.ok) engine = passResult.state;
        }
      }
    }

    persisted.engine = engine;
    this.recordRoundWinner(persisted, previousWinnerId, engine.winOrder[0]);
    if (engine.status === "finished") {
      persisted.room.status = "finished";
      const winner = persisted.players.find((p) => p.id === engine.winnerId);
      persisted.chat.push(systemMessage(persisted.room.id, `${winner?.nickname ?? "Pemain"} memenangkan pertandingan!`));
    }
    this.persistAndBroadcast(persisted, null);
    this.scheduleBotTurnIfNeeded(persisted);
  }

  destroy() {
    this.destroyed = true;
    if (this.presenceTimer) clearInterval(this.presenceTimer);
    if (this.watchdogTimer) clearInterval(this.watchdogTimer);
    if (this.turnWatchTimer) clearInterval(this.turnWatchTimer);
    if (this.botTimer) clearTimeout(this.botTimer);
    if (this.requestTimer) clearTimeout(this.requestTimer);
    this.typingTimers.forEach((timer) => clearTimeout(timer));
    this.typingTimers.clear();
    window.removeEventListener("storage", this.handleStorage);
    window.removeEventListener("offline", this.handleOffline);
    window.removeEventListener("online", this.handleOnline);
    this.bc?.close();
    if (this.realtime) void getRealtimeClient()?.removeChannel(this.realtime);
    this.listeners.clear();
  }
}

function shuffleOrder(ids: string[]): string[] {
  const a = ids.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const channelCache = new Map<string, RoomChannel>();

export function getRoomChannel(code: string, selfId: string): RoomChannel {
  const key = `${code.toUpperCase()}::${selfId}`;
  let channel = channelCache.get(key);
  if (!channel) {
    channel = new RoomChannel(code, selfId);
    channelCache.set(key, channel);
  }
  return channel;
}

export function releaseRoomChannel(code: string, selfId: string) {
  const key = `${code.toUpperCase()}::${selfId}`;
  const channel = channelCache.get(key);
  if (channel) {
    channel.destroy();
    channelCache.delete(key);
  }
}
