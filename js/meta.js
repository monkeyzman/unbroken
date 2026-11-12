import { HEROES } from "./roster.js";
import { BOSSES, TIERS } from "./foes.js";
import { synergyBands } from "./synergy.js";

const KEY = "unbroken.meta.v1";

export const FRAMES = [
  { id: "classic", name: "Newsprint", need: "Yours from the first run." },
  { id: "heat", name: "Heat Line", need: "Land a 10-win streak." },
  { id: "gallery", name: "Gallery", need: "Fill 50 faces in the book." },
  { id: "daily", name: "Daily Ribbon", need: "Keep a 3-day daily streak." },
  { id: "flawless", name: "Flawless Foil", need: "Go 30–0." },
];

function blank() {
  return {
    seen: {},
    achievements: {},
    dailyStreak: 0,
    lastDaily: "",
    nearLoss: null,
    nearWin: null,
    equipped: "classic",
    runs: 0,
    tutorial: false,
    coach: {},
  };
}

export function loadMeta() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return blank();
    const parsed = JSON.parse(raw);
    return {
      ...blank(),
      ...parsed,
      seen: parsed.seen || {},
      achievements: parsed.achievements || {},
      coach: parsed.coach || {},
    };
  } catch {
    return blank();
  }
}

export function saveMeta(meta) {
  try {
    localStorage.setItem(KEY, JSON.stringify(meta));
  } catch {
    /* The run still ends if storage is blocked. */
  }
}

export function catalog() {
  const heroes = HEROES.map((hero) => ({ id: hero.id, name: hero.name, kind: "heroes", emoji: hero.emoji, faction: hero.faction }));
  const bosses = BOSSES.map((boss) => ({ id: boss.id, name: boss.name, kind: "bosses", emoji: boss.emoji }));
  const foes = TIERS.flatMap((tier) => tier.enemies.map((enemy) => ({ id: enemy.id, name: enemy.name, kind: "foes", emoji: enemy.emoji })));
  return [...heroes, ...bosses, ...foes];
}

export function seenCount(meta) {
  return Object.keys(meta?.seen || {}).length;
}

function remember(meta, id, kind, name) {
  if (!id) return;
  const prev = meta.seen[id];
  meta.seen[id] = { kind, name: name || prev?.name || id, times: (prev?.times || 0) + 1 };
}

function yesterday(key) {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function frameUnlocked(meta, id) {
  if (id === "classic") return true;
  if (id === "heat") return !!meta.achievements.streak10;
  if (id === "gallery") return seenCount(meta) >= 50;
  if (id === "daily") return meta.dailyStreak >= 3;
  if (id === "flawless") return !!meta.achievements.perfect;
  return false;
}

export function unlockedFrames(meta) {
  return FRAMES.filter((frame) => frameUnlocked(meta, frame.id));
}

const ACHIEVEMENTS = [
  { id: "first-win", name: "First Bell", text: "Win a fight.", test: (run) => run.wins >= 1 },
  { id: "boss", name: "Regent Down", text: "Beat a boss.", test: (run) => run.history.some((row) => row.kind === "boss" && row.win) },
  { id: "streak5", name: "City Noticed", text: "Reach a 5-win streak.", test: (run) => run.bestStreak >= 5 },
  { id: "streak10", name: "On a Tear", text: "Reach a 10-win streak.", test: (run) => run.bestStreak >= 10 },
  { id: "streak15", name: "Half a Legend", text: "Reach a 15-win streak.", test: (run) => run.bestStreak >= 15 },
  { id: "perfect", name: "Unbroken", text: "Go 30–0.", test: (run) => run.wins === 30 },
  { id: "close", name: "By a Hair", text: "Win a fight with 22% or less left.", test: (run) => run.history.some((row) => row.win && row.squadLeft <= 22) },
  { id: "almost", name: "So Close", text: "Lose with the foe under 25%.", test: (run) => run.history.some((row) => !row.win && row.foeLeft <= 24) },
  { id: "daily", name: "Today's Paper", text: "Finish a daily.", test: (run) => run.mode === "daily" },
  { id: "link", name: "Linked Up", text: "Draft a faction link.", test: (run) => synergyBands(run.picks).bands.length > 0 || synergyBands(run.picks).spectrum },
  { id: "book20", name: "Scrapbook", text: "See 20 faces.", test: (_run, meta) => seenCount(meta) >= 20 },
  { id: "book50", name: "Field Guide", text: "See 50 faces.", test: (_run, meta) => seenCount(meta) >= 50 },
  { id: "book81", name: "Whole Cast", text: "See all 81 faces.", test: (_run, meta) => seenCount(meta) >= 81 },
];

export function achievementList() {
  return ACHIEVEMENTS;
}

export function noteRoster(meta, run) {
  for (const hero of run.picks || []) remember(meta, hero.id, "heroes", hero.name);
}

export function noteFoe(meta, foe) {
  if (!foe?.id) return;
  const kind = foe.kind === "boss" ? "bosses" : "foes";
  remember(meta, foe.id, kind, foe.name);
}

export function recordRun(meta, run, dailyKey) {
  const before = new Set(Object.keys(meta.seen));
  meta.runs = (meta.runs || 0) + 1;
  noteRoster(meta, run);
  for (const row of run.history || []) {
    const kind = row.kind === "boss" ? "bosses" : "foes";
    if (row.id) remember(meta, row.id, kind, row.name);
  }
  const losses = (run.history || []).filter((row) => !row.win && Number.isFinite(row.foeLeft));
  const closestLoss = losses.sort((a, b) => a.foeLeft - b.foeLeft)[0];
  if (closestLoss && (!meta.nearLoss || closestLoss.foeLeft < meta.nearLoss.foeLeft)) {
    meta.nearLoss = { name: closestLoss.name, foeLeft: closestLoss.foeLeft, record: `${run.wins}-${run.losses}` };
  }
  const holds = (run.history || []).filter((row) => row.win && Number.isFinite(row.squadLeft));
  const closestWin = holds.sort((a, b) => a.squadLeft - b.squadLeft)[0];
  if (closestWin && (!meta.nearWin || closestWin.squadLeft < meta.nearWin.squadLeft)) {
    meta.nearWin = { name: closestWin.name, squadLeft: closestWin.squadLeft, record: `${run.wins}-${run.losses}` };
  }
  if (run.mode === "daily" && dailyKey) {
    if (meta.lastDaily !== dailyKey) {
      meta.dailyStreak = meta.lastDaily === yesterday(dailyKey) ? (meta.dailyStreak || 0) + 1 : 1;
      meta.lastDaily = dailyKey;
    }
  }
  const fresh = [];
  for (const achievement of ACHIEVEMENTS) {
    if (meta.achievements[achievement.id]) continue;
    if (!achievement.test(run, meta)) continue;
    meta.achievements[achievement.id] = Date.now();
    fresh.push(achievement);
  }
  if (!frameUnlocked(meta, meta.equipped)) meta.equipped = "classic";
  const newest = [...unlockedFrames(meta)].reverse().find((frame) => frame.id !== "classic" && fresh.some((item) => frameUnlocked(meta, frame.id)));
  if (newest) meta.equipped = newest.id;
  return { achievements: fresh, faces: Object.keys(meta.seen).filter((id) => !before.has(id)).length };
}

export function nextFrame(meta) {
  return FRAMES.find((frame) => !frameUnlocked(meta, frame.id)) || null;
}
