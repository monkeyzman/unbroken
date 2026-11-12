import { portraitURL } from "./portraits.js?v=4";
import { fellTo, rankTitle } from "./run.js";

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

export async function renderShareCard(run) {
  const canvas = document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 960;
  const g = canvas.getContext("2d");
  if (!g) return null;
  try {
    await document.fonts?.load?.('64px "Bangers"');
    await document.fonts?.load?.('28px "Outfit"');
  } catch {
    /* System fonts still draw the card. */
  }
  const fell = fellTo(run.history);
  const perfect = run.wins === 30;
  const faces = await Promise.all((run.picks || []).map((hero) => loadImage(portraitURL(hero))));

  g.fillStyle = "#120814";
  g.fillRect(0, 0, 720, 960);
  g.fillStyle = "#f6e7c8";
  roundRect(g, 36, 36, 648, 888, 28);
  g.fill();
  g.fillStyle = perfect ? "#fff4c2" : "#fff8ea";
  roundRect(g, 56, 56, 608, 848, 22);
  g.fill();

  g.strokeStyle = "#140c12";
  g.lineWidth = 8;
  roundRect(g, 56, 56, 608, 848, 22);
  g.stroke();

  g.fillStyle = "#e23b2f";
  g.beginPath();
  g.arc(590, 130, 70, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "#140c12";
  g.lineWidth = 6;
  g.stroke();

  g.fillStyle = "#e23b2f";
  g.font = '28px "Bangers", Impact, sans-serif';
  g.fillText("UNBROKEN · ASTER CITY", 84, 120);
  g.fillStyle = "#140c12";
  g.font = '120px "Bangers", Impact, sans-serif';
  g.fillText(`${run.wins}–${run.losses}`, 84, 250);

  g.fillStyle = "#fffaf0";
  g.font = '34px "Bangers", Impact, sans-serif';
  const rank = rankTitle(run.wins);
  const rankW = g.measureText(rank).width;
  g.fillStyle = "#e23b2f";
  roundRect(g, 84, 274, rankW + 28, 48, 8);
  g.fill();
  g.strokeStyle = "#140c12";
  g.lineWidth = 4;
  g.stroke();
  g.fillStyle = "#fffaf0";
  g.fillText(rank, 98, 310);

  g.fillStyle = "#140c12";
  g.font = '700 26px Outfit, sans-serif';
  const ending = perfect ? "The Ink Monarch fell." : `Fell to ${fell?.name || "the city"}.`;
  wrapText(g, ending, 84, 380, 540, 34);
  g.font = '600 22px Outfit, sans-serif';
  g.fillStyle = "#5c4b42";
  g.fillText(`Best streak ${run.bestStreak}. ${run.mode === "daily" ? "Daily." : "Exhibition."}`, 84, 460);

  const names = (run.picks || []).map((hero) => hero.name).join("  ·  ");
  g.font = '700 20px Outfit, sans-serif';
  g.fillStyle = "#140c12";
  wrapText(g, names, 84, 510, 540, 28);

  faces.forEach((img, i) => {
    const x = 84 + i * 108;
    const y = 590;
    g.save();
    roundRect(g, x, y, 96, 96, 16);
    g.clip();
    if (img) g.drawImage(img, x, y, 96, 96);
    else {
      g.fillStyle = "#ffd23f";
      g.fillRect(x, y, 96, 96);
    }
    g.restore();
    g.strokeStyle = "#140c12";
    g.lineWidth = 4;
    roundRect(g, x, y, 96, 96, 16);
    g.stroke();
  });

  const history = run.history || [];
  for (let i = 0; i < 30; i++) {
    const col = i % 10;
    const row = Math.floor(i / 10);
    const x = 84 + col * 54;
    const y = 740 + row * 36;
    const item = history[i];
    g.fillStyle = !item ? "#fff" : item.win ? "#c6f54e" : "#ff5d4a";
    g.fillRect(x, y, 46, 26);
    g.strokeStyle = "#140c12";
    g.lineWidth = 3;
    g.strokeRect(x, y, 46, 26);
  }

  g.fillStyle = "#140c12";
  g.font = '22px "Bangers", Impact, sans-serif';
  g.fillText("TRY TO GO 30–0", 84, 860);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

function wrapText(g, text, x, y, max, line) {
  const words = String(text).split(" ");
  let row = "";
  let yy = y;
  for (const word of words) {
    const next = row ? `${row} ${word}` : word;
    if (g.measureText(next).width > max && row) {
      g.fillText(row, x, yy);
      row = word;
      yy += line;
    } else row = next;
  }
  if (row) g.fillText(row, x, yy);
}
