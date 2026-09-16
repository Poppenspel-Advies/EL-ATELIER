import type { MediaInput } from "./types";

/* ------------------------------------------------------------------ */
/*  Media utilities — turn the client's references (images, voice      */
/*  notes, video) into compact Gemini-compatible payloads.             */
/*  Images are compressed, videos are reduced to keyframes, audio is   */
/*  re-encoded to 16 kHz mono WAV — all client-side, so the Edge       */
/*  Function stays within request limits.                              */
/* ------------------------------------------------------------------ */

/** Load an image (data URL or remote URL) into an HTMLImageElement. */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("We couldn't read that image."));
    img.src = src;
  });
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Compress an uploaded image down to a JPEG under the given max dimension. */
export async function compressImageFile(
  file: File,
  maxDim = 1280,
): Promise<MediaInput> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable.");
    ctx.drawImage(img, 0, 0, w, h);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    return { mimeType: "image/jpeg", data: dataUrl.split(",")[1] ?? "" };
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Reduce a video upload to a few keyframes (Gemini-ready JPEGs). */
export async function extractVideoFrames(
  file: File,
  count = 5,
): Promise<MediaInput[]> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.src = url;
    video.muted = true;
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("We couldn't read that video."));
    });
    const duration = video.duration;
    if (!isFinite(duration) || duration <= 0) {
      throw new Error("That video has no playable frames.");
    }
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 576;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable.");
    const frames: MediaInput[] = [];
    for (let i = 0; i < count; i++) {
      const t = (duration * (i + 0.5)) / count;
      video.currentTime = t;
      await new Promise<void>((resolve) => {
        video.onseeked = () => resolve();
      });
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL("image/jpeg", 0.8).split(",")[1];
      if (data) frames.push({ mimeType: "image/jpeg", data });
    }
    return frames;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Re-encode any decodable audio (mp3, m4a, wav, webm…) as 16 kHz mono WAV. */
export async function audioToWav(file: Blob): Promise<MediaInput> {
  const arrayBuffer = await file.arrayBuffer();
  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioCtx) throw new Error("Audio decoding is not supported here.");
  const ctx = new AudioCtx();
  try {
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    return { mimeType: "audio/wav", data: encodeWav(audioBuffer) };
  } finally {
    void ctx.close();
  }
}

function encodeWav(buffer: AudioBuffer): string {
  const sampleRate = 16000;
  const src = buffer.getChannelData(0);
  const length = Math.max(1, Math.floor(buffer.duration * sampleRate));
  const ratio = buffer.sampleRate / sampleRate;
  const output = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    const idx = Math.min(src.length - 1, Math.floor(i * ratio));
    output[i] = src[idx];
  }

  const blockAlign = 2;
  const dataSize = length * blockAlign;
  const ab = new ArrayBuffer(44 + dataSize);
  const view = new DataView(ab);
  const writeString = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i));
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < length; i++) {
    const s = Math.max(-1, Math.min(1, output[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
  return bytesToBase64(new Uint8Array(ab));
}
