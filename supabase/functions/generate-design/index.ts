import { createClient } from "jsr:@supabase/supabase-js@2";

// --- Models (pinned constants — update here to move to newer models) ---
const CHAT_MODEL = "gpt-4o-mini"; // Pensamiento — brief composition
const IMAGE_MODEL = "gpt-image-2"; // COUTURE VISION — primary
const IMAGE_MODEL_FALLBACK = "gpt-image-1"; // COUTURE VISION — fallback
const IMAGE_SIZE = "1024x1536"; // portrait, fashion illustration

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // --- Verify the caller ---
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return json({ error: "The atelier key is not configured." }, 500);
    }

    const body = await req.json().catch(() => ({}));
    const step = body?.step ?? "brief";

    if (step === "image") {
      const imagePrompt = String(body?.image_prompt ?? "").trim();
      if (!imagePrompt) return json({ error: "image_prompt is required." }, 400);
      const imageBase64 = await generateImage(apiKey, imagePrompt);
      return json({ image_base64: imageBase64 });
    }

    // Default step: "brief" (Pensamiento)
    const prompt = String(body?.prompt ?? "").trim();
    if (prompt.length < 10) {
      return json({ error: "Describe your vision in a little more detail." }, 400);
    }
    const brief = await generateBrief(apiKey, prompt);
    return json({ brief });
  } catch (err) {
    console.error("generate-design error:", err);
    return json({ error: "The atelier encountered an error. Please try again." }, 500);
  }
});

/* ---------------- Pensamiento: compose the couture brief ---------------- */

async function generateBrief(apiKey: string, prompt: string) {
  const system = [
    "You are Pensamiento, the creative intelligence of EL ATELIER, a private maison of couture intelligence.",
    "You transform a client's vision into a precise, luxurious design brief for a haute couture garment.",
    "Respond ONLY with a JSON object — no markdown, no commentary.",
    "The JSON must contain exactly these keys:",
    '- "name": an evocative couture name for the piece (string)',
    '- "silhouette": the garment silhouette and cut (string)',
    '- "fabric": the recommended fabric(s) (string)',
    '- "palette": an array of 3-5 hex color strings, e.g. ["#1C1917", "#F5EFE6"]',
    '- "occasion": the intended occasion (string)',
    '- "mood": the mood or attitude of the piece (string)',
    '- "styling_notes": 1-2 sentences of styling direction (string)',
    '- "model_type": the type of model/figure for the illustration, e.g. "editorial runway figure" (string)',
    '- "collection_notes": one sentence placing the piece within a collection (string)',
    '- "image_prompt": a detailed, self-contained English image prompt for an illustration of this garment, describing silhouette, fabric, colors, mood, model pose, background (keep it minimal and editorial), and rendering style ("haute couture fashion illustration, full-length, elegant, refined")',
  ].join("\n");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      temperature: 0.85,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("OpenAI chat error:", res.status, text);
    throw new Error("Pensamiento could not compose the brief.");
  }

  const data = await res.json();
  const content: string = data?.choices?.[0]?.message?.content ?? "{}";
  let brief: Record<string, unknown>;
  try {
    brief = JSON.parse(content);
  } catch {
    throw new Error("Pensamiento returned an unreadable brief.");
  }

  // Ensure required fields exist (fallbacks so the image step always works)
  return {
    name: String(brief.name ?? "Untitled Look"),
    silhouette: String(brief.silhouette ?? "Evening gown"),
    fabric: String(brief.fabric ?? "Silk"),
    palette: Array.isArray(brief.palette) ? brief.palette.map(String).slice(0, 6) : [],
    occasion: String(brief.occasion ?? "Evening"),
    mood: String(brief.mood ?? "Elegant"),
    styling_notes: String(brief.styling_notes ?? ""),
    model_type: String(brief.model_type ?? "editorial runway figure"),
    collection_notes: String(brief.collection_notes ?? ""),
    image_prompt: String(brief.image_prompt ?? `${brief.name} haute couture fashion illustration, full-length, elegant`),
  };
}

/* ---------------- COUTURE VISION: render the illustration ---------------- */

async function generateImage(apiKey: string, imagePrompt: string): Promise<string> {
  // Try the primary model, fall back to gpt-image-1
  const attempts = [
    { model: IMAGE_MODEL, withQuality: false },
    { model: IMAGE_MODEL_FALLBACK, withQuality: true },
  ];

  for (const { model, withQuality } of attempts) {
    try {
      const payload: Record<string, unknown> = {
        model,
        prompt: imagePrompt,
        n: 1,
        size: IMAGE_SIZE,
      };
      if (withQuality) {
        payload.quality = "high";
        payload.response_format = "b64_json";
      }
      const res = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        console.error(`OpenAI image error (${model}):`, res.status, text);
        continue; // try fallback
      }
      const data = await res.json();
      const b64: string | undefined = data?.data?.[0]?.b64_json;
      if (b64) return b64;
      const url: string | undefined = data?.data?.[0]?.url;
      if (url) return await urlToBase64(url);
      throw new Error("No image data returned.");
    } catch (e) {
      console.error(`Image generation failed (${model}):`, e);
    }
  }
  throw new Error("COUTURE VISION could not render the illustration.");
}

async function urlToBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

/* ---------------- helpers ---------------- */

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}
