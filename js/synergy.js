import { FACTIONS, STATS } from "./roster.js";

/** Pair-or-better faction links, plus a five-faction banner. */
export const SYNERGY_BONUS = { 2: 0.08, 3: 0.15, 4: 0.24, 5: 0.35 };
export const SPECTRUM_BONUS = 0.08;

const STAT_KEYS = STATS.map((s) => s.id);

export function synergyBands(heroes) {
  const counts = {};
  for (const h of heroes) counts[h.faction] = (counts[h.faction] || 0) + 1;
  const bands = [];
  for (const [faction, count] of Object.entries(counts)) {
    if (count < 2) continue;
    const meta = FACTIONS[faction];
    bands.push({
      faction,
      count,
      bonus: SYNERGY_BONUS[count],
      stat: meta.stat,
      name: meta.synergy,
      label: meta.name,
      short: meta.short,
      color: meta.color,
      ink: meta.ink,
    });
  }
  bands.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
  const spectrum = heroes.length >= 5 && Object.keys(counts).length === 5;
  return { counts, bands, spectrum };
}

/** Copies heroes, writes effective stats. `scale` halves or zeroes the link. */
export function withSynergy(heroes, scale = 1) {
  const report = synergyBands(heroes);
  const out = heroes.map((h) => {
    const base = { ...(h.baseStats || h.stats) };
    return {
      ...h,
      baseStats: base,
      stats: { ...base },
      out: false,
    };
  });
  for (const h of out) {
    for (const band of report.bands) {
      if (h.faction !== band.faction) continue;
      const key = band.stat;
      h.stats[key] = Math.round(h.baseStats[key] * (1 + band.bonus * scale));
    }
    if (report.spectrum && scale > 0) {
      for (const key of STAT_KEYS) {
        h.stats[key] = Math.round(h.stats[key] * (1 + SPECTRUM_BONUS * scale));
      }
    }
  }
  return { heroes: out, report, scale };
}

export function printedSums(heroes) {
  const sums = { pwr: 0, spd: 0, smt: 0, def: 0, tmw: 0 };
  for (const h of heroes) {
    const s = h.baseStats || h.stats;
    for (const key of STAT_KEYS) sums[key] += s[key];
  }
  return sums;
}

export function loudestStat(sums) {
  let best = "pwr";
  for (const key of STAT_KEYS) if (sums[key] > sums[best]) best = key;
  return best;
}
