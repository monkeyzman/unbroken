import { STATS, STAT_NAME, totalOf } from "./roster.js";
import { withSynergy } from "./synergy.js";
import { clamp } from "./rng.js";

const KEYS = STATS.map((s) => s.id);

export const TUNING = {
  dmgBrawl: 0.72,
  dmgOtherPwr: 0.22,
  dmgSpdSpike: 0.18,
  dmgOtherSpd: 0.03,
  dmgSmt: 0.04,
  shieldTech: 2.15,
  shieldOther: 0.12,
  shieldPwr: 0.04,
  shieldLeak: 0.1,
  hpBase: 124,
  hpDef: 0.38,
  hpTmw: 0.065,
  tankDefWeight: 1.5,
  wildTmwWeight: 1.45,
  speedInitWeight: 1.6,
  mitK: 260,
  foeMitK: 180,
  varBase: 0.17,
  varFloor: 0.055,
  varTmwSpan: 460,
  windTmw: 390,
  windChance: 0.32,
  windOverkill: 0.09,
  mirrorSteal: 0.56,
  mirrorCracked: 0.26,
  mirrorCrackTmw: 455,
  mirrorAtk: 0.14,
  mirrorTax: 0.9,
  mirrorTaxCracked: 1,
  huntDodge: 104,
  huntBlock: 96,
  huntBlockCost: 0.24,
  huntRage: 1.2,
  hushRestoreSmt: 97,
  hushTmw: 0.6,
  hushTmwRestored: 0.86,
  editorReturnTmw: 470,
  editorGrow: 1.08,
  editorFinaleGrow: 1.1,
  editorFinaleAtk: 1.08,
  seasonOpen: 1.26,
  paperShield: 0.48,
  paperRegen: 0.02,
  extinct: 0.7,
  focusBase: 1.08,
  focusPower: 1.12,
  adaptGrow: 1.075,
  maxBeatsMob: 6,
  maxBeatsBoss: 6,
  maxBeatsFinal: 7,
};

function measure(heroes) {
  const sums = { pwr: 0, spd: 0, smt: 0, def: 0, tmw: 0 };
  for (const h of heroes) for (const key of KEYS) sums[key] += h.stats[key];
  const brawler = heroes.find((h) => h.role === "brawl") || null;
  const tank = heroes.find((h) => h.role === "tank") || null;
  const speed = heroes.find((h) => h.role === "speed") || null;
  const tech = heroes.find((h) => h.role === "tech") || null;
  const wild = heroes.find((h) => h.role === "wild") || null;
  const brawlPwr = brawler ? brawler.stats.pwr : 0;
  const tankDef = tank ? tank.stats.def : 0;
  const spdSpike = speed ? speed.stats.spd : 0;
  const techSmt = tech ? tech.stats.smt : 0;
  const wildTmw = wild ? wild.stats.tmw : 0;
  return {
    sums,
    brawler,
    tank,
    speed,
    tech,
    wild,
    brawlPwr,
    otherPwr: sums.pwr - brawlPwr,
    tankDef,
    otherDef: sums.def - tankDef,
    spdSpike,
    otherSpd: sums.spd - spdSpike,
    techSmt,
    otherSmt: sums.smt - techSmt,
    wildTmw,
    otherTmw: sums.tmw - wildTmw,
    defScore: tankDef * TUNING.tankDefWeight + (sums.def - tankDef),
    tmwScore: wildTmw * TUNING.wildTmwWeight + (sums.tmw - wildTmw),
  };
}

function argmax(sums) {
  let best = "pwr";
  for (const key of KEYS) if (sums[key] > sums[best]) best = key;
  return best;
}

function varianceOf(tmwScore) {
  const t = clamp(tmwScore / TUNING.varTmwSpan, 0, 1);
  return TUNING.varBase - (TUNING.varBase - TUNING.varFloor) * t;
}

function hpOf(m) {
  return Math.round(TUNING.hpBase + m.defScore * TUNING.hpDef + m.tmwScore * TUNING.hpTmw);
}

function activeOf(heroes) {
  return heroes.filter((h) => !h.out);
}

function lerpTowardBase(heroes, frac, tmwMult) {
  for (const h of heroes) {
    const peak = h.peakStats || h.stats;
    for (const key of KEYS) {
      h.stats[key] = Math.round(h.baseStats[key] + (peak[key] - h.baseStats[key]) * frac);
    }
    h.stats.tmw = Math.round(h.stats.tmw * tmwMult);
  }
}

function resolveHunt(heroes, rt, foeName, label) {
  const active = activeOf(heroes);
  if (!active.length) return { text: `${label}: nobody left to chase.`, tone: "info", landed: false };
  const prey = [...active].sort((a, b) => b.stats.spd - a.stats.spd)[0];
  if (prey.stats.spd >= TUNING.huntDodge) {
    rt.dodged = true;
    return {
      text: `${label}: ${prey.name} is already somewhere else. The grab catches air.`,
      tone: "good",
      landed: false,
    };
  }
  const tank = active.find((h) => h.role === "tank");
  if (tank && tank.id !== prey.id && tank.stats.def >= TUNING.huntBlock) {
    const lost = Math.round(tank.stats.def * TUNING.huntBlockCost);
    tank.stats.def = Math.max(0, tank.stats.def - lost);
    rt.blocked = true;
    return {
      text: `${label}: ${tank.name} body-blocks. ${prey.name} stays. The tank gives up ${lost} Defense.`,
      tone: "good",
      landed: false,
    };
  }
  prey.out = true;
  rt.atk *= TUNING.huntRage;
  rt.huntLanded = true;
  rt.benched = prey.name;
  return {
    text: `${label}: ${foeName} yoinks ${prey.name} off the page. The beating speeds up.`,
    tone: "bad",
    landed: true,
  };
}

function setup(heroes, foe, rt, notes) {
  const tags = rt.tags;
  if (foe.kind === "boss") {
    if (foe.mechanic === "mirror") {
      const m = measure(heroes);
      const stat = argmax(m.sums);
      const cracked = m.tmwScore >= TUNING.mirrorCrackTmw;
      const steal = cracked ? TUNING.mirrorCracked : TUNING.mirrorSteal;
      let stolen = 0;
      for (const h of heroes) {
        stolen += h.stats[stat] * steal;
        h.stats[stat] = Math.round(h.stats[stat] * (1 - steal));
      }
      rt.atk += stolen * TUNING.mirrorAtk;
      rt.mirrorTax = cracked ? TUNING.mirrorTaxCracked : TUNING.mirrorTax;
      tags.stolenStat = stat;
      tags.cracked = cracked;
      notes.push({
        tone: cracked ? "good" : "info",
        text: cracked
          ? `Mirrorcut grabs ${STAT_NAME[stat]}, but Teamwork cracks the glass. She keeps a shard.`
          : `Mirrorcut steals ${STAT_NAME[stat]} — your loudest stat — and wears it on the backswing.`,
      });
    } else if (foe.mechanic === "fineprint") {
      rt.shield = foe.shield;
      rt.shieldMax = foe.shield;
      rt.regen = foe.regen;
      notes.push({
        tone: "info",
        text: `Fine Print. A ${foe.shield}-point shield. Smarts can burn the clause. Fists mostly can't, and it grows back.`,
      });
    } else if (foe.mechanic === "hunt") {
      notes.push(resolveHunt(heroes, rt, foe.name, "Hunt the Swift"));
    } else if (foe.mechanic === "season") {
      rt.grow = foe.grow || 1.2;
      rt.pendingOpen = true;
      notes.push({
        tone: "info",
        text: `Season Turn. ${foe.name} gets stronger every exchange. A fast open hits harder. Don't let her grow up.`,
      });
    } else if (foe.mechanic === "hush") {
      const tech = heroes.find((h) => h.role === "tech");
      const reboot = !!(tech && tech.stats.smt >= TUNING.hushRestoreSmt);
      for (const h of heroes) h.peakStats = { ...h.stats };
      lerpTowardBase(heroes, reboot ? 0.5 : 0, reboot ? TUNING.hushTmwRestored : TUNING.hushTmw);
      tags.hushed = true;
      tags.restored = reboot;
      notes.push({
        tone: reboot ? "good" : "bad",
        text: reboot
          ? `Hush falls. ${tech.name} hotwires half the link back on. Teamwork is bruised, not buried.`
          : `Hush. Faction links go dark and Teamwork frays. You fight on raw stats.`,
      });
    } else if (foe.mechanic === "editor") {
      const ace = [...heroes].sort((a, b) => totalOf(b.baseStats) - totalOf(a.baseStats))[0];
      const early = measure(heroes).tmwScore >= TUNING.editorReturnTmw;
      ace.out = true;
      rt.editor = { id: ace.id, name: ace.name, returnBeat: early ? 2 : 4 };
      rt.shield = foe.shield;
      rt.shieldMax = foe.shield;
      rt.regen = foe.regen;
      rt.grow = TUNING.editorGrow;
      tags.erased = ace.name;
      tags.returnedEarly = early;
      notes.push({
        tone: "bad",
        text: `Editor's Cut. ${ace.name}, your highest card, is cut from the opening pages.`,
      });
      notes.push({
        tone: early ? "good" : "info",
        text: early
          ? `Teamwork scribbles ${ace.name} back in early. An ink shield (${foe.shield}) still has to go.`
          : `They don't return until the late pages. An ink shield (${foe.shield}) stands in the way.`,
      });
    }
    return;
  }

  if (foe.field === "paper") {
    rt.shield = Math.round(foe.hp * TUNING.paperShield);
    rt.shieldMax = rt.shield;
    rt.regen = Math.round(foe.hp * TUNING.paperRegen);
    notes.push({
      tone: "info",
      text: `Paper Shield (${rt.shield}). Smarts scratch it. Knuckles mostly wait.`,
    });
  } else if (foe.field === "focus") {
    const loud = argmax(measure(heroes).sums);
    rt.atk *= TUNING.focusBase * (loud === "pwr" ? TUNING.focusPower : 1);
    tags.focusPower = loud === "pwr";
    notes.push({
      tone: "info",
      text:
        loud === "pwr"
          ? `Focused Fire. Power is your loudest stat, so the warhost leans all the way in.`
          : `Focused Fire. They hit harder, hunting for a star to punish.`,
    });
  } else if (foe.field === "adapt") {
    rt.grow = TUNING.adaptGrow;
    notes.push({
      tone: "info",
      text: `Adaptation. ${foe.name} learns a little every exchange.`,
    });
  } else if (foe.field === "weather") {
    notes.push({
      tone: "bad",
      text: `Bad Weather. Faction synergy is blowing away — only half the link holds.`,
    });
  } else if (foe.field === "extinct") {
    const weak = [...heroes].sort((a, b) => totalOf(a.baseStats) - totalOf(b.baseStats))[0];
    for (const key of KEYS) weak.stats[key] = Math.round(weak.stats[key] * TUNING.extinct);
    rt.grow = Math.max(rt.grow, TUNING.adaptGrow);
    tags.pressed = weak.name;
    notes.push({
      tone: "bad",
      text: `Extinction Pressure. The era leans on ${weak.name}, your thinnest card, and the beast is already swelling.`,
    });
  }

  if (foe.ability === "chip") {
    for (const h of heroes) h.stats.spd = Math.round(h.stats.spd * 0.9);
    notes.push({ tone: "foe", text: `${foe.name} drags at your ankles. Speed dips.` });
  } else if (foe.ability === "guard") {
    const extra = Math.round(foe.hp * 0.18);
    rt.shield += extra;
    rt.shieldMax = rt.shield;
    if (!rt.regen) rt.regen = Math.round(foe.hp * 0.02);
    notes.push({ tone: "foe", text: `${foe.name} braces. Shield thickens to ${rt.shield}.` });
  } else if (foe.ability === "dodge") {
    rt.dodgeCheck = true;
    notes.push({ tone: "foe", text: `${foe.name} is slippery. A slow first step might whiff.` });
  } else if (foe.ability === "snipe") {
    const loud = argmax(measure(heroes).sums);
    if (loud === "pwr") rt.atk *= 1.14;
    notes.push({
      tone: "foe",
      text:
        loud === "pwr"
          ? `${foe.name} calls the shot on your Power and leans in.`
          : `${foe.name} hunts for a star hitter and doesn't quite find one.`,
    });
  } else if (foe.ability === "grow") {
    rt.grow = (rt.grow > 1 ? rt.grow : 1) * 1.07;
    notes.push({ tone: "foe", text: `${foe.name} is just getting started. The hits will swell.` });
  } else if (foe.ability === "flicker") {
    for (const h of heroes) h.stats.tmw = Math.round(h.stats.tmw * 0.84);
    notes.push({ tone: "foe", text: `${foe.name} buzzes the comms. Teamwork frays.` });
  } else if (foe.ability === "leech") {
    const stat = argmax(measure(heroes).sums);
    for (const h of heroes) h.stats[stat] = Math.round(h.stats[stat] * 0.88);
    rt.atk += 14;
    notes.push({ tone: "foe", text: `${foe.name} sips your ${STAT_NAME[stat]} and stands up taller.` });
  } else if (foe.ability === "armor") {
    rt.def += 30;
    notes.push({ tone: "foe", text: `${foe.name} is plated. Clean hits will dull.` });
  } else if (foe.ability === "double") {
    const spike = measure(heroes).spdSpike;
    if (rt.spd > spike) {
      rt.atk *= 1.16;
      notes.push({ tone: "foe", text: `${foe.name} is quicker than your runner and swings on the way in.` });
    } else {
      notes.push({ tone: "good", text: `${foe.name} tries to double up. Your runner is already ahead of it.` });
    }
  }
}

function attackerName(m) {
  if (m.brawler) return m.brawler.name;
  const pool = [m.tank, m.speed, m.tech, m.wild].filter(Boolean);
  if (!pool.length) return "The squad";
  return [...pool].sort((a, b) => b.stats.pwr - a.stats.pwr)[0].name;
}

export function simulateFight(squad, foe, rng) {
  const rnd = rng || Math.random;
  const scale = foe.field === "weather" ? 0.5 : 1;
  const { heroes, report } = withSynergy(squad, scale);
  const rt = {
    hp: foe.hp,
    max: foe.hp,
    atk: foe.atk,
    spd: foe.spd,
    def: foe.def,
    shield: 0,
    shieldMax: 0,
    regen: 0,
    grow: foe.grow && foe.mechanic !== "editor" && foe.mechanic !== "season" ? foe.grow : 1,
    pendingOpen: false,
    dodgeCheck: false,
    editor: null,
    tags: {},
  };
  if (foe.mechanic === "season") rt.grow = 1;
  const notes = [];
  if (foe.quote) notes.push({ tone: "foe", text: `“${foe.quote}”` });
  setup(heroes, foe, rt, notes);
  for (const h of heroes) if (!h.peakStats) h.peakStats = { ...h.stats };

  let active = activeOf(heroes);
  let squadMax = hpOf(measure(active));
  let squadHp = squadMax;
  const beats = [];

  const sidelined = () => heroes.filter((h) => h.out).map((h) => h.id);
  const statusLine = () => {
    const out = heroes.filter((h) => h.out);
    if (!out.length) return "";
    return out.map((h) => `${h.name} is off-panel`).join(" · ");
  };
  const push = (text, tone) => {
    beats.push({
      text,
      tone: tone || "info",
      squadHp: Math.max(0, Math.round(squadHp)),
      foeHp: Math.max(0, Math.round(rt.hp)),
      squadMax,
      foeMax: rt.max,
      shield: Math.max(0, Math.round(rt.shield)),
      shieldMax: rt.shieldMax,
      sidelined: sidelined(),
      status: statusLine(),
    });
  };
  for (const note of notes) push(note.text, note.tone);

  const maxBeats =
    foe.mechanic === "editor"
      ? TUNING.maxBeatsFinal
      : foe.kind === "boss"
        ? TUNING.maxBeatsBoss
        : TUNING.maxBeatsMob;

  let windUsed = false;
  let outcome = null;
  let openUsed = false;

  const refreshHpCeil = () => {
    const max = hpOf(measure(activeOf(heroes)));
    if (max > squadMax) {
      squadHp += max - squadMax;
      squadMax = max;
    } else if (max < squadMax) {
      const ratio = squadHp / squadMax;
      squadMax = max;
      squadHp = Math.min(squadHp, Math.round(squadMax * ratio));
    }
  };

  for (let n = 1; n <= maxBeats && !outcome; n++) {
    if (rt.editor && n === rt.editor.returnBeat) {
      const ace = heroes.find((h) => h.id === rt.editor.id);
      if (ace?.out) {
        ace.out = false;
        refreshHpCeil();
        push(`${ace.name} forces the panel back open.`, "good");
      }
    }
    if (rt.editor && n === 4 && !rt.editor.finaleDone) {
      rt.editor.finaleDone = true;
      const tech = activeOf(heroes).find((h) => h.role === "tech");
      const reboot = !!(tech && tech.stats.smt >= TUNING.hushRestoreSmt);
      lerpTowardBase(heroes, reboot ? 0.5 : 0, reboot ? TUNING.hushTmwRestored : TUNING.hushTmw);
      rt.tags.hushed = true;
      rt.tags.restored = reboot;
      rt.grow = TUNING.editorFinaleGrow;
      rt.atk *= TUNING.editorFinaleAtk;
      push(
        reboot
          ? `Last pages. ${tech.name} keeps a thread of synergy lit. The hunt still comes.`
          : `Last pages. Synergy goes dark, and the hunt starts.`,
        reboot ? "good" : "bad",
      );
      const hunt = resolveHunt(heroes, rt, foe.name, "Margin hunt");
      push(hunt.text, hunt.tone);
      refreshHpCeil();
    }

    if (n > 1 && rt.grow > 1.02) {
      rt.atk *= rt.grow;
    }

    active = activeOf(heroes);
    const m = measure(active);
    const spread = varianceOf(m.tmwScore);
    const squadRoll = 1 + (rnd() * 2 - 1) * spread;
    const foeRoll = 1 + (rnd() * 2 - 1) * spread;
    const init = m.spdSpike * TUNING.speedInitWeight + m.otherSpd;
    const squadFirst = init + rnd() * 26 >= rt.spd + rnd() * 26;

    const squadStrike = () => {
      let raw =
        (m.brawlPwr * TUNING.dmgBrawl +
          m.otherPwr * TUNING.dmgOtherPwr +
          m.spdSpike * TUNING.dmgSpdSpike +
          m.otherSpd * TUNING.dmgOtherSpd +
          m.sums.smt * TUNING.dmgSmt) *
        squadRoll;
      if (rt.mirrorTax) raw *= rt.mirrorTax;
      let openNote = "";
      if (rt.pendingOpen && !openUsed && n === 1 && squadFirst) {
        raw *= TUNING.seasonOpen;
        openNote = " The fast open lands heavier.";
        openUsed = true;
      }
      rt.pendingOpen = false;
      let whiff = "";
      if (rt.dodgeCheck && !rt.dodgeUsed) {
        rt.dodgeUsed = true;
        if (rt.spd > m.spdSpike) {
          raw *= 0.4;
          whiff = `${foe.name} slips the first shot. `;
        }
      }
      const who = attackerName(m);
      const mit = rt.def / (rt.def + TUNING.foeMitK);
      if (rt.shield > 0) {
        const burn = Math.max(
          0,
          Math.round(
            (m.techSmt * TUNING.shieldTech + m.otherSmt * TUNING.shieldOther + m.brawlPwr * TUNING.shieldPwr) *
              squadRoll,
          ),
        );
        const before = rt.shield;
        rt.shield = Math.max(0, rt.shield - burn);
        const broke = rt.shield === 0;
        const leak = broke ? 1 : TUNING.shieldLeak;
        const dmg = Math.max(0, Math.round(raw * leak * (1 - mit)));
        rt.hp -= dmg;
        if (rt.shield > 0 && rt.regen) rt.shield = Math.min(rt.shieldMax, rt.shield + rt.regen);
        const techName = m.tech ? m.tech.name : who;
        const brokeLine = broke ? ` ${techName} rips it.` : ` Shield ${Math.round(rt.shield)} left.`;
        push(
          `${whiff}${techName} burns ${Math.min(burn, Math.round(before))} off the shield.${brokeLine} ${who} ${
            dmg > 0 ? `sneaks ${dmg} through.` : "can't land the real hit yet."
          }${openNote}`,
          broke ? "good" : "squad",
        );
      } else {
        const dmg = Math.max(0, Math.round(raw * (1 - mit)));
        rt.hp -= dmg;
        push(`${whiff}${who} lands ${dmg}.${openNote}`, "squad");
      }
      if (rt.hp <= 0) {
        rt.hp = 0;
        push(`${foe.name} drops.`, "good");
        return true;
      }
      return false;
    };

    const foeStrike = () => {
      const mit = m.defScore / (m.defScore + TUNING.mitK);
      let dmg = Math.max(1, Math.round(rt.atk * foeRoll * (1 - mit)));
      const swell = n > 1 && rt.grow > 1.04 ? " Swelling." : "";
      squadHp -= dmg;
      if (squadHp <= 0) {
        const over = -squadHp;
        const canWind =
          !windUsed &&
          m.tmwScore >= TUNING.windTmw &&
          over < squadMax * TUNING.windOverkill &&
          rnd() < TUNING.windChance;
        if (canWind) {
          windUsed = true;
          rt.tags.secondWind = true;
          squadHp = Math.max(8, Math.round(squadMax * 0.08));
          const glue = m.wild ? m.wild.name : "The squad";
          push(`${foe.name} hits for ${dmg}.${swell} ${glue} refuses the last box. Second wind.`, "good");
          return false;
        }
        squadHp = 0;
        push(`${foe.name} hits for ${dmg}.${swell} The squad hits the pavement.`, "bad");
        return true;
      }
      push(`${foe.name} answers for ${dmg}.${swell}`, "foe");
      return false;
    };

    if (squadFirst) {
      if (squadStrike()) outcome = "win";
      else if (foeStrike()) outcome = "loss";
    } else if (foeStrike()) outcome = "loss";
    else if (squadStrike()) outcome = "win";
  }

  if (!outcome) {
    if (foe.kind === "boss") {
      outcome = "loss";
      push(`The page ends. ${foe.name} is still standing.`, "bad");
    } else {
      const ahead = squadHp / squadMax > rt.hp / rt.max;
      outcome = ahead ? "win" : "loss";
      push(
        ahead ? "The bell. You were ahead when it rang." : "The bell. They were still up.",
        ahead ? "good" : "bad",
      );
    }
  }

  const win = outcome === "win";
  const stamps = win
    ? foe.kind === "boss"
      ? ["TOPPLED", "WHAM", "KAPOW"]
      : ["WHAM", "POW", "YES"]
    : foe.kind === "boss"
      ? ["FELLED", "OOF", "DOWN"]
      : ["OOF", "WHIFF", "NOPE"];
  const stamp = stamps[Math.floor(rnd() * stamps.length)];
  const summary = win
    ? `${foe.name} falls. Squad held with ${Math.round((Math.max(squadHp, 0) / squadMax) * 100)}% left.`
    : `${foe.name} wins it. They had ${Math.round((rt.hp / rt.max) * 100)}% left.`;

  return {
    win,
    beats,
    squadHp: Math.max(0, Math.round(squadHp)),
    squadMax,
    foeHp: Math.max(0, Math.round(rt.hp)),
    foeMax: rt.max,
    stamp,
    summary,
    tags: rt.tags,
    synergy: report,
    foe: {
      name: foe.name,
      title: foe.title || "",
      epithet: foe.epithet,
      round: foe.round,
      kind: foe.kind,
      tier: foe.tier,
      tierName: foe.tierName,
      mechanic: foe.mechanic,
      mechanicName: foe.mechanicName || foe.fieldName,
      banner: foe.banner,
      color: foe.color,
      deep: foe.deep,
      ink: foe.ink,
      emoji: foe.emoji,
      id: foe.id,
      quote: foe.quote,
      form: foe.form,
      mask: foe.mask,
    },
  };
}
