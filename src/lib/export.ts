import { jsPDF } from "jspdf";
import { loadImage } from "./media";

/* ------------------------------------------------------------------ */
/*  Branded exports — every file that leaves the maison carries the    */
/*  EL ATELIER mark.                                                   */
/*  · Images  → composited canvas with wordmark + caption              */
/*  · PDF     → magazine-style dossier (cover, plates, article)        */
/*  · Film    → cinematic Ken-Burns slideshow recorded to WebM/MP4     */
/* ------------------------------------------------------------------ */

const INK = "#1C1917";
const GOLD = "#A16207";
const IVORY = "#F8F4EA";
const SERIF = "'Playfair Display', Georgia, 'Times New Roman', serif";
const SANS = "Inter, ui-sans-serif, system-ui, sans-serif";

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const n = parseInt(
    h.length === 3 ? h.split("").map((c) => c + c).join("") : h,
    16,
  );
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Draw the EL ATELIER brand mark in the bottom-right corner. */
function drawBrandMark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const x = width - 40;
  const y = height - 34;
  ctx.save();
  ctx.textAlign = "right";
  ctx.fillStyle = INK;
  ctx.font = `600 30px ${SERIF}`;
  ctx.fillText("EL ATELIER", x, y);
  ctx.font = `500 11px ${SANS}`;
  ctx.fillStyle = GOLD;
  ctx.fillText("COUTURE INTELLIGENCE", x, y + 18);
  // gold diamond
  ctx.translate(x - 8, y - 40);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = GOLD;
  ctx.fillRect(-4, -4, 8, 8);
  ctx.restore();
}

function drawCaption(
  ctx: CanvasRenderingContext2D,
  height: number,
  caption: string,
) {
  ctx.save();
  ctx.textAlign = "left";
  ctx.fillStyle = INK;
  ctx.font = `500 22px ${SERIF}`;
  ctx.fillText(caption.toUpperCase(), 40, height - 26);
  ctx.restore();
}

/**
 * Compose a branded image: the artwork cover-fit on an ivory canvas with
 * an optional caption and the maison wordmark.
 */
export async function brandCanvas(
  imageSrc: string,
  opts: { width?: number; height?: number; caption?: string } = {},
): Promise<HTMLCanvasElement> {
  const img = await loadImage(imageSrc);
  const width = opts.width ?? 1200;
  const height = opts.height ?? 1500;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable.");
  ctx.fillStyle = IVORY;
  ctx.fillRect(0, 0, width, height);
  const band = Math.round(height * 0.09);
  const drawH = height - band;
  const scale = Math.max(width / img.width, drawH / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, (width - w) / 2, (drawH - h) / 2, w, h);
  if (opts.caption) drawCaption(ctx, height, opts.caption);
  drawBrandMark(ctx, width, height);
  return canvas;
}

/** Compose a branded contact sheet from several images (2-column grid). */
export async function brandContactSheet(
  items: { dataUrl: string; caption: string }[],
  opts: { width?: number; title?: string } = {},
): Promise<HTMLCanvasElement> {
  const width = opts.width ?? 1400;
  const cols = 2;
  const rows = Math.ceil(items.length / cols);
  const pad = 40;
  const header = 130;
  const footer = 120;
  const gap = 28;
  const cellW = (width - pad * 2 - gap * (cols - 1)) / cols;
  const cellH = Math.round(cellW * 1.18);
  const height = header + rows * cellH + (rows - 1) * gap + footer;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable.");
  ctx.fillStyle = IVORY;
  ctx.fillRect(0, 0, width, height);

  ctx.textAlign = "center";
  ctx.fillStyle = INK;
  ctx.font = `600 44px ${SERIF}`;
  ctx.fillText("EL ATELIER", width / 2, 64);
  ctx.fillStyle = GOLD;
  ctx.font = `500 15px ${SANS}`;
  ctx.fillText("COUTURE INTELLIGENCE", width / 2, 92);
  if (opts.title) {
    ctx.fillStyle = INK;
    ctx.font = `500 26px ${SERIF}`;
    ctx.fillText(opts.title, width / 2, 122);
  }

  for (let i = 0; i < items.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = pad + col * (cellW + gap);
    const y = header + row * (cellH + gap);
    const img = await loadImage(items[i].dataUrl);
    const scale = Math.max(cellW / img.width, cellH / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, cellW, cellH);
    ctx.clip();
    ctx.drawImage(img, x + (cellW - w) / 2, y + (cellH - h) / 2, w, h);
    ctx.restore();
    ctx.strokeStyle = "rgba(28,25,23,0.18)";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, cellW - 1, cellH - 1);
    ctx.textAlign = "center";
    ctx.fillStyle = INK;
    ctx.font = `500 20px ${SERIF}`;
    ctx.fillText(items[i].caption.toUpperCase(), x + cellW / 2, y + cellH + 24);
  }

  drawBrandMark(ctx, width, height);
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement, type = "image/png"): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Export failed."))),
      type,
    );
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5_000);
}

/** Download a single branded image. */
export async function downloadBrandedImage(
  imageSrc: string,
  filename: string,
  caption?: string,
): Promise<void> {
  const canvas = await brandCanvas(imageSrc, { caption });
  const blob = await canvasToBlob(canvas, "image/png");
  downloadBlob(blob, filename);
}

/** Download a branded contact sheet of several images. */
export async function downloadContactSheet(
  items: { dataUrl: string; caption: string }[],
  filename: string,
  title?: string,
): Promise<void> {
  const canvas = await brandContactSheet(items, { title });
  const blob = await canvasToBlob(canvas, "image/png");
  downloadBlob(blob, filename);
}

/* ------------------------------------------------------------------ */
/*  PDF dossier — magazine style with the maison mark on every page    */
/* ------------------------------------------------------------------ */

export interface PdfImagePage {
  dataUrl: string;
  caption?: string;
}

export interface PdfSection {
  heading: string;
  body: string;
}

export interface PdfOptions {
  title: string;
  subtitle: string;
  metaLines: string[];
  images: PdfImagePage[];
  sections: PdfSection[];
  filename: string;
}

function pdfFooter(doc: jsPDF) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const [r, g, b] = hexToRgb(GOLD);
  doc.setDrawColor(r, g, b);
  doc.setLineWidth(0.4);
  doc.line(20, h - 16, w - 20, h - 16);
  doc.setFont("times", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...hexToRgb(INK));
  doc.text("EL ATELIER", 20, h - 10);
  doc.setTextColor(r, g, b);
  doc.text("COUTURE INTELLIGENCE", w - 20, h - 10, { align: "right" });
}

/** Build and download a branded PDF dossier. */
export async function exportPdf(opts: PdfOptions): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const [inkR, inkG, inkB] = hexToRgb(INK);
  const [goldR, goldG, goldB] = hexToRgb(GOLD);
  const [ivoryR, ivoryG, ivoryB] = hexToRgb(IVORY);

  // ---- Cover ----
  doc.setFillColor(ivoryR, ivoryG, ivoryB);
  doc.rect(0, 0, pageW, pageH, "F");
  doc.setFillColor(goldR, goldG, goldB);
  doc.rect(0, 0, pageW, 3, "F");
  doc.setFont("times", "bold");
  doc.setFontSize(30);
  doc.setTextColor(inkR, inkG, inkB);
  doc.text("EL ATELIER", pageW / 2, 56, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(goldR, goldG, goldB);
  doc.text("C O U T U R E   I N T E L L I G E N C E", pageW / 2, 64, {
    align: "center",
  });
  doc.setDrawColor(goldR, goldG, goldB);
  doc.setLineWidth(0.5);
  doc.line(pageW / 2 - 25, 74, pageW / 2 + 25, 74);

  doc.setFont("times", "bold");
  doc.setFontSize(26);
  doc.setTextColor(inkR, inkG, inkB);
  const titleLines = doc.splitTextToSize(opts.title, pageW - 50);
  doc.text(titleLines, pageW / 2, 104, { align: "center" });

  doc.setFont("times", "italic");
  doc.setFontSize(12);
  doc.setTextColor(...hexToRgb("#44403C"));
  const subLines = doc.splitTextToSize(opts.subtitle, pageW - 60);
  doc.text(subLines, pageW / 2, 104 + titleLines.length * 9 + 6, {
    align: "center",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  let metaY = pageH - 60;
  for (const line of opts.metaLines) {
    doc.setTextColor(inkR, inkG, inkB);
    doc.text(line, pageW / 2, metaY, { align: "center" });
    metaY += 6;
  }
  pdfFooter(doc);

  // ---- Image plates ----
  for (const img of opts.images) {
    doc.addPage();
    doc.setFillColor(ivoryR, ivoryG, ivoryB);
    doc.rect(0, 0, pageW, pageH, "F");
    try {
      const dims = await loadImage(img.dataUrl);
      const maxW = pageW - 34;
      const maxH = pageH - (img.caption ? 46 : 30);
      const scale = Math.min(maxW / dims.width, maxH / dims.height);
      const w = dims.width * scale;
      const h = dims.height * scale;
      const x = (pageW - w) / 2;
      const y = (pageH - h) / 2 - 6;
      doc.addImage(img.dataUrl, "PNG", x, y, w, h);
    } catch {
      /* plate failed — leave the ivory page with the caption */
    }
    if (img.caption) {
      doc.setFont("times", "italic");
      doc.setFontSize(10);
      doc.setTextColor(inkR, inkG, inkB);
      doc.text(img.caption.toUpperCase(), pageW / 2, pageH - 28, {
        align: "center",
      });
    }
    pdfFooter(doc);
  }

  // ---- Article sections ----
  for (const section of opts.sections) {
    doc.addPage();
    doc.setFillColor(ivoryR, ivoryG, ivoryB);
    doc.rect(0, 0, pageW, pageH, "F");
    doc.setFont("times", "bold");
    doc.setFontSize(18);
    doc.setTextColor(inkR, inkG, inkB);
    const headLines = doc.splitTextToSize(section.heading, pageW - 40);
    doc.text(headLines, pageW / 2, 30, { align: "center" });
    doc.setDrawColor(goldR, goldG, goldB);
    doc.setLineWidth(0.4);
    doc.line(pageW / 2 - 18, 36 + headLines.length * 6, pageW / 2 + 18, 36 + headLines.length * 6);

    doc.setFont("times", "normal");
    doc.setFontSize(11);
    doc.setTextColor(...hexToRgb("#44403C"));
    const bodyLines = doc.splitTextToSize(section.body, pageW - 50);
    let y = 48 + headLines.length * 7;
    for (const line of bodyLines) {
      if (y > pageH - 30) {
        doc.addPage();
        doc.setFillColor(ivoryR, ivoryG, ivoryB);
        doc.rect(0, 0, pageW, pageH, "F");
        y = 24;
      }
      doc.text(line, 25, y);
      y += 6.4;
    }
    pdfFooter(doc);
  }

  doc.save(opts.filename);
}

/* ------------------------------------------------------------------ */
/*  Film — cinematic Ken-Burns slideshow with the maison mark          */
/* ------------------------------------------------------------------ */

export type SoundtrackKind =
  | "atelier"
  | "flamenco"
  | "sevillanas"
  | "fandango"
  | "jazz"
  | "classical"
  | "latin";

/** The music of the maison — the global player and the film soundtracks. */
export const MUSIC_KINDS: {
  id: SoundtrackKind;
  label: string;
  description: string;
  loud: boolean;
}[] = [
  { id: "atelier", label: "L'Atelier", description: "Quiet cinematic piano-pad — the house theme", loud: false },
  { id: "flamenco", label: "Flamenco", description: "Loud Spanish compás — palmas, cajón, zapateado", loud: true },
  { id: "sevillanas", label: "Sevillanas", description: "Festive four-part Spanish fiesta, bright and loud", loud: true },
  { id: "fandango", label: "Fandango", description: "Uptempo Spanish courtship — guitars and castanets", loud: true },
  { id: "latin", label: "Latin", description: "Salsa-swing heat — brass, claves and montuno", loud: true },
  { id: "jazz", label: "Jazz", description: "Midnight brushwork and soft chords", loud: false },
  { id: "classical", label: "Classical", description: "Strings and harp — a gilded ballroom", loud: false },
];

export const musicKindById = (id: SoundtrackKind | null | undefined) =>
  MUSIC_KINDS.find((k) => k.id === id);

function getAudioCtor(): typeof AudioContext | null {
  const Ctx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return Ctx ?? null;
}

/**
 * Synthesized soundtracks for films and the maison.
 *  · "atelier"  — a quiet cinematic piano-pad (used by default on films)
 *  · "flamenco" — a festive Spanish compás: palmas, cajón, zapateado
 *    and guitar strums — the sound of LA GRANDE NOVIA™.
 * The music is generated with the Web Audio API (no assets, no network),
 * so films always carry a soundtrack. Pass `capture` to also route the
 * music into a MediaStreamAudioDestination for MediaRecorder.
 */
export function startMusic(
  kind: SoundtrackKind,
  capture = false,
): { stop: () => void; audioTrack?: MediaStreamTrack; setVolume?: (v: number) => void } {
  const Ctx = getAudioCtor();
  if (!Ctx) return { stop: () => {} };
  const ctx = new Ctx();
  void ctx.resume();
  const master = ctx.createGain();
  const loud = (musicKindById(kind)?.loud ?? false) ? 0.2 : 0.1;
  master.gain.value = loud;
  master.connect(ctx.destination);

  let audioTrack: MediaStreamTrack | undefined;
  if (capture) {
    const dest = ctx.createMediaStreamDestination();
    master.connect(dest);
    audioTrack = dest.stream.getAudioTracks()[0];
  }

  const cleanup =
    kind === "flamenco"
      ? flamencoLoop(ctx, master, 428, true)
      : kind === "sevillanas"
        ? sevillanasLoop(ctx, master)
        : kind === "fandango"
          ? flamencoLoop(ctx, master, 300, false)
          : kind === "latin"
            ? latinLoop(ctx, master)
            : kind === "jazz"
              ? jazzLoop(ctx, master)
              : kind === "classical"
                ? classicalLoop(ctx, master)
                : atelierLoop(ctx, master);

  return {
    audioTrack,
    setVolume: (v: number) => {
      master.gain.setTargetAtTime(Math.max(0, Math.min(1, v)), ctx.currentTime, 0.05);
    },
    stop: () => {
      try {
        cleanup();
        void ctx.close();
      } catch {
        /* already stopped */
      }
    },
  };
}

/** Sharp percussive noise burst — palmas, castanets, heels. */
function noiseHit(
  ctx: AudioContext,
  master: AudioNode,
  when: number,
  freq: number,
  q: number,
  gain: number,
  dur: number,
) {
  const len = Math.ceil(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, when);
  g.gain.linearRampToValueAtTime(0.0001, when + dur);
  src.connect(f);
  f.connect(g);
  g.connect(master);
  src.start(when);
  src.stop(when + dur + 0.01);
}

/** A plucked note — triangle wave with a fast attack and long decay. */
function pluck(
  ctx: AudioContext,
  master: AudioNode,
  when: number,
  freq: number,
  gain: number,
  dur = 0.6,
) {
  const o = ctx.createOscillator();
  o.type = "triangle";
  o.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(gain, when + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  o.connect(g);
  g.connect(master);
  o.start(when);
  o.stop(when + dur + 0.02);
}

/** Festive flamenco compás — bulerías feel, ~140 bpm, 12-count cycle. */
function flamencoLoop(ctx: AudioContext, master: AudioNode, beatMs = 428, lush = true): () => void {
  const palmas = [0, 0, 1, 0, 0, 1, 1, 1, 0, 1, 0, 1];
  const cajon = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0];
  const zap = [0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0];
  const chords = [
    [164.81, 246.94, 329.63], // E minor
    [110.0, 220.0, 329.63], // A minor
    [174.61, 261.63, 349.23], // F major
    [146.83, 220.0, 293.66], // D minor
  ];
  let beat = 0;
  let chordIdx = 0;

  const tick = () => {
    const when = ctx.currentTime + 0.06;
    if (palmas[beat]) noiseHit(ctx, master, when, 2400, 1.2, 0.5, 0.09);
    if (cajon[beat]) {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(92, when);
      o.frequency.exponentialRampToValueAtTime(40, when + 0.1);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.9, when);
      g.gain.linearRampToValueAtTime(0.0001, when + 0.13);
      o.connect(g);
      g.connect(master);
      o.start(when);
      o.stop(when + 0.14);
    }
    if (zap[beat]) noiseHit(ctx, master, when + 0.02, 320, 0.9, 0.28, 0.05);
    if (palmas[beat] && beat !== 2) {
      const chord = chords[chordIdx];
      chord.forEach((freq, i) =>
        pluck(ctx, master, when + 0.02 + i * 0.045, freq, lush ? 0.16 : 0.24, 0.5),
      );
    }
    beat = (beat + 1) % 12;
    if (beat === 0) chordIdx = (chordIdx + 1) % chords.length;
  };

  tick();
  const id = window.setInterval(tick, beatMs);
  return () => window.clearInterval(id);
}

/**
 * Sevillanas — a brighter, louder four-part fiesta. Same 12-count family as
 * flamenco but with extra palmas, a driving cajón and a fuller chord pluck.
 */
function sevillanasLoop(ctx: AudioContext, master: AudioNode): () => void {
  const beatMs = 360;
  const palmas = [1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1];
  const cajon = [1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0];
  const chords = [
    [146.83, 220.0, 293.66], // D minor
    [164.81, 246.94, 329.63], // E minor
    [130.81, 196.0, 261.63], // C major
    [110.0, 220.0, 329.63], // A minor
  ];
  let beat = 0;
  let chordIdx = 0;
  const tick = () => {
    const when = ctx.currentTime + 0.05;
    if (palmas[beat]) noiseHit(ctx, master, when, 2600, 1.4, 0.6, 0.08);
    if (cajon[beat]) {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.setValueAtTime(96, when);
      o.frequency.exponentialRampToValueAtTime(38, when + 0.09);
      const g = ctx.createGain();
      g.gain.setValueAtTime(1.0, when);
      g.gain.linearRampToValueAtTime(0.0001, when + 0.12);
      o.connect(g);
      g.connect(master);
      o.start(when);
      o.stop(when + 0.13);
    }
    const chord = chords[chordIdx];
    chord.forEach((freq, i) =>
      pluck(ctx, master, when + 0.015 + i * 0.04, freq, 0.22, 0.42),
    );
    beat = (beat + 1) % 12;
    if (beat === 0) chordIdx = (chordIdx + 1) % chords.length;
  };
  tick();
  const id = window.setInterval(tick, beatMs);
  return () => window.clearInterval(id);
}

/** Latin heat — a salsa montuno: claves, a driving bass line and brass stabs. */
function latinLoop(ctx: AudioContext, master: AudioNode): () => void {
  const beatMs = 260; // ~115 bpm salsa
  const clave = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0];
  const bass = [110.0, 0, 0, 110.0, 0, 0, 130.81, 0, 0, 146.83, 0, 0, 0, 110.0, 0, 0];
  const brass = [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0];
  let i = 0;
  const tick = () => {
    const when = ctx.currentTime + 0.05;
    if (clave[i]) noiseHit(ctx, master, when, 3200, 2.5, 0.5, 0.06);
    const b = bass[i];
    if (b) {
      const o = ctx.createOscillator();
      o.type = "triangle";
      o.frequency.value = b;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.28, when);
      g.gain.exponentialRampToValueAtTime(0.0001, when + 0.22);
      o.connect(g);
      g.connect(master);
      o.start(when);
      o.stop(when + 0.24);
    }
    if (brass[i]) {
      [329.63, 415.3, 493.88].forEach((f, k) =>
        pluck(ctx, master, when + k * 0.03, f, 0.16, 0.3),
      );
    }
    i = (i + 1) % 16;
  };
  tick();
  const id = window.setInterval(tick, beatMs);
  return () => window.clearInterval(id);
}

/** Midnight jazz — soft brush hiss and warm 7th chords on the off-beats. */
function jazzLoop(ctx: AudioContext, master: AudioNode): () => void {
  const beatMs = 460;
  const chords: number[][] = [
    [174.61, 220.0, 261.63, 329.63], // Fmaj7
    [146.83, 174.61, 220.0, 261.63], // Dm7
    [130.81, 164.81, 196.0, 246.94], // Cmaj7
    [98.0, 123.47, 146.83, 196.0], // G7
  ];
  let chordIdx = 0;
  let brush = 0;
  const tick = () => {
    const when = ctx.currentTime + 0.06;
    if (brush % 2 === 0) noiseHit(ctx, master, when, 1400, 0.6, 0.16, 0.16);
    const chord = chords[chordIdx];
    chord.forEach((freq, k) =>
      pluck(ctx, master, when + 0.03 + k * 0.06, freq, 0.09, 1.8),
    );
    brush = (brush + 1) % 4;
    if (brush === 0) chordIdx = (chordIdx + 1) % chords.length;
  };
  tick();
  const id = window.setInterval(tick, beatMs);
  return () => window.clearInterval(id);
}

/** Classical — a gilded string section and a slow harp arpeggio. */
function classicalLoop(ctx: AudioContext, master: AudioNode): () => void {
  const pad = ctx.createGain();
  pad.gain.value = 0.05;
  pad.connect(master);
  [130.81, 196.0, 261.63, 329.63].forEach((f, i) => {
    const o = ctx.createOscillator();
    o.type = i === 0 ? "sine" : "triangle";
    o.frequency.value = f;
    o.detune.value = i * 3;
    o.connect(pad);
    o.start();
  });
  const arp = [261.63, 329.63, 392.0, 523.25, 392.0, 329.63];
  let i = 0;
  const tick = () => {
    const when = ctx.currentTime + 0.05;
    pluck(ctx, master, when, arp[i % arp.length], 0.09, 1.4);
    i = (i + 1) % arp.length;
  };
  tick();
  const id = window.setInterval(tick, 420);
  return () => {
    window.clearInterval(id);
    try {
      pad.disconnect();
    } catch {
      /* noop */
    }
  };
}

/** Quiet cinematic pad + sparse piano arpeggio — the atelier's own theme. */
function atelierLoop(ctx: AudioContext, master: AudioNode): () => void {
  const padGain = ctx.createGain();
  padGain.gain.value = 0.045;
  padGain.connect(master);
  const pads = [110, 164.81, 220];
  pads.forEach((f, i) => {
    const o = ctx.createOscillator();
    o.type = i === 0 ? "sine" : "triangle";
    o.frequency.value = f;
    o.detune.value = i * 4;
    o.connect(padGain);
    o.start();
  });

  const notes = [220.0, 261.63, 329.63, 293.66, 349.23, 392.0];
  let i = 0;
  const tick = () => {
    const when = ctx.currentTime + 0.05;
    pluck(ctx, master, when, notes[i % notes.length], 0.1, 2.2);
    i = (i + 1) % notes.length;
  };
  tick();
  const id = window.setInterval(tick, 2400);
  return () => {
    window.clearInterval(id);
    try {
      padGain.disconnect();
    } catch {
      /* noop */
    }
  };
}

export interface FilmOptions {
  title: string;
  subtitle?: string;
  frames: { dataUrl: string; caption?: string }[];
  filename: string;
  /** Seconds per frame (recording runs in real time). */
  secondsPerFrame?: number;
  /** Synthesized music mixed into the recording (atelier by default). */
  soundtrack?: SoundtrackKind | null;
  onProgress?: (fraction: number) => void;
}

function pickVideoMime(): string {
  const candidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ];
  return candidates.find((m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) ?? "";
}

function drawFilmFrame(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  W: number,
  H: number,
  t: number,
  per: number,
  frameIndex: number,
  opts: FilmOptions,
) {
  // cover-fit
  const scaleBase = Math.max(W / img.width, H / img.height);
  const zoom = scaleBase * (1.02 + 0.1 * (t / per)); // subtle Ken Burns zoom
  const w = img.width * zoom;
  const h = img.height * zoom;
  // drift direction alternates per frame
  const dx = (frameIndex % 2 === 0 ? -1 : 1) * ((w - W) / 2) * (t / per) * 0.6;
  const dy = (frameIndex % 3 === 0 ? -1 : 1) * ((h - H) / 2) * (t / per) * 0.4;
  const x = (W - w) / 2 + dx;
  const y = (H - h) / 2 + dy;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  ctx.drawImage(img, x, y, w, h);

  // ivory fade between frames
  const fade = 360;
  if (t > per * 1000 - fade) {
    const a = Math.min(1, (t - (per * 1000 - fade)) / fade);
    ctx.fillStyle = `rgba(248,244,234,${(a * 0.92).toFixed(3)})`;
    ctx.fillRect(0, 0, W, H);
  }

  // caption bar
  ctx.fillStyle = "rgba(248,244,234,0.94)";
  ctx.fillRect(0, H - 96, W, 96);
  ctx.fillStyle = GOLD;
  ctx.fillRect(0, H - 96, W, 3);
  ctx.fillStyle = INK;
  ctx.textAlign = "left";
  ctx.font = `600 30px ${SERIF}`;
  ctx.fillText("EL ATELIER", 44, H - 52);
  ctx.font = `500 13px ${SANS}`;
  ctx.fillStyle = GOLD;
  ctx.fillText("COUTURE INTELLIGENCE", 44, H - 32);
  ctx.textAlign = "right";
  ctx.fillStyle = INK;
  ctx.font = `500 22px ${SERIF}`;
  const caption = opts.frames[frameIndex]?.caption ?? opts.title;
  ctx.fillText(caption.toUpperCase(), W - 44, H - 42);
}

/** Record a branded slideshow film and download it. */
export async function exportFilm(opts: FilmOptions): Promise<void> {
  const mime = pickVideoMime();
  if (!mime) {
    throw new Error("Your browser can't record video — try the PDF export instead.");
  }
  const W = 1280;
  const H = 720;
  const per = (opts.secondsPerFrame ?? 2.2) * 1000;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable.");
  const stream = canvas.captureStream(30);
  const videoTracks = stream.getVideoTracks();
  let recordStream: MediaStream = stream;
  let soundtrack: { stop: () => void } | null = null;
  // Films carry the atelier soundtrack by default; pass null to record silent.
  const soundtrackKind = opts.soundtrack === null ? null : (opts.soundtrack ?? "atelier");
  if (soundtrackKind) {
    try {
      const started = startMusic(soundtrackKind, true);
      if (started.audioTrack) {
        recordStream = new MediaStream([...videoTracks, started.audioTrack]);
        soundtrack = started;
      }
    } catch {
      soundtrack = null; // film silently without music
    }
  }
  const rec = new MediaRecorder(recordStream, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  const stopped = new Promise<void>((resolve) => {
    rec.onstop = () => resolve();
  });

  const images = await Promise.all(opts.frames.map((f) => loadImage(f.dataUrl)));
  if (images.length === 0) throw new Error("No frames to film.");

  rec.start();
  const start = performance.now();
  const total = images.length * per;
  await new Promise<void>((resolve) => {
    const tick = (now: number) => {
      const t = now - start;
      const idx = Math.min(images.length - 1, Math.floor(t / per));
      drawFilmFrame(ctx, images[idx], W, H, t % per, per, idx, opts);
      opts.onProgress?.(Math.min(1, t / total));
      if (t < total) {
        requestAnimationFrame(tick);
      } else {
        resolve();
      }
    };
    requestAnimationFrame(tick);
  });
  rec.stop();
  await stopped;
  soundtrack?.stop();
  const blob = new Blob(chunks, { type: mime });
  downloadBlob(blob, opts.filename);
}
