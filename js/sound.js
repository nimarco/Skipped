/*
 * sound.js — BROWSER API: Web Audio + Vibration
 * https://developer.mozilla.org/docs/Web/API/Web_Audio_API
 *
 * Every sound in the room is synthesized here (no audio files, nothing
 * copied from the class site): the alarm, the phone buzzing on the
 * blanket, message pops, the clock ticking through a time jump.
 * Browsers only allow audio after a click, so unlock() runs on "wake up".
 */

let ctx = null;
let muted = false;

export function audioContext() {
  if (!ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    ctx = AudioCtx ? new AudioCtx() : null;
  }
  return ctx;
}

export function unlock() {
  const c = audioContext();
  if (c?.state === "suspended") c.resume();
}

export function setMuted(value) {
  muted = value;
}

export function isMuted() {
  return muted;
}

function tone({ freq, type = "sine", start = 0, length = 0.15, volume = 0.2, slide = null }) {
  const c = audioContext();
  if (!c || muted) return;
  const t = c.currentTime + start;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slide) osc.frequency.exponentialRampToValueAtTime(slide, t + length);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
  osc.connect(gain).connect(c.destination);
  osc.start(t);
  osc.stop(t + length + 0.02);
}

// The cheap alarm clock: four square beeps, twice a second. Returns a stop function.
export function startAlarm() {
  let on = true;
  const beep = () => {
    if (!on) return;
    for (let i = 0; i < 4; i++) tone({ freq: 2050, type: "square", start: i * 0.09, length: 0.06, volume: 0.06 });
  };
  beep();
  const id = setInterval(beep, 620);
  return () => {
    on = false;
    clearInterval(id);
  };
}

// The phone vibrating against the blanket: a low, rattly hum.
export function buzz() {
  navigator.vibrate?.([90, 70, 90]);
  const c = audioContext();
  if (!c || muted) return;
  for (const start of [0, 0.22]) {
    const t = c.currentTime + start;
    const osc = c.createOscillator();
    const rattle = c.createOscillator();
    const depth = c.createGain();
    const gain = c.createGain();
    osc.type = "sawtooth";
    osc.frequency.value = 150;
    rattle.frequency.value = 32;
    depth.gain.value = 0.5;
    rattle.connect(depth).connect(gain.gain);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.05, t + 0.02);
    gain.gain.linearRampToValueAtTime(0.0001, t + 0.16);
    const filter = c.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 500;
    osc.connect(filter).connect(gain).connect(c.destination);
    osc.start(t);
    rattle.start(t);
    osc.stop(t + 0.18);
    rattle.stop(t + 0.18);
  }
}

export const pop = () => tone({ freq: 880, slide: 1320, length: 0.09, volume: 0.08 });
export const send = () => tone({ freq: 520, slide: 980, length: 0.12, volume: 0.06 });
export const key = () => tone({ freq: 1800 + Math.random() * 400, type: "triangle", length: 0.02, volume: 0.015 });
export const wrong = () => tone({ freq: 196, type: "triangle", slide: 140, length: 0.22, volume: 0.15 });

export function correct() {
  tone({ freq: 784, length: 0.18, volume: 0.12 });
  tone({ freq: 1175, start: 0.12, length: 0.32, volume: 0.12 });
}

export function closed() {
  tone({ freq: 392, type: "triangle", length: 0.3, volume: 0.12 });
  tone({ freq: 294, type: "triangle", start: 0.25, length: 0.5, volume: 0.12 });
}

// The clock racing forward: ticks that speed up and slow down over `ms`.
export function fastForward(ms) {
  const count = 14;
  for (let i = 0; i < count; i++) {
    const x = i / (count - 1);
    const start = (ms / 1000) * (0.5 - 0.5 * Math.cos(Math.PI * x)) * 0.92;
    tone({ freq: 3000, type: "square", start, length: 0.012, volume: 0.025 });
  }
}
