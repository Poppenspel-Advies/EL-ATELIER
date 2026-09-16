import type {
  CollectionAsset,
  DesignBrief,
  NarrationKit,
  SongKit,
} from "./types";
import { dataUrl } from "./gemini";
import {
  downloadContactSheet,
  exportFilm,
  exportPdf,
  type FilmOptions,
  type PdfOptions,
} from "./export";

/* ------------------------------------------------------------------ */
/*  Le Livret — the complete booklet of a creation or collection.      */
/*                                                                    */
/*  Everything the atelier has made is bound together: the images,     */
/*  the drawings, the stories, the narrations, the price tags, the     */
/*  innovations, the magazine articles, the materials and the time     */
/*  required, the measurements of the model and the designs, the       */
/*  inspiration, the proposed songs and music, the jewellery, bags,    */
/*  accessories and shoes, and the proposed digital runways of         */
/*  La-Pista — a brand of EL ATELIER.                                 */
/* ------------------------------------------------------------------ */

export interface BookletDesign {
  name: string;
  brief: DesignBrief | null;
  illustrationUrl?: string | null;
  sketchUrl?: string | null;
  price?: number | null;
  tags?: string[];
}

export interface BookletBrand {
  name: string;
  tagline?: string | null;
  positioning?: string | null;
  house_notes?: string | null;
  coverUrl?: string | null;
  logoUrl?: string | null;
  creationImages?: (string | null)[];
}

export interface BookletInput {
  title: string;
  subtitle: string;
  designs: BookletDesign[];
  brands: BookletBrand[];
  assets: CollectionAsset[];
  songs: SongKit[];
  narrations: NarrationKit[];
  collectionName?: string;
}

/* ---------------- Atelier craft: measurements & time ---------------- */

const MEASUREMENT_SETS: Record<string, string[]> = {
  "editorial runway": [
    "Height 5'11\" (180 cm) · Bust 32\" (81 cm) · Waist 24\" (61 cm) · Hips 35\" (89 cm) · Inseam 34\" (86 cm)",
  ],
  "full-figured": [
    "Height 5'10\" (178 cm) · Bust 40\" (102 cm) · Waist 33\" (84 cm) · Hips 45\" (114 cm) · Inseam 32\" (81 cm)",
  ],
  androgynous: [
    "Height 6'0\" (183 cm) · Bust 34\" (86 cm) · Waist 26\" (66 cm) · Hips 35\" (89 cm) · Inseam 34\" (86 cm)",
  ],
  "golden-age": [
    "Height 5'8\" (173 cm) · Bust 36\" (91 cm) · Waist 25\" (64 cm) · Hips 37\" (94 cm) · Inseam 31\" (79 cm)",
  ],
  "street-casting": [
    "Height 5'9\" (175 cm) · Bust 34\" (86 cm) · Waist 27\" (69 cm) · Hips 38\" (97 cm) · Inseam 32\" (81 cm)",
  ],
};

export function measurementsFor(modelType: string | null | undefined): string {
  const m = (modelType ?? "").toLowerCase();
  const key = Object.keys(MEASUREMENT_SETS).find((k) => m.includes(k));
  return key
    ? MEASUREMENT_SETS[key][0]
    : "Height 5'10\" (178 cm) · Bust 33\" (84 cm) · Waist 25\" (64 cm) · Hips 36\" (91 cm) · Inseam 33\" (84 cm)";
}

export function atelierHoursFor(brief: DesignBrief | null): string {
  if (!brief) return "120–180 hours";
  const innovation = brief.innovation ?? "";
  const base = 120 + Math.min(240, innovation.length * 2);
  const fabric = (brief.fabric ?? "").toLowerCase();
  const luxe = /silk|charmeuse|brocade|lace|organza|cashmere/.test(fabric) ? 40 : 0;
  const fit = (brief.fit ?? "").toLowerCase();
  const fitted = /mermaid|corset|structured/.test(fit) ? 30 : 0;
  const total = base + luxe + fitted;
  return `${total}–${total + 60} atelier hours (${Math.round(total / 8)}–${Math.round((total + 60) / 8)} working days)`;
}

/* ---------------- Price tags ---------------- */

export function estimatePrice(brief: DesignBrief | null): number {
  if (!brief) return 4500;
  const fabric = (brief.fabric ?? "").toLowerCase();
  const mood = (brief.mood ?? "").toLowerCase();
  const innovation = brief.innovation ?? "";
  let base = 4500;
  if (/silk|charmeuse|brocade|lace|organza|cashmere|velvet/.test(fabric)) base += 1500;
  if (/sculptural|dramatic|opulent|maximal|avant/.test(mood)) base += 1200;
  if (innovation.length > 80) base += 2200;
  if (innovation.length > 0) base += 800;
  if (/mermaid|corset|structured/.test(brief.fit ?? "")) base += 600;
  return Math.round(base / 100) * 100;
}

export const formatUsd = (n: number | null | undefined) =>
  n == null ? "" : `$${n.toLocaleString("en-US")}`;

/* ---------------- La-Pista — a brand of EL ATELIER ---------------- */

export interface RunwayTheme {
  name: string;
  concept: string;
  prompt: string;
}

/** The proposed digital runways of La-Pista, a brand of EL ATELIER. */
export const LAPISTA_RUNWAYS: RunwayTheme[] = [
  {
    name: "The Salón Dorado",
    concept: "A gilded Andalusian ballroom, candlelight on marble, the train sweeping the parquet.",
    prompt: "digital runway, a gilded Andalusian ballroom at dusk, candlelight on marble, a model in the couture creation sweeping a long train across the parquet, cinematic camera, elegant, modest and refined",
  },
  {
    name: "The Azahar Patio",
    concept: "An orange-blossom courtyard at golden hour — petals drifting as the collection walks.",
    prompt: "digital runway, an Andalusian orange-blossom courtyard at golden hour, petals drifting in the air, a model in the couture creation walking a stone colonnade, cinematic, elegant, modest and refined",
  },
  {
    name: "The Glass Atelier",
    concept: "A mirrored atelier of the future — the collection under skylight and specular steel.",
    prompt: "digital runway, a futuristic mirrored atelier, skylight and specular steel, a model in the couture creation walking a reflective runway, cinematic, elegant, modest and refined",
  },
  {
    name: "The Midnight Terrace",
    concept: "A rooftop over Seville at night — the tower, the stars, the train alight.",
    prompt: "digital runway, a rooftop terrace over Seville at night, the Giralda in the distance, stars overhead, a model in the couture creation on the terrace, cinematic, elegant, modest and refined",
  },
  {
    name: "The Iris Hall",
    concept: "A flooded baroque hall, the hemline tracing the waterline, irises in bloom.",
    prompt: "digital runway, a flooded baroque hall with shallow water and irises in bloom, a model in the couture creation walking the waterline, reflections, cinematic, elegant, modest and refined",
  },
  {
    name: "The White Desert",
    concept: "Dunes of white salt under a pale sun — the collection as a mirage.",
    prompt: "digital runway, white salt dunes under a pale sun, heat shimmer, a model in the couture creation walking the crest of a dune, cinematic, elegant, modest and refined",
  },
];

/* ---------------- Compile the booklet ---------------- */

function assetSections(assets: CollectionAsset[]): PdfOptions["sections"] {
  const sections: PdfOptions["sections"] = [];
  const byKind = (kind: string) => assets.filter((a) => a.kind === kind);
  const push = (heading: string, body: string) => {
    if (body.trim()) sections.push({ heading, body });
  };

  const bijoux = [
    ...byKind("bijoux"),
    ...byKind("bag"),
    ...byKind("shoe"),
    ...byKind("accessory"),
  ];
  if (bijoux.length) {
    push(
      "Couture Bijoux — jewellery, bags, accessories & shoes",
      bijoux
        .map((b) => {
          const p = b.payload as {
            material?: string;
            craftsmanship?: string;
            styling?: string;
            concept?: string;
          };
          const price = b.price ? ` · ${formatUsd(b.price)}` : "";
          return `◆ ${b.name}${price}\n${p.material ?? ""}${p.craftsmanship ? ` — ${p.craftsmanship}` : ""}${p.styling ? `\nStyling: ${p.styling}` : ""}`;
        })
        .join("\n\n"),
    );
  }

  const stories = [...byKind("story"), ...byKind("article")];
  if (stories.length) {
    push(
      "Stories & magazine articles",
      stories
        .map((s) => {
          const p = s.payload as { body?: string; text?: string; article?: string[] };
          return `◆ ${s.name}\n${p.body ?? p.text ?? (Array.isArray(p.article) ? p.article.join("\n") : "")}`;
        })
        .join("\n\n"),
    );
  }

  const editorials = byKind("editorial");
  if (editorials.length) {
    push(
      "Editorial campaigns",
      editorials.map((e) => `◆ ${e.name}\n${String(e.payload.concept ?? e.payload.campaign_concept ?? "")}`).join("\n\n"),
    );
  }

  const drawings = byKind("drawing");
  if (drawings.length) {
    push(
      "Design drawings",
      drawings.map((d) => `◆ ${d.name}\n${String(d.payload.description ?? "")}`).join("\n\n"),
    );
  }

  return sections;
}

export function compileBookletPdf(input: BookletInput): PdfOptions {
  const images: PdfOptions["images"] = [];
  const sections: PdfOptions["sections"] = [];

  for (const brand of input.brands) {
    if (brand.coverUrl) images.push({ dataUrl: brand.coverUrl, caption: brand.name });
    const body = [brand.positioning, brand.house_notes].filter(Boolean).join("\n\n");
    if (body) sections.push({ heading: `The maison — ${brand.name}`, body });
  }

  for (const d of input.designs) {
    if (d.illustrationUrl) images.push({ dataUrl: d.illustrationUrl, caption: d.name });
    if (d.sketchUrl) images.push({ dataUrl: d.sketchUrl, caption: `${d.name} — design drawing` });
    const b = d.brief;
    if (b) {
      const price = formatUsd(d.price ?? estimatePrice(b));
      const tags = d.tags?.length ? `\nTags: ${d.tags.join(" · ")}` : "";
      sections.push({
        heading: d.name,
        body: [
          `${b.silhouette}${b.fit ? ` · ${b.fit} fit` : ""} · ${b.fabric}`,
          `Occasion: ${b.occasion} · Mood: ${b.mood}`,
          `Palette: ${b.palette.join(", ")}`,
          b.innovation ? `Innovation: ${b.innovation}` : "",
          b.variation ? `Variation: ${b.variation}` : "",
          b.styling_notes ? `Styling: ${b.styling_notes}` : "",
          b.director_note ? `The Creative Director: ${b.director_note}` : "",
          `Materials & time: ${b.fabric} — ${atelierHoursFor(b)}`,
          `The model: ${measurementsFor(b.model_type)}`,
          `Price tag: ${price}${tags}`,
        ]
          .filter(Boolean)
          .join("\n"),
      });
    }
  }

  // Inspiration — from the narrations and songs.
  const inspiration = [
    ...input.narrations.map((n) => `◆ ${n.title}\n${n.script.join("\n")}`),
  ];
  if (inspiration.length) {
    sections.push({ heading: "Inspiration & narrations", body: inspiration.join("\n\n") });
  }

  // The songs & music of the collection.
  if (input.songs.length) {
    sections.push({
      heading: "The proposed songs & music of the collection",
      body: input.songs
        .map((s) => {
          const lyrics = s.lyrics.join("\n");
          const chords = s.chord_sheet ? `\nChords: ${s.chord_sheet}` : "";
          return `♫ ${s.title} — ${s.style}, ${s.tempo}, in ${s.language_label}${chords}\n${lyrics}`;
        })
        .join("\n\n"),
    });
  }

  sections.push(...assetSections(input.assets));

  // La-Pista — the proposed digital runways.
  sections.push({
    heading: "La-Pista — proposed digital runways (a brand of EL ATELIER)",
    body: LAPISTA_RUNWAYS.map((r) => `◆ ${r.name}\n${r.concept}`).join("\n\n"),
  });

  const metaLines = [
    input.collectionName ? `Collection: ${input.collectionName}` : "",
    `${input.designs.length} creations · ${input.brands.length} maison(s) · ${input.assets.length} archived pieces`,
    `EL ATELIER · ${new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}`,
  ].filter(Boolean);

  return {
    title: input.title,
    subtitle: input.subtitle,
    metaLines,
    images,
    sections,
    filename: "el-atelier-livret.pdf",
  };
}

export function compileBookletFrames(input: BookletInput): FilmOptions["frames"] {
  const frames: FilmOptions["frames"] = [];
  for (const brand of input.brands) {
    if (brand.coverUrl) frames.push({ dataUrl: brand.coverUrl, caption: brand.name });
  }
  for (const d of input.designs) {
    if (d.illustrationUrl) frames.push({ dataUrl: d.illustrationUrl, caption: d.name });
    if (d.sketchUrl) frames.push({ dataUrl: d.sketchUrl, caption: `${d.name} — drawing` });
  }
  for (const a of input.assets) {
    const img = a.payload.data_url as string | undefined;
    if (typeof img === "string" && img) {
      frames.push({ dataUrl: dataUrl(img), caption: a.name });
    }
  }
  if (frames.length === 0 && input.designs.length === 0 && input.brands.length === 0) {
    throw new Error("There is nothing to bind yet — create something first.");
  }
  return frames;
}

export function compileBookletSheet(input: BookletInput): {
  items: { dataUrl: string; caption: string }[];
} {
  const items: { dataUrl: string; caption: string }[] = [];
  for (const brand of input.brands) {
    if (brand.coverUrl) items.push({ dataUrl: brand.coverUrl, caption: brand.name });
    (brand.creationImages ?? []).forEach((img, i) => {
      if (img) items.push({ dataUrl: img, caption: `${brand.name} — Look ${String(i + 1).padStart(2, "0")}` });
    });
  }
  for (const d of input.designs) {
    if (d.illustrationUrl) items.push({ dataUrl: d.illustrationUrl, caption: d.name });
    if (d.sketchUrl) items.push({ dataUrl: d.sketchUrl, caption: `${d.name} — drawing` });
  }
  for (const a of input.assets) {
    const img = a.payload.data_url as string | undefined;
    if (typeof img === "string" && img) items.push({ dataUrl: dataUrl(img), caption: a.name });
  }
  return { items };
}

/* ---------------- One-click exports ---------------- */

export async function exportBookletPdf(input: BookletInput): Promise<void> {
  await exportPdf(compileBookletPdf(input));
}

export async function exportBookletSheet(input: BookletInput): Promise<void> {
  const { items } = compileBookletSheet(input);
  await downloadContactSheet(items, "el-atelier-livret.png", input.title);
}

export async function exportBookletFilm(
  input: BookletInput,
  soundtrack?: import("./export").SoundtrackKind,
  onProgress?: (f: number) => void,
): Promise<void> {
  await exportFilm({
    title: input.title,
    frames: compileBookletFrames(input),
    filename: "el-atelier-livret.webm",
    soundtrack: soundtrack ?? null,
    secondsPerFrame: 2,
    onProgress,
  });
}

/** The markdown of the booklet — downloadable as a text file. */
export function bookletMarkdown(input: BookletInput): string {
  const parts: string[] = [];
  parts.push(`# ${input.title}\n${input.subtitle}`);
  for (const brand of input.brands) {
    parts.push(`## ${brand.name}\n${[brand.tagline, brand.positioning, brand.house_notes].filter(Boolean).join("\n\n")}`);
  }
  for (const d of input.designs) {
    const b = d.brief;
    parts.push(
      `## ${d.name}\n` +
        [b?.silhouette && `${b.silhouette} · ${b.fabric}`, b?.innovation && `Innovation: ${b.innovation}`, `Materials & time: ${atelierHoursFor(b)}`, `The model: ${measurementsFor(b?.model_type)}`, `Price tag: ${formatUsd(d.price ?? estimatePrice(b))}`].filter(Boolean).join("\n"),
    );
  }
  if (input.songs.length) {
    parts.push(`## The songs of the collection\n${input.songs.map((s) => `${s.title} — ${s.style} (${s.language_label})\n${s.lyrics.join("\n")}`).join("\n\n")}`);
  }
  parts.push(`## La-Pista — proposed digital runways\n${LAPISTA_RUNWAYS.map((r) => `${r.name}: ${r.concept}`).join("\n")}`);
  return parts.join("\n\n");
}
