let raf = 0;
let running = false;
let mode = "off";
let canvas = null;
let g = null;
let viewW = 1;
let viewH = 1;
let parts = [];
let clock = 0;
let last = 0;
let spawnAcc = 0;

const BURST = ["#ffd23f", "#e23b2f", "#fff6e8", "#7ef0ff", "#c6f54e"];

function fit(node) {
  const parent = node.parentElement || node;
  const w = Math.max(1, parent.clientWidth || 390);
  const h = Math.max(1, parent.clientHeight || 640);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  if (node.width !== Math.floor(w * dpr) || node.height !== Math.floor(h * dpr)) {
    node.width = Math.floor(w * dpr);
    node.height = Math.floor(h * dpr);
  }
  node.style.width = `${w}px`;
  node.style.height = `${h}px`;
  const ctx = node.getContext("2d", { alpha: true });
  if (!ctx) return null;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  viewW = w;
  viewH = h;
  return ctx;
}

function pushPart(part) {
  parts.push(part);
  if (parts.length > 160) parts.splice(0, parts.length - 160);
}

function spray(x, y, color, kind, count, speed) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const sp = (speed || 90) * (0.35 + Math.random());
    pushPart({
      x,
      y,
      vx: Math.cos(angle) * sp,
      vy: Math.sin(angle) * sp,
      life: 0.38 + Math.random() * 0.4,
      age: 0,
      color,
      size: kind === "streak" ? 8 + Math.random() * 10 : 3.2 + Math.random() * 4.2,
      kind,
      rot: Math.random() * Math.PI,
      spin: Math.random() * 7 - 3.5,
    });
  }
}

function seedMotes(count) {
  for (let i = 0; i < count; i++) {
    pushPart({
      x: Math.random() * viewW,
      y: Math.random() * viewH,
      vx: -6 + Math.random() * 12,
      vy: -18 - Math.random() * 22,
      life: 6 + Math.random() * 4,
      age: Math.random() * 2,
      color: Math.random() > 0.7 ? "#ffd23f" : "#fff6e8",
      size: 1.2 + Math.random() * 2.2,
      kind: "mote",
      rot: 0,
      spin: 0,
    });
  }
}

export function stopFx() {
  running = false;
  if (raf) cancelAnimationFrame(raf);
  raf = 0;
  parts = [];
  canvas = null;
  g = null;
  mode = "off";
  clock = 0;
}

export function syncFx(kind) {
  try {
    stopFx();
    if (!kind || kind === "off") return;
    const id = kind === "title" ? "ambience" : kind === "fireworks" ? "fireworks" : "fx-canvas";
    canvas = document.getElementById(id);
    if (!canvas) return;
    g = fit(canvas);
    if (!g) return;
    mode = kind;
    parts = [];
    clock = 0;
    spawnAcc = 0;
    if (kind === "title") seedMotes(32);
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  } catch {
    stopFx();
  }
}

function pointOf(id) {
  if (!canvas) return null;
  const node = document.getElementById(id);
  const stage = canvas.parentElement;
  if (!node || !stage) return null;
  const a = stage.getBoundingClientRect();
  const b = node.getBoundingClientRect();
  return {
    x: b.left - a.left + b.width / 2,
    y: b.top - a.top + b.height / 2,
  };
}

export function impact(which, opts = {}) {
  try {
    if (mode !== "fight" || !canvas) return;
    const at = pointOf(which === "squad" ? "squad-lead" : "foe-lead");
    if (!at) return;
    const kind = opts.kind || "spark";
    const color = opts.color || "#ffd23f";
    const count = opts.crit ? 32 : 16;
    spray(at.x, at.y, color, kind, count, opts.crit ? 210 : 130);
    if (kind === "ring" || opts.crit) {
      pushPart({
        x: at.x,
        y: at.y,
        vx: 0,
        vy: 0,
        life: 0.42,
        age: 0,
        color,
        size: 12,
        kind: "ring",
        rot: 0,
        spin: 0,
      });
    }
  } catch {
    /* Particles are garnish. */
  }
}

export function shake(selector, mag = 1) {
  try {
    const node = typeof selector === "string" ? document.querySelector(selector) : selector;
    if (!node) return;
    node.classList.remove("rumble");
    node.style.setProperty("--rumble", `${Math.min(10, 4 * mag)}px`);
    void node.offsetWidth;
    node.classList.add("rumble");
  } catch {
    /* Shake is optional. */
  }
}

export function lunge(id) {
  try {
    const node = document.getElementById(id);
    if (!node) return;
    node.classList.remove("lunge", "flash");
    void node.offsetWidth;
    node.classList.add("lunge");
  } catch {
    /* Ignore. */
  }
}

export function flash(id) {
  try {
    const node = document.getElementById(id);
    if (!node) return;
    node.classList.remove("flash");
    void node.offsetWidth;
    node.classList.add("flash");
  } catch {
    /* Ignore. */
  }
}

export function floater(text, crit, side = "foe") {
  try {
    const layer = document.getElementById("floaters");
    if (!layer || !text) return;
    while (layer.children.length > 3) layer.firstElementChild?.remove();
    const el = document.createElement("div");
    el.className = crit ? "floater crit" : "floater";
    el.textContent = text;
    const base = side === "squad" ? 22 : 74;
    el.style.left = `${base + Math.random() * 8}%`;
    layer.appendChild(el);
    setTimeout(() => el.remove(), 760);
  } catch {
    /* Ignore. */
  }
}

function draw(p, alpha) {
  g.save();
  g.translate(p.x, p.y);
  g.rotate(p.rot);
  g.globalAlpha = Math.max(0, alpha);
  g.fillStyle = p.color;
  g.strokeStyle = p.color;
  if (p.kind === "ring") {
    g.lineWidth = 2;
    g.beginPath();
    g.arc(0, 0, p.size, 0, Math.PI * 2);
    g.stroke();
  } else if (p.kind === "shard" || p.kind === "seal") {
    g.fillRect(-p.size, -p.size * 0.35, p.size * 2, p.size * 0.7);
  } else if (p.kind === "leaf") {
    g.beginPath();
    g.ellipse(0, 0, p.size * 0.6, p.size * 1.3, 0, 0, Math.PI * 2);
    g.fill();
  } else if (p.kind === "streak") {
    g.fillRect(-p.size, -1.2, p.size * 2, 2.4);
  } else if (p.kind === "ink") {
    g.beginPath();
    g.arc(0, 0, p.size * 1.15, 0, Math.PI * 2);
    g.fill();
  } else {
    g.beginPath();
    g.arc(0, 0, p.size, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

function step(dt) {
  if (!g || !canvas) return;
  if ((clock += dt) > 0.5) {
    const next = fit(canvas);
    if (next) g = next;
    clock = 0;
  }
  g.clearRect(0, 0, viewW, viewH);
  spawnAcc += dt;
  if (mode === "fireworks" && spawnAcc > 0.42) {
    spawnAcc = 0;
    spray(
      30 + Math.random() * (viewW - 60),
      40 + Math.random() * (viewH * 0.42),
      BURST[Math.floor(Math.random() * BURST.length)],
      "spark",
      34,
      180,
    );
  }
  if (mode === "title" && parts.length < 36 && spawnAcc > 0.35) {
    spawnAcc = 0;
    pushPart({
      x: Math.random() * viewW,
      y: viewH + 6,
      vx: -8 + Math.random() * 16,
      vy: -16 - Math.random() * 24,
      life: 7,
      age: 0,
      color: Math.random() > 0.75 ? "#ffd23f" : "#fff6e8",
      size: 1.2 + Math.random() * 2,
      kind: "mote",
      rot: 0,
      spin: 0,
    });
  }
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.age += dt;
    if (p.age >= p.life) {
      parts.splice(i, 1);
      continue;
    }
    if (p.kind === "ring") p.size += dt * 140;
    else {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
      const gravity = p.kind === "mote" ? 0 : p.kind === "ink" || p.kind === "leaf" ? 90 : 28;
      p.vy += gravity * dt;
      p.vx *= 0.985;
    }
    const fade = p.kind === "mote" ? 0.55 : 1 - p.age / p.life;
    draw(p, fade);
  }
}

function tick(now) {
  if (!running) return;
  const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
  last = now;
  try {
    step(dt);
  } catch {
    stopFx();
    return;
  }
  raf = requestAnimationFrame(tick);
}
