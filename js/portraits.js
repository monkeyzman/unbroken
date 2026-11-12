import { FACTIONS } from "./roster.js";

const BOSSES = new Set(["vesper", "halder", "sable", "orla", "nulla", "monarch"]);
const warmed = new Set();

function attr(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

export function portraitKind(actor) {
  if (!actor) return "foes";
  if (actor.kind === "boss" || BOSSES.has(actor.id)) return "bosses";
  if (actor.role || (actor.faction && FACTIONS[actor.faction])) return "heroes";
  return "foes";
}

export function portraitURL(actor) {
  const kind = portraitKind(actor);
  const id = String(actor?.id || "unknown").replace(/[^a-z0-9_-]/gi, "");
  return `./assets/portraits/${kind}/${id}.webp`;
}

function rimOf(actor) {
  if (actor?.faction && FACTIONS[actor.faction]) return FACTIONS[actor.faction].color;
  if (portraitKind(actor) === "bosses") return actor.deep || "#e23b2f";
  return actor?.color || "#ffd23f";
}

function plateOf(actor) {
  if (actor?.faction && FACTIONS[actor.faction]) return FACTIONS[actor.faction].deep;
  return actor?.deep || actor?.color || "#241820";
}

/** Square portrait <img> with a faction rim. Falls back to the emoji plate if the file fails. */
export function portraitHTML(actor, size = 72, opts = {}) {
  const safe = actor || { id: "unknown", emoji: "✦" };
  const kind = portraitKind(safe);
  const faction = safe.faction && FACTIONS[safe.faction] ? safe.faction : "";
  const px = Math.max(16, Math.round(Number(size) || 72));
  const eager = opts.eager ? "eager" : "lazy";
  const bare = opts.bare ? " bare" : "";
  return `<span class="frame kind-${kind}${faction ? ` fac-${faction}` : ""}${bare}" style="--rim:${rimOf(safe)};--plate:${plateOf(safe)};--s:${px}px;width:${px}px;height:${px}px" data-emoji="${attr(safe.emoji || "✦")}"><img class="portrait" src="${portraitURL(safe)}" alt="" width="${px}" height="${px}" loading="${eager}" decoding="async" draggable="false"></span>`;
}

export function portraitSVG(actor, size = 72) {
  return portraitHTML(actor, size);
}

export function actorArt(actor, size = 120) {
  return portraitHTML(actor, size, { eager: true });
}

export function bossArt(id) {
  return portraitHTML({ id, kind: "boss", emoji: "✦" }, 160, { eager: true });
}

export function preloadPortraits(actors) {
  if (!actors || typeof Image === "undefined") return;
  for (const actor of actors) {
    if (!actor?.id) continue;
    const url = portraitURL(actor);
    if (warmed.has(url)) continue;
    warmed.add(url);
    const img = new Image();
    img.decoding = "async";
    img.src = url;
  }
}

export function bindPortraits(root) {
  if (!root) return;
  root.querySelectorAll("img.portrait").forEach((img) => {
    const fail = () => {
      const frame = img.closest(".frame");
      if (frame) frame.classList.add("miss");
    };
    if (img.dataset.bound) return;
    img.dataset.bound = "1";
    img.addEventListener("error", fail);
    if (img.complete && img.naturalWidth === 0) fail();
  });
}
