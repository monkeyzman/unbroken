const KEY = "unbroken.settings.v1";

const BASE = {
  sound: 0.85,
  music: 0.42,
  muted: false,
  haptics: true,
  motion: "auto",
  battleSpeed: 1,
};

function clamp01(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(1, n));
}

export function loadSettings() {
  const base = { ...BASE };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const next = { ...base, ...parsed };
      next.sound = clamp01(next.sound, base.sound);
      next.music = clamp01(next.music, base.music);
      next.muted = !!next.muted;
      next.haptics = next.haptics !== false;
      if (!["auto", "full", "reduce"].includes(next.motion)) next.motion = "auto";
      if (![1, 2, 3].includes(Number(next.battleSpeed))) next.battleSpeed = 1;
      else next.battleSpeed = Number(next.battleSpeed);
      return next;
    }
  } catch {
    /* Ignore a broken settings blob. */
  }
  try {
    if (localStorage.getItem("unbroken.mute") === "1") base.muted = true;
  } catch {
    /* Private mode can throw on storage. */
  }
  return base;
}

export function saveSettings(set) {
  try {
    localStorage.setItem(KEY, JSON.stringify(set));
    localStorage.setItem("unbroken.mute", set.muted ? "1" : "0");
  } catch {
    /* The run still plays if storage is blocked. */
  }
}

export function motionReduced(set) {
  if (set?.motion === "reduce") return true;
  if (set?.motion === "full") return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

const PATTERNS = {
  tap: [8],
  hit: [14],
  crit: [10, 28, 22],
  win: [18, 36, 18, 36, 48],
  loss: [36, 48, 36],
  boss: [24, 36, 24, 36, 70],
};

export function buzz(kind, set) {
  try {
    if (!set?.haptics) return;
    if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
    navigator.vibrate(PATTERNS[kind] || PATTERNS.tap);
  } catch {
    /* A missing vibration motor must not swallow the tap. */
  }
}
