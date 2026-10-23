"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getRoomChannel, releaseRoomChannel, type RoomSnapshot } from "@/lib/room-channel";
import type { ClientAction } from "@/lib/types";
import { getSessionId } from "@/lib/session";

const EMPTY_SNAPSHOT: RoomSnapshot = {
  room: null,
  players: [],
  chat: [],
  game: null,
  legalCardIds: [],
  isHost: false,
  selfId: "",
  error: null,
  reconnectAvailable: false,
  reconnecting: false,
  notices: [],
  typingPlayers: [],
};

export function useRoom(code: string | null, nickname: string | null) {
  const selfId = useMemo(() => getSessionId(), []);
  const [snapshot, setSnapshot] = useState<RoomSnapshot>(EMPTY_SNAPSHOT);
  const [joinError, setJoinError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof getRoomChannel> | null>(null);

  useEffect(() => {
    if (!code) return;
    const channel = getRoomChannel(code, selfId);
    channelRef.current = channel;
    const unsub = channel.subscribe(setSnapshot);
    if (nickname) {
      const result = channel.join(nickname);
      setJoinError(result.ok ? null : result.reason);
    }
    return () => {
      unsub();
      releaseRoomChannel(code, selfId);
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, selfId, nickname]);

  const dispatch = (action: ClientAction) => {
    channelRef.current?.dispatch(action);
  };

  const setTyping = useCallback((typing: boolean) => {
    channelRef.current?.setTyping(typing);
  }, []);

  const reconnect = useCallback(() => {
    channelRef.current?.reconnect();
  }, []);

  return { snapshot, dispatch, setTyping, reconnect, selfId, joinError };
}
