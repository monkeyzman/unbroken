import { FACTIONS } from "./roster.js";

const SKINS = ["#f6d7bd", "#e8b98a", "#c68642", "#8d5524", "#f3e2cf", "#d7a07a"];
const FURS = ["#c47a3a", "#8d5a32", "#d8b15a", "#6e4a32", "#b5654a"];

function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 33 + str.charCodeAt(i)) >>> 0;
  return h;
}

function palette(actor) {
  if (actor.faction && FACTIONS[actor.faction]) {
    const f = FACTIONS[actor.faction];
    return { bg: f.color, deep: f.deep, ink: "#140c12" };
  }
  return {
    bg: actor.color || "#e7d7b8",
    deep: actor.deep || "#333",
    ink: actor.ink || "#140c12",
  };
}

function bust(actor, skin, ink) {
  const mask = actor.mask || "none";
  const form = actor.form || "person";
  if (form === "beast") {
    return `
      <ellipse cx="40" cy="74" rx="26" ry="14" fill="${skin}" stroke="${ink}" stroke-width="3"/>
      <ellipse cx="40" cy="40" rx="16" ry="14" fill="${skin}" stroke="${ink}" stroke-width="3"/>
      <path d="M26 30 L22 14 L34 26" fill="${skin}" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M54 30 L58 14 L46 26" fill="${skin}" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>
      <ellipse cx="40" cy="46" rx="8" ry="6" fill="#f3d2b5" stroke="${ink}" stroke-width="2"/>
      <circle cx="34" cy="38" r="2.2" fill="${ink}"/>
      <circle cx="46" cy="38" r="2.2" fill="${ink}"/>
      <path d="M36 50 Q40 54 44 50" fill="none" stroke="${ink}" stroke-width="2"/>
    `;
  }
  if (form === "construct") {
    return `
      <rect x="16" y="58" width="48" height="20" rx="6" fill="${skin}" stroke="${ink}" stroke-width="3"/>
      <rect x="22" y="18" width="36" height="40" rx="6" fill="${skin}" stroke="${ink}" stroke-width="3"/>
      <rect x="28" y="32" width="24" height="8" rx="2" fill="${ink}"/>
      <circle cx="30" cy="26" r="2" fill="${ink}"/>
      <circle cx="50" cy="26" r="2" fill="${ink}"/>
      <circle cx="30" cy="50" r="2" fill="${ink}"/>
      <circle cx="50" cy="50" r="2" fill="${ink}"/>
    `;
  }
  if (form === "specter") {
    return `
      <path d="M24 70 C20 50 22 28 40 18 C58 28 60 50 56 70 C50 62 46 70 40 64 C34 70 30 62 24 70Z" fill="${skin}" stroke="${ink}" stroke-width="3"/>
      <circle cx="33" cy="40" r="3" fill="#fff" stroke="${ink}" stroke-width="2"/>
      <circle cx="47" cy="40" r="3" fill="#fff" stroke="${ink}" stroke-width="2"/>
      <circle cx="33" cy="40" r="1.3" fill="${ink}"/>
      <circle cx="47" cy="40" r="1.3" fill="${ink}"/>
    `;
  }
  const eyes =
    mask === "visor" || mask === "helm"
      ? `<rect x="26" y="36" width="28" height="7" rx="2" fill="${ink}"/>`
      : `<circle cx="33" cy="38" r="2.3" fill="${ink}"/><circle cx="47" cy="38" r="2.3" fill="${ink}"/>`;
  let overlay = "";
  if (mask === "domino") overlay = `<rect x="24" y="34" width="32" height="10" rx="5" fill="${ink}" opacity="0.9"/>`;
  if (mask === "hood") overlay = `<path d="M18 42 C18 16 62 16 62 42 L56 36 C56 22 24 22 24 36Z" fill="${ink}" opacity="0.82"/>`;
  if (mask === "helm") overlay = `<path d="M22 40 C22 16 58 16 58 40 L52 34 C52 22 28 22 28 36Z" fill="${ink}" opacity="0.88"/>`;
  if (mask === "halo") overlay = `<ellipse cx="40" cy="16" rx="14" ry="5" fill="none" stroke="${ink}" stroke-width="3"/>`;
  if (mask === "grin") overlay = `<path d="M30 48 Q40 58 50 48" fill="none" stroke="${ink}" stroke-width="3"/>`;
  if (mask === "half") overlay = `<path d="M40 20 L40 56 C28 54 24 40 26 28Z" fill="${ink}" opacity="0.35"/>`;
  if (mask === "band") overlay = `<rect x="24" y="34" width="32" height="8" fill="#f4efe4" stroke="${ink}" stroke-width="2"/>`;
  if (mask === "crown") overlay = `<path d="M24 28 L28 16 L34 26 L40 12 L46 26 L52 16 L56 28Z" fill="#ffd23f" stroke="${ink}" stroke-width="2"/>`;
  return `
    <ellipse cx="40" cy="74" rx="26" ry="14" fill="${skin}" stroke="${ink}" stroke-width="3"/>
    <circle cx="40" cy="36" r="16" fill="${skin}" stroke="${ink}" stroke-width="3"/>
    ${eyes}
    ${overlay}
  `;
}

export function portraitSVG(actor, size = 72) {
  const { bg, ink } = palette(actor);
  const n = hash(actor.id || actor.name || "x");
  const skin =
    actor.form === "beast"
      ? FURS[n % FURS.length]
      : actor.form === "construct"
        ? "#d9dde6"
        : actor.form === "specter"
          ? bg
          : SKINS[n % SKINS.length];
  const pid = `dot-${actor.id || "a"}-${size}`;
  return `<svg class="portrait" viewBox="0 0 80 80" width="${size}" height="${size}" aria-hidden="true">
    <defs>
      <pattern id="${pid}" width="5" height="5" patternUnits="userSpaceOnUse">
        <circle cx="1" cy="1" r="0.8" fill="${ink}" opacity="0.28"/>
      </pattern>
    </defs>
    <rect width="80" height="80" rx="10" fill="${bg}"/>
    <rect width="80" height="80" rx="10" fill="url(#${pid})"/>
    ${bust(actor, skin, ink)}
    <circle cx="64" cy="16" r="11" fill="#fffaf0" stroke="${ink}" stroke-width="2"/>
    <text x="64" y="20" text-anchor="middle" font-size="12">${actor.emoji || "✦"}</text>
  </svg>`;
}

function frame(id, inner, bg = "#f4e4c4") {
  const pid = `bossdots-${id}`;
  return `<svg class="boss-art" viewBox="0 0 200 148" role="img">
    <defs>
      <pattern id="${pid}" width="6" height="6" patternUnits="userSpaceOnUse">
        <circle cx="1" cy="1" r="0.9" fill="#140c12" opacity="0.18"/>
      </pattern>
    </defs>
    <rect width="200" height="148" rx="8" fill="${bg}"/>
    <rect width="200" height="148" rx="8" fill="url(#${pid})"/>
    ${inner}
  </svg>`;
}

const BOSSES_ART = {
  vesper: () =>
    frame("vesper", `
      <rect width="200" height="148" fill="#e4e7f8"/>
      <polygon points="18,120 40,40 70,120" fill="#f6f7ff" stroke="#140c12" stroke-width="3"/>
      <polygon points="130,120 160,36 186,120" fill="#c5d0ea" stroke="#140c12" stroke-width="3"/>
      <polygon points="78,18 122,18 118,130 82,130" fill="#f4efe8" stroke="#140c12" stroke-width="3"/>
      <path d="M100 18 L92 130" stroke="#9aa6c8" stroke-width="4"/>
      <path d="M78 70 H122" stroke="#140c12" stroke-width="4"/>
      <circle cx="90" cy="58" r="4" fill="#140c12"/>
      <circle cx="112" cy="58" r="4" fill="#fff" stroke="#140c12" stroke-width="2"/>
      <path d="M86 88 Q100 98 114 84" fill="none" stroke="#140c12" stroke-width="3"/>
      <polygon points="146,28 156,48 168,30 164,52 180,46" fill="#d5def5" stroke="#140c12" stroke-width="2"/>
    `, "#e4e7f8"),
  halder: () =>
    frame("halder", `
      <rect width="200" height="148" fill="#e7f6d8"/>
      <rect x="28" y="28" width="100" height="96" rx="4" fill="#f7f3e4" stroke="#140c12" stroke-width="3"/>
      <path d="M40 48 H116 M40 62 H110 M40 76 H116 M40 90 H90" stroke="#140c12" stroke-width="2"/>
      <circle cx="148" cy="58" r="36" fill="#f0c84a" stroke="#140c12" stroke-width="4"/>
      <circle cx="148" cy="58" r="24" fill="none" stroke="#140c12" stroke-width="2"/>
      <text x="148" y="66" text-anchor="middle" font-family="Bangers, Impact, sans-serif" font-size="28" fill="#140c12">V</text>
      <path d="M150 96 L176 132" stroke="#8a5a20" stroke-width="4"/>
      <path d="M176 132 l8 -16 l-4 2" fill="#222" stroke="#140c12" stroke-width="2"/>
    `, "#e7f6d8"),
  sable: () =>
    frame("sable", `
      <rect width="200" height="148" fill="#2a0c12"/>
      <path d="M-10 40 H210 M-10 70 H210 M-10 100 H210" stroke="#ff5a4a" stroke-width="2" opacity="0.45"/>
      <path d="M30 110 L58 36 L78 110 Z" fill="#ff8d7a" stroke="#140c12" stroke-width="3"/>
      <path d="M78 112 L112 28 L136 112 Z" fill="#e10600" stroke="#140c12" stroke-width="3"/>
      <path d="M128 114 L158 44 L186 114 Z" fill="#7a1020" stroke="#140c12" stroke-width="3"/>
      <circle cx="66" cy="58" r="3" fill="#fff"/>
      <circle cx="120" cy="52" r="3" fill="#fff"/>
      <circle cx="166" cy="64" r="3" fill="#fff"/>
    `, "#2a0c12"),
  orla: () =>
    frame("orla", `
      <rect width="200" height="148" fill="#d7f0c4"/>
      <path d="M20 130 C40 90 30 70 50 60 C40 40 70 20 100 28 C130 16 160 40 150 64 C176 74 170 110 150 130Z" fill="#2f6b32" stroke="#140c12" stroke-width="3"/>
      <circle cx="100" cy="78" r="26" fill="#e7c2a2" stroke="#140c12" stroke-width="3"/>
      <circle cx="92" cy="76" r="3" fill="#140c12"/>
      <circle cx="110" cy="76" r="3" fill="#140c12"/>
      <path d="M92 88 Q100 94 110 88" fill="none" stroke="#140c12" stroke-width="2"/>
      <circle cx="62" cy="48" r="6" fill="#e85d8c" stroke="#140c12" stroke-width="2"/>
      <circle cx="138" cy="44" r="6" fill="#f2d24a" stroke="#140c12" stroke-width="2"/>
      <circle cx="150" cy="70" r="5" fill="#fff" stroke="#140c12" stroke-width="2"/>
      <path d="M40 120 C70 100 130 100 164 122" fill="none" stroke="#1c3d16" stroke-width="4"/>
    `, "#d7f0c4"),
  nulla: () =>
    frame("nulla", `
      <rect width="200" height="148" fill="#f7f1dc"/>
      <circle cx="100" cy="74" r="22" fill="#fffaf0" stroke="#140c12" stroke-width="3"/>
      <path d="M88 80 H112" stroke="#140c12" stroke-width="2"/>
      <path d="M92 80 v6 M100 80 v8 M108 80 v6" stroke="#c9a24a" stroke-width="2"/>
      <circle cx="48" cy="48" r="14" fill="#fff" stroke="#140c12" stroke-width="3"/>
      <circle cx="152" cy="48" r="14" fill="#fff" stroke="#140c12" stroke-width="3"/>
      <circle cx="40" cy="100" r="13" fill="#fff" stroke="#140c12" stroke-width="3"/>
      <circle cx="160" cy="100" r="13" fill="#fff" stroke="#140c12" stroke-width="3"/>
      <circle cx="100" cy="28" r="12" fill="#fff" stroke="#140c12" stroke-width="3"/>
      <circle cx="100" cy="124" r="12" fill="#fff" stroke="#140c12" stroke-width="3"/>
      <path d="M40 48 H56 M144 48 H160 M34 100 H48 M152 100 H166 M92 28 H108 M92 124 H108" stroke="#140c12" stroke-width="2"/>
    `, "#f7f1dc"),
  monarch: () =>
    frame("monarch", `
      <rect width="200" height="148" fill="#f6e7c8"/>
      <path d="M46 46 L58 18 L74 42 L100 10 L126 42 L142 18 L154 46 Z" fill="#e23b2f" stroke="#140c12" stroke-width="3"/>
      <rect x="48" y="46" width="104" height="78" fill="#fffaf0" stroke="#140c12" stroke-width="4"/>
      <path d="M48 46 H152" stroke="#140c12" stroke-width="3"/>
      <circle cx="86" cy="78" r="5" fill="#140c12"/>
      <circle cx="116" cy="78" r="5" fill="#140c12"/>
      <path d="M78 98 Q100 118 124 96" fill="none" stroke="#e23b2f" stroke-width="4"/>
      <path d="M70 124 C74 140 78 146 82 148" fill="none" stroke="#140c12" stroke-width="3"/>
      <path d="M120 126 C126 142 130 146 136 150" fill="none" stroke="#140c12" stroke-width="3"/>
      <rect x="156" y="70" width="8" height="36" fill="#e23b2f" stroke="#140c12" stroke-width="2"/>
    `, "#f6e7c8"),
};

export function bossArt(id) {
  const draw = BOSSES_ART[id];
  return draw ? draw() : "";
}

export function actorArt(actor, size = 84) {
  if (actor.kind === "boss" && BOSSES_ART[actor.id]) return bossArt(actor.id);
  return portraitSVG(actor, size);
}
