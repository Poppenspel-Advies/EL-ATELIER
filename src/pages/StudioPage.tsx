import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Aperture,
  Check,
  Feather,
  ImageIcon,
  Layers,
  Loader2,
  PencilLine,
  Plus,
  Save,
  Sparkles,
  Wand2,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import {
  createCollection,
  fetchCollections,
  saveBrand,
  saveDesign,
} from "../lib/api";
import {
  dataUrl,
  generateBrandKit,
  generateBrief,
  generatePieceVisuals,
  MUSES,
  renderBrandVisuals,
  SAMPLE_MAISONS,
  SAMPLE_PIECES,
  sampleArt,
} from "../lib/gemini";
import type { BrandKit, BrandVisuals, RenderProgress } from "../lib/gemini";
import type {
  Collection,
  DesignBrief,
  SamplePreset,
} from "../lib/types";
import TransformationPanel from "../components/TransformationPanel";

type Mode = "piece" | "maison";
type Phase = "idle" | "composing" | "rendering" | "done" | "error";

const GARMENTS = [
  "Evening gown",
  "Tailleur suit",
  "Cocktail dress",
  "Opera coat",
  "Slip dress",
  "Jumpsuit",
  "Corseted dress",
  "Kaftan",
];

const FITS = [
  "Mermaid",
  "A-line",
  "Bias-cut",
  "Column",
  "Structured",
  "Oversized",
  "Trapeze",
  "Peplum",
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
  { name: "Blush", hex: "#f9c5d5" },
  { name: "Light pink", hex: "#f9a8d4" },
  { name: "Bright pink", hex: "#ec4899" },
  { name: "Magenta", hex: "#c026d3" },
  { name: "Rose gold", hex: "#e0a899" },
  { name: "Champagne", hex: "#e9dcc9" },
  { name: "Pearl", hex: "#f5f0e8" },
  { name: "Ivory", hex: "#faf7f0" },
  { name: "Noir", hex: "#1c1917" },
  { name: "Gold", hex: "#d4a017" },
  { name: "Flamingo", hex: "#fb7185" },
  { name: "Coral", hex: "#fb6f5e" },
  { name: "Violet", hex: "#8b5cf6" },
  { name: "Cyan", hex: "#22d3ee" },
  { name: "Emerald", hex: "#10b981" },
  { name: "Sapphire", hex: "#2563eb" },
];

export default function StudioPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>("piece");

  // Composer state (shared)
  const [freeText, setFreeText] = useState("");
  const [museId, setMuseId] = useState<string | null>(null);

  // Piece-only guidance
  const [garment, setGarment] = useState<string | null>(null);
  const [fit, setFit] = useState<string | null>(null);
  const [fabric, setFabric] = useState<string | null>(null);
  const [occasion, setOccasion] = useState<string | null>(null);
  const [mood, setMood] = useState<string | null>(null);
  const [palette, setPalette] = useState<string[]>([]);

  const [phase, setPhase] = useState<Phase>("idle");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Piece results
  const [brief, setBrief] = useState<DesignBrief | null>(null);
  const [pieceVisuals, setPieceVisuals] = useState<{
    illustration: string | null;
    sketch: string | null;
  } | null>(null);
  const [pieceImage, setPieceImage] = useState<"illustration" | "sketch">(
    "illustration",
  );

  // Maison results
  const [kit, setKit] = useState<BrandKit | null>(null);
  const [visuals, setVisuals] = useState<BrandVisuals | null>(null);
  const [progress, setProgress] = useState<RenderProgress | null>(null);

  // Save controls
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionId, setCollectionId] = useState<string>("");
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [designName, setDesignName] = useState("");
  const [maisonName, setMaisonName] = useState("");

  useEffect(() => {
    if (!user) return;
    fetchCollections(user.id)
      .then(setCollections)
      .catch(() => setCollections([]));
  }, [user]);

  const prompt = useMemo(() => {
    if (mode === "piece") {
      const parts: string[] = [];
      if (garment) parts.push(`garment type: ${garment}`);
      if (fit) parts.push(`fit: ${fit}`);
      if (fabric) parts.push(`fabric: ${fabric}`);
      if (occasion) parts.push(`occasion: ${occasion}`);
      if (mood) parts.push(`mood: ${mood}`);
      if (palette.length) parts.push(`palette: ${palette.join(", ")}`);
      const guided = parts.join("; ");
      return [freeText.trim(), guided].filter(Boolean).join(". ");
    }
    return freeText.trim();
  }, [mode, freeText, garment, fit, fabric, occasion, mood, palette]);

  const togglePalette = (name: string) =>
    setPalette((p) => (p.includes(name) ? p.filter((x) => x !== name) : [...p, name]));

  const applySample = (sample: SamplePreset) => {
    setFreeText(sample.prompt);
    setMuseId(sample.museId);
    setMode(sample.mode);
    setError(null);
  };

  const handleGenerate = async () => {
    if (!prompt || busy) return;
    setError(null);
    setPhase("composing");

    try {
      if (mode === "piece") {
        setBrief(null);
        setPieceVisuals(null);
        const composed = await generateBrief(prompt, museId);
        setBrief(composed);
        setDesignName(composed.name || "");
        setPhase("rendering");
        const visuals = await generatePieceVisuals(composed, museId);
        setPieceVisuals(visuals);
        setPieceImage(visuals.illustration ? "illustration" : "sketch");
        setPhase("done");
      } else {
        setKit(null);
        setVisuals(null);
        setProgress(null);
        const composed = await generateBrandKit(prompt, museId);
        setKit(composed);
        setMaisonName(composed.name || "");
        setPhase("rendering");
        const rendered = await renderBrandVisuals(composed, museId, setProgress);
        setVisuals(rendered);
        setPhase("done");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "The atelier encountered an error.");
      setPhase("error");
    }
  };

  const handleSavePiece = async () => {
    if (!user || !brief || !pieceVisuals?.illustration) return;
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
        imageBase64: pieceVisuals.illustration,
        collectionId: targetCollectionId,
      });
      navigate(`/dossier/${design.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't save this design.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMaison = async () => {
    if (!user || !kit || !visuals) return;
    if (!maisonName.trim()) {
      setError("Please give the maison a name.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const brand = await saveBrand({
        userId: user.id,
        name: maisonName.trim(),
        tagline: kit.tagline,
        prompt,
        muse: museId,
        kit,
        visuals,
      });
      navigate(`/maison/${brand.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't save this maison.");
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

  const busy = phase === "composing" || phase === "rendering" || saving;

  const samples = mode === "piece" ? SAMPLE_PIECES : SAMPLE_MAISONS;

  return (
    <div className="px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <p className="eyebrow text-secondary">The studio</p>
        <h1 className="font-heading mt-2 text-3xl font-medium text-primary sm:text-4xl">
          Forge a design — or a maison
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-secondary">
          Describe a single vision, or hand the atelier a world and it will
          found an entire fashion house — logo, cover, tagline and ten
          creations with illustrations, design drawings and innovations.
        </p>

        {/* Mode switcher */}
        <div
          role="tablist"
          aria-label="Studio mode"
          className="mt-8 inline-flex rounded-full border border-border bg-on-primary p-1"
        >
          {(
            [
              { id: "piece", label: "Pièce", icon: Feather },
              { id: "maison", label: "Maison", icon: Layers },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              type="button"
              aria-selected={mode === id}
              onClick={() => {
                setMode(id);
                setError(null);
              }}
              className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200 cursor-pointer ${
                mode === id
                  ? "bg-primary text-on-primary shadow-sm"
                  : "text-secondary hover:text-primary"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {/* ---------- COMPOSER ---------- */}
          <section className="card p-6" aria-label="Design composer">
            <label htmlFor="freeText" className="label">
              {mode === "piece" ? "Your vision" : "The world of your maison"}
            </label>
            <textarea
              id="freeText"
              rows={mode === "maison" ? 5 : 4}
              className="input resize-y"
              placeholder={
                mode === "piece"
                  ? "Describe the piece in your own words…"
                  : "Describe a world, a mood, a woman — the atelier will found the house around it…"
              }
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              disabled={busy}
            />

            {/* Model / muse selection */}
            <div className="mt-6">
              <p className="label">Choose the model</p>
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
              <p className="mt-2 text-xs text-secondary">
                {museId
                  ? MUSES.find((m) => m.id === museId)?.description
                  : "Let the atelier choose the figure for each look."}
              </p>
            </div>

            {mode === "piece" && (
              <div className="mt-6 flex flex-col gap-5">
                <div>
                  <p className="label">Garment type</p>
                  <div className="flex flex-wrap gap-2">
                    {GARMENTS.map((g) => (
                      <button
                        key={g}
                        type="button"
                        className={chipClass(garment === g)}
                        onClick={() => setGarment(garment === g ? null : g)}
                        disabled={busy}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="label">Fit</p>
                  <div className="flex flex-wrap gap-2">
                    {FITS.map((f) => (
                      <button
                        key={f}
                        type="button"
                        className={chipClass(fit === f)}
                        onClick={() => setFit(fit === f ? null : f)}
                        disabled={busy}
                      >
                        {f}
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
            )}

            {/* Sample gallery with images + models */}
            <div className="mt-6">
              <p className="label">
                {mode === "piece" ? "Or begin with a sample" : "Or begin with a sample maison"}
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {samples.map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    className="group overflow-hidden rounded-xl border border-border bg-on-primary text-left transition-all duration-200 hover:border-primary/40 hover:shadow-md cursor-pointer"
                    onClick={() => applySample(sample)}
                    disabled={busy}
                  >
                    <div className="relative aspect-[3/4] overflow-hidden">
                      <img
                        src={sampleArt(sample.palette)}
                        alt=""
                        aria-hidden="true"
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                      />
                      <span className="absolute left-2 top-2 rounded-full bg-on-primary/85 px-2 py-0.5 text-[0.6rem] font-semibold tracking-wide text-secondary backdrop-blur-sm">
                        {sample.mode === "maison" ? "Maison" : "Pièce"}
                      </span>
                    </div>
                    <div className="p-2.5">
                      <p className="truncate text-xs font-semibold text-primary">
                        {sample.title}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-[0.65rem] leading-snug text-secondary">
                        {sample.blurb}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

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
              {phase === "composing"
                ? "Pensamiento is thinking…"
                : phase === "rendering" && mode === "piece"
                  ? "COUTURE VISION is rendering…"
                  : phase === "rendering" && mode === "maison"
                    ? `Rendering the maison — ${progress?.done ?? 0}/${progress?.total ?? 24}`
                    : mode === "piece"
                      ? "Forge design"
                      : "Found the maison"}
            </button>

            {error && (
              <p
                role="alert"
                className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                {error}
              </p>
            )}
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
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet/10 text-violet">
                    <Layers className="h-5 w-5" aria-hidden="true" />
                  </span>
                </div>
                <h2 className="font-heading mt-5 text-xl font-medium text-primary">
                  {mode === "piece" ? "The canvas awaits" : "A maison awaits"}
                </h2>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-secondary">
                  {mode === "piece"
                    ? "Compose your vision on the left, then forge the design. You'll receive both an illustration and a design drawing."
                    : "Describe a world and the atelier will found a house — logo, cover, tagline and ten creations with drawings."}
                </p>
              </div>
            )}

            {(phase === "composing" || phase === "rendering") && (
              <div
                className="flex h-full min-h-[22rem] flex-col items-center justify-center text-center"
                role="status"
              >
                <div className="relative">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary">
                    {phase === "composing" ? (
                      <Feather className="h-6 w-6 anim-pulse-soft" aria-hidden="true" />
                    ) : (
                      <Aperture className="h-6 w-6 anim-pulse-soft" aria-hidden="true" />
                    )}
                  </span>
                  <span className="absolute -inset-2 rounded-full border border-primary/30 anim-pulse-soft" />
                </div>
                <h2 className="font-heading mt-6 text-xl font-medium text-primary">
                  {phase === "composing"
                    ? mode === "piece"
                      ? "Pensamiento"
                      : "Pensamiento · founding the house"
                    : "COUTURE VISION"}
                </h2>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-secondary">
                  {phase === "composing"
                    ? mode === "piece"
                      ? "Composing your couture brief — silhouette, fabric, palette, mood and the story of the piece."
                      : "Composing the maison — name, tagline, positioning, logo and cover prompts, and ten looks as one coherent collection."
                    : mode === "piece"
                      ? "Rendering the illustration and the design drawing from the brief."
                      : progress
                        ? `Rendering ${progress.label} — ${progress.done} of ${progress.total} images.`
                        : "Rendering the maison — logo, cover and every look."}
                </p>
                {mode === "maison" && phase === "rendering" && progress && (
                  <div className="mt-6 w-full max-w-sm">
                    <div
                      className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
                      role="progressbar"
                      aria-valuenow={progress.done}
                      aria-valuemin={0}
                      aria-valuemax={progress.total}
                      aria-label="Rendering progress"
                    >
                      <div
                        className="h-full rounded-full bg-primary transition-[width] duration-100 linear"
                        style={{
                          width: `${Math.round((progress.done / progress.total) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ----- Piece result ----- */}
            {phase === "done" && mode === "piece" && brief && pieceVisuals && (
              <div className="anim-fade-in flex flex-col gap-4">
                <div className="overflow-hidden rounded-2xl border border-border bg-on-primary">
                  {pieceVisuals.illustration || pieceVisuals.sketch ? (
                    <img
                      src={dataUrl(
                        pieceImage === "illustration"
                          ? pieceVisuals.illustration ?? pieceVisuals.sketch!
                          : pieceVisuals.sketch ?? pieceVisuals.illustration!,
                      )}
                      alt={
                        pieceImage === "illustration"
                          ? `Illustration of ${brief.name}`
                          : `Design drawing of ${brief.name}`
                      }
                      className="mx-auto max-h-[26rem] w-auto object-contain"
                    />
                  ) : (
                    <div className="flex aspect-[3/4] items-center justify-center text-secondary">
                      The imagery could not be rendered.
                    </div>
                  )}
                  {pieceVisuals.illustration && pieceVisuals.sketch && (
                    <div className="flex items-center justify-center gap-2 border-t border-border bg-on-primary p-2">
                      {(
                        [
                          { id: "illustration", label: "Illustration", icon: ImageIcon },
                          { id: "sketch", label: "Design drawing", icon: PencilLine },
                        ] as const
                      ).map(({ id, label, icon: Icon }) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setPieceImage(id)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 cursor-pointer ${
                            pieceImage === id
                              ? "bg-primary text-on-primary"
                              : "text-secondary hover:bg-muted hover:text-primary"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
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
                    {brief.fit && (
                      <div>
                        <dt className="font-medium tracking-wide text-secondary/70 uppercase">
                          Fit
                        </dt>
                        <dd className="mt-0.5 font-medium text-primary">{brief.fit}</dd>
                      </div>
                    )}
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
                  {brief.innovation && (
                    <p className="mt-3 text-xs leading-relaxed text-secondary">
                      <span className="font-semibold text-primary">Innovation · </span>
                      {brief.innovation}
                    </p>
                  )}
                  {brief.variation && (
                    <p className="mt-2 text-xs leading-relaxed text-secondary">
                      <span className="font-semibold text-primary">Variation · </span>
                      {brief.variation}
                    </p>
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
                    <button
                      type="button"
                      onClick={handleSavePiece}
                      disabled={saving || !pieceVisuals.illustration}
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

                {/* Transformation — re-imagine this creation */}
                <TransformationPanel
                  sourceBrief={brief}
                  sourcePrompt={prompt}
                  museId={museId}
                />
              </div>
            )}

            {/* ----- Maison result ----- */}
            {phase === "done" && mode === "maison" && kit && visuals && (
              <div className="anim-fade-in flex flex-col gap-4">
                {/* Cover */}
                <div className="overflow-hidden rounded-2xl border border-border bg-on-primary">
                  {visuals.cover ? (
                    <img
                      src={dataUrl(visuals.cover)}
                      alt={`${kit.name} campaign cover`}
                      className="aspect-[16/9] w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-[16/9] items-center justify-center bg-gradient-to-br from-violet/15 via-pink/10 to-cyan/10 text-secondary">
                      Cover unavailable
                    </div>
                  )}
                </div>

                {/* Logo + tagline */}
                <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-on-primary p-6 text-center">
                  {visuals.logo && (
                    <img
                      src={dataUrl(visuals.logo)}
                      alt={`${kit.name} logo`}
                      className="mx-auto h-24 w-24 rounded-full border border-border object-cover"
                    />
                  )}
                  <div>
                    <h2 className="font-heading text-2xl font-semibold text-primary">
                      {kit.name}
                    </h2>
                    {kit.tagline && (
                      <p className="mt-1 text-sm italic text-secondary">“{kit.tagline}”</p>
                    )}
                  </div>
                  {kit.palette.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-[0.65rem] font-medium tracking-wide text-secondary/70 uppercase">
                        House palette
                      </span>
                      {kit.palette.map((hex) => (
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

                {kit.positioning && (
                  <p className="rounded-2xl border border-border bg-on-primary p-4 text-sm leading-relaxed text-secondary">
                    <span className="font-semibold text-primary">Positioning · </span>
                    {kit.positioning}
                  </p>
                )}
                {kit.house_notes && (
                  <p className="rounded-2xl border border-border bg-on-primary p-4 text-sm leading-relaxed text-secondary">
                    <span className="font-semibold text-primary">House notes · </span>
                    {kit.house_notes}
                  </p>
                )}

                {/* Creations */}
                <h3 className="eyebrow mt-2 text-secondary">
                  The collection — {kit.creations.length} looks
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {kit.creations.map((c, i) => {
                    const v = visuals.creations[i];
                    return (
                      <article
                        key={`${c.name}-${i}`}
                        className="overflow-hidden rounded-2xl border border-border bg-on-primary"
                      >
                        <div className="relative aspect-[3/4] overflow-hidden bg-muted">
                          {v?.illustration ? (
                            <img
                              src={dataUrl(v.illustration)}
                              alt={`Illustration of ${c.name}`}
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          ) : v?.sketch ? (
                            <img
                              src={dataUrl(v.sketch)}
                              alt={`Design drawing of ${c.name}`}
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-border">
                              <ImageIcon className="h-10 w-10" aria-hidden="true" />
                            </div>
                          )}
                          <span className="absolute left-3 top-3 rounded-full bg-on-primary/85 px-3 py-1 text-[0.65rem] font-semibold tracking-wide text-secondary backdrop-blur-sm">
                            Look {String(i + 1).padStart(2, "0")}
                          </span>
                        </div>
                        <div className="p-4">
                          <h4 className="font-heading text-base font-semibold text-primary">
                            {c.name}
                          </h4>
                          <p className="mt-1 text-xs leading-relaxed text-secondary">
                            {c.silhouette} · {c.fabric}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {c.palette.map((hex) => (
                              <span
                                key={hex}
                                title={hex}
                                aria-label={`Color ${hex}`}
                                className="h-3.5 w-3.5 rounded-full border border-black/10"
                                style={{ backgroundColor: hex }}
                              />
                            ))}
                          </div>
                          <dl className="mt-3 space-y-1.5 text-xs leading-relaxed">
                            {c.fit && (
                              <div className="flex gap-2">
                                <dt className="shrink-0 font-medium tracking-wide text-secondary/70 uppercase">
                                  Fit
                                </dt>
                                <dd className="text-primary">{c.fit}</dd>
                              </div>
                            )}
                            {c.occasion && (
                              <div className="flex gap-2">
                                <dt className="shrink-0 font-medium tracking-wide text-secondary/70 uppercase">
                                  Occasion
                                </dt>
                                <dd className="text-primary">{c.occasion}</dd>
                              </div>
                            )}
                            {c.mood && (
                              <div className="flex gap-2">
                                <dt className="shrink-0 font-medium tracking-wide text-secondary/70 uppercase">
                                  Mood
                                </dt>
                                <dd className="text-primary">{c.mood}</dd>
                              </div>
                            )}
                            {c.innovation && (
                              <div className="flex gap-2">
                                <dt className="shrink-0 font-medium tracking-wide text-secondary/70 uppercase">
                                  Innovation
                                </dt>
                                <dd className="text-secondary">{c.innovation}</dd>
                              </div>
                            )}
                            {c.variation && (
                              <div className="flex gap-2">
                                <dt className="shrink-0 font-medium tracking-wide text-secondary/70 uppercase">
                                  Variation
                                </dt>
                                <dd className="text-secondary">{c.variation}</dd>
                              </div>
                            )}
                            {c.styling_notes && (
                              <div className="flex gap-2">
                                <dt className="shrink-0 font-medium tracking-wide text-secondary/70 uppercase">
                                  Styling
                                </dt>
                                <dd className="text-secondary">{c.styling_notes}</dd>
                              </div>
                            )}
                          </dl>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {/* Save maison */}
                <div className="rounded-2xl border border-border bg-on-primary p-4">
                  <p className="label">Save the maison to your atelier</p>
                  <div className="flex flex-col gap-3">
                    <div>
                      <label htmlFor="maisonName" className="label">
                        Maison name
                      </label>
                      <input
                        id="maisonName"
                        className="input"
                        value={maisonName}
                        onChange={(e) => setMaisonName(e.target.value)}
                        placeholder="e.g. Maison Abysse"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveMaison}
                      disabled={saving}
                      className="btn-primary w-full"
                    >
                      {saving ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Save className="h-4 w-4" aria-hidden="true" />
                      )}
                      {saving ? "Filing…" : "Save the maison"}
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
