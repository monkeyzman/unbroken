/** Seeded RNG so daily runs and sim-all match a watched fight. */

export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(list, rng) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function dailyKey(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function dailySeed(date = new Date()) {
  const key = dailyKey(date);
  return { key, seed: hashString(`unbroken-daily-${key}`) };
}

const EXHIBIT_NONCE_KEY = "unbroken.exhibit.nonce";
let memoryNonce = 0;

function nextExhibitNonce() {
  memoryNonce = (memoryNonce + 1) >>> 0;
  if (memoryNonce === 0) memoryNonce = 1;
  try {
    const store = globalThis.localStorage;
    if (!store) return memoryNonce;
    const prev = Number(store.getItem(EXHIBIT_NONCE_KEY));
    const stored = ((Number.isFinite(prev) ? prev : 0) + 1) >>> 0 || 1;
    store.setItem(EXHIBIT_NONCE_KEY, String(stored));
    return (stored ^ memoryNonce) >>> 0 || stored;
  } catch {
    return memoryNonce;
  }
}

function cryptoWord() {
  try {
    const cryptoObj = globalThis.crypto;
    if (!cryptoObj || typeof cryptoObj.getRandomValues !== "function") return 0;
    const buf = new Uint32Array(2);
    cryptoObj.getRandomValues(buf);
    return (buf[0] ^ buf[1]) >>> 0;
  } catch {
    return 0;
  }
}

/** Fresh seed for a normal draft. Never the daily seed, and a new value every call. */
export function exhibitSeed() {
  const nonce = nextExhibitNonce();
  const time = Date.now() >>> 0;
  const fuzzy = Math.floor(Math.random() * 0x100000000) >>> 0;
  let seed = (cryptoWord() ^ time ^ fuzzy ^ Math.imul(nonce, 0x9e3779b1)) >>> 0;
  if (seed === dailySeed().seed || seed === 0) seed = (0x6d2b79f5 ^ nonce ^ time) >>> 0 || 1;
  return seed;
}

export function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}
