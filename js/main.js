import { view, paintFight, showStamp, toast } from "./ui.js?v=3";
import { createRun, resolveNext, heroFromId, shareText, fellTo } from "./run.js";
import { dailyKey, dailySeed, exhibitSeed } from "./rng.js?v=2";
import { BOSSES, TIERS, tierAfterBoss } from "./foes.js";
import { HEROES } from "./roster.js";
import { isMuted, setMuted, sfx } from "./audio.js";
import { bindPortraits, preloadPortraits } from "./portraits.js?v=3";

const SAVE_KEY = "unbroken.save.v1";
const RUN_KEY = "unbroken.run.v1";
const app = document.querySelector("#app");

const S = {
  screen: "title",
  run: null,
  hi: -1,
  fight: null,
  save: loadSave(),
  mute: localStorage.getItem("unbroken.mute") === "1",
  dailyKey: dailyKey(),
  resume: loadResume(),
  returnTo: "title",
  unlockTier: null,
  unlockWon: false,
  newBest: false,
  anim: 0,
  reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
};

setMuted(S.mute);
render();

app.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button || button.disabled) return;
  const action = button.dataset.action;
  const fn = actions[action];
  if (fn) fn(button);
  if (action !== "skip" && action !== "mute") {
    try {
      sfx.tap();
    } catch {
      /* Sound must not cancel New Run or Draft Again. */
    }
  }
});

const actions = {
  mute() {
    S.mute = !S.mute;
    setMuted(S.mute);
    localStorage.setItem("unbroken.mute", S.mute ? "1" : "0");
    render();
  },
  title() {
    S.screen = "title";
    S.resume = loadResume();
    render();
  },
  back() {
    S.screen = S.returnTo || "title";
    render();
  },
  how() {
    S.screen = "how";
    render();
  },
  board() {
    S.returnTo = S.screen === "board" ? "title" : S.screen;
    S.screen = "board";
    render();
  },
  "new-run"() {
    startExhibition();
  },
  daily() {
    const daily = dailySeed();
    S.dailyKey = daily.key;
    startRun("daily", daily.seed);
  },
  resume() {
    restore(S.resume);
  },
  highlight(button) {
    S.hi = Number(button.dataset.i);
    render();
  },
  recruit() {
    if (!S.run || S.hi < 0) return;
    const step = S.run.picks.length;
    const hero = S.run.options[step][S.hi];
    if (!hero) return;
    S.run.picks.push(hero);
    S.hi = -1;
    S.screen = S.run.picks.length === 5 ? "confirm" : "draft";
    persist();
    render();
  },
  undo() {
    if (!S.run?.picks.length) return;
    S.run.picks.pop();
    S.hi = -1;
    S.screen = "draft";
    persist();
    render();
  },
  reopen() {
    if (!S.run) return;
    S.run.picks = [];
    S.hi = -1;
    S.screen = "draft";
    persist();
    render();
  },
  "start-season"() {
    S.screen = "season";
    persist();
    render();
  },
  fight() {
    beginFight(false);
  },
  quick() {
    beginFight(true);
  },
  "sim-all"() {
    if (!S.run) return;
    while (S.run.index < 30) resolveNext(S.run);
    finish();
  },
  skip() {
    S.anim += 1;
    if (!S.fight) return;
    paintFight(S.fight, S.fight.beats.length);
    showStamp(S.fight);
    if (S.fight.win) sfx.win();
    else sfx.bad();
  },
  continue() {
    afterFight();
  },
  onward() {
    if (S.run.index >= 30) finish();
    else {
      S.screen = "season";
      persist();
      render();
    }
  },
  share() {
    shareResult();
  },
  copy() {
    copyText(shareText(S.run));
  },
  "draft-again"() {
    startExhibition();
  },
};

function startExhibition() {
  startRun("exhibit", exhibitSeed());
}

function startRun(mode, seed) {
  S.run = createRun(seed, mode);
  S.run.dailyKey = mode === "daily" ? S.dailyKey : null;
  S.hi = -1;
  S.fight = null;
  S.newBest = false;
  S.screen = "draft";
  persist();
  render();
}

function beginFight(quick) {
  if (!S.run || S.run.index >= 30) return;
  S.fight = resolveNext(S.run);
  S.screen = "fight";
  persist();
  render();
  play(S.fight, quick || S.reduced);
}

async function play(result, instant) {
  const token = ++S.anim;
  const beats = result.beats;
  paintFight(result, 1);
  if (instant) {
    paintFight(result, beats.length);
    showStamp(result);
    if (result.win) sfx.win();
    else sfx.bad();
    return;
  }
  for (let i = 2; i <= beats.length; i++) {
    await wait(460);
    if (token !== S.anim) return;
    paintFight(result, i);
    const tone = beats[i - 1].tone;
    if (tone === "good") sfx.good();
    else sfx.hit();
  }
  if (token !== S.anim) return;
  showStamp(result);
  if (result.win) sfx.win();
  else sfx.bad();
}

function afterFight() {
  const foe = S.fight?.foe;
  if (!foe) return;
  if (foe.kind === "boss" && foe.round < 30) {
    S.unlockTier = tierAfterBoss(foe.round);
    S.unlockWon = S.fight.win;
    S.screen = "unlock";
    persist();
    render();
    return;
  }
  if (S.run.index >= 30) finish();
  else {
    S.screen = "season";
    persist();
    render();
  }
}

function finish() {
  const fell = fellTo(S.run.history);
  const record = {
    wins: S.run.wins,
    losses: S.run.losses,
    bestStreak: S.run.bestStreak,
    perfect: S.run.wins === 30,
    fellTo: fell ? fell.name : "nobody",
    squad: S.run.picks.map((hero) => hero.name),
    mode: S.run.mode,
    when: Date.now(),
  };
  S.newBest = better(record, S.save.best);
  if (S.newBest) S.save.best = record;
  S.save.last = record;
  if (S.run.mode === "daily") {
    const key = S.run.dailyKey || S.dailyKey;
    S.save.daily = S.save.daily || {};
    const prev = S.save.daily[key];
    if (!prev || better(record, prev)) S.save.daily[key] = { ...record };
  }
  localStorage.setItem(SAVE_KEY, JSON.stringify(S.save));
  sessionStorage.removeItem(RUN_KEY);
  S.resume = null;
  S.screen = "result";
  render();
}

function restore(data) {
  if (!data) return;
  const run = createRun(data.seed, data.mode);
  run.dailyKey = data.dailyKey || null;
  run.picks = (data.pickIds || []).map((id) => heroFromId(id)).filter(Boolean);
  const target = Math.min(data.index || 0, 30);
  while (run.index < target) resolveNext(run);
  S.run = run;
  if (data.dailyKey) S.dailyKey = data.dailyKey;
  if (run.index >= 30) {
    finish();
    return;
  }
  S.screen = run.picks.length >= 5 && data.screen === "confirm" ? "confirm" : data.screen === "draft" ? "draft" : "season";
  if (S.screen === "draft" && run.picks.length >= 5) S.screen = "confirm";
  S.hi = -1;
  persist();
  render();
}

function persist() {
  if (!S.run || S.screen === "result") {
    sessionStorage.removeItem(RUN_KEY);
    S.resume = null;
    return;
  }
  const screen = S.screen === "fight" || S.screen === "unlock" ? "season" : S.screen;
  const payload = {
    seed: S.run.seed,
    mode: S.run.mode,
    dailyKey: S.run.dailyKey || null,
    pickIds: S.run.picks.map((hero) => hero.id),
    index: S.run.index,
    screen,
  };
  sessionStorage.setItem(RUN_KEY, JSON.stringify(payload));
  S.resume = payload;
}

function better(next, prev) {
  if (!prev) return true;
  if (next.wins !== prev.wins) return next.wins > prev.wins;
  if (next.losses !== prev.losses) return next.losses < prev.losses;
  return next.bestStreak > prev.bestStreak;
}

async function shareResult() {
  const text = shareText(S.run);
  try {
    if (navigator.share) {
      await navigator.share({ title: "Unbroken", text });
      return;
    }
  } catch (err) {
    if (err?.name === "AbortError") return;
  }
  await copyText(text);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.left = "-999px";
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }
  toast("Result copied.");
}

function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { best: null, last: null, daily: {} };
    const parsed = JSON.parse(raw);
    return { best: parsed.best || null, last: parsed.last || null, daily: parsed.daily || {} };
  } catch {
    return { best: null, last: null, daily: {} };
  }
}

function loadResume() {
  try {
    const raw = sessionStorage.getItem(RUN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function render() {
  app.innerHTML = view(S);
  window.scrollTo(0, 0);
  bindPortraits(app);
  warmPortraits();
}

function warmPortraits() {
  const run = S.run;
  if (!run) {
    preloadPortraits(HEROES);
    return;
  }
  if (S.screen === "draft") {
    const step = run.picks.length;
    preloadPortraits(run.options[step] || []);
    preloadPortraits(run.options[step + 1] || []);
    preloadPortraits(run.picks);
    return;
  }
  preloadPortraits(run.picks);
  const next = run.rounds?.[run.index];
  if (next) preloadPortraits([next]);
  if (S.screen === "fight" && S.fight?.foe) preloadPortraits([S.fight.foe]);
  if (S.screen === "board") {
    preloadPortraits(BOSSES.map((boss) => ({ ...boss, kind: "boss" })));
    for (const tier of TIERS) preloadPortraits(tier.enemies);
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
