// =========================================================================
// UNO GAME — Shared Types
// Semua state disimpan di localStorage (tidak ada database / server nyata).
// "Server authority" disimulasikan oleh tab Host melalui modul room-channel.
// =========================================================================

export type CardColor = "red" | "blue" | "green" | "yellow" | "wild";

export type CardValue =
  | "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"
  | "skip" | "reverse" | "draw2" | "wild" | "wild4";

export type Card = {
  id: string;
  color: CardColor;
  value: CardValue;
};

export type RoomStatus =
  | "waiting"
  | "ready"
  | "starting"
  | "playing"
  | "finished"
  | "closed";

export type ConnectionStatus = "connected" | "reconnecting" | "disconnected";

export type HouseRules = {
  stackingDrawTwo: boolean;
  stackingDrawFour: boolean;
  crossStacking: boolean;
  jumpIn: boolean;
  sevenSwap: boolean;
  zeroRotation: boolean;
  drawUntilPlayable: boolean;
};

export type RoomSettings = {
  minPlayers: number;
  maxPlayers: number;
  turnDurationSeconds: 15 | 30 | 45 | 60;
  chatEnabled: boolean;
  houseRules: HouseRules;
};

export type Player = {
  id: string;
  nickname: string;
  wins?: number;
  isHost: boolean;
  isReady: boolean;
  isBot: boolean;
  connectionStatus: ConnectionStatus;
  joinedAt: number;
  lastSeen: number;
};

export type RoomRecord = {
  id: string;
  code: string;
  name: string;
  hostPlayerId: string;
  status: RoomStatus;
  settings: RoomSettings;
  createdAt: number;
};

export type LastActionInfo = {
  type:
    | "play"
    | "draw"
    | "skip"
    | "reverse"
    | "draw2"
    | "wild"
    | "wild4"
    | "uno"
    | "win"
    | "seven-swap"
    | "zero-rotation"
    | "jump-in"
    | "system";
  actorId?: string;
  targetId?: string;
  card?: Card;
  count?: number;
  message?: string;
  at: number;
  seq: number;
};

export type GameStatusValue = "starting" | "playing" | "finished";

// Public, per-player view of the game. Never contains opponents' hands.
export type GamePublicState = {
  status: GameStatusValue;
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
  turnDurationSeconds: number;
  winnerId: string | null;
  winOrder: string[];
  myHand: Card[];
  lastAction: LastActionInfo | null;
  recentPlays: LastActionInfo[];
  version: number;
};

export type ChatMessage = {
  id: string;
  roomId: string;
  senderId: string | null;
  senderName: string;
  content: string;
  type: "chat" | "system";
  createdAt: number;
};

export type ClientAction =
  | { kind: "room:ready"; playerId: string; ready: boolean }
  | { kind: "room:update-settings"; playerId: string; settings: Partial<RoomSettings> }
  | { kind: "room:add-bot"; playerId: string }
  | { kind: "room:reset-scores"; playerId: string }
  | { kind: "room:remove-player"; playerId: string; targetId: string }
  | { kind: "room:leave"; playerId: string }
  | { kind: "game:start"; playerId: string }
  | { kind: "game:play-card"; playerId: string; cardId: string; chosenColor?: CardColor; sevenSwapTargetId?: string; matchingCardIds?: string[] }
  | { kind: "game:draw-card"; playerId: string }
  | { kind: "game:pass-turn"; playerId: string }
  | { kind: "game:jump-in"; playerId: string; cardId: string; chosenColor?: CardColor }
  | { kind: "game:rematch"; playerId: string }
  | { kind: "chat:send"; playerId: string; content: string };

export type ToastVariant = "default" | "success" | "error" | "warning";
