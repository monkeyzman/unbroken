let ctx = null;
let master = null;
let musicGain = null;
let sfxGain = null;
let noiseBuf = null;
let muted = false;
let soundVol = 0.85;
let musicVol = 0.42;
let bedName = "";
let bedToken = 0;
let bedTimer = 0;

const BEDS = {
  title: { bpm: 76, wave: "triangle", gain: 0.22, notes: [196, 247, 294, 247, 220, 196, 175, 220] },
  draft: { bpm: 98, wave: "square", gain: 0.12, notes: [262, 311, 349, 392, 349, 311, 294, 262] },
  season: { bpm: 104, wave: "square", gain: 0.13, notes: [220, 262, 330, 262, 247, 196] },
  fight: { bpm: 132, wave: "sawtooth", gain: 0.1, notes: [110, 110, 165, 110, 147, 110, 196, 147] },
  boss: { bpm: 144, wave: "sawtooth", gain: 0.12, notes: [98, 98, 123, 98, 147, 123, 110, 87] },
  result: { bpm: 84, wave: "triangle", gain: 0.18, notes: [262, 311, 349, 311, 262, 220] },
  perfect: { bpm: 112, wave: "square", gain: 0.14, notes: [523, 659, 784, 659, 784, 1046, 784, 659] },
};

function clamp(n, lo, hi, fallback) {
  const v = Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(lo, Math.min(hi, v));
}

export function isMuted() {
  return muted;
}

export function setMuted(value) {
  configureAudio({ muted: !!value, sound: soundVol, music: musicVol });
}

export function configureAudio(set) {
  try {
    muted = !!set?.muted;
    soundVol = clamp(set?.sound, 0, 1, soundVol);
    musicVol = clamp(set?.music, 0, 1, musicVol);
    applyGains();
    if (muted || musicVol <= 0) haltBed();
  } catch {
    /* Mixer failures stay inside the audio module. */
  }
}

export function primeAudio() {
  try {
    ensure();
    return true;
  } catch {
    return false;
  }
}

export function suspendAudio() {
  try {
    if (ctx?.state === "running") ctx.suspend();
  } catch {
    /* Ignore. */
  }
}

export function resumeAudio() {
  try {
    if (ctx?.state === "suspended") ctx.resume();
  } catch {
    /* Ignore. */
  }
}

function ensure() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  if (!master) {
    master = ctx.createGain();
    musicGain = ctx.createGain();
    sfxGain = ctx.createGain();
    musicGain.connect(master);
    sfxGain.connect(master);
    master.connect(ctx.destination);
    applyGains();
  }
  return ctx;
}

function applyGains() {
  if (!master || !ctx) return;
  const now = ctx.currentTime;
  master.gain.cancelScheduledValues(now);
  master.gain.setValueAtTime(muted ? 0 : 1, now);
  sfxGain.gain.setValueAtTime(soundVol, now);
  musicGain.gain.setValueAtTime(musicVol, now);
}

function noise() {
  const audio = ensure();
  if (!audio) return null;
  if (!noiseBuf) {
    const len = Math.floor(audio.sampleRate * 0.25);
    noiseBuf = audio.createBuffer(1, len, audio.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuf;
}

function tone(freq, dur, type, gain, slide) {
  if (muted || soundVol <= 0) return;
  try {
    const audio = ensure();
    if (!audio) return;
    const osc = audio.createOscillator();
    const amp = audio.createGain();
    const now = audio.currentTime;
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(40, freq), now);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slide), now + dur);
    amp.gain.setValueAtTime(Math.max(0.0001, gain), now);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(amp);
    amp.connect(sfxGain);
    osc.start(now);
    osc.stop(now + dur + 0.03);
  } catch {
    /* Missing or blocked audio should not stop the draft. */
  }
}

function thud(freq, dur, gain) {
  if (muted || soundVol <= 0) return;
  try {
    const audio = ensure();
    const buffer = noise();
    if (!audio || !buffer) return;
    const src = audio.createBufferSource();
    src.buffer = buffer;
    const filter = audio.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(freq, audio.currentTime);
    filter.frequency.exponentialRampToValueAtTime(180, audio.currentTime + dur);
    const amp = audio.createGain();
    amp.gain.setValueAtTime(Math.max(0.0001, gain), audio.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + dur);
    src.connect(filter);
    filter.connect(amp);
    amp.connect(sfxGain);
    src.start();
    src.stop(audio.currentTime + dur + 0.02);
  } catch {
    /* Impact noise is optional. */
  }
}

function haltBed() {
  bedToken += 1;
  if (bedTimer) clearTimeout(bedTimer);
  bedTimer = 0;
}

function pluck(freq, pattern) {
  try {
    const audio = ctx;
    if (!audio || !musicGain || muted || musicVol <= 0) return;
    const osc = audio.createOscillator();
    const warm = audio.createOscillator();
    const amp = audio.createGain();
    const now = audio.currentTime;
    const dur = 0.22;
    osc.type = pattern.wave;
    warm.type = "triangle";
    osc.frequency.setValueAtTime(freq, now);
    warm.frequency.setValueAtTime(freq * 0.5, now);
    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.exponentialRampToValueAtTime(Math.max(0.0001, pattern.gain), now + 0.02);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(amp);
    warm.connect(amp);
    amp.connect(musicGain);
    osc.start(now);
    warm.start(now);
    osc.stop(now + dur + 0.03);
    warm.stop(now + dur + 0.03);
  } catch {
    /* A dropped note is not a failed tap. */
  }
}

export function startBed(name) {
  try {
    if (!name || muted || musicVol <= 0) {
      bedName = name || "";
      haltBed();
      return;
    }
    if (name === bedName && bedTimer) return;
    if (!ensure()) return;
    bedName = name;
    haltBed();
    const pattern = BEDS[name] || BEDS.title;
    const token = bedToken;
    let i = 0;
    const tick = () => {
      if (token !== bedToken) return;
      try {
        pluck(pattern.notes[i % pattern.notes.length], pattern);
      } catch {
        /* Keep the clock even if one note fails. */
      }
      i += 1;
      bedTimer = setTimeout(tick, 60000 / pattern.bpm);
    };
    tick();
  } catch {
    /* Soundtrack is never allowed to break navigation. */
  }
}

export const sfx = {
  tap() {
    tone(620, 0.045, "square", 0.05);
  },
  flip() {
    tone(340, 0.07, "triangle", 0.05, 520);
  },
  recruit() {
    tone(440, 0.08, "square", 0.06);
    setTimeout(() => tone(660, 0.1, "square", 0.05), 70);
  },
  hit() {
    thud(900, 0.12, 0.18);
    tone(160, 0.1, "sawtooth", 0.06, 60);
  },
  crit() {
    thud(1400, 0.16, 0.22);
    tone(220, 0.08, "square", 0.07, 90);
    setTimeout(() => tone(880, 0.12, "square", 0.06), 50);
  },
  good() {
    tone(523, 0.07, "square", 0.05);
    setTimeout(() => tone(784, 0.1, "square", 0.045), 60);
  },
  bad() {
    tone(196, 0.18, "sawtooth", 0.06, 70);
    thud(400, 0.2, 0.12);
  },
  ko() {
    thud(500, 0.28, 0.2);
    tone(140, 0.22, "triangle", 0.07, 50);
  },
  win() {
    tone(523, 0.09, "square", 0.06);
    setTimeout(() => tone(659, 0.09, "square", 0.06), 90);
    setTimeout(() => tone(784, 0.16, "square", 0.06), 180);
  },
  hype() {
    tone(392, 0.08, "square", 0.06);
    setTimeout(() => tone(523, 0.08, "square", 0.06), 80);
    setTimeout(() => tone(784, 0.14, "square", 0.06), 160);
  },
  boss() {
    thud(700, 0.25, 0.2);
    tone(98, 0.28, "sawtooth", 0.07, 49);
    setTimeout(() => tone(196, 0.18, "square", 0.06), 160);
  },
};
