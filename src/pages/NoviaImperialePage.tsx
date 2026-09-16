import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  Crown,
  Download,
  Loader2,
  Save,
  Sparkles,
  Wand2,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { saveAsset, saveDesign } from "../lib/api";
import { dataUrl, generateBrief, generateImage, MUSES } from "../lib/gemini";
import { downloadBrandedImage } from "../lib/export";
import {
  GEMSTONE_PLATINGS,
  preciousPriceLabel,
  preciousPriceTag,
  preciousTags,
  preciousCollectionById,
} from "../lib/precious";
import type { DesignBrief } from "../lib/types";

type Phase = "idle" | "composing" | "rendering" | "done" | "error";

const IMPERIAL_SILHOUETTES = [
  { id: "imperial-ball", name: "The Imperial Ball Gown", best: "Cathedral & royal weddings" },
  { id: "empire-court", name: "The Empire Court Gown", best: "Court ceremony, full train" },
  { id: "cathedral-train", name: "The Cathedral Train", best: "Grand cathedral aisles" },
  { id: "golden-hour", name: "The Golden-Hour Sheath", best: "Statuesque, gilded minimalism" },
  { id: "jardin-royal", name: "The Jardin Royal", best: "Garden-ceremony romance" },
];

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "la-novia-imperiale";

/** LA NOVIA IMPÉRIALE™ — the imperial bridal couture of EL ATELIER. */
export default function NoviaImperialePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const collection = preciousCollectionById("diamant")!;

  const [silhouetteId, setSilhouetteId] = useState("");
  const [platingId, setPlatingId] = useState("");
  const [museId, setMuseId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [brief, setBrief] = useState<DesignBrief | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const silhouette = IMPERIAL_SILHOUETTES.find((s) => s.id === silhouetteId);
  const plating = GEMSTONE_PLATINGS.find((g) => g.id === platingId);
  const busy = phase === "composing" || phase === "rendering" || saving;

  const chipClass = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 cursor-pointer ${
      active
        ? "border-primary bg-primary text-on-primary shadow-sm"
        : "border-border bg-on-primary text-secondary hover:border-primary/50 hover:text-primary"
    }`;

  const handleGenerate = async () => {
    if (!silhouetteId || busy) return;
    setError(null);
    setBrief(null);
    setImage(null);
    setPhase("composing");
    try {
      const composed = await generateBrief(
        [
          "LA NOVIA IMPÉRIALE — the imperial bridal couture of EL ATELIER.",
          "L'art de la haute joaillerie nuptiale — the art of nuptial high jewellery.",
          `Imperial silhouette: ${silhouette?.name} — ${silhouette?.best}.`,
          plating
            ? `Set with ${plating.name} — ${plating.description}.`
            : "Set with white diamond pavé.",
          "The ultimate bridal luxury tier — regal, opulent, cathedral-scale.",
          "The bride is elegant and modest, fully and beautifully dressed, refined and dignified — no bare skin beyond face and hands.",
        ].join(" "),
        museId,
      );
      setBrief(composed);
      setName(composed.name || "LA NOVIA IMPÉRIALE");
      setPhase("rendering");
      const rendered = await generateImage(composed.image_prompt, "illustration", museId);
      setImage(rendered);
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "The imperial atelier couldn't complete that.");
      setPhase("error");
    }
  };

  const handleSave = async () => {
    if (!user || !brief || !image) return;
    if (!name.trim()) {
      setError("Please give the imperial gown a name.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const price = preciousPriceTag(brief, plating);
      const priceLabel = preciousPriceLabel(brief, plating);
      const tags = [
        "LA NOVIA IMPÉRIALE",
        "imperial bridal couture",
        "L'art de la haute joaillerie nuptiale",
        plating?.name,
      ].filter((t): t is string => Boolean(t));
      const design = await saveDesign({
        userId: user.id,
        name: name.trim(),
        prompt: `LA NOVIA IMPÉRIALE · ${silhouette?.name} · ${plating?.name ?? "diamond pavé"}`,
        brief,
        imageBase64: image,
        collectionId: null,
      });
      await saveAsset({
        userId: user.id,
        kind: "collection",
        name: `LA NOVIA IMPÉRIALE — ${brief.name}`,
        payload: {
          price_label: priceLabel,
          finish: "LA NOVIA IMPÉRIALE",
          plating: plating?.name ?? null,
        },
        imageBase64: image,
        price,
        tags,
        designId: design.id,
      });
      navigate(`/dossier/${design.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't save this imperial gown.");
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
        `la-novia-imperiale-${slug(brief?.name ?? "gown")}-el-atelier.png`,
        brief?.name ?? "LA NOVIA IMPÉRIALE",
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
            L'art de la haute joaillerie nuptiale
            <span aria-hidden="true" className="h-px w-8 bg-border" />
          </p>
          <h1 className="font-heading mt-3 text-3xl font-medium text-primary sm:text-5xl">
            LA NOVIA IMPÉRIALE<span className="align-super text-lg text-accent">™</span>
          </h1>
          <p className="mt-2 font-heading text-base italic text-accent">
            The Imperial Bridal Couture — L'Art de la Haute Joaillerie Nuptiale
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-secondary sm:text-base">
            The ultimate, imperial bridal tier of the maison — cathedral-scale
            gowns set with the costliest gemstones, each carrying its price tag
            and the house's highest jewellery art.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <section className="card p-6" aria-label="The imperial menu">
            <p className="label">The imperial silhouette</p>
            <ul className="mt-3 grid gap-2">
              {IMPERIAL_SILHOUETTES.map((s) => {
                const active = silhouetteId === s.id;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setSilhouetteId(active ? "" : s.id)}
                      disabled={busy}
                      aria-pressed={active}
                      className={`w-full rounded-xl border p-3 text-left transition-all duration-200 cursor-pointer ${
                        active ? "border-gold bg-gold/10 shadow-sm" : "border-border bg-on-primary hover:border-primary/40"
                      }`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-heading text-sm font-semibold text-primary">{s.name}</span>
                        {active && <Check className="h-4 w-4 shrink-0 text-gold" aria-hidden="true" />}
                      </span>
                      <span className="mt-0.5 block text-[0.65rem] font-medium tracking-wide text-gold uppercase">{s.best}</span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <p className="label mt-6">The gemstone plating</p>
            <div className="flex flex-wrap gap-2">
              {GEMSTONE_PLATINGS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  title={`${g.description} — +$${g.priceUsd.toLocaleString("en-US")}`}
                  className={chipClass(platingId === g.id)}
                  onClick={() => setPlatingId(platingId === g.id ? "" : g.id)}
                  disabled={busy}
                >
                  {g.name} · +${g.priceUsd.toLocaleString("en-US")}
                </button>
              ))}
            </div>

            <div className="mt-6">
              <p className="label">The bride</p>
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
              disabled={!silhouetteId || busy}
              className="btn-primary mt-6 w-full text-base"
            >
              {busy ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : (
                <Wand2 className="h-5 w-5" aria-hidden="true" />
              )}
              {phase === "composing"
                ? "Pensamiento is composing the imperial gown…"
                : phase === "rendering"
                  ? "COUTURE VISION is rendering…"
                  : "Forge the imperial gown"}
            </button>

            {error && (
              <p role="alert" className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </p>
            )}
          </section>

          <section className="card flex min-h-[24rem] flex-col p-6" aria-label="The imperial gown">
            {phase === "idle" && (
              <div className="flex h-full min-h-[22rem] flex-col items-center justify-center text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gold/10 text-gold">
                  <Crown className="h-6 w-6" aria-hidden="true" />
                </span>
                <h2 className="font-heading mt-5 text-xl font-medium text-primary">
                  The imperial bride awaits
                </h2>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-secondary">
                  Choose a silhouette and a gemstone plating, and the maison
                  forges the ultimate bridal creation with its price tag.
                </p>
              </div>
            )}

            {busy && !brief && (
              <div className="flex h-full min-h-[22rem] flex-col items-center justify-center text-center" role="status">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary">
                  <Crown className="h-6 w-6 anim-pulse-soft" aria-hidden="true" />
                </span>
                <h2 className="font-heading mt-6 text-xl font-medium text-primary">
                  {phase === "composing" ? "Pensamiento" : "COUTURE VISION"}
                </h2>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-secondary">
                  {phase === "composing"
                    ? "Composing the imperial bridal couture."
                    : "Rendering the signed gown."}
                </p>
              </div>
            )}

            {phase === "done" && brief && (
              <div className="anim-fade-in flex flex-col gap-4">
                <div className="overflow-hidden rounded-2xl border border-border bg-on-primary">
                  {image ? (
                    <img
                      src={dataUrl(image)}
                      alt={`${brief.name} — LA NOVIA IMPÉRIALE`}
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
                  <p className="mt-2 text-xs leading-relaxed text-secondary">
                    {brief.silhouette} · {brief.fabric}
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-on-primary p-4">
                  <p className="label">File the imperial gown</p>
                  <label htmlFor="imperialName" className="label">
                    Gown name
                  </label>
                  <input
                    id="imperialName"
                    className="input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="LA NOVIA IMPÉRIALE"
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
                <h2 className="font-heading mt-5 text-xl font-medium text-primary">The imperial atelier stumbled</h2>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-secondary">{error}</p>
                <button type="button" onClick={handleGenerate} className="btn-secondary mt-6">Try again</button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
