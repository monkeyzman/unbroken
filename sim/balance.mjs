import { HEROES, ROLES, heroTotal } from "../js/roster.js";
import { BOSSES, TIERS, buildSeason, isBossRound, tierIndexForRound } from "../js/foes.js";
import { createRun, draftBy, playSeason, pickGreedy, pickRandom, pickSkilled, pickWorst, resolveNext } from "../js/run.js";
import { simulateFight } from "../js/combat.js";
import { mulberry32 } from "../js/rng.js";
import { HERO_BY_ID } from "../js/roster.js";

const RARITY_ORDER = ["common", "rare", "epic", "legendary"];

function fail(msg) {
  console.error("FAIL", msg);
  process.exitCode = 1;
}

function checkRoster() {
  const ids = new Set();
  for (const hero of HEROES) {
    if (ids.has(hero.id)) fail(`duplicate id ${hero.id}`);
    ids.add(hero.id);
    const total = heroTotal(hero);
    hero._total = total;
  }
  if (HEROES.length < 40) fail(`roster ${HEROES.length} < 40`);
  for (const role of ROLES) {
    const group = HEROES.filter((h) => h.role === role.id);
    if (group.length < 8) fail(`${role.id} only has ${group.length}`);
    for (let i = 0; i < RARITY_ORDER.length - 1; i++) {
      const hi = Math.max(...group.filter((h) => h.rarity === RARITY_ORDER[i]).map((h) => h._total));
      const lo = Math.min(...group.filter((h) => h.rarity === RARITY_ORDER[i + 1]).map((h) => h._total));
      if (!(hi < lo)) fail(`${role.id} rarity overlap ${RARITY_ORDER[i]} ${hi} vs ${RARITY_ORDER[i + 1]} ${lo}`);
    }
  }
  const blob = JSON.stringify({ HEROES, BOSSES, TIERS }).toLowerCase();
  const banned = [
    "batman", "superman", "wonder woman", "spider-man", "spiderman", "iron man", "wolverine",
    "thanos", "joker", "harley quinn", "hulk", "thor", "loki", "avengers", "justice league",
    "x-men", "deadpool", "aquaman", "green lantern", "catwoman", "lex luthor", "darkseid",
    "black panther", "captain america", "doctor strange", "scarlet witch", "black widow",
    "hawkeye", "groot", "venom", "magneto", "mystique", "cyclops", "nightwing", "batgirl",
    "supergirl", "gotham", "krypton", "wakanda", "asgard", "stark", "bruce wayne",
  ];
  for (const word of banned) {
    const re = new RegExp(`\\b${word}\\b`, "i");
    if (re.test(blob)) fail(`banned name hit: ${word}`);
  }
  console.log(`roster ok · ${HEROES.length} heroes · 5 factions · ${BOSSES.length} bosses · ${TIERS.length} tiers`);
}

function checkSeasonShape() {
  const rounds = buildSeason(mulberry32(1));
  if (rounds.length !== 30) fail("season length");
  const counts = [0, 0, 0, 0, 0, 0];
  for (const round of rounds) {
    if (isBossRound(round.round)) {
      if (round.kind !== "boss") fail(`round ${round.round} should be boss`);
      if (round.mechanic !== BOSSES[round.round / 5 - 1].mechanic) fail("boss order");
    } else {
      if (round.tier !== tierIndexForRound(round.round)) fail(`tier mismatch r${round.round}`);
      counts[round.tier] += 1;
    }
  }
  if (counts.some((c) => c !== 4)) fail(`tier counts ${counts}`);
  console.log("season shape ok", counts.map((c, i) => `${TIERS[i].short}:${c}`).join(" "));
}

function squad(ids) {
  return ids.map((id) => HERO_BY_ID[id]);
}

function bossWinRate(ids, bossIndex, n = 500) {
  const heroes = squad(ids);
  const boss = BOSSES[bossIndex];
  let wins = 0;
  for (let i = 0; i < n; i++) {
    const foe = { ...boss, round: (bossIndex + 1) * 5, kind: "boss", field: "none", ability: null };
    const result = simulateFight(heroes, foe, mulberry32(5000 + i * 13 + bossIndex * 99));
    if (result.win) wins += 1;
  }
  return wins / n;
}

function checkMechanics() {
  const balanced = ["helio", "lumen", "brand", "meridian", "fox"];
  const skewed = ["bracken", "ping", "socket", "antenna", "knot"];
  const solar = ["helio", "lumen", "brand", "gnomon", "fox"];
  const noTech = ["helio", "lumen", "brand", "root", "fox"];
  const noTank = ["pylon", "lumen", "brand", "meridian", "fox"];

  const mirrorHi = bossWinRate(balanced, 0, 400);
  const mirrorLo = bossWinRate(skewed, 0, 400);
  console.log(`mirror  balanced ${(mirrorHi * 100).toFixed(0)}%   skewed ${(mirrorLo * 100).toFixed(0)}%`);

  const shieldHi = bossWinRate(balanced, 1, 400);
  const shieldLo = bossWinRate(noTech, 1, 400);
  console.log(`shield  legend-tech ${(shieldHi * 100).toFixed(0)}%   common-tech ${(shieldLo * 100).toFixed(0)}%`);

  const huntHi = bossWinRate(balanced, 2, 400);
  const huntLo = bossWinRate(noTank, 2, 400);
  console.log(`hunt    legend-tank ${(huntHi * 100).toFixed(0)}%   common-tank ${(huntLo * 100).toFixed(0)}%`);

  const growHi = bossWinRate(balanced, 3, 400);
  const growLo = bossWinRate(["helio", "ping", "socket", "meridian", "fox"], 3, 400);
  console.log(`season  burst ${(growHi * 100).toFixed(0)}%   slow ${(growLo * 100).toFixed(0)}%`);

  const hushSyn = bossWinRate(solar, 4, 400);
  const hushRaw = bossWinRate(["theorem", "neon", "mastiff", "meridian", "unvoted"], 4, 400);
  console.log(`hush    mono-solar ${(hushSyn * 100).toFixed(0)}%   mixed+tech ${(hushRaw * 100).toFixed(0)}%`);

  const finalHi = bossWinRate(balanced, 5, 400);
  const finalLo = bossWinRate(skewed, 5, 400);
  console.log(`editor  balanced ${(finalHi * 100).toFixed(0)}%   skewed ${(finalLo * 100).toFixed(0)}%`);

  const sample = simulateFight(
    squad(balanced),
    { ...BOSSES[0], round: 5, kind: "boss", field: "none", ability: null },
    mulberry32(7),
  );
  if (!sample.beats.some((b) => /mirrorcut/i.test(b.text))) fail("mirror log missing");
  const hunt = simulateFight(
    squad(noTank),
    { ...BOSSES[2], round: 15, kind: "boss", field: "none", ability: null },
    mulberry32(8),
  );
  if (!hunt.beats.some((b) => /hunt the swift/i.test(b.text))) fail("hunt log missing");
  const season = simulateFight(
    squad(balanced),
    { ...BOSSES[3], round: 20, kind: "boss", field: "none", ability: null },
    mulberry32(9),
  );
  if (!season.beats.some((b) => /season turn/i.test(b.text))) fail("season log missing");
  if (!season.beats.some((b) => /swelling/i.test(b.text))) fail("season did not swell");
  const hush = simulateFight(
    squad(solar),
    { ...BOSSES[4], round: 25, kind: "boss", field: "none", ability: null },
    mulberry32(10),
  );
  if (!hush.beats.some((b) => /hush/i.test(b.text))) fail("hush log missing");
  const editor = simulateFight(
    squad(balanced),
    { ...BOSSES[5], round: 30, kind: "boss", field: "none", ability: null },
    mulberry32(11),
  );
  if (!editor.beats.some((b) => /editor's cut/i.test(b.text))) fail("editor log missing");
  if (!editor.tags.erased) fail("editor did not cut");
  console.log("mechanic logs ok · cut", editor.tags.erased, "early", !!editor.tags.returnedEarly);
}

function simulateStrategy(label, chooser, n) {
  let perfect = 0;
  let winSum = 0;
  let streakSum = 0;
  const bossW = [0, 0, 0, 0, 0, 0];
  const bossN = [0, 0, 0, 0, 0, 0];
  const tierW = [0, 0, 0, 0, 0, 0];
  const tierN = [0, 0, 0, 0, 0, 0];
  const tierHp = [0, 0, 0, 0, 0, 0];
  let regs = 0;
  let block = 0;
  let reboot = 0;
  let legends = 0;
  for (let i = 0; i < n; i++) {
    const seed = (i + 1) * 10007 + label.length * 333;
    const run = createRun(seed);
    draftBy(run, chooser, mulberry32(seed ^ 0x9e3779b9));
    const tank = run.picks.find((h) => h.role === "tank");
    const tech = run.picks.find((h) => h.role === "tech");
    if (tank.stats.def >= 96) block += 1;
    if (tech.stats.smt >= 97) reboot += 1;
    legends += run.picks.filter((h) => h.rarity === "legendary").length;
    playSeason(run);
    winSum += run.wins;
    streakSum += run.bestStreak;
    if (run.wins === 30) perfect += 1;
    let regularLoss = false;
    for (const row of run.history) {
      if (row.kind === "boss") {
        const bi = row.round / 5 - 1;
        bossN[bi] += 1;
        if (row.win) bossW[bi] += 1;
      } else {
        tierN[row.tier] += 1;
        if (row.win) {
          tierW[row.tier] += 1;
          tierHp[row.tier] += row.squadLeft;
        } else regularLoss = true;
      }
    }
    if (!regularLoss) regs += 1;
  }
  const pct = (w, t) => (t ? `${((100 * w) / t).toFixed(0)}%` : "-");
  console.log(
    `\n${label}  n=${n}  perfect ${(100 * perfect / n).toFixed(2)}%  avg ${(winSum / n).toFixed(2)}-0  streak ${(streakSum / n).toFixed(1)}  clean-regulars ${(100 * regs / n).toFixed(0)}%`,
  );
  console.log(
    `  bosses ${bossW.map((w, i) => pct(w, bossN[i])).join("  ")}`,
  );
  console.log(
    `  tiers  ${tierW.map((w, i) => `${pct(w, tierN[i])}@${tierW[i] ? Math.round(tierHp[i] / tierW[i]) : 0}%hp`).join("  ")}`,
  );
  console.log(
    `  draft coverage  block-tank ${(100 * block / n).toFixed(0)}%  hush-tech ${(100 * reboot / n).toFixed(0)}%  avg legends ${(legends / n).toFixed(2)}`,
  );
  return { perfect: perfect / n, avg: winSum / n };
}

function sampleLog() {
  const run = createRun(42);
  draftBy(run, (slot, picks) => pickSkilled(slot, picks), mulberry32(1));
  console.log("\nSAMPLE SQUAD", run.picks.map((h) => `${h.name} (${h.rarity[0]})`).join(" · "));
  const show = new Set([1, 5, 6, 10, 15, 20, 25, 30]);
  while (run.index < 30) {
    const result = resolveNext(run);
    if (!show.has(result.foe.round)) continue;
    console.log(`\n== R${result.foe.round} ${result.foe.name} ${result.win ? "W" : "L"} ${result.stamp} ==`);
    for (const beat of result.beats) console.log(`  [${beat.tone}] ${beat.text}`);
  }
  console.log(`RECORD ${run.wins}-${run.losses} streak ${run.bestStreak}`);
}

const trials = Number(process.argv[2] || 800);
checkRoster();
checkSeasonShape();
checkMechanics();
simulateStrategy("skilled", (slot, picks) => pickSkilled(slot, picks), trials);
simulateStrategy("greedy", (slot) => pickGreedy(slot), trials);
simulateStrategy("random", (slot, picks, rng) => pickRandom(slot, picks, rng), trials);
simulateStrategy("worst", (slot) => pickWorst(slot), Math.min(trials, 400));
sampleLog();
