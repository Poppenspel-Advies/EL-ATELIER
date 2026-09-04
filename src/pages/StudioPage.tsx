import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Aperture,
  Check,
  Feather,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Wand2,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import {
  createCollection,
  fetchCollections,
  generateBrief,
  generateImage,
  saveDesign,
} from "../lib/api";
import type { Collection, DesignBrief } from "../lib/types";

type Phase = "idle" | "brief" | "image" | "done" | "error";

const SILHOUETTES = [
  "Evening gown",
  "Tailored blazer",
  "Cocktail dress",
  "Column dress",
  "Opera coat",
  "Two-piece suit",
  "Slip dress",
  "Wrap dress",
];

const FABRICS = [
  "Silk",
  "Taffeta",
  "Velvet",
  "Wool crepe",
  "Chiffon",
  "Brocade",
  "Organza",
  "Cashmere",
];

const OCCASIONS = [
  "Red carpet",
  "Gala",
  "Editorial shoot",
  "Office",
  "Garden party",
  "Runway",
  "Soirée",
  "Museum opening",
];

const MOODS = [
  "Sculptural",
  "Fluid",
  "Minimal",
  "Dramatic",
  "Romantic",
  "Avant-garde",
  "Quiet luxury",
  "Ethereal",
];

const PALETTE = [
  { name: "Pink", hex: "#ec4899" },
  { name: "Cyan", hex: "#22d3ee" },
  { name: "Violet", hex: "#8b5cf6" },
  { name: "Green", hex: "#10b981" },
  { name: "Flamingo", hex: "#fb7185" },
  { name: "Gold", hex: "#d4a017" },
  { name: "Noir", hex: "#1c1917" },
  { name: "Ivory", hex: "#f5f0e8" },
];

const EXAMPLES = [
  "A sculptural evening gown in liquid silk, moody violet, for a museum opening — dramatic, architectural folds.",
  "Quiet luxury two-piece suit in wool crepe, ivory and noir, for the office — minimal, sharp, editorial.",
  "A romantic slip dress in champagne chiffon for a garden soirée, ethereal movement, flamingo blush accents.",
];

export default function StudioPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [freeText, setFreeText] = useState("");
  const [silhouette, setSilhouette] = useState<string | null>(null);
  const [fabric, setFabric] = useState<string | null>(null);
  const [occasion, setOccasion] = useState<string | null>(null);
  const [mood, setMood] = useState<string | null>(null);
  const [palette, setPalette] = useState<string[]>([]);

  const [phase, setPhase] = useState<Phase>("idle");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brief, setBrief] = useState<DesignBrief | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  // Save controls
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionId, setCollectionId] = useState<string>("");
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [designName, setDesignName] = useState("");

  useEffect(() => {
    if (!user) return;
    fetchCollections(user.id)
      .then(setCollections)
      .catch(() => setCollections([]));
  }, [user]);

  const prompt = useMemo(() => {
    const parts: string[] = [];
    if (silhouette) parts.push(`silhouette: ${silhouette}`);
    if (fabric) parts.push(`fabric: ${fabric}`);
    if (occasion) parts.push(`occasion: ${occasion}`);
    if (mood) parts.push(`mood: ${mood}`);
    if (palette.length) parts.push(`palette: ${palette.join(", ")}`);
    const guided = parts.join("; ");
    return [freeText.trim(), guided].filter(Boolean).join(". ");
  }, [freeText, silhouette, fabric, occasion, mood, palette]);

  const togglePalette = (name: string) =>
    setPalette((p) => (p.includes(name) ? p.filter((x) => x !== name) : [...p, name]));

  const handleGenerate = async () => {
    if (!prompt || busy) return;
    setError(null);
    setBrief(null);
    setImageBase64(null);

    try {
      // Act 1 — Pensamiento composes the brief
      setPhase("brief");
      const composed = await generateBrief(prompt);
      setBrief(composed);

      // Act 2 — COUTURE VISION renders the illustration
      setPhase("image");
      const base64 = await generateImage(composed.image_prompt);
      setImageBase64(base64);

      setDesignName(composed.name || "");
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "The atelier encountered an error.");
      setPhase("error");
    }
  };

  const handleSave = async () => {
    if (!user || !brief || !imageBase64) return;
    if (!designName.trim()) {
      setError("Please give this design a name.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let targetCollectionId: string | null = collectionId || null;
      if (showNewCollection && newCollectionName.trim()) {
        const col = await createCollection(user.id, newCollectionName.trim());
        targetCollectionId = col.id;
      }
      const design = await saveDesign({
        userId: user.id,
        name: designName.trim(),
        prompt,
        brief,
        imageBase64,
        collectionId: targetCollectionId,
      });
      navigate(`/dossier/${design.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't save this design.");
    } finally {
      setSaving(false);
    }
  };

  const chipClass = (active: boolean) =>
    `rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-200 cursor-pointer ${
      active
        ? "border-primary bg-primary text-on-primary shadow-sm"
        : "border-border bg-on-primary text-secondary hover:border-primary/50 hover:text-primary"
    }`;

  const busy = phase === "brief" || phase === "image" || saving;

  return (
    <div className="px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <p className="eyebrow text-secondary">The studio</p>
        <h1 className="font-heading mt-2 text-3xl font-medium text-primary sm:text-4xl">
          Forge a design
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-secondary">
          Describe your vision, or guide the atelier with the selections below.
          Pensamiento will compose the brief; COUTURE VISION will render the look.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {/* ---------- COMPOSER ---------- */}
          <section className="card p-6" aria-label="Design composer">
            <label htmlFor="freeText" className="label">
              Your vision
            </label>
            <textarea
              id="freeText"
              rows={4}
              className="input resize-y"
              placeholder="Describe the piece in your own words…"
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              disabled={busy}
            />

            <div className="mt-6 flex flex-col gap-5">
              <div>
                <p className="label">Silhouette</p>
                <div className="flex flex-wrap gap-2">
                  {SILHOUETTES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={chipClass(silhouette === s)}
                      onClick={() => setSilhouette(silhouette === s ? null : s)}
                      disabled={busy}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="label">Fabric</p>
                <div className="flex flex-wrap gap-2">
                  {FABRICS.map((f) => (
                    <button
                      key={f}
                      type="button"
                      className={chipClass(fabric === f)}
                      onClick={() => setFabric(fabric === f ? null : f)}
                      disabled={busy}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="label">Occasion</p>
                <div className="flex flex-wrap gap-2">
                  {OCCASIONS.map((o) => (
                    <button
                      key={o}
                      type="button"
                      className={chipClass(occasion === o)}
                      onClick={() => setOccasion(occasion === o ? null : o)}
                      disabled={busy}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="label">Mood</p>
                <div className="flex flex-wrap gap-2">
                  {MOODS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={chipClass(mood === m)}
                      onClick={() => setMood(mood === m ? null : m)}
                      disabled={busy}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="label">Palette</p>
                <div className="flex flex-wrap gap-2">
                  {PALETTE.map((c) => {
                    const active = palette.includes(c.name);
                    return (
                      <button
                        key={c.name}
                        type="button"
                        className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-200 cursor-pointer ${
                          active
                            ? "border-primary bg-primary text-on-primary shadow-sm"
                            : "border-border bg-on-primary text-secondary hover:border-primary/50 hover:text-primary"
                        }`}
                        onClick={() => togglePalette(c.name)}
                        disabled={busy}
                      >
                        <span
                          aria-hidden="true"
                          className="h-3 w-3 rounded-full border border-black/10"
                          style={{ backgroundColor: c.hex }}
                        />
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {phase === "idle" && (
              <div className="mt-6">
                <p className="label">Or begin with an example</p>
                <div className="flex flex-col gap-2">
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      className="rounded-xl border border-border bg-on-primary px-4 py-3 text-left text-xs leading-relaxed text-secondary transition-all duration-200 hover:border-pink/40 hover:text-primary cursor-pointer"
                      onClick={() => setFreeText(ex)}
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleGenerate}
              disabled={!prompt || busy}
              className="btn-primary mt-6 w-full text-base"
            >
              {busy ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : (
                <Wand2 className="h-5 w-5" aria-hidden="true" />
              )}
              {phase === "brief"
                ? "Pensamiento is thinking…"
                : phase === "image"
                  ? "COUTURE VISION is rendering…"
                  : "Forge design"}
            </button>
          </section>

          {/* ---------- RESULT PANEL ---------- */}
          <section
            className="card min-h-[24rem] p-6"
            aria-label="Generation result"
          >
            {phase === "idle" && (
              <div className="flex h-full min-h-[22rem] flex-col items-center justify-center text-center">
                <div className="flex -space-x-1">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-pink/10 text-pink">
                    <Feather className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan/10 text-cyan">
                    <Aperture className="h-5 w-5" aria-hidden="true" />
                  </span>
                </div>
                <h2 className="font-heading mt-5 text-xl font-medium text-primary">
                  The canvas awaits
                </h2>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-secondary">
                  Compose your vision on the left, then forge the design. The
                  brief and illustration will appear here.
                </p>
              </div>
            )}

            {(phase === "brief" || phase === "image") && (
              <div
                className="flex h-full min-h-[22rem] flex-col items-center justify-center text-center"
                role="status"
              >
                <div className="relative">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary">
                    {phase === "brief" ? (
                      <Feather className="h-6 w-6 anim-pulse-soft" aria-hidden="true" />
                    ) : (
                      <Aperture className="h-6 w-6 anim-pulse-soft" aria-hidden="true" />
                    )}
                  </span>
                  <span className="absolute -inset-2 rounded-full border border-primary/30 anim-pulse-soft" />
                </div>
                <h2 className="font-heading mt-6 text-xl font-medium text-primary">
                  {phase === "brief" ? "Pensamiento" : "COUTURE VISION"}
                </h2>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-secondary">
                  {phase === "brief"
                    ? "Composing your couture brief — silhouette, fabric, palette, mood and the story of the piece."
                    : "Rendering the full-length illustration from the brief's vision."}
                </p>
              </div>
            )}

            {phase === "done" && brief && imageBase64 && (
              <div className="anim-fade-in flex flex-col gap-4">
                <div className="overflow-hidden rounded-2xl border border-border bg-on-primary">
                  <img
                    src={`data:image/png;base64,${imageBase64}`}
                    alt={`Illustration of ${brief.name}`}
                    className="mx-auto max-h-[26rem] w-auto object-contain"
                  />
                </div>

                <div className="rounded-2xl border border-border bg-on-primary p-4">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green" aria-hidden="true" />
                    <h2 className="font-heading text-lg font-semibold text-primary">
                      {brief.name}
                    </h2>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div>
                      <dt className="font-medium tracking-wide text-secondary/70 uppercase">
                        Silhouette
                      </dt>
                      <dd className="mt-0.5 font-medium text-primary">{brief.silhouette}</dd>
                    </div>
                    <div>
                      <dt className="font-medium tracking-wide text-secondary/70 uppercase">
                        Fabric
                      </dt>
                      <dd className="mt-0.5 font-medium text-primary">{brief.fabric}</dd>
                    </div>
                    <div>
                      <dt className="font-medium tracking-wide text-secondary/70 uppercase">
                        Occasion
                      </dt>
                      <dd className="mt-0.5 font-medium text-primary">{brief.occasion}</dd>
                    </div>
                    <div>
                      <dt className="font-medium tracking-wide text-secondary/70 uppercase">
                        Mood
                      </dt>
                      <dd className="mt-0.5 font-medium text-primary">{brief.mood}</dd>
                    </div>
                  </dl>
                  {brief.palette.length > 0 && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-[0.65rem] font-medium tracking-wide text-secondary/70 uppercase">
                        Palette
                      </span>
                      {brief.palette.map((hex) => (
                        <span
                          key={hex}
                          title={hex}
                          aria-label={`Color ${hex}`}
                          className="h-4 w-4 rounded-full border border-black/10"
                          style={{ backgroundColor: hex }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Save controls */}
                <div className="rounded-2xl border border-border bg-on-primary p-4">
                  <p className="label">Save to your archive</p>
                  <div className="flex flex-col gap-3">
                    <div>
                      <label htmlFor="designName" className="label">
                        Design name
                      </label>
                      <input
                        id="designName"
                        className="input"
                        value={designName}
                        onChange={(e) => setDesignName(e.target.value)}
                        placeholder="e.g. Solstice Gown"
                      />
                    </div>
                    <div>
                      <label htmlFor="collection" className="label">
                        Collection
                      </label>
                      <div className="flex gap-2">
                        <select
                          id="collection"
                          className="input cursor-pointer"
                          value={collectionId}
                          onChange={(e) => setCollectionId(e.target.value)}
                        >
                          <option value="">No collection</option>
                          {collections.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="btn-secondary shrink-0"
                          onClick={() => {
                            setShowNewCollection((v) => !v);
                            setNewCollectionName("");
                          }}
                          aria-expanded={showNewCollection}
                        >
                          <Plus className="h-4 w-4" aria-hidden="true" />
                          New
                        </button>
                      </div>
                      {showNewCollection && (
                        <input
                          className="input mt-2"
                          placeholder="Collection name, e.g. Spring 2026"
                          value={newCollectionName}
                          onChange={(e) => setNewCollectionName(e.target.value)}
                        />
                      )}
                    </div>
                    {error && (
                      <p role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        {error}
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saving}
                      className="btn-primary w-full"
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Save className="h-4 w-4" aria-hidden="true" />
                      )}
                      {saving ? "Filing…" : "Save to archive"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {phase === "error" && (
              <div className="flex h-full min-h-[22rem] flex-col items-center justify-center text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                </span>
                <h2 className="font-heading mt-5 text-xl font-medium text-primary">
                  The atelier stumbled
                </h2>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-secondary">
                  {error}
                </p>
                <button type="button" onClick={handleGenerate} className="btn-secondary mt-6">
                  Try again
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
