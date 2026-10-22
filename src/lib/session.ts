"use client";

import { randomId } from "./utils";

const NICKNAME_KEY = "uno-tongkrongan:nickname";
const SESSION_KEY = "uno-tongkrongan:session-id";
const SOUND_KEY = "uno-tongkrongan:sound-enabled";
const MOTION_KEY = "uno-tongkrongan:reduced-motion";

// Nickname persists across the whole browser (localStorage) so the user
// doesn't need to type it again on their next visit.
export function getStoredNickname(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(NICKNAME_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setStoredNickname(name: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(NICKNAME_KEY, name);
  } catch {
    /* ignore */
  }
}

// Session id is per browser TAB (sessionStorage) — this is what lets us
// treat each tab as an independent "player" for local multiplayer testing,
// while surviving a refresh of that same tab (reconnection).
export function getSessionId(): string {
  if (typeof window === "undefined") return randomId("sess");
  try {
    let id = window.sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = randomId("sess");
      window.sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return randomId("sess");
  }
}

export function getSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const v = window.localStorage.getItem(SOUND_KEY);
    return v === null ? true : v === "1";
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SOUND_KEY, enabled ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function getReducedMotionPref(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const v = window.localStorage.getItem(MOTION_KEY);
    return v === "1";
  } catch {
    return false;
  }
}

export function setReducedMotionPref(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MOTION_KEY, enabled ? "1" : "0");
  } catch {
    /* ignore */
  }
}
