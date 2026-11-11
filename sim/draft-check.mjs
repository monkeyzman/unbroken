import { HEROES, ROLES } from "../js/roster.js";
import { createRun } from "../js/run.js";
import { dailySeed, exhibitSeed } from "../js/rng.js";

const DRAFTS = 20;

function signature(run) {
  return run.options.map((slot) => slot.map((hero) => hero.id).join(",")).join("|");
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

const daily = dailySeed();
const dailyAgain = dailySeed();
if (daily.seed !== dailyAgain.seed) fail("daily seed changed within the same UTC day");
const dailyRun = signature(createRun(daily.seed, "daily"));
if (dailyRun !== signature(createRun(daily.seed, "daily"))) fail("daily draft was not repeatable");

const seeded = signature(createRun(42, "exhibit"));
if (seeded !== signature(createRun(42, "exhibit"))) fail("same exhibition seed did not resume the same offers");

const runs = [];
const seeds = [];
for (let i = 0; i < DRAFTS; i++) {
  const seed = exhibitSeed();
  if (seed === daily.seed) fail(`exhibition seed matched the daily seed on draft ${i + 1}`);
  seeds.push(seed);
  runs.push(createRun(seed, "exhibit"));
}

if (new Set(seeds).size !== DRAFTS) fail(`exhibition seeds repeated: ${seeds.join(", ")}`);

const signatures = runs.map(signature);
if (new Set(signatures).size !== DRAFTS) {
  fail(`expected ${DRAFTS} different drafts, got ${new Set(signatures).size}`);
}

const seen = new Set();
for (let slot = 0; slot < ROLES.length; slot++) {
  const trios = new Set(runs.map((run) => run.options[slot].map((hero) => hero.id).sort().join(",")));
  if (trios.size < 12) fail(`${ROLES[slot].name} only produced ${trios.size} different trios in ${DRAFTS} drafts`);
  for (const hero of runs.flatMap((run) => run.options[slot])) {
    if (hero.role !== ROLES[slot].id) fail(`${hero.name} appeared in the ${ROLES[slot].name} slot`);
    seen.add(hero.id);
  }
  const pool = HEROES.filter((hero) => hero.role === ROLES[slot].id).length;
  if (pool !== 9) fail(`${ROLES[slot].name} pool is ${pool}, expected 9`);
}

if (HEROES.length !== 45) fail(`roster is ${HEROES.length}, expected 45`);
if (seen.size < 35) fail(`only ${seen.size} of 45 heroes appeared across ${DRAFTS} drafts`);
if (signatures.includes(dailyRun) && new Set(signatures).size === 1) {
  fail("every exhibition draft matched the daily draft");
}

const againA = signature(createRun(exhibitSeed(), "exhibit"));
const againB = signature(createRun(exhibitSeed(), "exhibit"));
if (againA === againB) fail("Draft again produced the same offers");

console.log(
  `ok  ${DRAFTS} exhibition drafts  ${new Set(signatures).size} unique  ${seen.size}/45 heroes  daily ${daily.key} held steady`,
);
