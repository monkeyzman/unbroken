import { FACTIONS, ROLES, ROLE_STAT, RARITY_LABEL, STATS, STAT_NAME, heroTotal } from "./roster.js";
import { TIERS, BOSSES, tierAfterBoss } from "./foes.js";
import { synergyBands, loudestStat, printedSums, SPECTRUM_BONUS } from "./synergy.js";
import { bindPortraits, portraitHTML } from "./portraits.js?v=4";
import { fellTo, rankTitle, shareText } from "./run.js";
import { flash, floater, impact, lunge, shake } from "./fx.js?v=4";

const BOSS_FX = {
  vesper: { color: "#d5def5", kind: "shard" },
  halder: { color: "#b6f27a", kind: "seal" },
  sable: { color: "#ff3b30", kind: "streak" },
  orla: { color: "#7dce4a", kind: "leaf" },
  nulla: { color: "#fff6d8", kind: "ring" },
  monarch: { color: "#e23b2f", kind: "ink" },
};

const HYPE = {
  5: ["5–0", "The city noticed."],
  10: ["10–0", "On a tear."],
  15: ["15–0", "Half a legend."],
  20: ["20–0", "They're getting worried."],
  25: ["25–0", "One throne left."],
  30: ["30–0", "Unbroken."],
};

export function esc(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

function openCls(state, extra = "") {
  return ["screen", extra, state.entered ? "enter" : ""].filter(Boolean).join(" ");
}

function synergyChips(heroes, { preview = false } = {}) {
  if (!heroes.length) return `<span class="chip soft">Match a faction and the link lights up.</span>`;
  const { bands, spectrum } = synergyBands(heroes);
  const chips = [];
  if (spectrum) chips.push(`<span class="chip live">Five Banners · +${Math.round(SPECTRUM_BONUS * 100)}% all</span>`);
  for (const band of bands) {
    const pct = Math.round(band.bonus * 100);
    chips.push(
      `<span class="chip live" style="background:${band.color}">${esc(band.name)} ×${band.count} · +${pct}% ${esc(STAT_NAME[band.stat])}</span>`,
    );
  }
  if (!chips.length) {
    chips.push(`<span class="chip soft">${preview ? "No link on this pick yet." : "No faction link yet."}</span>`);
  }
  return chips.join("");
}

function linkClass(heroes) {
  const { bands, spectrum } = synergyBands(heroes);
  return bands.length || spectrum ? " lit" : "";
}

function statBlock(hero) {
  const hot = ROLE_STAT[hero.role];
  return STATS.map((stat) => {
    const value = hero.stats[stat.id];
    return `<div class="stat${stat.id === hot ? " hot" : ""}"><b>${stat.label}</b><i><span style="width:${value}%"></span></i><b>${value}</b></div>`;
  }).join("");
}

function jobHook(hero) {
  if (hero.role === "tank" && hero.stats.def >= 96) return "Body-blocks a hunt.";
  if (hero.role === "tank") return `${96 - hero.stats.def} Defense short of a body-block.`;
  if (hero.role === "tech" && hero.stats.smt >= 97) return "Can reboot a hush.";
  if (hero.role === "tech") return `${97 - hero.stats.smt} Smarts short of a reboot.`;
  if (hero.role === "speed" && hero.stats.spd >= 104) return "Slips a grab.";
  if (hero.role === "speed") return `${104 - hero.stats.spd} Speed short of slipping a grab.`;
  if (hero.role === "brawl" && hero.stats.pwr >= 97) return "Ends fights before they get weird.";
  if (hero.role === "wild" && hero.stats.tmw >= 97) return "Steadies luck and cracks a mirror.";
  return "";
}

function cardHTML(hero, index, picked, deal) {
  const faction = FACTIONS[hero.faction];
  const foil = hero.rarity === "common" ? "" : `<span class="foil" aria-hidden="true"></span>`;
  const hook = jobHook(hero);
  return `<button class="card rarity-${hero.rarity} fac-${hero.faction}${picked ? " picked" : ""}${deal ? " deal" : ""}" data-action="highlight" data-i="${index}" aria-pressed="${picked ? "true" : "false"}">
    ${foil}
    <div class="card-face">${portraitHTML(hero, 72, { eager: true })}<div class="total">TOT ${heroTotal(hero)}</div></div>
    <div>
      <div class="card-meta">
        <span class="rarity ${hero.rarity}">${RARITY_LABEL[hero.rarity]}</span>
        <span class="fac" style="background:${faction.color}">${esc(faction.short)}</span>
      </div>
      <div class="hname">${hero.emoji} ${esc(hero.name)}</div>
      <div class="epi">${esc(hero.epithet)}</div>
      ${hook ? `<div class="hook${/short of/.test(hook) ? "" : " hot"}">${esc(hook)}</div>` : ""}
      <div class="stats">${statBlock(hero)}</div>
    </div>
  </button>`;
}

function slotsHTML(picks) {
  return ROLES.map((role, i) => {
    const hero = picks[i];
    if (!hero) return `<div class="slot" title="${esc(role.name)}"><span class="small">${role.emoji}</span></div>`;
    return `<div class="slot filled" title="${esc(hero.name)}">${portraitHTML(hero, 56, { eager: true, bare: true })}</div>`;
  }).join("");
}

function dotsHTML(history, nextRound) {
  const byRound = new Map(history.map((row) => [row.round, row]));
  let html = `<div class="dots" aria-label="Season map">`;
  for (let round = 1; round <= 30; round++) {
    const row = byRound.get(round);
    const boss = round % 5 === 0;
    let cls = "dot";
    if (boss) cls += " boss";
    if (row) cls += row.win ? " w" : " l";
    else if (round === nextRound) cls += " next";
    html += `<i class="${cls}" title="Round ${round}${boss ? " boss" : ""}">${boss ? "★" : ""}</i>`;
  }
  html += `</div>`;
  return html;
}

function hypeHTML(run) {
  if (!run?.streak || run.streak % 5 !== 0) return "";
  const [big, sub] = HYPE[run.streak] || [`${run.streak}–0`, "Still standing."];
  return `<div class="hype hype-${Math.min(run.streak, 30)}"><b class="display">${esc(big)}</b><span>${esc(sub)}</span></div>`;
}

function motionLabel(motion) {
  if (motion === "full") return "Full motion";
  if (motion === "reduce") return "Reduced";
  return "Match device";
}

export function view(state) {
  const screen = state.screen;
  if (screen === "how") return howScreen(state);
  if (screen === "board") return boardScreen(state);
  if (screen === "settings") return settingsScreen(state);
  if (screen === "draft") return draftScreen(state);
  if (screen === "confirm") return confirmScreen(state);
  if (screen === "season") return seasonScreen(state);
  if (screen === "fight") return fightScreen(state);
  if (screen === "unlock") return unlockScreen(state);
  if (screen === "result") return resultScreen(state);
  return titleScreen(state);
}

function titleScreen(state) {
  const best = state.save.best;
  const daily = state.save.daily?.[state.dailyKey];
  const bestLine = best
    ? `<b class="display">${best.wins}–${best.losses}</b><div>${best.perfect ? "Flawless." : `Fell to ${esc(best.fellTo)}.`}</div>`
    : `<b class="display">NONE</b><div>No record yet.</div>`;
  return `<section class="${openCls(state, "title-screen")}">
    <div class="city" aria-hidden="true">
      <div class="layer sky"></div>
      <div class="layer far"></div>
      <div class="layer near"></div>
      <canvas id="ambience" class="fx-layer"></canvas>
    </div>
    <div class="sunburst" aria-hidden="true"></div>
    <div class="topbar title-hero">
      <span class="kicker">ASTER CITY CIRCUIT</span>
      <span class="top-actions">
        <button class="icon-btn" data-action="mute" aria-label="Toggle sound">${state.set.muted ? "🔇" : "🔊"}</button>
        <button class="icon-btn" data-action="settings" aria-label="Settings">SET</button>
      </span>
    </div>
    <div class="title-hero">
      <h1 class="wordmark"><span>UN</span><span>BROKEN</span></h1>
      <p class="tagline">Draft a starting five. Survive thirty fights. Lose none.</p>
    </div>
    <div class="ticket glass">
      <span class="kicker">BEST ON THIS PHONE</span>
      ${bestLine}
      <div class="sub">${daily ? `Today’s daily: ${daily.wins}-${daily.losses}.` : `Daily ${esc(state.dailyKey)} UTC is open. Same cards for everyone.`}</div>
    </div>
    <div class="stack" style="margin-top:16px">
      ${state.resume ? `<button class="btn ink" data-action="resume">RESUME</button>` : ""}
      <button class="btn" data-action="new-run">NEW RUN</button>
      <button class="btn red" data-action="daily">DAILY CHALLENGE</button>
      <div class="btn-row">
        <button class="btn ghost" data-action="how">HOW IT WORKS</button>
        <button class="btn ghost" data-action="board">THREAT BOARD</button>
      </div>
    </div>
    <p class="small muted" style="margin-top:auto">Original heroes only. Nothing here is borrowed from a comic company.</p>
  </section>`;
}

function settingsScreen(state) {
  const set = state.set;
  return `<section class="${openCls(state)}">
    <div class="topbar"><button class="btn ghost" data-action="back">BACK</button><span class="kicker">SETTINGS</span></div>
    <div class="scroll">
      <article class="panel glass">
        <h2 class="display">Sound</h2>
        <button class="btn ${set.muted ? "red" : "ink"}" data-action="mute">${set.muted ? "SOUND OFF" : "SOUND ON"}</button>
        <label class="slider">Sound effects <b id="sound-readout">${Math.round(set.sound * 100)}</b>
          <input type="range" min="0" max="100" value="${Math.round(set.sound * 100)}" data-setting="sound" data-readout="sound-readout" aria-label="Sound effects volume">
        </label>
        <label class="slider">Music <b id="music-readout">${Math.round(set.music * 100)}</b>
          <input type="range" min="0" max="100" value="${Math.round(set.music * 100)}" data-setting="music" data-readout="music-readout" aria-label="Music volume">
        </label>
      </article>
      <article class="panel">
        <h2 class="display">Feel</h2>
        <button class="btn ghost" data-action="toggle-haptics">HAPTICS ${set.haptics ? "ON" : "OFF"}</button>
        <button class="btn ghost" data-action="cycle-motion">MOTION · ${esc(motionLabel(set.motion)).toUpperCase()}</button>
        <p class="small">Reduced motion follows your device unless you pick full or reduced here. It skips shakes, particles, and the long fight.</p>
      </article>
      <article class="panel">
        <h2 class="display">Battle speed</h2>
        <div class="btn-row speed-row">
          ${[1, 2, 3].map((n) => `<button class="btn ${set.battleSpeed === n ? "ink" : "ghost"}" data-action="set-speed" data-speed="${n}">${n}×</button>`).join("")}
        </div>
        <p class="small">You can also tap the speed button during a fight. Skip still jumps to the stamp.</p>
      </article>
    </div>
  </section>`;
}

function howScreen(state) {
  const factions = Object.values(FACTIONS)
    .map(
      (f) =>
        `<div class="chip" style="background:${f.color}">${esc(f.short)} · ${esc(f.synergy)} · +${esc(STAT_NAME[f.stat])}</div>`,
    )
    .join(" ");
  return `<section class="${openCls(state)}">
    <div class="topbar"><button class="btn ghost" data-action="title">BACK</button><span class="kicker">RULES</span></div>
    <div class="scroll">
      <article class="panel gloss">
        <h2 class="display">The season</h2>
        <p>Five slots. Three cards each. Then thirty fights. Every fifth fight is a boss with a cheat. After each boss, the regulars change — new faces, a new trick.</p>
        <p>Thirty and oh is the only perfect season. It should feel rare. Your best record stays on this phone.</p>
      </article>
      <article class="panel gloss">
        <h2 class="display">Links</h2>
        <p>Two heroes from one faction start a bonus. Three, four, or all five stack it. Five different factions is its own bonus, Five Banners.</p>
        <div class="syn-row" style="margin:8px 0">${factions}</div>
        <p class="small">2 together +8%. 3 +15%. 4 +24%. All 5 +35%. Five Banners +8% to every stat.</p>
      </article>
      <article class="panel gloss">
        <h2 class="display">What the stats do</h2>
        <p><b>Power</b> ends fights. <b>Speed</b> swings first and can slip a grab. <b>Smarts</b> burns shields. <b>Defense</b> keeps the squad standing and can body-block a hunt. <b>Teamwork</b> steadies luck, cracks a mirror, and can scribble a cut hero back in.</p>
        <p class="small">Read the wanted poster before you tap Fight. The cheat is the fight.</p>
      </article>
    </div>
  </section>`;
}

function boardScreen(state) {
  const blocks = BOSSES.map((boss) => {
    return `<article class="panel boss-block">
      <div class="art">${portraitHTML({ ...boss, kind: "boss" }, 148, { eager: false })}</div>
      <p class="kicker" style="margin:8px 0 0">ROUND ${[5, 10, 15, 20, 25, 30][BOSSES.indexOf(boss)]}</p>
      <h2 class="display">${esc(boss.name)}</h2>
      <p class="title-line">${esc(boss.title)}</p>
      <p class="quote">“${esc(boss.quote)}”</p>
      <p class="small">${esc(boss.personality)} ${esc(boss.look)}</p>
      <p><b>${esc(boss.mechanicName)}.</b> ${esc(boss.banner.split("·")[1] || boss.banner)}</p>
      <p class="answer">${esc(boss.answer)}</p>
    </article>`;
  }).join("");
  return `<section class="${openCls(state)}">
    <div class="topbar"><button class="btn ghost" data-action="back">BACK</button><span class="kicker">THREAT BOARD</span></div>
    <div class="scroll">
      <p class="small">Six bosses. Each one cheats differently, and each one hits harder than the last. Scout them, then draft for the holes.</p>
      ${blocks}
      <article class="panel gloss">
        <h2 class="display">After each boss</h2>
        <p>The regulars step up a tier. ${TIERS.map((t) => `<b>${esc(t.name)}</b> (${esc(t.rounds)}): ${esc(t.fieldName)}`).join(". ")}.</p>
      </article>
    </div>
  </section>`;
}

function draftScreen(state) {
  const step = state.run.picks.length;
  const role = ROLES[step];
  const options = state.run.options[step];
  const preview = state.hi >= 0 ? [...state.run.picks, options[state.hi]] : state.run.picks;
  return `<section class="${openCls(state, "draft-screen")}">
    <div class="topbar">
      <button class="icon-btn" data-action="title" aria-label="Back to title">←</button>
      <span class="kicker">DRAFT ${step + 1}/5</span>
      <button class="icon-btn" data-action="undo" ${step === 0 ? "disabled" : ""} aria-label="Undo last pick">↩</button>
    </div>
    <div class="role-head">
      <div class="steps">${ROLES.map((_, i) => `<i class="${i < step ? "done" : i === step ? "on" : ""}"></i>`).join("")}</div>
      <h2 class="display">${role.emoji} ${esc(role.name).toUpperCase()}</h2>
      <p class="small" style="margin:4px 0 8px">${esc(role.blurb)}</p>
    </div>
    <div class="scroll">
      ${options.map((hero, i) => cardHTML(hero, i, i === state.hi, state.justDealt)).join("")}
    </div>
    <footer class="dock">
      <div class="slots">${slotsHTML(state.run.picks)}</div>
      <div class="syn-row${linkClass(preview)}">${synergyChips(preview, { preview: state.hi >= 0 })}</div>
      <button class="btn" data-action="recruit" ${state.hi < 0 ? "disabled" : ""}>RECRUIT</button>
    </footer>
  </section>`;
}

function confirmScreen(state) {
  const picks = state.run.picks;
  const sums = printedSums(picks);
  const loud = loudestStat(sums);
  return `<section class="${openCls(state)}">
    <div class="topbar"><span class="kicker">STARTING FIVE</span></div>
    <h2 class="display" style="font-size:42px;margin:0 0 8px">LOCK THEM IN</h2>
    <div class="squad-row">${picks.map((h) => `<div class="mini" title="${esc(h.name)}">${portraitHTML(h, 48, { eager: true, bare: true })}</div>`).join("")}</div>
    <div class="stack" style="margin-top:10px">
      ${picks
        .map((h) => {
          const f = FACTIONS[h.faction];
          return `<div class="panel gloss" style="padding:8px 10px"><b>${h.emoji} ${esc(h.name)}</b> <span class="small">${esc(ROLES.find((r) => r.id === h.role).name)} · ${esc(f.short)} · ${esc(RARITY_LABEL[h.rarity])}</span></div>`;
        })
        .join("")}
    </div>
    <div class="syn-row${linkClass(picks)}" style="margin-top:10px">${synergyChips(picks)}</div>
    <p class="small"><b>Lean:</b> ${esc(STAT_NAME[loud])} is the loudest printed stat.</p>
    <div class="stack" style="margin-top:auto">
      <button class="btn" data-action="start-season">START THE SEASON</button>
      <button class="btn ghost" data-action="reopen">REOPEN THE DRAFT</button>
    </div>
  </section>`;
}

function seasonScreen(state) {
  const run = state.run;
  const next = run.rounds[run.index];
  const roundLabel = next.kind === "boss" ? `ROUND ${next.round} · BOSS` : `ROUND ${next.round} · ${esc(next.tierName)}`;
  return `<section class="${openCls(state, "season-screen")}">
    <div class="topbar">
      <button class="icon-btn" data-action="title" aria-label="Title">⌂</button>
      <span class="kicker">${roundLabel}</span>
      <button class="icon-btn" data-action="board" aria-label="Threat board">?</button>
    </div>
    <div class="scoreline">
      <div class="record display">${run.wins}–${run.losses}</div>
      <div class="streak${run.streak >= 5 ? " hot" : ""}">STREAK ${run.streak}</div>
    </div>
    ${recapHTML(run)}
    ${hypeHTML(run)}
    ${dotsHTML(run.history, next.round)}
    <article class="poster${next.kind === "boss" ? " wanted-boss" : ""}">
      <div class="art">${portraitHTML(next, 148, { eager: true })}</div>
      <div class="body">
        <p class="kicker" style="margin:0">${next.kind === "boss" ? esc(next.title) : esc(next.tierName)}</p>
        <h3 class="display">${esc(next.name)}</h3>
        <p class="small" style="margin:4px 0">${esc(next.epithet)}</p>
        <div class="trick">${esc(next.banner)}</div>
      </div>
    </article>
    <div class="faces" style="margin:8px 0">${run.picks.map((h) => `<div class="mini" title="${esc(h.name)}">${portraitHTML(h, 32, { eager: true, bare: true })}</div>`).join("")}</div>
    <div class="stack" style="margin-top:auto">
      <button class="btn red" data-action="fight">FIGHT</button>
      <div class="btn-row">
        <button class="btn ghost" data-action="quick">QUICK</button>
        <button class="btn ghost" data-action="sim-all">SIM REST</button>
      </div>
    </div>
  </section>`;
}

function fightScreen(state) {
  const foe = state.fight.foe;
  const picks = state.run.picks;
  const lead = picks.find((h) => h.role === "brawl") || picks[0];
  const boss = foe.kind === "boss";
  const speed = state.set?.battleSpeed || 1;
  return `<section class="${openCls(state, "stage")}${boss ? ` boss-${foe.id}` : ""}" id="fight-root" data-boss="${boss ? foe.id : ""}" data-phase="1">
    <div class="topbar">
      <span class="kicker">ROUND ${foe.round}${boss ? " · BOSS" : ""}</span>
      <span class="small">${state.run.wins}–${state.run.losses}</span>
      <span class="top-actions">
        <button class="icon-btn" id="speed-btn" data-action="speed" aria-label="Battle speed">${speed}×</button>
        <button class="icon-btn" data-action="mute" aria-label="Toggle sound">${state.set.muted ? "🔇" : "🔊"}</button>
      </span>
    </div>
    <div class="banner" id="fight-banner">${esc(foe.banner)}</div>
    <div class="arena" id="arena">
      <canvas id="fx-canvas" class="fx-layer" aria-hidden="true"></canvas>
      <div class="fighter" id="squad-side">
        <div class="who">YOUR FIVE</div>
        <div class="lead" id="squad-lead" data-who="${lead.id}">${portraitHTML(lead, 112, { eager: true })}</div>
        <div class="bar"><span id="squad-bar"></span></div>
        <div class="faces" id="squad-faces">${picks
          .map((h) => `<div class="mini" data-hero="${h.id}" title="${esc(h.name)}">${portraitHTML(h, 28, { eager: true, bare: true })}</div>`)
          .join("")}</div>
      </div>
      <div class="vs-mark" aria-hidden="true">VS</div>
      <div class="fighter foe" id="foe-side">
        <div class="who">${esc(foe.name)}</div>
        <div class="lead" id="foe-lead">${portraitHTML({ ...foe, kind: foe.kind }, 112, { eager: true })}</div>
        <div class="bar foe"><span id="foe-bar"></span></div>
        <div class="bar shield" id="shield-wrap" hidden><span id="shield-bar"></span></div>
      </div>
      <div id="floaters"></div>
    </div>
    <p class="callout" id="status-line"></p>
    <div class="log" id="fight-log"></div>
    <div class="stamp" id="fight-stamp" hidden></div>
    <div class="btn-row">
      <button class="btn ghost" id="fight-skip" data-action="skip">SKIP</button>
      <button class="btn" id="fight-next" data-action="continue" hidden>CONTINUE</button>
    </div>
    ${boss ? bossIntro(foe) : ""}
  </section>`;
}

function bossIntro(foe) {
  return `<div class="boss-intro boss-${esc(foe.id)}" id="boss-intro" hidden>
    <div class="boss-card">
      ${portraitHTML({ ...foe, kind: "boss" }, 148, { eager: true })}
      <p class="kicker">ROUND ${foe.round} · BOSS</p>
      <h2 class="display">${esc(foe.name)}</h2>
      <p class="title-line">${esc(foe.title || foe.epithet)}</p>
      <p class="quote">“${esc(foe.quote || "")}”</p>
    </div>
    <div class="btn-row">
      <button class="btn" data-action="intro-go">ENTER</button>
      <button class="btn ghost" data-action="skip">SKIP FIGHT</button>
    </div>
  </div>`;
}

function unlockScreen(state) {
  const tier = state.unlockTier;
  const won = state.unlockWon;
  const run = state.run;
  return `<section class="${openCls(state, won ? "unlock-win" : "unlock-loss")}">
    ${hypeHTML(run)}
    <p class="kicker">${won ? "BOSS DOWN. SOMETHING WORSE HEARD." : "YOU DROPPED THE BOSS. THE CITY GOT MEANER ANYWAY."}</p>
    <h2 class="display" style="font-size:58px;margin:6px 0">NEW<br>THREATS</h2>
    <p class="display" style="font-size:28px;margin:0">${esc(tier.name)}</p>
    <p class="small">${esc(tier.rounds)}</p>
    <div class="trick">${esc(tier.fieldName)} · ${esc(tier.fieldText)}</div>
    <div class="enemy-grid" style="margin-top:10px">
      ${tier.enemies
        .map(
          (enemy) => `<div class="enemy-card">
            ${portraitHTML({ ...enemy, color: tier.color, deep: tier.deep, ink: tier.ink }, 48)}
            <div><strong>${enemy.emoji} ${esc(enemy.name)}</strong><span>${esc(enemy.abilityName)}</span></div>
          </div>`,
        )
        .join("")}
    </div>
    <p class="small" style="margin-top:8px">${esc(tier.unlock)}</p>
    <button class="btn red" style="margin-top:auto" data-action="onward">ONWARD</button>
  </section>`;
}

function resultScreen(state) {
  const run = state.run;
  const fell = fellTo(run.history);
  const perfect = run.wins === 30;
  const rank = rankTitle(run.wins);
  const names = run.picks.map((h) => h.name).join(" · ");
  const tape = timeline(run.history);
  return `<section class="${openCls(state, "result-screen")}">
    ${perfect ? `<canvas id="fireworks" class="fx-layer" aria-hidden="true"></canvas>${confetti()}` : ""}
    <div class="topbar"><span class="kicker">${run.mode === "daily" ? `DAILY ${esc(state.dailyKey)}` : "EXHIBITION"}</span>${state.newBest ? `<span class="kicker">NEW BEST</span>` : ""}</div>
    <article class="share-card${perfect ? " perfect" : " defeat"}" id="share-card">
      <div class="burst" aria-hidden="true"></div>
      <p class="kicker" style="margin:0">UNBROKEN · ASTER CITY</p>
      <div class="record display">${run.wins}–${run.losses}</div>
      <div class="rank">${rank}</div>
      <p class="ending">${perfect ? "The Ink Monarch fell. Nobody wrote your ending." : `${esc(fell?.name || "The city")} wrote the last panel.`}</p>
      <p class="small rematch">${perfect ? `Best streak ${run.bestStreak}.` : `Best streak ${run.bestStreak}. The next draft doesn't have to end this way.`}</p>
      <p class="small squad-names">${esc(names)}</p>
      <div class="squad-row">${run.picks.map((h) => `<div class="mini">${portraitHTML(h, 48, { eager: true, bare: true })}</div>`).join("")}</div>
      <div class="syn-row${linkClass(run.picks)}" style="margin-top:8px">${synergyChips(run.picks)}</div>
      ${dotsHTML(run.history, 99)}
    </article>
    <div class="stack" style="margin-top:12px">
      ${
        perfect
          ? `<button class="btn" data-action="share">SHARE THE RUN</button>
             <div class="btn-row">
               <button class="btn ghost" data-action="copy">COPY</button>
               <button class="btn red" data-action="draft-again">RUN IT BACK</button>
             </div>`
          : `<button class="btn red" data-action="draft-again">RUN IT BACK</button>
             <div class="btn-row">
               <button class="btn" data-action="share">SHARE</button>
               <button class="btn ghost" data-action="copy">COPY</button>
             </div>`
      }
      ${run.mode === "daily" ? `<button class="btn ghost" data-action="daily">RETRY TODAY’S DRAFT</button>` : ""}
    </div>
    <details style="margin-top:10px">
      <summary class="display" style="font-size:22px">SEASON TAPE</summary>
      <div class="tape">${tape}</div>
    </details>
    <p class="small muted" id="share-text" hidden>${esc(shareText(run))}</p>
  </section>`;
}

function timeline(history) {
  const bits = [];
  for (const row of history) {
    bits.push(
      `<div class="row"><span>${row.round}</span><span class="pill${row.win ? "" : " l"}">${row.win ? "W" : "L"}</span><span>${esc(row.name)}${row.kind === "boss" ? " · boss" : ""}</span></div>`,
    );
    const next = tierAfterBoss(row.round);
    if (row.kind === "boss" && next) {
      bits.push(`<div class="unlock-line">New threats · ${esc(next.name)} · ${esc(next.fieldName)}</div>`);
    }
  }
  return bits.join("");
}

function confetti() {
  const bits = Array.from({ length: 22 }, (_, i) => {
    const left = (i * 47) % 100;
    const delay = (i % 7) * 0.11;
    const color = ["#e23b2f", "#ffd23f", "#243f8f", "#c6f54e", "#ff8ad4"][i % 5];
    return `<i style="left:${left}%;background:${color};animation-delay:${delay}s"></i>`;
  }).join("");
  return `<div class="confetti" aria-hidden="true">${bits}</div>`;
}

export function beatImpact(text) {
  const landed = text.match(/lands (\d+)/);
  const sneak = text.match(/sneaks (\d+)/);
  const hit = text.match(/hits for (\d+)/);
  const answer = text.match(/answers for (\d+)/);
  const dmg = Number((landed || sneak || hit || answer || [])[1] || 0);
  return {
    dmg,
    crit: dmg >= 110 || /heavier/.test(text),
    ko: /drops\./.test(text) || /pavement/.test(text),
    wind: /second wind/i.test(text),
    squadSwing: /lands \d+|sneaks \d+|burns \d+/.test(text),
    foeSwing: /hits for \d+|answers for \d+|pavement/.test(text),
  };
}

function heroNamed(text, picks) {
  let found = null;
  for (const hero of picks || []) {
    if (text.includes(hero.name) && (!found || hero.name.length > found.name.length)) found = hero;
  }
  return found;
}

export function paintFight(result, upto, opts = {}) {
  const beats = result.beats.slice(0, upto);
  const last = beats[beats.length - 1];
  const log = document.getElementById("fight-log");
  const squadBar = document.getElementById("squad-bar");
  const foeBar = document.getElementById("foe-bar");
  if (!log || !last) return;
  const squadPct = last.squadMax ? Math.max(0, Math.round((last.squadHp / last.squadMax) * 100)) : 0;
  const foePct = last.foeMax ? Math.max(0, Math.round((last.foeHp / last.foeMax) * 100)) : 0;
  squadBar.style.width = `${squadPct}%`;
  foeBar.style.width = `${foePct}%`;
  squadBar.style.background = squadPct < 28 ? "#ff5d4a" : squadPct < 58 ? "#ffd23f" : "#c6f54e";
  const shieldWrap = document.getElementById("shield-wrap");
  if (last.shieldMax > 0) {
    shieldWrap.hidden = false;
    document.getElementById("shield-bar").style.width = `${Math.round((last.shield / last.shieldMax) * 100)}%`;
  } else if (shieldWrap) shieldWrap.hidden = true;
  log.innerHTML = beats
    .map((beat, index) => {
      const fresh = !opts.instant && index === beats.length - 1 ? " fresh" : "";
      return `<div class="bubble ${beat.tone}${fresh}">${esc(beat.text)}</div>`;
    })
    .join("");
  log.scrollTop = log.scrollHeight;
  const status = document.getElementById("status-line");
  if (status) status.textContent = last.status || "";
  document.querySelectorAll("#squad-faces .mini").forEach((node) => {
    node.classList.toggle("off", (last.sidelined || []).includes(node.dataset.hero));
  });
  const root = document.getElementById("fight-root");
  if (root) {
    const phase = foePct > 66 ? "1" : foePct > 33 ? "2" : "3";
    root.dataset.phase = phase;
  }
  document.getElementById("squad-side")?.classList.toggle("ko", last.squadHp <= 0);
  document.getElementById("foe-side")?.classList.toggle("ko", last.foeHp <= 0);

  const lead = document.getElementById("squad-lead");
  const named = heroNamed(last.text, opts.picks);
  if (named && lead && lead.dataset.who !== named.id) {
    lead.dataset.who = named.id;
    lead.innerHTML = portraitHTML(named, 112, { eager: true });
    bindPortraits(lead);
  }

  if (opts.instant || opts.reduced) return;
  const hit = beatImpact(last.text);
  const foeFx = BOSS_FX[result.foe?.id] || { color: result.foe?.color || "#ff5d4a", kind: "spark" };
  const hero = named || (opts.picks || []).find((item) => item.id === lead?.dataset.who);
  const heroColor = (hero && FACTIONS[hero.faction]?.color) || "#ffd23f";
  if (hit.squadSwing) {
    lunge("squad-side");
    flash("foe-side");
    impact("foe", { color: heroColor, kind: result.foe?.kind === "boss" ? foeFx.kind : "spark", crit: hit.crit });
  } else if (hit.foeSwing) {
    lunge("foe-side");
    flash("squad-side");
    impact("squad", { color: foeFx.color, kind: foeFx.kind, crit: hit.crit });
  }
  const side = hit.squadSwing ? "foe" : "squad";
  if (hit.wind) floater("SECOND WIND", true, side);
  else if (hit.ko) floater(hit.dmg ? `${hit.dmg} KO` : "KO", true, side);
  else if (hit.dmg) floater(hit.crit ? `${hit.dmg} CRIT` : String(hit.dmg), hit.crit, side);
  if (hit.crit || hit.ko) shake("#fight-root", hit.crit ? 1.5 : 1.1);
  else if (hit.dmg || hit.squadSwing || hit.foeSwing) shake("#arena", 0.7);
}

export function showBossIntro() {
  const el = document.getElementById("boss-intro");
  if (!el) return;
  el.hidden = false;
}

export function hideBossIntro() {
  const el = document.getElementById("boss-intro");
  if (el) el.hidden = true;
}

export function marginOf(result) {
  const foePct = result.foeMax ? Math.round((result.foeHp / result.foeMax) * 100) : 0;
  const squadPct = result.squadMax ? Math.round((result.squadHp / result.squadMax) * 100) : 0;
  if (result.win && result.foe?.kind === "boss") return { kind: "huge", text: "THE PAGE IS YOURS" };
  if (result.win && squadPct <= 22) return { kind: "hair", text: `BY A HAIR · ${squadPct}% of the squad left` };
  if (!result.win && foePct <= 24) return { kind: "close", text: `SO CLOSE · ${result.foe?.name || "They"} had ${foePct}% left` };
  if (!result.win) return { kind: "fair", text: `${result.foe?.name || "They"} still had ${foePct}%. The swing was earned.` };
  return { kind: "clean", text: `${squadPct}% of the squad still standing` };
}

function recapHTML(run) {
  const last = run.history?.[run.history.length - 1];
  if (!last) return "";
  if (last.win && last.squadLeft <= 22) return `<p class="recap hair">Last one was a hair. ${last.squadLeft}% left.</p>`;
  if (last.win) return `<p class="recap">${esc(last.name)} fell. ${last.squadLeft}% of the squad held.</p>`;
  if ((last.foeLeft ?? 100) <= 24) return `<p class="recap close">${esc(last.name)} had ${last.foeLeft}% left. Answer the cheat.</p>`;
  return `<p class="recap">${esc(last.name)} kept ${last.foeLeft ?? "?"}%. Read the poster, then swing.</p>`;
}

export function showStamp(result) {
  const stamp = document.getElementById("fight-stamp");
  const skip = document.getElementById("fight-skip");
  const next = document.getElementById("fight-next");
  const root = document.getElementById("fight-root");
  if (!stamp) return;
  const margin = marginOf(result);
  stamp.hidden = false;
  stamp.innerHTML = `${esc(result.stamp)}<small class="margin ${margin.kind}">${esc(margin.text)}</small>`;
  stamp.classList.toggle("loss", !result.win);
  stamp.classList.toggle("boss-win", !!(result.win && result.foe?.kind === "boss"));
  stamp.classList.toggle("close", margin.kind === "close" || margin.kind === "hair");
  if (root && result.win && result.foe?.kind === "boss") root.classList.add("boss-down");
  if (root && (margin.kind === "close" || margin.kind === "hair")) root.classList.add("close-call");
  if (skip) skip.hidden = true;
  if (next) next.hidden = false;
}

export function toast(message) {
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  document.body.appendChild(node);
  setTimeout(() => node.remove(), 1700);
}
