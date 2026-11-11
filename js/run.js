import { HEROES, HERO_BY_ID, ROLES, heroTotal } from "./roster.js";
import { buildSeason } from "./foes.js";
import { simulateFight } from "./combat.js";
import { mulberry32, shuffle } from "./rng.js";
import { synergyBands } from "./synergy.js";

export function createRun(seed, mode = "exhibit") {
  const rng = mulberry32(seed >>> 0);
  const options = ROLES.map((role) =>
    shuffle(
      HEROES.filter((h) => h.role === role.id),
      rng,
    ).slice(0, 3),
  );
  const rounds = buildSeason(rng);
  return {
    seed: seed >>> 0,
    mode,
    options,
    rounds,
    picks: [],
    index: 0,
    wins: 0,
    losses: 0,
    streak: 0,
    bestStreak: 0,
    history: [],
  };
}

export function fightRng(run, round) {
  return mulberry32((run.seed + round * 9973) >>> 0);
}

export function resolveNext(run) {
  const foe = run.rounds[run.index];
  const result = simulateFight(run.picks, foe, fightRng(run, foe.round));
  if (result.win) {
    run.wins += 1;
    run.streak += 1;
    if (run.streak > run.bestStreak) run.bestStreak = run.streak;
  } else {
    run.losses += 1;
    run.streak = 0;
  }
  run.history.push({
    round: foe.round,
    win: result.win,
    name: foe.name,
    title: foe.title || foe.epithet,
    kind: foe.kind,
    tier: foe.tier,
    tierName: foe.tierName || "",
    mechanicName: foe.mechanicName || foe.abilityName || "",
    stamp: result.stamp,
    summary: result.summary,
    squadLeft: result.squadMax ? Math.round((result.squadHp / result.squadMax) * 100) : 0,
  });
  run.index += 1;
  return result;
}

export function skillScore(hero, picks) {
  const s = hero.stats;
  let score = s.pwr * 1.15 + s.spd * 1.08 + s.smt * 1.22 + s.def * 1.12 + s.tmw * 1.08;
  const counts = {};
  for (const p of picks) counts[p.faction] = (counts[p.faction] || 0) + 1;
  const next = (counts[hero.faction] || 0) + 1;
  if (next === 2) score += 26;
  if (next === 3) score += 34;
  if (next === 4) score += 16;
  if (next === 5) score += 8;
  const distinct = new Set([...picks.map((p) => p.faction), hero.faction]).size;
  if (picks.length === 4 && distinct === 5) score += 28;
  if (hero.role === "tank" && s.def >= 96) score += 58;
  if (hero.role === "tech" && s.smt >= 97) score += 54;
  if (hero.role === "brawl" && s.pwr >= 97) score += 28;
  if (hero.role === "speed" && s.spd >= 97) score += 18;
  if (hero.role === "wild" && s.tmw >= 97) score += 24;
  if (s.pwr < 36 || s.spd < 32 || s.def < 32) score -= 8;
  return score;
}

export function pickSkilled(options, picks) {
  return [...options].sort((a, b) => skillScore(b, picks) - skillScore(a, picks))[0];
}

export function pickGreedy(options) {
  const rank = { common: 0, rare: 1, epic: 2, legendary: 3 };
  return [...options].sort((a, b) => rank[b.rarity] - rank[a.rarity] || heroTotal(b) - heroTotal(a))[0];
}

export function pickWorst(options) {
  return [...options].sort((a, b) => heroTotal(a) - heroTotal(b))[0];
}

export function pickRandom(options, _picks, rng) {
  return options[Math.floor(rng() * options.length)];
}

export function draftBy(run, chooser, rng) {
  const picks = [];
  for (const slot of run.options) {
    picks.push(chooser(slot, picks, rng));
  }
  run.picks = picks;
  return picks;
}

export function playSeason(run) {
  while (run.index < 30) resolveNext(run);
  return run;
}

export function fellTo(history) {
  const losses = history.filter((h) => !h.win);
  if (!losses.length) return null;
  const bosses = losses.filter((h) => h.kind === "boss");
  if (bosses.length) return bosses[bosses.length - 1];
  return [...losses].sort((a, b) => (b.tier ?? -1) - (a.tier ?? -1) || b.round - a.round)[0];
}

export function shareText(run) {
  const fell = fellTo(run.history);
  const line = fell
    ? `My squad went ${run.wins}-${run.losses} and fell to ${fell.name}.`
    : `My squad went 30-0. The Ink Monarch fell.`;
  const names = run.picks.map((h) => h.name).join(", ");
  const daily = run.mode === "daily" ? " Daily." : "";
  return `${line}\nBest streak ${run.bestStreak}. ${names}.\nUNBROKEN — Aster City Circuit.${daily}`;
}

export function rankTitle(wins) {
  if (wins >= 30) return "FLAWLESS";
  if (wins >= 28) return "CITY LEGEND";
  if (wins >= 24) return "CONTENDER";
  if (wins >= 18) return "CLUB HERO";
  if (wins >= 10) return "GUTTER CREW";
  return "COMIC RELIEF";
}

export function squadBlurb(picks) {
  const { bands, spectrum } = synergyBands(picks);
  if (spectrum) return "Five Banners";
  if (!bands.length) return "No faction link";
  return bands.map((b) => `${b.short} ×${b.count}`).join(" · ");
}

export function heroFromId(id) {
  return HERO_BY_ID[id];
}
