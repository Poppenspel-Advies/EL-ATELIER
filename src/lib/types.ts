export interface DesignBrief {
  name: string;
  silhouette: string;
  fit?: string;
  fabric: string;
  palette: string[];
  occasion: string;
  mood: string;
  styling_notes: string;
  innovation?: string;
  variation?: string;
  model_type: string;
  image_prompt: string;
  sketch_prompt?: string;
  collection_notes?: string;
  /** The Creative Director's signed note for this piece. */
  director_note?: string;
}

export interface Design {
  id: string;
  user_id: string;
  collection_id: string | null;
  name: string;
  prompt: string;
  brief: DesignBrief | null;
  image_path: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Collection {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  created_at: string;
}

/* ---------------- Gemini / brand types ---------------- */

export type ImageKind =
  | "illustration"
  | "sketch"
  | "logo"
  | "cover"
  | "bijoux"
  | "shoe";

export interface Muse {
  id: string;
  label: string;
  description: string;
  /** Fragment injected into image prompts to direct the model/figure. */
  prompt: string;
}

export interface BrandCreation {
  name: string;
  silhouette: string;
  fit?: string;
  fabric: string;
  palette: string[];
  occasion: string;
  mood: string;
  styling_notes: string;
  innovation: string;
  variation: string;
  model_type: string;
  image_prompt: string;
  sketch_prompt: string;
}

export interface BrandKit {
  name: string;
  tagline: string;
  positioning: string;
  audience: string;
  house_notes: string;
  logo_prompt: string;
  cover_prompt: string;
  palette: string[];
  creations: BrandCreation[];
}

/** In-memory rendering results (base64 data, no leading prefix). */
export interface BrandVisuals {
  logo: string | null;
  cover: string | null;
  creations: { illustration: string | null; sketch: string | null }[];
}

/** Storage paths for a persisted brand. */
export interface BrandImagePaths {
  logo: string | null;
  cover: string | null;
  creations: { illustration: string | null; sketch: string | null }[];
}

export interface Brand {
  id: string;
  user_id: string;
  name: string;
  tagline: string | null;
  prompt: string;
  muse: string | null;
  kit: BrandKit | null;
  images: BrandImagePaths | null;
  status: string;
  slug: string | null;
  published: boolean;
  domain: string | null;
  created_at: string;
  updated_at: string;
}

/** Reusable house codes — a saved "workspace template" for the studio. */
export interface WorkspaceTemplate {
  id: string;
  user_id: string;
  name: string;
  palette: string[];
  muse: string | null;
  positioning: string | null;
  house_notes: string | null;
  style_prompt: string | null;
  created_at: string;
}

/** Options for transforming an existing creation. */
export interface TransformOptions {
  city: string;
  garment: string;
  direction: string;
}

export interface SamplePreset {
  id: string;
  title: string;
  mode: "piece" | "maison";
  blurb: string;
  prompt: string;
  museId: string;
  palette: string[];
}

/* ---------------- Creative Director & maison modules ---------------- */

/** A media reference (image, voice note, video frame) understood by Gemini. */
export interface MediaInput {
  mimeType: string;
  /** Base64 payload, no data-URL prefix. */
  data: string;
}

/** COUTURE CRÉATION — the campaign world of a creation (stage two). */
export interface ContentCreation {
  title: string;
  subtitle: string;
  campaign_concept: string;
  editorial_copy: string[];
  moodboard_prompt: string;
  lookbook_concept: string;
  director_note: string;
}

/** COUTURE BIJOUX — one jewellery object, an accessory, or the shoes. */
export interface BijouxItem {
  id: "necklace" | "earrings" | "bracelet" | "ring" | "bag" | "tiara" | "shoes";
  kind: string;
  name: string;
  material: string;
  palette: string[];
  craftsmanship: string;
  styling: string;
  image_prompt: string;
}

/** COUTURE BIJOUX — the jewellery suite, accessories + shoes completing a creation. */
export interface BijouxKit {
  concept: string;
  inspiration: string;
  director_note: string;
  items: BijouxItem[];
}

/** ATELIER DOSSIER — the complete press-ready story of a creation. */
export interface DossierStory {
  title: string;
  subtitle: string;
  narrative: string[];
  magazine_title: string;
  article: string[];
  pull_quote: string;
  social_posts: string[];
  editorial_prompts: string[];
  director_note: string;
}

/* ---------------- Songs & narrations ---------------- */

export type SongLanguage = "es" | "fr" | "en-US" | "en-GB" | "it";

/** The song of a creation — lyrics and music sheet, in the client's language. */
export interface SongKit {
  title: string;
  language: SongLanguage;
  language_label: string;
  style: string;
  tempo: string;
  key: string;
  lyrics: string[];
  chorus: string;
  chord_sheet: string;
  producer_notes: string;
}

/** The narrator's script — the voice of the house reading the creation aloud. */
export interface NarrationKit {
  title: string;
  language_label: string;
  script: string[];
}

/* ---------------- The collection archive ---------------- */

export type AssetKind =
  | "drawing"
  | "article"
  | "story"
  | "editorial"
  | "bijoux"
  | "bag"
  | "shoe"
  | "accessory"
  | "song"
  | "narration"
  | "collection"
  | "brand";

/** Anything saved into the atelier archive — included in the booklet exports. */
export interface CollectionAsset {
  id: string;
  user_id: string;
  collection_id: string | null;
  kind: AssetKind;
  name: string;
  payload: Record<string, unknown>;
  image_path: string | null;
  price: number | null;
  tags: string[];
  design_id: string | null;
  brand_id: string | null;
  created_at: string;
}

/* ---------------- Billing & subscriptions ---------------- */

export type PlanTier = "free" | "couture" | "premium" | "luxe";

export interface ProfileBilling {
  tier: PlanTier;
  designs_used: number;
  brands_created: number;
  images_used: number;
  paypal_subscription_id: string | null;
  paypal_status: string | null;
  plan_cycle_start: string | null;
}

export interface Plan {
  id: string;
  tier: PlanTier;
  name: string;
  priceUsd: number;
  cadence: "month" | "metered" | "one-time";
  blurb: string;
  features: string[];
  cta: string;
}

/** Precious finishing for the bridal collection — gold, diamond, crystal. */
export interface PreciousFinishing {
  id: string;
  name: string;
  description: string;
  priceUsd: number;
  tags: string[];
}
