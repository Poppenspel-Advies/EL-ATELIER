import { supabase } from "./supabase";
import type { Collection, Design, DesignBrief } from "./types";

/* ---------------- Edge function (generate-design) ---------------- */

export async function generateBrief(prompt: string): Promise<DesignBrief> {
  const { data, error } = await supabase.functions.invoke("generate-design", {
    body: { step: "brief", prompt },
  });
  if (error) throw new Error(friendlyFnError(error.message));
  return data?.brief as DesignBrief;
}

export async function generateImage(imagePrompt: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke("generate-design", {
    body: { step: "image", image_prompt: imagePrompt },
  });
  if (error) throw new Error(friendlyFnError(error.message));
  return data?.image_base64 as string;
}

function friendlyFnError(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes("401") || m.includes("unauthorized")) {
    return "Your session has expired — please sign in again.";
  }
  if (m.includes("429") || m.includes("rate")) {
    return "The atelier is busy — please wait a moment and try again.";
  }
  if (m.includes("key") || m.includes("configured")) {
    return "The atelier isn't fully configured yet — please try again shortly.";
  }
  return "The atelier couldn't complete that — please try again.";
}

/* ---------------- Design archive ---------------- */

export async function saveDesign(params: {
  userId: string;
  name: string;
  prompt: string;
  brief: DesignBrief;
  imageBase64: string;
  collectionId: string | null;
}): Promise<Design> {
  const id = crypto.randomUUID();
  const imagePath = `${params.userId}/${id}.png`;

  const binary = atob(params.imageBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const { error: uploadError } = await supabase.storage
    .from("design-images")
    .upload(imagePath, bytes, { contentType: "image/png", upsert: true });
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
