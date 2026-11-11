let ctx;
let muted = false;

export function setMuted(value) {
  muted = value;
}

export function isMuted() {
  return muted;
}

function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

function tone(freq, dur, type, gain, slide) {
  if (muted) return;
  try {
    const audio = ac();
    const osc = audio.createOscillator();
    const amp = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audio.currentTime);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slide), audio.currentTime + dur);
    amp.gain.setValueAtTime(gain, audio.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + dur);
    osc.connect(amp);
    amp.connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + dur + 0.02);
  } catch {
    /* Missing or blocked audio should not stop the draft. */
  }
}

export const sfx = {
  tap() {
    tone(520, 0.06, "square", 0.04);
  },
  hit() {
    tone(180, 0.09, "sawtooth", 0.05, 70);
  },
  good() {
    tone(520, 0.08, "square", 0.05);
    setTimeout(() => tone(780, 0.1, "square", 0.04), 70);
  },
  bad() {
    tone(220, 0.16, "sawtooth", 0.05, 80);
  },
  win() {
    tone(523, 0.1, "square", 0.05);
    setTimeout(() => tone(659, 0.1, "square", 0.05), 90);
    setTimeout(() => tone(784, 0.16, "square", 0.05), 180);
  },
};
