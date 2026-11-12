import { beatImpact, hideBossIntro, paintFight, showBossIntro, showStamp, toast, view } from "./ui.js?v=4";
import { createRun, fellTo, heroFromId, resolveNext, shareText } from "./run.js";
import { dailyKey, dailySeed, exhibitSeed } from "./rng.js?v=2";
import { BOSSES, TIERS, tierAfterBoss } from "./foes.js";
import { HEROES } from "./roster.js";
import { configureAudio, primeAudio, resumeAudio, sfx, startBed, suspendAudio } from "./audio.js?v=4";
import { buzz, loadSettings, motionReduced, saveSettings } from "./settings.js?v=4";
import { bindPortraits, preloadPortraits } from "./portraits.js?v=4";
import { stopFx, syncFx } from "./fx.js?v=4";
import { renderShareCard } from "./sharecard.js?v=4";

const SAVE_KEY = "unbroken.save.v1";
const RUN_KEY = "unbroken.run.v1";
const app = document.querySelector("#app");

const S = {
  screen: "title",
  run: null,
  hi: -1,
  fight: null,
  save: loadSave(),
  set: loadSettings(),
  dailyKey: dailyKey(),
  resume: loadResume(),
  returnTo: "title",
  unlockTier: null,
  unlockWon: false,
  newBest: false,
  anim: 0,
  paintedScreen: "",
  dealStep: -1,
  entered: true,
  justDealt: false,
  hypeFor: "",
  introRelease: null,
  audioOn: false,
};

configureAudio(S.set);
applyMotionClass();
render();
warmRoster();
registerWorker();

app.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button || button.disabled) return;
  const action = button.dataset.action;
  try {
    primeAudio();
    S.audioOn = true;
    resumeAudio();
  } catch {
    /* Audio must never cancel the button. */
  }
  const fn = actions[action];
  if (fn) fn(button);
  if (action !== "skip" && action !== "mute" && action !== "intro-go") {
    try {
      sfx.tap();
      buzz("tap", S.set);
    } catch {
      /* Sound must not cancel New Run or Draft Again. */
    }
  }
});

app.addEventListener("input", (event) => {
  const key = event.target.dataset?.setting;
  if (!key) return;
  const value = Number(event.target.value);
  if (key === "sound" || key === "music") S.set[key] = value / 100;
  saveSettings(S.set);
  try {
    configureAudio(S.set);
    if (S.audioOn) syncBed();
  } catch {
    /* Ignore mixer errors while dragging a slider. */
  }
  const readout = document.getElementById(event.target.dataset.readout || "");
  if (readout) readout.textContent = String(value);
});

app.addEventListener("pointermove", onTilt);
app.addEventListener("pointerdown", onTilt);
app.addEventListener("pointerup", clearTilt);
app.addEventListener("pointercancel", clearTilt);
app.addEventListener("pointerleave", clearTilt);

document.addEventListener("visibilitychange", () => {
  try {
    if (document.hidden) {
      suspendAudio();
      stopFx();
    } else {
      if (S.audioOn) resumeAudio();
      syncPresentation();
    }
  } catch {
    /* Backgrounding the tab is not a crash. */
  }
});

const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
motionQuery.addEventListener?.("change", () => {
  if (S.set.motion !== "auto") return;
  applyMotionClass();
  try {
    syncPresentation();
  } catch {
    /* Ignore. */
  }
});

const actions = {
  mute() {
    S.set.muted = !S.set.muted;
    saveSettings(S.set);
    try {
      configureAudio(S.set);
      if (!S.set.muted) syncBed();
    } catch {
      /* Mute still flips the icon if audio is blocked. */
    }
    if (S.screen === "fight") {
      document.querySelectorAll('[data-action="mute"]').forEach((btn) => {
        btn.textContent = S.set.muted ? "🔇" : "🔊";
      });
      return;
    }
    render();
  },
  settings() {
    S.returnTo = S.screen === "settings" ? "title" : S.screen;
    if (S.returnTo === "fight" || S.returnTo === "unlock") S.returnTo = "season";
    S.screen = "settings";
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
    if (S.returnTo === "fight") S.returnTo = "season";
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
    try {
      sfx.flip();
    } catch {
      /* Ignore. */
    }
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
    try {
      sfx.recruit();
      buzz("hit", S.set);
    } catch {
      /* Ignore. */
    }
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
  speed() {
    const order = [1, 2, 3];
    const cur = order.includes(S.set.battleSpeed) ? S.set.battleSpeed : 1;
    S.set.battleSpeed = order[(order.indexOf(cur) + 1) % order.length];
    saveSettings(S.set);
    const btn = document.getElementById("speed-btn");
    if (btn) btn.textContent = `${S.set.battleSpeed}×`;
  },
  "set-speed"(button) {
    const speed = Number(button.dataset.speed);
    S.set.battleSpeed = [1, 2, 3].includes(speed) ? speed : 1;
    saveSettings(S.set);
    render();
  },
  "toggle-haptics"() {
    S.set.haptics = !S.set.haptics;
    saveSettings(S.set);
    if (S.set.haptics) buzz("tap", S.set);
    render();
  },
  "cycle-motion"() {
    const order = ["auto", "full", "reduce"];
    const i = Math.max(0, order.indexOf(S.set.motion));
    S.set.motion = order[(i + 1) % order.length];
    saveSettings(S.set);
    render();
  },
  skip() {
    S.anim += 1;
    releaseIntro();
    if (!S.fight) return;
    hideBossIntro();
    paintFight(S.fight, S.fight.beats.length, {
      instant: true,
      picks: S.run?.picks || [],
    });
    showStamp(S.fight);
    try {
      if (S.fight.win) sfx.win();
      else sfx.bad();
    } catch {
      /* Ignore. */
    }
  },
  "intro-go"() {
    hideBossIntro();
    releaseIntro();
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
  S.hypeFor = "";
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
  play(S.fight, quick);
}

async function play(result, quick) {
  const token = ++S.anim;
  const reduced = motionReduced(S.set);
  const beats = result.beats;
  const boss = result.foe?.kind === "boss";
  if (boss && !quick) {
    showBossIntro();
    try {
      sfx.boss();
      buzz("boss", S.set);
      startBed("boss");
    } catch {
      /* The intro still shows if the sting fails. */
    }
    await wait(Math.max(520, (reduced ? 700 : 1500) / (S.set.battleSpeed || 1)));
    if (token !== S.anim) return;
    hideBossIntro();
  }
  if (token !== S.anim) return;
  if (quick || reduced) {
    paintFight(result, beats.length, { instant: true, picks: S.run?.picks || [], reduced });
    showStamp(result);
    finishSound(result);
    return;
  }
  paintFight(result, 1, { picks: S.run?.picks || [] });
  voiceBeat(beats[0]);
  for (let i = 2; i <= beats.length; i++) {
    await wait(beatMs(beats[i - 1]));
    if (token !== S.anim) return;
    paintFight(result, i, { picks: S.run?.picks || [], reduced: motionReduced(S.set) });
    voiceBeat(beats[i - 1]);
  }
  if (token !== S.anim) return;
  showStamp(result);
  finishSound(result);
}

function beatMs(beat) {
  const speed = S.set.battleSpeed || 1;
  const heavy = beat?.tone === "bad" || beat?.tone === "good" ? 640 : beat?.tone === "info" ? 420 : 540;
  return Math.max(150, heavy / speed);
}

function voiceBeat(beat) {
  if (!beat) return;
  try {
    const hit = beatImpact(beat.text);
    if (hit.ko) {
      sfx.ko();
      buzz(beat.tone === "bad" ? "loss" : "hit", S.set);
    } else if (hit.crit) {
      sfx.crit();
      buzz("crit", S.set);
    } else if (beat.tone === "good") {
      sfx.good();
      buzz("hit", S.set);
    } else if (beat.tone === "foe" || beat.tone === "bad") {
      sfx.hit();
      buzz("hit", S.set);
    }
  } catch {
    /* A sound error must never freeze the exchange. */
  }
}

function finishSound(result) {
  try {
    if (result.win) {
      sfx.win();
      buzz(result.foe?.kind === "boss" ? "win" : "hit", S.set);
    } else {
      sfx.bad();
      buzz("loss", S.set);
    }
  } catch {
    /* Ignore. */
  }
}

function releaseIntro() {
  const fn = S.introRelease;
  S.introRelease = null;
  if (fn) fn();
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
  try {
    if (S.run.wins === 30) {
      sfx.hype();
      buzz("win", S.set);
    }
  } catch {
    /* Ignore. */
  }
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
  let file = null;
  try {
    const blob = await renderShareCard(S.run);
    if (blob) file = new File([blob], "unbroken-run.png", { type: "image/png" });
  } catch {
    file = null;
  }
  try {
    if (file && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: "Unbroken", text, files: [file] });
      return;
    }
    if (navigator.share) {
      await navigator.share({ title: "Unbroken", text });
      return;
    }
  } catch (err) {
    if (err?.name === "AbortError") return;
  }
  if (file) downloadBlob(file);
  await copyText(text, file ? "Card saved. Result copied." : undefined);
}

function downloadBlob(file) {
  try {
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name || "unbroken-run.png";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  } catch {
    /* The text copy still lands. */
  }
}

async function copyText(text, message = "Result copied.") {
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
  toast(message);
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
  const step = S.run?.picks.length ?? -1;
  S.justDealt = S.screen === "draft" && S.dealStep !== step;
  S.entered = S.screen !== S.paintedScreen;
  S.paintedScreen = S.screen;
  applyMotionClass();
  app.dataset.screen = S.screen;
  app.innerHTML = view(S);
  if (S.screen === "draft") S.dealStep = step;
  window.scrollTo(0, 0);
  bindPortraits(app);
  warmPortraits();
  syncPresentation();
  try {
    if (S.audioOn) syncBed();
  } catch {
    /* Ignore. */
  }
  celebrate();
}

function syncPresentation() {
  try {
    if (motionReduced(S.set) || document.hidden) {
      stopFx();
      return;
    }
    if (S.screen === "title") syncFx("title");
    else if (S.screen === "fight") syncFx("fight");
    else if (S.screen === "result" && S.run?.wins === 30) syncFx("fireworks");
    else stopFx();
  } catch {
    stopFx();
  }
}

function syncBed() {
  if (S.set.muted || S.set.music <= 0) {
    startBed("");
    return;
  }
  let name = "title";
  if (S.screen === "draft" || S.screen === "confirm") name = "draft";
  else if (S.screen === "season" || S.screen === "unlock") name = "season";
  else if (S.screen === "fight") name = S.fight?.foe?.kind === "boss" ? "boss" : "fight";
  else if (S.screen === "result") name = S.run?.wins === 30 ? "perfect" : "result";
  startBed(name);
}

function celebrate() {
  if (!S.run || (S.screen !== "season" && S.screen !== "unlock")) return;
  if (!S.run.streak || S.run.streak % 5 !== 0) return;
  const key = `${S.run.index}:${S.run.streak}`;
  if (S.hypeFor === key) return;
  S.hypeFor = key;
  try {
    sfx.hype();
    buzz("win", S.set);
  } catch {
    /* Ignore. */
  }
}

function warmPortraits() {
  const run = S.run;
  if (!run) return;
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
}

function warmRoster() {
  const kick = () => {
    preloadPortraits(HEROES);
    preloadPortraits(BOSSES.map((boss) => ({ ...boss, kind: "boss" })));
    for (const tier of TIERS) preloadPortraits(tier.enemies);
  };
  if ("requestIdleCallback" in window) requestIdleCallback(kick, { timeout: 1200 });
  else setTimeout(kick, 400);
}

function applyMotionClass() {
  const root = document.documentElement;
  root.classList.toggle("motion-full", S.set.motion === "full");
  root.classList.toggle("motion-reduce", S.set.motion === "reduce" || (S.set.motion === "auto" && motionReduced(S.set)));
  root.classList.toggle("motion-auto", S.set.motion === "auto");
}

function onTilt(event) {
  if (motionReduced(S.set)) return;
  const card = event.target.closest?.(".card");
  document.querySelectorAll(".card.tilting").forEach((node) => {
    if (node !== card) {
      node.classList.remove("tilting");
      node.style.removeProperty("--rx");
      node.style.removeProperty("--ry");
    }
  });
  if (!card) return;
  const rect = card.getBoundingClientRect();
  const px = (event.clientX - rect.left) / rect.width;
  const py = (event.clientY - rect.top) / rect.height;
  card.style.setProperty("--rx", `${(0.5 - py) * 7}deg`);
  card.style.setProperty("--ry", `${(px - 0.5) * 9}deg`);
  card.style.setProperty("--mx", `${px * 100}%`);
  card.style.setProperty("--my", `${py * 100}%`);
  card.classList.add("tilting");
}

function clearTilt(event) {
  const stay = event?.type === "pointermove" || event?.type === "pointerdown";
  if (stay) return;
  document.querySelectorAll(".card.tilting").forEach((card) => {
    card.classList.remove("tilting");
    card.style.removeProperty("--rx");
    card.style.removeProperty("--ry");
  });
}

function registerWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

function wait(ms) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      S.introRelease = null;
      resolve();
    }, ms);
    S.introRelease = () => {
      clearTimeout(timer);
      S.introRelease = null;
      resolve();
    };
  });
}
