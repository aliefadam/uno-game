"use client";

// Lightweight synthesized sound effects via WebAudio — no external audio
// files needed. Sounds never autoplay; they only fire after a user gesture
// (clicking buttons / playing cards) which satisfies browser autoplay rules.
import { getSoundEnabled } from "./session";

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(freq: number, duration: number, type: OscillatorType = "sine", gain = 0.08, delay = 0) {
  const audio = getCtx();
  if (!audio || !getSoundEnabled()) return;
  const osc = audio.createOscillator();
  const g = audio.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const start = audio.currentTime + delay;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(g);
  g.connect(audio.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

export const sfx = {
  play: () => tone(520, 0.12, "triangle", 0.09),
  draw: () => tone(300, 0.1, "sine", 0.07),
  invalid: () => tone(140, 0.15, "sawtooth", 0.06),
  turn: () => tone(660, 0.1, "sine", 0.06),
  uno: () => {
    tone(700, 0.1, "square", 0.08);
    tone(900, 0.12, "square", 0.08, 0.1);
  },
  action: () => {
    tone(420, 0.08, "triangle", 0.08);
    tone(360, 0.1, "triangle", 0.08, 0.08);
  },
  win: () => {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, "triangle", 0.09, i * 0.11));
  },
  lose: () => tone(200, 0.4, "sawtooth", 0.07),
  join: () => tone(480, 0.1, "sine", 0.06),
  message: () => tone(620, 0.07, "sine", 0.05),
  click: () => tone(380, 0.05, "triangle", 0.05),
};
