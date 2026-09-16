import { supabase } from "./supabase";
import type {
  BijouxKit,
  BrandKit,
  BrandVisuals,
  ContentCreation,
  DesignBrief,
  DossierStory,
  ImageKind,
  MediaInput,
  Muse,
  NarrationKit,
  SamplePreset,
  SongKit,
  TransformOptions,
} from "./types";

export type { BrandKit, BrandVisuals } from "./types";

/* ------------------------------------------------------------------ */
/*  EL ATELIER × AI client                                             */
/*  Text (briefs, maisons, dossiers, concierge) is composed by          */
/*  Pensamiento inside the `generate-design` Edge Function — the        */
/*  Gemini key never touches the browser. COUTURE VISION images         */
/*  (illustrations, sketches, logos, covers) are rendered by the free   */
/*  Pollinations API via the same function — no key, no billing.        */
/* ------------------------------------------------------------------ */

/** Model / muse options — "user can select different model images". */
export const MUSES: Muse[] = [
  {
    id: "editorial",
    label: "Editorial Runway",
    description: "Tall, statuesque, serene",
    prompt: "tall editorial runway model, statuesque and serene, haute couture poise",
  },
  {
    id: "street",
    label: "Street Casting",
    description: "Relaxed, diverse, urban",
    prompt: "relaxed diverse street-casting model, natural unposed confidence, urban edge",
  },
  {
    id: "curve",
    label: "Curve Muse",
    description: "Confident, full-figured",
    prompt: "confident full-figured muse, powerful elegant posture, editorial glamour",
  },
  {
    id: "androgynous",
    label: "Androgynous",
    description: "Sharp, minimalist",
    prompt: "androgynous model, sharp features, minimalist androgynous styling",
  },
  {
    id: "golden",
    label: "Golden Age Icon",
    description: "Classic 1950s glamour",
    prompt: "golden-age Hollywood icon, classic 1950s glamour, timeless elegance",
  },
  {
    id: "avant",
    label: "Avant-Garde",
    description: "Sculptural, theatrical",
    prompt: "avant-garde muse, sculptural features, theatrical dramatic presence",
  },
];

export const museById = (id: string | null | undefined): Muse | undefined =>
  MUSES.find((m) => m.id === id);

/* ------------------------------------------------------------------ */
/*  Transformation menu — re-imagine a creation for a new context      */
/* ------------------------------------------------------------------ */

export const TRANSFORM_CITIES = [
  {
    id: "paris",
    label: "Paris",
    prompt:
      "Paris, France — haute couture capital, atelier discipline, romantic architecture, timeless Parisian elegance",
  },
  {
    id: "zurich",
    label: "Zürich, Swiss",
    prompt:
      "Zürich, Switzerland — alpine precision, clean geometry, snow light, quiet luxury, exacting craftsmanship",
  },
  {
    id: "tokyo",
    label: "Tokyo",
    prompt:
      "Tokyo, Japan — neo-futurist layering, origami structure, neon night, avant-garde street couture",
  },
  {
    id: "milan",
    label: "Milan",
    prompt:
      "Milan, Italy — opera-house drama, gilded tailoring, Italian sensuality, museum galleries",
  },
  {
    id: "marrakech",
    label: "Marrakech",
    prompt:
      "Marrakech, Morocco — souk color, caftan fluidity, desert gold, intricate embroidery, medina courtyards",
  },
  {
    id: "mumbai",
    label: "Mumbai",
    prompt:
      "Mumbai, India — maximalist color, sari draping, Bollywood drama, hand block-prints, monsoon romance",
  },
  {
    id: "reykjavik",
    label: "Reykjavík",
    prompt:
      "Reykjavík, Iceland — volcanic noir, aurora light, sculptural knitwear, brutalist calm, geothermal mist",
  },
  {
    id: "newyork",
    label: "New York",
    prompt:
      "New York City — sharp power dressing, urban edge, skyline energy, editorial confidence, street casting",
  },
  {
    id: "seoul",
    label: "Seoul",
    prompt:
      "Seoul, South Korea — high-tech minimalism, oversized structure, K-style precision, neon palaces",
  },
  {
    id: "copenhagen",
    label: "Copenhagen",
    prompt:
      "Copenhagen, Denmark — hygge minimalism, soft tailoring, muted nordic palette, canalside calm",
  },
] as const;

export const TRANSFORM_GARMENTS = [
  { id: "gown", label: "Evening gown", prompt: "floor-length evening gown" },
  { id: "tailleur", label: "Tailleur suit", prompt: "sharp tailored suit" },
  { id: "kilt", label: "Kilt dress", prompt: "pleated kilt-inspired dress" },
  { id: "cape", label: "Sculptural cape", prompt: "dramatic sculptural cape" },
  { id: "coat", label: "Opera coat", prompt: "floor-sweeping opera coat" },
  { id: "kaftan", label: "Kaftan", prompt: "fluid kaftan" },
  { id: "corset", label: "Corseted dress", prompt: "structured corseted dress" },
  { id: "jumpsuit", label: "Jumpsuit", prompt: "tailored jumpsuit" },
  { id: "trench", label: "Trench coat", prompt: "belted trench coat" },
  { id: "bikini", label: "Bikini / swimwear", prompt: "elegant couture bikini swimwear" },
  { id: "bridal", label: "Bridal gown", prompt: "bridal wedding gown" },
  { id: "ballgown", label: "Ball gown", prompt: "voluminous princess ball gown" },
  { id: "slip", label: "Slip dress", prompt: "bias-cut slip dress" },
  { id: "cocktail", label: "Cocktail dress", prompt: "polished cocktail dress" },
  { id: "minidress", label: "Minidress", prompt: "modern minidress" },
  { id: "bodysuit", label: "Bodysuit", prompt: "structured couture bodysuit" },
  { id: "flamenco", label: "Flamenco dress", prompt: "traditional flamenco dance dress with ruffled train" },
  { id: "bathrobe", label: "Resort robe", prompt: "flowing silk resort robe" },
] as const;

export const TRANSFORM_DIRECTIONS = [
  {
    id: "dramatic",
    label: "Dramatic",
    prompt: "dramatic and theatrical, high-contrast couture, stage presence",
  },
  {
    id: "artistic",
    label: "Artistic",
    prompt: "painterly and artistic, hand-painted textures, gallery couture",
  },
  {
    id: "avant",
    label: "Avant-garde",
    prompt: "avant-garde and experimental, sculptural forms, runway art",
  },
  {
    id: "romantic",
    label: "Romantic",
    prompt: "romantic and ethereal, soft volume, poetic movement",
  },
  {
    id: "minimal",
    label: "Minimal",
    prompt: "minimal and architectural, pure lines, quiet luxury",
  },
  {
    id: "maximal",
    label: "Maximal",
    prompt: "maximalist and ornate, rich embroidery, opulent drama",
  },
] as const;

/* ------------------------------------------------------------------ */
/*  Spanish dance transformations — the soul of LA GRANDE NOVIA™       */
/* ------------------------------------------------------------------ */

export const TRANSFORM_DANCES = [
  {
    id: "jota",
    label: "Jota",
    region: "Aragón (and nationwide)",
    prompt:
      "the Jota of Aragón — a fast-paced bouncing dance in triple meter, partners mirroring each other with high hopping steps and raised arms while clicking castanets",
  },
  {
    id: "pasodoble",
    label: "Paso Doble",
    region: "Nationwide (military / bullfight roots)",
    prompt:
      "the Paso Doble — a dramatic, fast-paced march mimicking a bullfight, the leader acting as the matador with sharp, arrogant steps",
  },
  {
    id: "sevillanas",
    label: "Sevillanas",
    region: "Seville, Andalusia",
    prompt:
      "the Sevillanas — a joyful four-part couple dance heavily influenced by flamenco yet less formal, the definitive party dance of southern Spanish festivals",
  },
  {
    id: "muneira",
    label: "Muñeira",
    region: "Galicia & Asturias (northwest)",
    prompt:
      "the Muñeira, the Miller's Dance — a heavy Celtic-influenced dance danced to the uptempo rhythm of traditional bagpipes (gaitas) and tambourines",
  },
  {
    id: "sardana",
    label: "Sardana",
    region: "Catalonia (northeast)",
    prompt:
      "the Sardana — an egalitarian circle dance where couples join hands in a closed ring and perform synchronized, meticulous footwork in public town squares",
  },
  {
    id: "zambra",
    label: "Zambra",
    region: "Granada, Andalusia",
    prompt:
      "the Zambra of Granada — a sensual dance with deep Moorish ancestry, flowing arm movements and elegant, modest choreography",
  },
  {
    id: "fandango",
    label: "Fandango",
    region: "Nationwide",
    prompt:
      "the Fandango — one of Spain's oldest courting dances, a lively festive tempo executed by couples to a rhythm of guitars, clapping and castanets",
  },
] as const;

export type TransformCity = (typeof TRANSFORM_CITIES)[number]["id"];
export type TransformGarment = (typeof TRANSFORM_GARMENTS)[number]["id"];
export type TransformDirection = (typeof TRANSFORM_DIRECTIONS)[number]["id"];
export type TransformDance = (typeof TRANSFORM_DANCES)[number]["id"];

/* ------------------------------------------------------------------ */
/*  Sample gallery — "more types of samples with images and models"    */
/*  Thumbnails are generated SVG art (no binary assets needed).        */
/* ------------------------------------------------------------------ */

const samplePalette = (palette: string[]) => {
  const [a = "#1C1917", b = "#A16207", c = "#F5EFE6"] = palette;
  return { a, b, c };
};

/** Inline SVG art for a sample card — gradient wash + abstract figure. */
export function sampleArt(palette: string[]): string {
  const { a, b, c } = samplePalette(palette);
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='400' viewBox='0 0 300 400'>
  <defs>
    <linearGradient id='g' x1='0' y1='0' x2='1' y2='1'>
      <stop offset='0' stop-color='${a}' stop-opacity='0.9'/>
      <stop offset='0.55' stop-color='${b}' stop-opacity='0.85'/>
      <stop offset='1' stop-color='${c}' stop-opacity='0.9'/>
    </linearGradient>
    <linearGradient id='f' x1='0' y1='0' x2='0' y2='1'>
      <stop offset='0' stop-color='#ffffff' stop-opacity='0.92'/>
      <stop offset='1' stop-color='#ffffff' stop-opacity='0.55'/>
    </linearGradient>
  </defs>
  <rect width='300' height='400' fill='url(#g)'/>
  <circle cx='250' cy='60' r='90' fill='#ffffff' opacity='0.12'/>
  <circle cx='40' cy='360' r='110' fill='#ffffff' opacity='0.1'/>
  <path d='M150 120 C 128 168 122 214 128 262 C 118 268 104 272 96 280 C 128 288 172 288 204 280 C 196 272 182 268 172 262 C 178 214 172 168 150 120 Z' fill='url(#f)'/>
  <path d='M150 244 L 132 344 C 138 356 162 356 168 344 Z' fill='#ffffff' opacity='0.75'/>
  <circle cx='150' cy='84' r='26' fill='#ffffff' opacity='0.9'/>
  <rect x='0' y='378' width='300' height='22' fill='#1C1917' opacity='0.55'/>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const SAMPLE_PIECES: SamplePreset[] = [
  {
    id: "abyssal-gala",
    title: "Abyssal Gala Gown",
    mode: "piece",
    blurb: "Sculptural evening gown in liquid silk, moody violet, for a museum opening.",
    prompt:
      "A sculptural evening gown in liquid silk, moody violet, for a museum opening — dramatic, architectural folds, a train that catches the light like water.",
    museId: "editorial",
    palette: ["#2e1a47", "#7c3aed", "#1c1917", "#e9d5ff"],
  },
  {
    id: "pearl-two-piece",
    title: "Pearl Two-Piece",
    mode: "piece",
    blurb: "Quiet-luxury suit in ivory wool crepe and noir, sharp and editorial.",
    prompt:
      "Quiet luxury two-piece suit in ivory wool crepe with noir trim, for the office — minimal, sharp, editorial, immaculate tailoring.",
    museId: "golden",
    palette: ["#f5efe6", "#1c1917", "#c8b89a", "#8a8175"],
  },
  {
    id: "champagne-slip",
    title: "Champagne Slip",
    mode: "piece",
    blurb: "Romantic champagne chiffon slip for a garden soirée, ethereal movement.",
    prompt:
      "A romantic slip dress in champagne chiffon for a garden soirée, ethereal movement, flamingo blush accents, delicate bias cut.",
    museId: "curve",
    palette: ["#e8c9a0", "#fb7185", "#f5efe6", "#a16207"],
  },
  {
    id: "noir-opera-coat",
    title: "Noir Opera Coat",
    mode: "piece",
    blurb: "Dramatic cashmere opera coat in noir for a winter premiere.",
    prompt:
      "A dramatic floor-length opera coat in noir cashmere, for a winter premiere — sweeping volume, satin lapels, cinematic presence.",
    museId: "androgynous",
    palette: ["#0c0a09", "#44403c", "#f5efe6", "#a16207"],
  },
  {
    id: "coral-architectural",
    title: "Coral Architectural Dress",
    mode: "piece",
    blurb: "Avant-garde dress with coral-scale pleating and aqua light.",
    prompt:
      "An avant-garde architectural dress with coral-scale pleating, aqua and pink light, for an experimental runway — sharp geometry, sculptural.",
    museId: "avant",
    palette: ["#fb7185", "#22d3ee", "#2e1a47", "#f5efe6"],
  },
  {
    id: "dune-kaftan",
    title: "Dune Kaftan",
    mode: "piece",
    blurb: "Fluid sand-toned kaftan in silk georgette, warm and effortless.",
    prompt:
      "A fluid kaftan in sand-toned silk georgette, for a coastal evening — effortless drape, warm neutral palette, soft gold embroidery.",
    museId: "street",
    palette: ["#d9c3a3", "#a16207", "#7c6f5e", "#f5efe6"],
  },
];

export const SAMPLE_MAISONS: SamplePreset[] = [
  {
    id: "maison-abysse",
    title: "Maison Abysse",
    mode: "maison",
    blurb: "A deep-sea couture house: bioluminescent silks, coral embroidery, gowns that move like currents.",
    prompt:
      "A couture house born from the deep sea — bioluminescent silks, coral-scale embroidery, gowns that move like ocean currents, a palette of abyss noir, abyss violet, aqua light and pearl. Ten looks from a gala goddess gown to a diving-suit evening tailleur.",
    museId: "editorial",
    palette: ["#0f1f3d", "#2e1a47", "#22d3ee", "#f5efe6"],
  },
  {
    id: "maison-nebule",
    title: "Maison Nébulе",
    mode: "maison",
    blurb: "Avant-garde house from a nebula: liquid-metal fabrics, star-dusted tulle, zero-gravity silhouettes.",
    prompt:
      "An avant-garde house from a nebula — liquid-metal fabrics, star-dusted tulle, zero-gravity sculptural silhouettes, cosmic pink, violet and noir. Ten looks from an astronaut muse to a red-carpet comet gown.",
    museId: "avant",
    palette: ["#1c1917", "#7c3aed", "#fb7185", "#f5efe6"],
  },
  {
    id: "maison-porcelaine",
    title: "Maison Porcelaine",
    mode: "maison",
    blurb: "Porcelain-quiet maison: ivory tailoring, hand-painted floral brocades, heirloom minimalism.",
    prompt:
      "A porcelain-quiet maison of quiet luxury — ivory tailoring, hand-painted floral brocades, heirloom minimalism, warm ivory, gold and noir. Ten looks from a museum-opening column to a garden-party cocktail dress.",
    museId: "golden",
    palette: ["#f5efe6", "#c8b89a", "#a16207", "#44403c"],
  },
  {
    id: "maison-tonnerre",
    title: "Maison Tonnerre",
    mode: "maison",
    blurb: "Thunderous house of sharp tailoring and saturated color — editorial power dressing.",
    prompt:
      "A thunderous house of power dressing — sharp tailoring, saturated flamingo pink, electric cyan and noir, editorial confidence, urban casting. Ten looks from a boardroom armour suit to a storm-chaser evening dress.",
    museId: "street",
    palette: ["#1c1917", "#fb7185", "#22d3ee", "#f5efe6"],
  },
  {
    id: "maison-lune",
    title: "Maison Lune",
    mode: "maison",
    blurb: "Lunar romance: champagne silks, moonlit sequins, dreamy eveningwear.",
    prompt:
      "A romantic maison of lunar evenings — champagne silk, moonlit sequins, blush and silver, dreamy but precisely cut. Ten looks from a full-moon ball gown to a midnight velvet dinner suit.",
    museId: "curve",
    palette: ["#e8c9a0", "#f5efe6", "#c0c4cc", "#2e1a47"],
  },
  {
    id: "maison-brut",
    title: "Maison Brut",
    mode: "maison",
    blurb: "Brutalist minimalism: raw tailoring, architectural folds, monochrome discipline.",
    prompt:
      "A brutalist minimalist maison — raw tailoring, architectural folds, monochrome discipline of noir, stone and bone, androgynous casting. Ten looks from a concrete-column trench to a sculptural column dress.",
    museId: "androgynous",
    palette: ["#0c0a09", "#8a8175", "#e7e5e4", "#a16207"],
  },
];

export const sampleById = (id: string | null | undefined) =>
  [...SAMPLE_PIECES, ...SAMPLE_MAISONS].find((s) => s.id === id);

/* ------------------------------------------------------------------ */
/*  Edge function client                                               */
/* ------------------------------------------------------------------ */

async function invoke<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("generate-design", {
    body,
  });
  if (error) {
    let code: string | undefined;
    let rawMessage = error.message;
    try {
      // FunctionsHttpError exposes the response body via context.json()
      const ctx = await (error as { context?: Response }).context?.json();
      if (ctx?.code) code = ctx.code;
      if (ctx?.error) rawMessage = ctx.error;
    } catch {
      /* keep default */
    }
    const friendly = friendlyError(code, rawMessage);
    const e = new Error(friendly) as Error & { code?: string };
    e.code = code ?? "unknown";
    throw e;
  }
  return data as T;
}

export async function generateBrief(
  prompt: string,
  museId?: string | null,
): Promise<DesignBrief> {
  const { brief } = await invoke<{ brief: DesignBrief }>({
    step: "brief",
    prompt,
    muse: museById(museId)?.prompt ?? "",
  });
  return brief;
}

export async function generateBrandKit(
  prompt: string,
  museId?: string | null,
): Promise<BrandKit> {
  const { brand } = await invoke<{ brand: BrandKit }>({
    step: "brand",
    prompt,
    muse: museById(museId)?.prompt ?? "",
  });
  return brand;
}

export async function generateImage(
  imagePrompt: string,
  kind: ImageKind,
  museId?: string | null,
): Promise<string> {
  const { image_base64 } = await invoke<{ image_base64: string }>({
    step: "image",
    image_prompt: imagePrompt,
    kind,
    muse: museById(museId)?.prompt ?? "",
  });
  return image_base64;
}

/** Render illustration + sketch for a single piece, in parallel. */
export async function generatePieceVisuals(
  brief: DesignBrief,
  museId?: string | null,
): Promise<{ illustration: string | null; sketch: string | null }> {
  let firstErr: unknown = null;
  const attempt = async (kind: ImageKind, prompt: string) => {
    try {
      return await generateImage(prompt, kind, museId);
    } catch (e) {
      firstErr ??= e;
      return null;
    }
  };
  const [illustration, sketch] = await Promise.all([
    attempt("illustration", brief.image_prompt),
    attempt("sketch", brief.sketch_prompt ?? brief.image_prompt),
  ]);
  // When NOTHING could be rendered, surface the real reason (e.g. quota
  // exhausted) instead of a silent empty state. Partial failures degrade.
  if (!illustration && !sketch && firstErr) throw firstErr;
  return { illustration, sketch };
}

/** Transform an existing creation into a new context (city, garment, direction, optional Spanish dance). */
export async function transformCreation(
  sourceBrief: DesignBrief,
  options: TransformOptions,
  museId?: string | null,
  danceId?: string | null,
): Promise<DesignBrief> {
  const city = TRANSFORM_CITIES.find((c) => c.id === options.city);
  const garment = TRANSFORM_GARMENTS.find((g) => g.id === options.garment);
  const direction = TRANSFORM_DIRECTIONS.find((d) => d.id === options.direction);
  const dance = TRANSFORM_DANCES.find((d) => d.id === danceId);
  const { brief } = await invoke<{ brief: DesignBrief }>({
    step: "transform",
    source_brief: sourceBrief,
    city: city?.prompt ?? options.city,
    garment: garment?.prompt ?? options.garment,
    direction: direction?.prompt ?? options.direction,
    dance: dance?.prompt ?? "",
    muse: museById(museId)?.prompt ?? "",
  });
  return brief;
}

export interface RenderProgress {
  done: number;
  total: number;
  label: string;
}

/* ------------------------------------------------------------------ */
/*  "On the House" — the concierge chat (Gemini, via Edge Function)    */
/* ------------------------------------------------------------------ */

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** Send a conversation to the house concierge and receive a reply. */
export async function chatWithMaison(messages: ChatMessage[]): Promise<string> {
  const { reply } = await invoke<{ reply: string }>({
    step: "chat",
    messages,
  });
  return reply;
}

/**
 * Render a full maison: logo + cover + every creation's illustration and
 * sketch. Images are generated with bounded concurrency so free-tier rate
 * limits are respected; a single failed image degrades to null, never
 * cancels the collection.
 */
export async function renderBrandVisuals(
  kit: BrandKit,
  museId?: string | null,
  onProgress?: (p: RenderProgress) => void,
): Promise<BrandVisuals> {
  const total = 2 + kit.creations.length * 2;
  let done = 0;
  let firstErr: unknown = null;
  const recordErr = (e: unknown) => {
    firstErr ??= e;
  };
  const tick = (label: string) => {
    done += 1;
    onProgress?.({ done, total, label });
  };

  const [logo, cover] = await Promise.all([
    generateImage(kit.logo_prompt, "logo", museId)
      .then((b) => {
        tick(`${kit.name} logo`);
        return b;
      })
      .catch((e) => {
        recordErr(e);
        tick(`${kit.name} logo`);
        return null;
      }),
    generateImage(kit.cover_prompt, "cover", museId)
      .then((b) => {
        tick(`${kit.name} cover`);
        return b;
      })
      .catch((e) => {
        recordErr(e);
        tick(`${kit.name} cover`);
        return null;
      }),
  ]);

  const creations = await mapLimit(
    kit.creations,
    2,
    async (creation) => {
      const [illustration, sketch] = await Promise.all([
        generateImage(creation.image_prompt, "illustration", museId)
          .then((b) => {
            tick(`${creation.name} illustration`);
            return b;
          })
          .catch((e) => {
            recordErr(e);
            tick(`${creation.name} illustration`);
            return null;
          }),
        generateImage(creation.sketch_prompt, "sketch", museId)
          .then((b) => {
            tick(`${creation.name} sketch`);
            return b;
          })
          .catch((e) => {
            recordErr(e);
            tick(`${creation.name} sketch`);
            return null;
          }),
      ]);
      return { illustration, sketch };
    },
  );

  // When NOTHING could be rendered, surface the real reason (e.g. quota
  // exhausted) instead of a silent empty state. Partial failures degrade.
  const allEmpty =
    !logo &&
    !cover &&
    creations.every((c) => !c.illustration && !c.sketch);
  if (allEmpty && firstErr) throw firstErr;

  return { logo, cover, creations };
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

/* ------------------------------------------------------------------ */
/*  Error mapping — readable atelier messages, no raw codes            */
/* ------------------------------------------------------------------ */

export function friendlyError(code: string | undefined, raw: string): string {
  const m = `${code ?? ""} ${raw}`.toLowerCase();
  if (code === "unauthorized" || m.includes("401")) {
    return "Your session has expired — please sign in again.";
  }
  if (code === "key_missing") {
    return "The atelier isn't configured yet — the Gemini key is missing. Add GEMINI_API_KEY as an Edge Function secret.";
  }
  if (code === "invalid_key") {
    return "The atelier's key was rejected — it may have been rotated. Please try again shortly.";
  }
  if (code === "model_unavailable") {
    return "The atelier's model is unavailable right now — please try again in a moment.";
  }
  if (code === "quota" || m.includes("429") || m.includes("rate limit")) {
    return "The atelier is at full capacity right now — wait a few minutes and try again.";
  }
  if (code === "blocked" || m.includes("blocked") || m.includes("safety")) {
    return "That vision was declined by the atelier's safety standards — try a slightly different description.";
  }
  if (code === "bad_request") {
    return "Describe your vision in a little more detail.";
  }
  return "The atelier couldn't complete that — please try again.";
}

/**
 * Turn a base64 image payload into a usable data URL. Pollinations returns
 * JPEG (base64 prefix "/9j/"); Gemini returned PNG. Label it correctly so
 * every browser decodes it without sniffing.
 */
export const dataUrl = (base64: string) => {
  const mime = base64.startsWith("/9j/") ? "image/jpeg" : "image/png";
  return `data:${mime};base64,${base64}`;
};

/* ------------------------------------------------------------------ */
/*  The Creative Director — the fashion director of the maison         */
/* ------------------------------------------------------------------ */

export const CREATIVE_DIRECTOR = {
  name: "Elianne Vérin",
  title: "Directrice de la Création",
  signature: "E. Vérin",
} as const;

/* ------------------------------------------------------------------ */
/*  COUTURE CRÉATION — content creation (stage two of the pipeline)    */
/* ------------------------------------------------------------------ */

export async function generateContentCreation(
  prompt: string,
  brief: DesignBrief,
  museId?: string | null,
): Promise<ContentCreation> {
  const { content } = await invoke<{ content: ContentCreation }>({
    step: "content",
    prompt,
    brief,
    muse: museById(museId)?.prompt ?? "",
  });
  return content;
}

/* ------------------------------------------------------------------ */
/*  COUTURE BIJOUX — jewellery + shoes completing a creation           */
/* ------------------------------------------------------------------ */

export async function generateBijouxKit(
  prompt: string,
  media: MediaInput[],
  museId?: string | null,
): Promise<BijouxKit> {
  const { bijoux } = await invoke<{ bijoux: BijouxKit }>({
    step: "bijoux",
    prompt,
    media,
    muse: museById(museId)?.prompt ?? "",
  });
  return bijoux;
}

/* ------------------------------------------------------------------ */
/*  ATELIER DOSSIER — the complete press-ready story of a creation     */
/* ------------------------------------------------------------------ */

export async function generateDossierStory(
  brief: DesignBrief,
  prompt: string,
): Promise<DossierStory> {
  const { dossier } = await invoke<{ dossier: DossierStory }>({
    step: "dossier",
    brief,
    prompt,
  });
  return dossier;
}

/* ------------------------------------------------------------------ */
/*  The song of the creation — lyrics & music sheet, in the client's   */
/*  language (Spanish, French, US English, UK English).                */
/* ------------------------------------------------------------------ */

export const SONG_LANGUAGES = [
  { id: "es", label: "Español" },
  { id: "fr", label: "Français" },
  { id: "en-US", label: "English (US)" },
  { id: "en-GB", label: "English (UK)" },
  { id: "it", label: "Italiano" },
] as const;

export type SongLanguageId = (typeof SONG_LANGUAGES)[number]["id"];

export async function generateSong(
  prompt: string,
  language: SongLanguageId,
): Promise<SongKit> {
  const { song } = await invoke<{ song: SongKit }>({
    step: "song",
    prompt,
    language,
  });
  return song;
}

/* ------------------------------------------------------------------ */
/*  The narration — the narrator's script for the creation or brand.   */
/* ------------------------------------------------------------------ */

export async function generateNarration(
  prompt: string,
  language: string,
  brief?: DesignBrief | null,
): Promise<NarrationKit> {
  const { narration } = await invoke<{ narration: NarrationKit }>({
    step: "narration",
    prompt,
    language,
    brief: brief ?? null,
  });
  return narration;
}

/* ------------------------------------------------------------------ */
/*  The model's face — bold, beautiful, fully visible.                 */
/*  Reinforced server-side in the image styles; this constant labels   */
/*  the promise in the UI.                                             */
/* ------------------------------------------------------------------ */

export const FACE_PROMISE =
  "Every model's full face is clearly visible — bold, beautiful and confident.";

