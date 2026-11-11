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

export function exhibitSeed() {
  const buf = new Uint32Array(2);
  if (globalThis.crypto?.getRandomValues) crypto.getRandomValues(buf);
  else {
    buf[0] = Math.floor(Math.random() * 0xffffffff);
    buf[1] = Date.now() >>> 0;
  }
  return (buf[0] ^ buf[1] ^ (Date.now() >>> 0)) >>> 0;
}

export function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}
