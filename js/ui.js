import { FACTIONS, ROLES, ROLE_STAT, RARITY_LABEL, STATS, heroTotal } from "./roster.js";
import { TIERS, BOSSES, tierAfterBoss } from "./foes.js";
import { STAT_NAME } from "./roster.js";
import { synergyBands, loudestStat, printedSums, SPECTRUM_BONUS } from "./synergy.js";
import { portraitSVG, actorArt } from "./portraits.js";
import { fellTo, rankTitle, shareText } from "./run.js";

export function esc(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

function synergyChips(heroes, { preview = false } = {}) {
  if (!heroes.length) return `<span class="chip soft">Match a faction and the link lights up.</span>`;
  const { bands, spectrum } = synergyBands(heroes);
  const chips = [];
  if (spectrum) chips.push(`<span class="chip">Five Banners · +${Math.round(SPECTRUM_BONUS * 100)}% all</span>`);
  for (const band of bands) {
    const pct = Math.round(band.bonus * 100);
    chips.push(
      `<span class="chip" style="background:${band.color}">${esc(band.name)} ×${band.count} · +${pct}% ${esc(STAT_NAME[band.stat])}</span>`,
    );
  }
  if (!chips.length) {
    chips.push(`<span class="chip soft">${preview ? "No link on this pick yet." : "No faction link yet."}</span>`);
  }
  return chips.join("");
}

function statBlock(hero) {
  const hot = ROLE_STAT[hero.role];
  return STATS.map((stat) => {
    const value = hero.stats[stat.id];
    return `<div class="stat${stat.id === hot ? " hot" : ""}"><b>${stat.label}</b><i><span style="width:${value}%"></span></i><b>${value}</b></div>`;
  }).join("");
}

function cardHTML(hero, index, picked) {
  const faction = FACTIONS[hero.faction];
  return `<button class="card rarity-${hero.rarity}${picked ? " picked" : ""}" data-action="highlight" data-i="${index}" aria-pressed="${picked ? "true" : "false"}">
    <div>${portraitSVG(hero, 72)}<div class="total">TOT ${heroTotal(hero)}</div></div>
    <div>
      <div class="card-meta">
        <span class="rarity ${hero.rarity}">${RARITY_LABEL[hero.rarity]}</span>
        <span class="fac" style="background:${faction.color}">${esc(faction.short)}</span>
      </div>
      <div class="hname">${hero.emoji} ${esc(hero.name)}</div>
      <div class="epi">${esc(hero.epithet)}</div>
      <div class="stats">${statBlock(hero)}</div>
    </div>
  </button>`;
}

function slotsHTML(picks) {
  return ROLES.map((role, i) => {
    const hero = picks[i];
    if (!hero) return `<div class="slot" title="${esc(role.name)}"><span class="small">${role.emoji}</span></div>`;
    return `<div class="slot filled" title="${esc(hero.name)}">${portraitSVG(hero, 56)}</div>`;
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

export function view(state) {
  const screen = state.screen;
  if (screen === "how") return howScreen();
  if (screen === "board") return boardScreen();
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
    : `<b class="display">—</b><div>No record yet.</div>`;
  return `<section class="screen">
    <div class="sunburst" aria-hidden="true"></div>
    <div class="topbar title-hero">
      <span class="kicker">ASTER CITY CIRCUIT</span>
      <button class="icon-btn" data-action="mute" aria-label="Toggle sound">${state.mute ? "🔇" : "🔊"}</button>
    </div>
    <div class="title-hero">
      <h1 class="wordmark">UN<br>BROKEN</h1>
      <p class="tagline">Draft a starting five. Survive thirty fights. Lose none.</p>
    </div>
    <div class="ticket">
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

function howScreen() {
  const factions = Object.values(FACTIONS)
    .map(
      (f) =>
        `<div class="chip" style="background:${f.color}">${esc(f.short)} · ${esc(f.synergy)} · +${esc(STAT_NAME[f.stat])}</div>`,
    )
    .join(" ");
  return `<section class="screen">
    <div class="topbar"><button class="btn ghost" data-action="title">BACK</button><span class="kicker">RULES</span></div>
    <div class="scroll">
      <article class="panel">
        <h2 class="display">The season</h2>
        <p>Five slots. Three cards each. Then thirty fights. Every fifth fight is a boss with a cheat. After each boss, the regulars change — new faces, a new trick.</p>
        <p>Thirty and oh is the only perfect season. It should feel rare. Your best record stays on this phone.</p>
      </article>
      <article class="panel">
        <h2 class="display">Links</h2>
        <p>Two heroes from one faction start a bonus. Three, four, or all five stack it. Five different factions is its own bonus, Five Banners.</p>
        <div class="syn-row" style="margin:8px 0">${factions}</div>
        <p class="small">2 together +8%. 3 +15%. 4 +24%. All 5 +35%. Five Banners +8% to every stat.</p>
      </article>
      <article class="panel">
        <h2 class="display">What the stats do</h2>
        <p><b>Power</b> ends fights. <b>Speed</b> swings first and can slip a grab. <b>Smarts</b> burns shields. <b>Defense</b> keeps the squad standing and can body-block a hunt. <b>Teamwork</b> steadies luck, cracks a mirror, and can scribble a cut hero back in.</p>
        <p class="small">Read the wanted poster before you tap Fight. The cheat is the fight.</p>
      </article>
    </div>
  </section>`;
}

function boardScreen() {
  const blocks = BOSSES.map((boss) => {
    return `<article class="panel boss-block">
      <div class="art">${actorArt({ ...boss, kind: "boss" })}</div>
      <p class="kicker" style="margin:8px 0 0">ROUND ${[5, 10, 15, 20, 25, 30][BOSSES.indexOf(boss)]}</p>
      <h2 class="display">${esc(boss.name)}</h2>
      <p class="quote">“${esc(boss.quote)}”</p>
      <p class="small">${esc(boss.personality)} ${esc(boss.look)}</p>
      <p><b>${esc(boss.mechanicName)}.</b> ${esc(boss.banner.split("·")[1] || boss.banner)}</p>
      <p class="answer">${esc(boss.answer)}</p>
    </article>`;
  }).join("");
  return `<section class="screen">
    <div class="topbar"><button class="btn ghost" data-action="back">BACK</button><span class="kicker">THREAT BOARD</span></div>
    <div class="scroll">
      <p class="small">Six bosses. Each one cheats differently, and each one hits harder than the last. Scout them, then draft for the holes.</p>
      ${blocks}
      <article class="panel">
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
  return `<section class="screen">
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
      ${options.map((hero, i) => cardHTML(hero, i, i === state.hi)).join("")}
    </div>
    <footer class="dock">
      <div class="slots">${slotsHTML(state.run.picks)}</div>
      <div class="syn-row">${synergyChips(preview, { preview: state.hi >= 0 })}</div>
      <button class="btn" data-action="recruit" ${state.hi < 0 ? "disabled" : ""}>RECRUIT</button>
    </footer>
  </section>`;
}

function confirmScreen(state) {
  const picks = state.run.picks;
  const sums = printedSums(picks);
  const loud = loudestStat(sums);
  return `<section class="screen">
    <div class="topbar"><span class="kicker">STARTING FIVE</span></div>
    <h2 class="display" style="font-size:42px;margin:0 0 8px">LOCK THEM IN</h2>
    <div class="squad-row">${picks.map((h) => `<div class="mini" title="${esc(h.name)}">${portraitSVG(h, 48)}</div>`).join("")}</div>
    <div class="stack" style="margin-top:10px">
      ${picks
        .map((h) => {
          const f = FACTIONS[h.faction];
          return `<div class="panel" style="padding:8px 10px"><b>${h.emoji} ${esc(h.name)}</b> <span class="small">${esc(ROLES.find((r) => r.id === h.role).name)} · ${esc(f.short)} · ${esc(RARITY_LABEL[h.rarity])}</span></div>`;
        })
        .join("")}
    </div>
    <div class="syn-row" style="margin-top:10px">${synergyChips(picks)}</div>
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
  return `<section class="screen">
    <div class="topbar">
      <button class="icon-btn" data-action="title" aria-label="Title">⌂</button>
      <span class="kicker">${roundLabel}</span>
      <button class="icon-btn" data-action="board" aria-label="Threat board">?</button>
    </div>
    <div class="scoreline">
      <div class="record display">${run.wins}–${run.losses}</div>
      <div class="streak">STREAK ${run.streak}</div>
    </div>
    ${dotsHTML(run.history, next.round)}
    <article class="poster">
      <div class="art">${actorArt(next, 120)}</div>
      <div class="body">
        <p class="kicker" style="margin:0">${next.kind === "boss" ? esc(next.title) : esc(next.tierName)}</p>
        <h3 class="display">${esc(next.name)}</h3>
        <p class="small" style="margin:4px 0">${esc(next.epithet)}</p>
        <div class="trick">${esc(next.banner)}</div>
      </div>
    </article>
    <div class="faces" style="margin:8px 0">${run.picks.map((h) => `<div class="mini" title="${esc(h.name)}">${portraitSVG(h, 32)}</div>`).join("")}</div>
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
  return `<section class="screen fight" id="fight-root">
    <div class="topbar">
      <span class="kicker">ROUND ${foe.round}${foe.kind === "boss" ? " · BOSS" : ""}</span>
      <span class="small">${state.run.wins}–${state.run.losses}</span>
    </div>
    <div class="banner" id="fight-banner">${esc(foe.banner)}</div>
    <div class="duel">
      <div class="side" id="squad-side">
        <div class="who">YOUR FIVE</div>
        <div class="bar"><span id="squad-bar"></span></div>
        <div class="faces" id="squad-faces">${picks
          .map((h) => `<div class="mini" data-hero="${h.id}" title="${esc(h.name)}">${portraitSVG(h, 28)}</div>`)
          .join("")}</div>
      </div>
      <div class="side foe" id="foe-side">
        <div class="who">${esc(foe.name)}</div>
        <div class="bar foe"><span id="foe-bar"></span></div>
        <div class="bar shield" id="shield-wrap" hidden><span id="shield-bar"></span></div>
        <div style="margin-top:6px">${actorArt({ ...foe, kind: foe.kind }, 72)}</div>
      </div>
    </div>
    <p class="small" id="status-line" style="min-height:1.2em;margin:0"></p>
    <div class="log" id="fight-log"></div>
    <div class="stamp" id="fight-stamp" hidden></div>
    <div class="btn-row">
      <button class="btn ghost" id="fight-skip" data-action="skip">SKIP</button>
      <button class="btn" id="fight-next" data-action="continue" hidden>CONTINUE</button>
    </div>
  </section>`;
}

function unlockScreen(state) {
  const tier = state.unlockTier;
  const won = state.unlockWon;
  return `<section class="screen">
    <p class="kicker">${won ? "YOU WON. SOMETHING WORSE HEARD." : "YOU DROPPED THE BOSS. THE CITY GOT MEANER ANYWAY."}</p>
    <h2 class="display" style="font-size:58px;margin:6px 0">NEW<br>THREATS</h2>
    <p class="display" style="font-size:28px;margin:0">${esc(tier.name)}</p>
    <p class="small">${esc(tier.rounds)}</p>
    <div class="trick">${esc(tier.fieldName)} · ${esc(tier.fieldText)}</div>
    <div class="enemy-grid" style="margin-top:10px">
      ${tier.enemies
        .map(
          (enemy) => `<div class="enemy-card">
            ${portraitSVG({ ...enemy, color: tier.color, deep: tier.deep, ink: tier.ink }, 48)}
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
  return `<section class="screen">
    ${perfect ? confetti() : ""}
    <div class="topbar"><span class="kicker">${run.mode === "daily" ? `DAILY ${esc(state.dailyKey)}` : "EXHIBITION"}</span>${state.newBest ? `<span class="kicker">NEW BEST</span>` : ""}</div>
    <article class="share-card${perfect ? " perfect" : ""}" id="share-card">
      <div class="burst" aria-hidden="true"></div>
      <p class="kicker" style="margin:0">UNBROKEN · ASTER CITY</p>
      <div class="record display">${run.wins}–${run.losses}</div>
      <div class="rank">${rank}</div>
      <p style="font-weight:800;position:relative">${
        perfect ? "The Ink Monarch fell." : `Fell to ${esc(fell?.name || "the city")}.`
      }</p>
      <p class="small" style="position:relative">Best streak ${run.bestStreak}. ${esc(names)}</p>
      <div class="squad-row">${run.picks.map((h) => `<div class="mini">${portraitSVG(h, 48)}</div>`).join("")}</div>
      <div class="syn-row" style="margin-top:8px;position:relative">${synergyChips(run.picks)}</div>
      ${dotsHTML(run.history, 99)}
    </article>
    <div class="stack" style="margin-top:12px">
      <button class="btn" data-action="share">SHARE</button>
      <div class="btn-row">
        <button class="btn ghost" data-action="copy">COPY</button>
        <button class="btn ghost" data-action="draft-again">DRAFT AGAIN</button>
      </div>
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
  const bits = Array.from({ length: 18 }, (_, i) => {
    const left = (i * 53) % 100;
    const delay = (i % 6) * 0.12;
    const color = ["#e23b2f", "#ffd23f", "#243f8f", "#c6f54e"][i % 4];
    return `<i style="left:${left}%;background:${color};animation-delay:${delay}s"></i>`;
  }).join("");
  return `<div class="confetti" aria-hidden="true">${bits}</div>`;
}

export function paintFight(result, upto) {
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
  const shieldWrap = document.getElementById("shield-wrap");
  if (last.shieldMax > 0) {
    shieldWrap.hidden = false;
    document.getElementById("shield-bar").style.width = `${Math.round((last.shield / last.shieldMax) * 100)}%`;
  } else shieldWrap.hidden = true;
  log.innerHTML = beats
    .map((beat) => `<div class="bubble ${beat.tone}">${esc(beat.text)}</div>`)
    .join("");
  log.scrollTop = log.scrollHeight;
  const status = document.getElementById("status-line");
  if (status) status.textContent = last.status || "";
  document.querySelectorAll("#squad-faces .mini").forEach((node) => {
    node.classList.toggle("off", (last.sidelined || []).includes(node.dataset.hero));
  });
  const side = last.tone === "foe" || last.tone === "bad" ? "squad-side" : "foe-side";
  const node = document.getElementById(side);
  if (node) {
    node.classList.remove("shake");
    void node.offsetWidth;
    node.classList.add("shake");
  }
}

export function showStamp(result) {
  const stamp = document.getElementById("fight-stamp");
  const skip = document.getElementById("fight-skip");
  const next = document.getElementById("fight-next");
  if (!stamp) return;
  stamp.hidden = false;
  stamp.textContent = result.stamp;
  stamp.classList.toggle("loss", !result.win);
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
