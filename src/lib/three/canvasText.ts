import * as THREE from "three";

/**
 * Shared soft radial-gradient sprite (particles, portal glow, clouds).
 * Created once and cached for the whole session.
 */
let softSprite: THREE.CanvasTexture | null = null;

export function getSoftSprite(): THREE.CanvasTexture {
  if (softSprite) return softSprite;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.35, "rgba(255,255,255,0.5)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  softSprite = new THREE.CanvasTexture(canvas);
  return softSprite;
}

/**
 * Renders a floating portal label (main title + subtitle + gold rule) to a
 * CanvasTexture. Uses the Playfair Display serif when loaded, falling back
 * to Georgia — both elegant serifs, so the label always looks couture.
 */
export function makeLabelTexture(spec: {
  text: string;
  sub?: string;
  color?: string;
}): { texture: THREE.CanvasTexture; aspect: number } {
  const w = 1024;
  const h = 320;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, w, h);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const color = spec.color ?? "#F8F4EA";
  const main = spec.text.toUpperCase();

  ctx.shadowColor = "rgba(0,0,0,0.9)";
  ctx.shadowBlur = 22;
  ctx.fillStyle = color;
  ctx.font = '600 82px "Playfair Display", Georgia, serif';
  try {
    (ctx as unknown as { letterSpacing?: string }).letterSpacing = "12px";
  } catch {
    /* older browsers ignore letter spacing */
  }
  ctx.fillText(main, w / 2, spec.sub ? h * 0.33 : h * 0.5);
  ctx.shadowBlur = 0;

  const width = ctx.measureText(main).width + 24;

  if (spec.sub) {
    ctx.fillStyle = "rgba(248,244,234,0.72)";
    ctx.font = '500 38px "Inter", ui-sans-serif, sans-serif';
    try {
      (ctx as unknown as { letterSpacing?: string }).letterSpacing = "4px";
    } catch {
      /* ignore */
    }
    ctx.fillText(spec.sub.toUpperCase(), w / 2, h * 0.66);
  }

  const ruleY = spec.sub ? h * 0.5 : h * 0.7;
  ctx.strokeStyle = "rgba(161,98,7,0.95)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(w / 2 - width / 2, ruleY);
  ctx.lineTo(w / 2 + width / 2, ruleY);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { texture: tex, aspect: w / h };
}
