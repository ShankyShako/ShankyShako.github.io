/* Every sound is synthesized here with WebAudio: no files, no licences. The
   context is made on the first sound after the player turns sound on (that
   click is the user gesture browsers want). */

import { BEAT_MS } from './engine';

let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
  try {
    if (!ctx) {
      const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

type Tone = { f: number; to?: number; t?: number; dur: number; type?: OscillatorType; gain?: number };

function tone(c: AudioContext, { f, to, t = 0, dur, type = 'sine', gain = 0.18 }: Tone) {
  const at = c.currentTime + t;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, at);
  if (to) o.frequency.exponentialRampToValueAtTime(to, at + dur);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(c.destination);
  o.start(at);
  o.stop(at + dur + 0.02);
}

/* The streak climbs C5 D E F G A, then holds on A5 (880 Hz) however long
   it runs. Modelled on the site pet's combo chops, which climb six steps
   from about F5 to A#5 (~950 Hz) and then hold: the top stays under that,
   where the old two-octave climb ended up at C7 (2093 Hz) and shrill. */
const CLIMB = [0, 2, 4, 5, 7, 9];

export const sfx = {
  perfect(streak: number) {
    const c = ac();
    if (!c) return;
    const f = 523.25 * 2 ** (CLIMB[Math.min(Math.max(streak - 1, 0), CLIMB.length - 1)] / 12);
    tone(c, { f, dur: 0.32, type: 'triangle', gain: 0.2 });
    tone(c, { f: f * 2, dur: 0.16, gain: 0.045 });
  },
  good() {
    const c = ac();
    if (c) tone(c, { f: 1800, to: 1200, dur: 0.04, type: 'square', gain: 0.04 });
  },
  off() {
    const c = ac();
    if (c) tone(c, { f: 140, to: 55, dur: 0.14, gain: 0.25 });
  },
  /** A streak of 5 or more just broke. */
  broke() {
    const c = ac();
    if (!c) return;
    tone(c, { f: 660, dur: 0.08, type: 'square', gain: 0.05 });
    tone(c, { f: 440, t: 0.09, dur: 0.12, type: 'square', gain: 0.05 });
  },
  buy() {
    const c = ac();
    if (!c) return;
    tone(c, { f: 784, dur: 0.07, type: 'triangle', gain: 0.12 });
    tone(c, { f: 1175, t: 0.07, dur: 0.12, type: 'triangle', gain: 0.12 });
  },
  light(white: boolean, i: number) {
    const c = ac();
    if (c) tone(c, { f: white ? 880 : 220, t: i * 0.16, dur: 0.12, type: white ? 'sine' : 'sawtooth', gain: white ? 0.14 : 0.06 });
  },
  /** The VS screen slams in: a falling growl under two hits. */
  vs() {
    const c = ac();
    if (!c) return;
    tone(c, { f: 180, to: 45, dur: 0.6, type: 'sawtooth', gain: 0.12 });
    tone(c, { f: 110, to: 40, dur: 0.35, gain: 0.3 });
    tone(c, { f: 392, t: 0.32, dur: 0.18, type: 'square', gain: 0.06 });
    tone(c, { f: 587.33, t: 0.44, dur: 0.3, type: 'square', gain: 0.06 });
  },
  /** Rock-paper-scissors reveal. */
  reveal() {
    const c = ac();
    if (!c) return;
    tone(c, { f: 660, dur: 0.06, type: 'square', gain: 0.05 });
    tone(c, { f: 990, t: 0.07, dur: 0.09, type: 'square', gain: 0.05 });
  },
  /** Someone lost cred. */
  hit() {
    const c = ac();
    if (!c) return;
    tone(c, { f: 160, to: 40, dur: 0.22, gain: 0.32 });
    tone(c, { f: 90, to: 30, dur: 0.3, type: 'square', gain: 0.05 });
  },
  /** Cred won back. */
  heal() {
    const c = ac();
    if (!c) return;
    [659.25, 830.61, 987.77].forEach((f, i) => tone(c, { f, t: i * 0.06, dur: 0.14, type: 'triangle', gain: 0.1 }));
  },
  podium() {
    const c = ac();
    if (!c) return;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(c, { f, t: i * 0.11, dur: 0.3, type: 'triangle', gain: 0.14 }));
  },
};

/** Resumes the context on a user gesture (browsers start it suspended). */
export function wake() {
  if (ctx && ctx.state === 'suspended') void ctx.resume().catch(() => {});
}

/* ---------- The music loop ----------
   A gym groove locked to the rep metronome: the kick lands exactly on each
   beat, so the music itself is a timing cue. Layers come in with the streak:
   a clap on the backbeat at 3, hats at 5, a bass line at 10. */

let noise: AudioBuffer | null = null;
function noiseBuf(c: AudioContext) {
  if (!noise) {
    noise = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noise;
}

function hit(c: AudioContext, out: AudioNode, at: number, dur: number, gain: number, filter: BiquadFilterType, freq: number) {
  const src = c.createBufferSource();
  src.buffer = noiseBuf(c);
  const f = c.createBiquadFilter();
  f.type = filter;
  f.frequency.value = freq;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(f).connect(g).connect(out);
  src.start(at);
  src.stop(at + dur + 0.02);
}

function kick(c: AudioContext, out: AudioNode, at: number) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.frequency.setValueAtTime(150, at);
  o.frequency.exponentialRampToValueAtTime(42, at + 0.22);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(0.9, at + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.32);
  o.connect(g).connect(out);
  o.start(at);
  o.stop(at + 0.34);
}

function bass(c: AudioContext, out: AudioNode, at: number, f: number, dur: number) {
  const o = c.createOscillator();
  const lp = c.createBiquadFilter();
  const g = c.createGain();
  o.type = 'sawtooth';
  o.frequency.value = f;
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(900, at);
  lp.frequency.exponentialRampToValueAtTime(220, at + dur);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(0.22, at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(lp).connect(g).connect(out);
  o.start(at);
  o.stop(at + dur + 0.02);
}

/* A minor groove over a 4-bar loop: roots in Hz for each bar. */
const ROOTS = [55, 55, 65.41, 49];

function beat(c: AudioContext, out: AudioNode, at: number, k: number, streak: number) {
  const half = BEAT_MS / 2000;
  const inBar = ((k % 4) + 4) % 4;
  kick(c, out, at);
  if (streak >= 3 && inBar % 2 === 1) hit(c, out, at, 0.16, 0.35, 'bandpass', 1500);
  if (streak >= 5) {
    hit(c, out, at + half, 0.05, 0.22, 'highpass', 7000);
    hit(c, out, at, 0.03, 0.08, 'highpass', 8000);
  }
  if (streak >= 10) {
    const root = ROOTS[Math.floor(((k % 16) + 16) % 16 / 4)];
    bass(c, out, at, root, half * 0.9);
    bass(c, out, at + half, inBar === 3 ? root * 1.5 : root * 2, half * 0.8);
  }
}

let timer = 0;
let master: GainNode | null = null;

export const music = {
  /** Starts the loop on the beat clock that began at `t0` (performance.now()). */
  start(t0: number, streak: () => number) {
    const c = ac();
    if (!c || timer) return;
    master = c.createGain();
    master.gain.value = 0.32;
    master.connect(c.destination);
    const out = master;
    let k = Math.ceil((performance.now() - t0) / BEAT_MS);
    timer = window.setInterval(() => {
      const now = performance.now();
      /* Scheduled early by the output latency, so the kick is heard on the beat. */
      const lat = (c.outputLatency || 0) + (c.baseLatency || 0);
      while (t0 + k * BEAT_MS < now + 250) {
        const at = c.currentTime + (t0 + k * BEAT_MS - now) / 1000 - lat;
        if (c.state === 'running' && at >= c.currentTime - 0.005) beat(c, out, Math.max(at, c.currentTime), k, streak());
        k++;
      }
    }, 50);
  },
  stop() {
    window.clearInterval(timer);
    timer = 0;
    if (master && ctx) {
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.05);
      const m = master;
      window.setTimeout(() => m.disconnect(), 400);
    }
    master = null;
  },
};

/** Close the audio context when the game unmounts, so leaving the page frees it. */
export function shutdown() {
  music.stop();
  const c = ctx;
  ctx = null;
  if (c && c.state !== 'closed') void c.close().catch(() => {});
}
