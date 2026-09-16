import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  Download,
  Gem,
  Loader2,
  Save,
  Sparkles,
  Wand2,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { saveAsset, saveDesign } from "../lib/api";
import {
  dataUrl,
  generateBrief,
  generateImage,
  MUSES,
} from "../lib/gemini";
import { downloadBrandedImage } from "../lib/export";
import {
  GEMSTONE_PLATINGS,
  preciousCollectionById,
  preciousPriceLabel,
  preciousPriceTag,
  preciousTags,
  type PreciousFinishId,
} from "../lib/precious";
import type { DesignBrief } from "../lib/types";

type Phase = "idle" | "composing" | "rendering" | "done" | "error";

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "couture";

/**
 * The precious couture collections — GOLD COUTURE™, DIAMANT COUTURE™,
 * CRYSTAL COUTURE™, GEMME COUTURE™ and COUTURE PLATINE™. One atelier,
 * five finishes; every piece is tagged and carries its price.
 */
export default function PreciousCouturePage({
  finishId,
}: {
  finishId: PreciousFinishId;
}) {
  const collection = preciousCollectionById(finishId);
  const { user } = useAuth();
  const navigate = useNavigate();

  const [vision, setVision] = useState("");
  const [platingId, setPlatingId] = useState<string>("");
  const [museId, setMuseId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [brief, setBrief] = useState<DesignBrief | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  if (!collection) return null;

  const plating = GEMSTONE_PLATINGS.find((g) => g.id === platingId);
  const busy = phase === "composing" || phase === "rendering" || saving;

  const chipClass = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 cursor-pointer ${
      active
        ? "border-primary bg-primary text-on-primary shadow-sm"
        : "border-border bg-on-primary text-secondary hover:border-primary/50 hover:text-primary"
    }`;

  const handleGenerate = async () => {
    if (!vision.trim() || busy) return;
    setError(null);
    setBrief(null);
    setImage(null);
    setPhase("composing");
    try {
      const composed = await generateBrief(
        [
          collection.title,
          collection.tagline,
          collection.materials,
          plating
            ? `Precious plating: ${plating.name} — ${plating.description}.`
            : "",
          "The vision:",
          vision.trim(),
          collection.prompt,
        ]
          .filter(Boolean)
          .join(" "),
        museId,
      );
      setBrief(composed);
      setName(composed.name || "");
      setPhase("rendering");
      const rendered = await generateImage(composed.image_prompt, "illustration", museId);
      setImage(rendered);
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "The precious atelier couldn't complete that.");
      setPhase("error");
    }
  };

  const handleSave = async () => {
    if (!user || !brief || !image) return;
    if (!name.trim()) {
      setError("Please give the piece a name.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const priceLabel = preciousPriceLabel(brief, plating);
      const price = preciousPriceTag(brief, plating);
      const tags = preciousTags(collection, plating);
      const design = await saveDesign({
        userId: user.id,
        name: name.trim(),
        prompt: [collection.title, plating?.name, vision.trim()].filter(Boolean).join(" · "),
        brief,
        imageBase64: image,
        collectionId: null,
      });
      // File a collection asset so the piece appears in the archive with
      // its price tag and collection tags.
      await saveAsset({
        userId: user.id,
        kind: "collection",
        name: `${collection.title} — ${brief.name}`,
        payload: {
          price_label: priceLabel,
          finish: collection.title,
          plating: plating?.name ?? null,
          materials: collection.materials,
        },
        imageBase64: image,
        price,
        tags,
        designId: design.id,
      });
      navigate(`/dossier/${design.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't save this piece.");
    } finally {
      setSaving(false);
    }
  };

  const handleImage = async () => {
    if (!image) return;
    setExporting(true);
    try {
      await downloadBrandedImage(
        dataUrl(image),
        `${slug(brief?.name ?? collection.title)}-${collection.id}-el-atelier.png`,
        brief?.name ?? collection.title,
      );
    } catch {
      setError("We couldn't export that image.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="eyebrow flex items-center justify-center gap-3 text-secondary">
            <span aria-hidden="true" className="h-px w-8 bg-border" />
            The precious couture collections
            <span aria-hidden="true" className="h-px w-8 bg-border" />
          </p>
          <h1 className="font-heading mt-3 text-3xl font-medium text-primary sm:text-5xl">
            {collection.menu}
          </h1>
          <p className="mt-2 font-heading text-base italic text-accent">
            {collection.tagline}
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-secondary sm:text-base">
            {collection.description}
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {/* ---------- THE VISION ---------- */}
          <section className="card p-6" aria-label="The vision">
            <label htmlFor="preciousVision" className="label">
              The vision
            </label>
            <textarea
              id="preciousVision"
              rows={4}
              className="input resize-y"
              placeholder="A wedding gown of falling gold leaf, its train a river of light…"
              value={vision}
              onChange={(e) => setVision(e.target.value)}
              disabled={busy}
            />

            <p className="label mt-6">The precious plating — each with its price</p>
            <ul className="mt-3 grid gap-2">
              {GEMSTONE_PLATINGS.map((g) => {
                const active = platingId === g.id;
                return (
                  <li key={g.id}>
                    <button
                      type="button"
                      onClick={() => setPlatingId(active ? "" : g.id)}
                      disabled={busy}
                      aria-pressed={active}
                      className={`w-full rounded-xl border p-3 text-left transition-all duration-200 cursor-pointer ${
                        active
                          ? "border-gold bg-gold/10 shadow-sm"
                          : "border-border bg-on-primary hover:border-primary/40"
                      }`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-heading text-sm font-semibold text-primary">
                          {g.name}
                        </span>
                        <span className="shrink-0 rounded-full bg-gold/10 px-2.5 py-0.5 text-[0.65rem] font-bold text-gold">
                          +${g.priceUsd.toLocaleString("en-US")}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-secondary">
                        {g.description}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="mt-6">
              <p className="label">The figure</p>
              <div className="flex flex-wrap gap-2">
                {MUSES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    title={m.description}
                    className={chipClass(museId === m.id)}
                    onClick={() => setMuseId(museId === m.id ? null : m.id)}
                    disabled={busy}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={!vision.trim() || busy}
              className="btn-primary mt-6 w-full text-base"
            >
              {busy ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : (
                <Wand2 className="h-5 w-5" aria-hidden="true" />
              )}
              {phase === "composing"
                ? "Pensamiento is composing the piece…"
                : phase === "rendering"
                  ? "COUTURE VISION is rendering…"
                  : `Forge the ${collection.title.toLowerCase()}`}
            </button>

            {error && (
              <p role="alert" className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </p>
            )}
          </section>

          {/* ---------- THE PIECE ---------- */}
          <section className="card flex min-h-[24rem] flex-col p-6" aria-label="The piece">
            {phase === "idle" && (
              <div className="flex h-full min-h-[22rem] flex-col items-center justify-center text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gold/10 text-gold">
                  <Gem className="h-6 w-6" aria-hidden="true" />
                </span>
                <h2 className="font-heading mt-5 text-xl font-medium text-primary">
                  {collection.menu} awaits
                </h2>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-secondary">
                  Write the vision, choose a precious plating, and the atelier
                  forges the piece with its price tag.
                </p>
              </div>
            )}

            {busy && !brief && (
              <div className="flex h-full min-h-[22rem] flex-col items-center justify-center text-center" role="status">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary">
                  <Gem className="h-6 w-6 anim-pulse-soft" aria-hidden="true" />
                </span>
                <h2 className="font-heading mt-6 text-xl font-medium text-primary">
                  {phase === "composing" ? "Pensamiento" : "COUTURE VISION"}
                </h2>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-secondary">
                  {phase === "composing"
                    ? "Distilling the vision into a couture brief."
                    : "Rendering the signed illustration."}
                </p>
              </div>
            )}

            {phase === "done" && brief && (
              <div className="anim-fade-in flex flex-col gap-4">
                <div className="overflow-hidden rounded-2xl border border-border bg-on-primary">
                  {image ? (
                    <img
                      src={dataUrl(image)}
                      alt={`${brief.name} — ${collection.title}`}
                      className="mx-auto max-h-[24rem] w-auto object-contain"
                    />
                  ) : (
                    <div className="flex aspect-[3/4] items-center justify-center text-secondary">
                      The imagery could not be rendered.
                    </div>
                  )}
                  {image && (
                    <div className="flex items-center justify-between gap-2 border-t border-border p-3">
                      <span className="rounded-full bg-gold/10 px-3 py-1 text-xs font-bold text-gold">
                        {preciousPriceLabel(brief, plating)}
                      </span>
                      <button type="button" onClick={handleImage} disabled={exporting} className="btn-secondary text-xs">
                        <Download className="h-3.5 w-3.5" aria-hidden="true" />
                        {exporting ? "Exporting…" : "Branded image"}
                      </button>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-border bg-on-primary p-4">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green" aria-hidden="true" />
                    <h3 className="font-heading text-lg font-semibold text-primary">{brief.name}</h3>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div>
                      <dt className="font-medium tracking-wide text-secondary/70 uppercase">Silhouette</dt>
                      <dd className="mt-0.5 font-medium text-primary">{brief.silhouette}</dd>
                    </div>
                    <div>
                      <dt className="font-medium tracking-wide text-secondary/70 uppercase">Fabric</dt>
                      <dd className="mt-0.5 font-medium text-primary">{brief.fabric}</dd>
                    </div>
                  </dl>
                  <p className="mt-3 text-xs leading-relaxed text-secondary">
                    <span className="font-semibold text-primary">Tags · </span>
                    {preciousTags(collection, plating).join(" · ")}
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-on-primary p-4">
                  <p className="label">File the piece in your archive</p>
                  <label htmlFor="preciousName" className="label">
                    Piece name
                  </label>
                  <input
                    id="preciousName"
                    className="input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={collection.title}
                  />
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || !image}
                    className="btn-primary mt-3 w-full"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Save className="h-4 w-4" aria-hidden="true" />
                    )}
                    {saving ? "Filing…" : "Save with price tag"}
                  </button>
                </div>
              </div>
            )}

            {phase === "error" && (
              <div className="flex h-full min-h-[22rem] flex-col items-center justify-center text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                </span>
                <h2 className="font-heading mt-5 text-xl font-medium text-primary">
                  The precious atelier stumbled
                </h2>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-secondary">{error}</p>
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
