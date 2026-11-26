/*
 * voicememo.js — BROWSER API: Web Audio (+ Wikimedia Commons audio files)
 *
 * The last-resort hint: a friend whispers the word into their phone under
 * the desk. A real pronunciation recording from Wikimedia Commons (found
 * once by lab/words/build.py through the Free Dictionary API) is muffled
 * through filters, sped up a little and buried under classroom noise.
 * upload.wikimedia.org sends CORS *, so decodeAudioData works.
 */

import { audioContext, isMuted } from "./sound.js";

const cache = new Map();

async function loadBuffer(url) {
  if (!cache.has(url)) {
    cache.set(url, (async () => {
      const response = await fetch(url);
      if (!response.ok) throw new Error("audio missing");
      return audioContext().decodeAudioData(await response.arrayBuffer());
    })());
  }
  return cache.get(url);
}

function noise(c, seconds) {
  const buffer = c.createBuffer(1, Math.ceil(c.sampleRate * seconds), c.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    last = 0.97 * last + 0.03 * (Math.random() * 2 - 1); // brown-ish: a room murmur, not hiss
    data[i] = last * 3;
  }
  const src = c.createBufferSource();
  src.buffer = buffer;
  return src;
}

/** Plays the memo. Resolves with its length in seconds, rejects if it can't load. */
export async function playVoiceMemo(url) {
  const c = audioContext();
  if (!c) throw new Error("no Web Audio");
  const buffer = await loadBuffer(url);
  if (isMuted()) return buffer.duration;
  const lead = 0.6; // a beat of room noise before the whisper
  const t = c.currentTime + 0.05;

  const voice = c.createBufferSource();
  voice.buffer = buffer;
  voice.playbackRate.value = 1.08;
  const high = c.createBiquadFilter();
  high.type = "highpass";
  high.frequency.value = 420;
  const low = c.createBiquadFilter();
  low.type = "lowpass";
  low.frequency.value = 1500; // a hand over the phone
  const voiceGain = c.createGain();
  voiceGain.gain.value = 0.9;
  voice.connect(high).connect(low).connect(voiceGain).connect(c.destination);

  const length = buffer.duration / 1.08 + lead * 2;
  const room = noise(c, length);
  const roomGain = c.createGain();
  roomGain.gain.setValueAtTime(0.0001, t);
  roomGain.gain.linearRampToValueAtTime(0.16, t + 0.15);
  roomGain.gain.setValueAtTime(0.16, t + length - 0.2);
  roomGain.gain.linearRampToValueAtTime(0.0001, t + length);
  room.connect(roomGain).connect(c.destination);

  room.start(t);
  voice.start(t + lead);
  room.stop(t + length);
  return length;
}

export function preloadVoiceMemo(url) {
  if (url && audioContext()) loadBuffer(url).catch(() => cache.delete(url));
}
