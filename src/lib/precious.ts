import type { DesignBrief } from "./types";
import { estimatePrice, formatUsd } from "./booklet";

/* ------------------------------------------------------------------ */
/*  LA NOVIA IMPÉRIALE™ & the precious couture collections of the      */
/*  maison. Every piece carries a price tag — the base couture price    */
/*  plus the cost of its precious plating (gold, diamonds, Swarovski    */
/*  crystal, rare gemstones, platinum).                                */
/* ------------------------------------------------------------------ */

export type PreciousFinishId = "gold" | "diamant" | "crystal" | "gemme" | "platine";

export interface PreciousCollection {
  id: PreciousFinishId;
  menu: string;
  /** Full menu title shown in navigation and page headings. */
  title: string;
  tagline: string;
  description: string;
  materials: string;
  gemstones: string[];
  /** Injected into the image prompt to direct the finish. */
  prompt: string;
  accent: string;
}

export const PRECIOUS_COLLECTIONS: PreciousCollection[] = [
  {
    id: "gold",
    menu: "GOLD COUTURE™",
    title: "GOLD COUTURE",
    tagline: "Gold-integrated garments and couture detailing",
    description:
      "Garments woven, embroidered and plated in gold — gilded thread, liquid-metal lamé and hand-laid gold leaf, integrated into the couture itself.",
    materials: "24k gold leaf, gold lamé, gilded silk organza, gold bullion embroidery",
    gemstones: ["24k gold plating", "rose gold", "champagne gold"],
    prompt:
      "opulent gold couture, gilded thread, liquid-metal gold lamé, hand-laid gold leaf, luminous and regal, elegant and modest, fully dressed and refined",
    accent: "#D4A017",
  },
  {
    id: "diamant",
    menu: "DIAMANT COUTURE™",
    title: "DIAMANT COUTURE",
    tagline: "Diamond bridal creations and high-jewellery couture",
    description:
      "Bridal couture set with diamonds — pavé bodices, diamond-dusted tulle and high-jewellery construction, the house's most radiant bridal tier.",
    materials: "white diamonds, champagne diamonds, black diamonds, diamond-dusted tulle",
    gemstones: ["white diamond pavé", "champagne diamonds", "black diamonds"],
    prompt:
      "diamond bridal couture, pavé-set diamond bodice, diamond-dusted tulle, high-jewellery construction, sparkling and regal, elegant and modest, fully dressed and refined",
    accent: "#B9D8E6",
  },
  {
    id: "crystal",
    menu: "CRYSTAL COUTURE™",
    title: "CRYSTAL COUTURE",
    tagline: "Swarovski and crystal-encrusted creations",
    description:
      "Creations encrusted with Swarovski crystal — aurora borealis fire, glass-beaded embroidery and crystal fringe that catches every light.",
    materials: "Swarovski crystal, aurora borealis crystal, glass beads, crystal fringe",
    gemstones: ["aurora borealis crystal", "clear Swarovski crystal", "crystal fringe"],
    prompt:
      "Swarovski crystal-encrusted couture, aurora borealis crystal fire, glass-beaded embroidery and crystal fringe, glittering and elegant, fully dressed and refined",
    accent: "#B9C7E8",
  },
  {
    id: "gemme",
    menu: "GEMME COUTURE™",
    title: "GEMME COUTURE",
    tagline: "Precious, rare and exceptional gemstone creations",
    description:
      "Creations set with the rarest gemstones on earth — Colombian emeralds, Burmese rubies, Kashmir sapphires and Paraíba tourmaline.",
    materials: "emeralds, rubies, sapphires, aquamarine, tanzanite, Paraíba tourmaline",
    gemstones: [
      "Colombian emeralds",
      "Burmese rubies",
      "Kashmir sapphires",
      "Paraíba tourmaline",
      "Tanzanite",
      "Aquamarine",
    ],
    prompt:
      "rare exceptional gemstone couture, Colombian emeralds, Burmese rubies, Kashmir sapphires and Paraíba tourmaline, opulent and majestic, elegant and modest, fully dressed and refined",
    accent: "#34C77B",
  },
  {
    id: "platine",
    menu: "COUTURE PLATINE™",
    title: "COUTURE PLATINE",
    tagline: "Platinum and precious-metal couture creations",
    description:
      "Couture built in platinum and precious metal — platinum threadwork, palladium chainmail and liquid-silver draping, cold and flawless.",
    materials: "platinum thread, palladium chainmail, liquid silver, white-gold detailing",
    gemstones: ["platinum threadwork", "palladium chainmail", "white gold"],
    prompt:
      "platinum precious-metal couture, platinum threadwork, palladium chainmail and liquid-silver draping, cold flawless luxury, elegant and modest, fully dressed and refined",
    accent: "#C7D2D6",
  },
];

export const preciousCollectionById = (id: string) =>
  PRECIOUS_COLLECTIONS.find((c) => c.id === id);

/* ------------------------------------------------------------------ */
/*  The costliest gemstone platings — each with its own price tag.     */
/* ------------------------------------------------------------------ */

export interface GemstonePlating {
  id: string;
  name: string;
  description: string;
  priceUsd: number;
}

export const GEMSTONE_PLATINGS: GemstonePlating[] = [
  { id: "gold-24k", name: "24k Gold Plating", description: "Hand-laid gold leaf over the couture", priceUsd: 12000 },
  { id: "rose-gold", name: "Rose Gold Plating", description: "Warm rose-gold gilding and thread", priceUsd: 9500 },
  { id: "diamond-pave", name: "White Diamond Pavé", description: "Micro-set white diamonds across the bodice", priceUsd: 85000 },
  { id: "champagne-diamond", name: "Champagne Diamonds", description: "Soft champagne-tinted diamond dusting", priceUsd: 60000 },
  { id: "black-diamond", name: "Black Diamonds", description: "Noir pavé for a midnight bridal finish", priceUsd: 70000 },
  { id: "crystal-ab", name: "Swarovski Aurora Borealis", description: "Iridescent crystal fire across every seam", priceUsd: 4800 },
  { id: "crystal-clear", name: "Clear Swarovski Crystal", description: "Pure crystal clarity, glass-beaded", priceUsd: 3200 },
  { id: "emerald", name: "Colombian Emeralds", description: "Deep green high-jewellery settings", priceUsd: 120000 },
  { id: "ruby", name: "Burmese Rubies", description: "Pigeon-blood ruby settings", priceUsd: 150000 },
  { id: "sapphire", name: "Kashmir Sapphires", description: "Velvet blue cornflower settings", priceUsd: 110000 },
  { id: "aquamarine", name: "Aquamarine", description: "Glacial sea-blue settings", priceUsd: 38000 },
  { id: "tanzanite", name: "Tanzanite", description: "Violet-blue settings of exceptional rarity", priceUsd: 45000 },
  { id: "morganite", name: "Morganite", description: "Peach-pink rose settings", priceUsd: 28000 },
  { id: "opal", name: "Opal", description: "Fire-opal settings, shifting with the light", priceUsd: 52000 },
  { id: "paraiba", name: "Paraíba Tourmaline", description: "Neon electric turquoise, among the rarest", priceUsd: 95000 },
  { id: "platinum", name: "Platinum Threadwork", description: "Hand-woven platinum embroidery", priceUsd: 18000 },
];

export const gemstonePlatingById = (id: string) =>
  GEMSTONE_PLATINGS.find((g) => g.id === id);

/* ------------------------------------------------------------------ */
/*  Price tags — base couture price + precious plating.                */
/* ------------------------------------------------------------------ */

export function preciousPriceTag(
  brief: DesignBrief | null,
  plating: GemstonePlating | null | undefined,
): number {
  return estimatePrice(brief) + (plating?.priceUsd ?? 0);
}

export function preciousPriceLabel(
  brief: DesignBrief | null,
  plating: GemstonePlating | null | undefined,
): string {
  const base = estimatePrice(brief);
  const platingPrice = plating?.priceUsd ?? 0;
  return plating
    ? `${formatUsd(base + platingPrice)} (${formatUsd(base)} couture + ${formatUsd(platingPrice)} ${plating.name})`
    : formatUsd(base + platingPrice);
}

/** Tags stamped on every piece and its collection entry. */
export function preciousTags(collection: PreciousCollection, plating?: GemstonePlating | null): string[] {
  return [
    collection.menu.replace("™", ""),
    collection.tagline.split(" ").slice(0, 3).join(" "),
    ...(plating ? [plating.name] : []),
    "EL ATELIER",
  ].filter(Boolean);
}
