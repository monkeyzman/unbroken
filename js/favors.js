import { mulberry32, shuffle } from "./rng.js";

/** One favor at a time. It spends on the next boss, then you pick again. */
export const FAVORS = [
  { id: "salve", name: "Noon Salve", blurb: "+3 Defense on your tank for the next boss.", role: "tank", stat: "def", amount: 3 },
  { id: "hands", name: "Hot Hands", blurb: "+3 Power on your brawler for the next boss.", role: "brawl", stat: "pwr", amount: 3 },
  { id: "exit", name: "Quicker Exit", blurb: "+3 Speed on your runner for the next boss.", role: "speed", stat: "spd", amount: 3 },
  { id: "margin", name: "Margin Note", blurb: "+3 Smarts on your tech for the next boss.", role: "tech", stat: "smt", amount: 3 },
  { id: "thread", name: "Chorus Thread", blurb: "+3 Teamwork on your wildcard for the next boss.", role: "wild", stat: "tmw", amount: 3 },
];

const BY_ID = Object.fromEntries(FAVORS.map((favor) => [favor.id, favor]));

const NEED = {
  tank: ["def", 96],
  tech: ["smt", 97],
  speed: ["spd", 104],
  brawl: ["pwr", 90],
  wild: ["tmw", 84],
};

export function favorById(id) {
  return BY_ID[id] || null;
}

export function withFavors(picks, favorIds = []) {
  const favors = (favorIds || []).map(favorById).filter(Boolean);
  if (!favors.length) return picks;
  return picks.map((hero) => {
    const stats = { ...hero.stats };
    for (const favor of favors) {
      if (favor.all) {
        for (const [key, amount] of Object.entries(favor.all)) stats[key] += amount;
      } else if (favor.role === hero.role) stats[favor.stat] += favor.amount;
    }
    return { ...hero, stats };
  });
}

export function offerFavors(run) {
  if ((run.favors || []).length >= 1) return [];
  const owned = new Set(run.favors || []);
  const left = FAVORS.filter((favor) => !owned.has(favor.id));
  if (!left.length) return [];
  const rng = mulberry32((run.seed ^ Math.imul((run.index || 1) + 3, 0x9e3779b9)) >>> 0);
  return shuffle(left, rng).slice(0, Math.min(3, left.length));
}

function favorScore(favor, picks) {
  if (!favor) return -1;
  if (favor.all) return 14;
  const hero = picks.find((item) => item.role === favor.role);
  if (!hero) return 0;
  const [stat, need] = NEED[favor.role] || [favor.stat, 80];
  const have = hero.stats[stat];
  if (have < need && have + (favor.amount || 0) >= need) return 80;
  if (have < need) return 30 + Math.min(20, need - have);
  return 8;
}

export function bestFavor(run) {
  const boosted = withFavors(run.picks, run.favors || []);
  const offers = offerFavors(run);
  return [...offers].sort((a, b) => favorScore(b, boosted) - favorScore(a, boosted))[0] || null;
}

export function grantFavor(run) {
  run.favors = run.favors || [];
  const pick = bestFavor(run);
  if (pick && !run.favors.includes(pick.id)) run.favors.push(pick.id);
  return pick;
}
