import { supabase } from "./supabase";
import type {
  Brand,
  BrandImagePaths,
  BrandKit,
  BrandVisuals,
  Collection,
  CollectionAsset,
  Design,
  DesignBrief,
  ProfileBilling,
  WorkspaceTemplate,
} from "./types";

/* ---------------- Design archive ---------------- */

/**
 * Sniff the real format of a base64 image payload. COUTURE VISION renders
 * JPEG (base64 begins "/9j/"); older Gemini renders were PNG. Storing the
 * correct extension AND content type keeps every browser decoding it.
 */
function sniffImage(
  base64: string,
): { mime: "image/jpeg" | "image/png"; ext: "jpg" | "png" } {
  return base64.startsWith("/9j/")
    ? { mime: "image/jpeg", ext: "jpg" }
    : { mime: "image/png", ext: "png" };
}

export async function saveDesign(params: {
  userId: string;
  name: string;
  prompt: string;
  brief: DesignBrief;
  imageBase64: string;
  collectionId: string | null;
}): Promise<Design> {
  const id = crypto.randomUUID();
  const { mime, ext } = sniffImage(params.imageBase64);
  const imagePath = `${params.userId}/${id}.${ext}`;

  const binary = atob(params.imageBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const { error: uploadError } = await supabase.storage
    .from("design-images")
    .upload(imagePath, bytes, { contentType: mime, upsert: true });
  if (uploadError) {
    throw new Error("We couldn't archive the illustration — please try again.");
  }

  const { data, error } = await supabase
    .from("designs")
    .insert({
      id,
      user_id: params.userId,
      collection_id: params.collectionId,
      name: params.name,
      prompt: params.prompt,
      brief: params.brief,
      image_path: imagePath,
      status: "ready",
    })
    .select()
    .single();

  if (error || !data) {
    throw new Error("We couldn't save the design — please try again.");
  }
  return data as Design;
}

export async function fetchDesigns(userId: string): Promise<Design[]> {
  const { data, error } = await supabase
    .from("designs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error("We couldn't load your archive.");
  return (data ?? []) as Design[];
}

export async function fetchDesign(id: string): Promise<Design | null> {
  const { data, error } = await supabase
    .from("designs")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as Design;
}

export async function renameDesign(id: string, name: string): Promise<void> {
  const { error } = await supabase
    .from("designs")
    .update({ name, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error("We couldn't rename the design.");
}

export async function moveDesignToCollection(
  id: string,
  collectionId: string | null
): Promise<void> {
  const { error } = await supabase
    .from("designs")
    .update({ collection_id: collectionId, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error("We couldn't move the design.");
}

export async function deleteDesign(design: Design): Promise<void> {
  if (design.image_path) {
    const { error: storageError } = await supabase.storage
      .from("design-images")
      .remove([design.image_path]);
    if (storageError) throw new Error("We couldn't remove the illustration.");
  }
  const { error } = await supabase.from("designs").delete().eq("id", design.id);
  if (error) throw new Error("We couldn't delete the design.");
}

/* ---------------- Collections ---------------- */

export async function fetchCollections(userId: string): Promise<Collection[]> {
  const { data, error } = await supabase
    .from("collections")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw new Error("We couldn't load your collections.");
  return (data ?? []) as Collection[];
}

export async function createCollection(
  userId: string,
  name: string
): Promise<Collection> {
  const { data, error } = await supabase
    .from("collections")
    .insert({ user_id: userId, name })
    .select()
    .single();
  if (error || !data) throw new Error("We couldn't create that collection.");
  return data as Collection;
}

/* ---------------- Storage helper ---------------- */

export async function getImageUrl(imagePath: string | null): Promise<string | null> {
  if (!imagePath) return null;
  const { data } = await supabase.storage
    .from("design-images")
    .createSignedUrl(imagePath, 3600);
  return data?.signedUrl ?? null;
}

/* ---------------- Maison (brand) archive ---------------- */

const BRAND_BUCKET = "brand-images";

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function saveBrand(params: {
  userId: string;
  name: string;
  tagline: string;
  prompt: string;
  muse: string | null;
  kit: BrandKit;
  visuals: BrandVisuals;
}): Promise<Brand> {
  const id = crypto.randomUUID();
  const prefix = `${params.userId}/${id}`;
  const paths: BrandImagePaths = {
    logo: null,
    cover: null,
    creations: params.kit.creations.map(() => ({ illustration: null, sketch: null })),
  };

  const upload = async (key: string, base64: string | null): Promise<string | null> => {
    if (!base64) return null;
    const { mime, ext } = sniffImage(base64);
    const path = `${prefix}/${key}.${ext}`;
    const { error } = await supabase.storage
      .from(BRAND_BUCKET)
      .upload(path, base64ToBytes(base64), {
        contentType: mime,
        upsert: true,
      });
    if (error) throw new Error("We couldn't archive the maison imagery — please try again.");
    return path;
  };

  paths.logo = await upload("logo", params.visuals.logo);
  paths.cover = await upload("cover", params.visuals.cover);

  for (let i = 0; i < params.kit.creations.length; i++) {
    const v = params.visuals.creations[i];
    if (!v) continue;
    paths.creations[i] = {
      illustration: await upload(`creation-${i + 1}-illustration`, v.illustration),
      sketch: await upload(`creation-${i + 1}-sketch`, v.sketch),
    };
  }

  const { data, error } = await supabase
    .from("brands")
    .insert({
      id,
      user_id: params.userId,
      name: params.name,
      tagline: params.tagline,
      prompt: params.prompt,
      muse: params.muse,
      kit: params.kit,
      images: paths,
      status: "ready",
    })
    .select()
    .single();

  if (error || !data) {
    // Best-effort cleanup of the uploaded imagery.
    const all = [
      paths.logo,
      paths.cover,
      ...paths.creations.flatMap((c) => [c.illustration, c.sketch]),
    ].filter(Boolean) as string[];
    if (all.length) await supabase.storage.from(BRAND_BUCKET).remove(all);
    throw new Error("We couldn't save the maison — please try again.");
  }
  return data as Brand;
}

export async function fetchBrands(userId: string): Promise<Brand[]> {
  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error("We couldn't load your maisons.");
  return (data ?? []) as Brand[];
}

export async function fetchBrand(id: string): Promise<Brand | null> {
  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) return null;
  return data as Brand;
}

export async function deleteBrand(brand: Brand): Promise<void> {
  if (brand.images) {
    const all = [
      brand.images.logo,
      brand.images.cover,
      ...brand.images.creations.flatMap((c) => [c.illustration, c.sketch]),
    ].filter(Boolean) as string[];
    if (all.length) {
      const { error: storageError } = await supabase.storage
        .from(BRAND_BUCKET)
        .remove(all);
      if (storageError) throw new Error("We couldn't remove the maison imagery.");
    }
  }
  const { error } = await supabase.from("brands").delete().eq("id", brand.id);
  if (error) throw new Error("We couldn't delete the maison.");
}

/** Resolve a full brand's image paths to signed URLs for display. */
export async function getBrandImageUrls(brand: Brand): Promise<BrandVisuals | null> {
  if (!brand.images) return null;
  const img = brand.images;
  const url = (path: string | null) =>
    path
      ? supabase.storage
          .from(BRAND_BUCKET)
          .createSignedUrl(path, 3600)
          .then((r) => r.data?.signedUrl ?? null)
      : Promise.resolve(null);

  const logo = await url(img.logo);
  const cover = await url(img.cover);
  const creations = await Promise.all(
    img.creations.map(async (c) => ({
      illustration: await url(c.illustration),
      sketch: await url(c.sketch),
    })),
  );
  return { logo, cover, creations };
}

/* ---------------- Workspace templates ---------------- */

export async function saveTemplate(params: {
  userId: string;
  name: string;
  palette: string[];
  muse: string | null;
  positioning: string | null;
  house_notes: string | null;
  style_prompt: string | null;
}): Promise<WorkspaceTemplate> {
  const { data, error } = await supabase
    .from("templates")
    .insert({
      user_id: params.userId,
      name: params.name,
      palette: params.palette,
      muse: params.muse,
      positioning: params.positioning,
      house_notes: params.house_notes,
      style_prompt: params.style_prompt,
    })
    .select()
    .single();
  if (error || !data) throw new Error("We couldn't save this template.");
  return data as WorkspaceTemplate;
}

export async function fetchTemplates(userId: string): Promise<WorkspaceTemplate[]> {
  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error("We couldn't load your templates.");
  return (data ?? []) as WorkspaceTemplate[];
}

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await supabase.from("templates").delete().eq("id", id);
  if (error) throw new Error("We couldn't delete the template.");
}

/* ---------------- Publish (public maison website) ---------------- */

export async function publishBrand(params: {
  brandId: string;
  slug: string;
  domain: string | null;
}): Promise<Brand> {
  const { data, error } = await supabase
    .from("brands")
    .update({
      slug: params.slug,
      domain: params.domain || null,
      published: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.brandId)
    .select()
    .single();
  if (error || !data) throw new Error("We couldn't publish the maison website.");
  return data as Brand;
}

export async function unpublishBrand(brandId: string): Promise<void> {
  const { error } = await supabase
    .from("brands")
    .update({ published: false, updated_at: new Date().toISOString() })
    .eq("id", brandId);
  if (error) throw new Error("We couldn't unpublish the maison website.");
}

/** Fetch a published maison by slug — readable by anon via RLS policy. */
export async function fetchPublishedBrand(slug: string): Promise<Brand | null> {
  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  if (error || !data) return null;
  return data as Brand;
}

/** Public image URLs (bucket is public-read for published maisons). */
export async function getPublicBrandImageUrls(
  brand: Brand,
): Promise<BrandVisuals | null> {
  if (!brand.images) return null;
  const img = brand.images;
  const url = (path: string | null) =>
    path
      ? supabase.storage.from(BRAND_BUCKET).getPublicUrl(path).data.publicUrl
      : null;

  const creations = await Promise.all(
    img.creations.map(async (c) => ({
      illustration: url(c.illustration),
      sketch: url(c.sketch),
    })),
  );
  return { logo: url(img.logo), cover: url(img.cover), creations };
}

/* ---------------- The collection archive (assets) ---------------- */

/**
 * Save any generated artefact — a drawing, article, story, bijoux piece,
 * bag, shoe, accessory, song or narration — into the atelier archive so it
 * appears in the Collection, the booklet, and every PDF / image / film export.
 */
export async function saveAsset(params: {
  userId: string;
  kind: CollectionAsset["kind"];
  name: string;
  payload: Record<string, unknown>;
  imageBase64?: string | null;
  price?: number | null;
  tags?: string[];
  collectionId?: string | null;
  designId?: string | null;
  brandId?: string | null;
}): Promise<CollectionAsset> {
  let imagePath: string | null = null;
  if (params.imageBase64) {
    const { mime, ext } = sniffImage(params.imageBase64);
    const id = crypto.randomUUID();
    imagePath = `assets/${params.userId}/${id}.${ext}`;
    const binary = atob(params.imageBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const { error: uploadError } = await supabase.storage
      .from("design-images")
      .upload(imagePath, bytes, { contentType: mime, upsert: true });
    if (uploadError) {
      throw new Error("We couldn't archive the imagery — please try again.");
    }
  }

  const { data, error } = await supabase
    .from("collection_assets")
    .insert({
      user_id: params.userId,
      collection_id: params.collectionId ?? null,
      kind: params.kind,
      name: params.name,
      payload: params.payload,
      image_path: imagePath,
      price: params.price ?? null,
      tags: params.tags ?? [],
      design_id: params.designId ?? null,
      brand_id: params.brandId ?? null,
    })
    .select()
    .single();
  if (error || !data) {
    throw new Error("We couldn't save this to the collection.");
  }
  return data as CollectionAsset;
}

export async function fetchAssets(userId: string): Promise<CollectionAsset[]> {
  const { data, error } = await supabase
    .from("collection_assets")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error("We couldn't load the collection.");
  return (data ?? []) as CollectionAsset[];
}

export async function deleteAsset(id: string): Promise<void> {
  const { error } = await supabase
    .from("collection_assets")
    .delete()
    .eq("id", id);
  if (error) throw new Error("We couldn't remove that from the collection.");
}

export async function getAssetImageUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage
    .from("design-images")
    .createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

/* ---------------- Billing profile ---------------- */

export async function fetchProfileBilling(userId: string): Promise<ProfileBilling> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error || !data) {
    return {
      tier: "free",
      designs_used: 0,
      brands_created: 0,
      images_used: 0,
      paypal_subscription_id: null,
      paypal_status: null,
      plan_cycle_start: null,
    };
  }
  return data as ProfileBilling;
}

/** The design-images bucket doubles as the maison asset bucket. */
export { BRAND_BUCKET as ASSET_BUCKET };
