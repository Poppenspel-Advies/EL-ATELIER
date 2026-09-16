import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  Download,
  FileText,
  Film,
  Heart,
  ImageIcon,
  Layers,
  Loader2,
  Music2,
  Music4,
  PencilLine,
  Save,
  Sparkles,
  Wand2,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { saveBrand } from "../lib/api";
import {
  dataUrl,
  generateBrandKit,
  generateImage,
  MUSES,
  renderBrandVisuals,
  TRANSFORM_DANCES,
} from "../lib/gemini";
import {
  downloadContactSheet,
  exportFilm,
  exportPdf,
  startMusic,
} from "../lib/export";
import type { BrandKit, BrandVisuals, RenderProgress } from "../lib/gemini";

/**
 * LA GRANDE NOVIA™ — the bridal atelier of EL ATELIER.
 * Choose a bridal silhouette from the menu, pick a Spanish dance to carry
 * the collection, and the atelier founds an entire Spanish bridal house:
 * ten looks, rendered in rich couture shades. Música española plays while
 * you browse, and the flamenco film downloads with its soundtrack.
 */
type Phase = "idle" | "composing" | "rendering" | "done" | "error";

const NOVIA_STYLES = [
  {
    id: "aline-princess",
    name: "A-Line / Princess Ball Gown",
    best: "Traditional cathedral weddings",
    features: "Flowing skirts, layered ruffles, illusion V-necks, full stitched sleeves",
  },
  {
    id: "mermaid-fish",
    name: "Mermaid / Fish-Cut",
    best: "Modern, form-fitting elegance",
    features: "Body-contouring mesh, sculpted curves, dramatic trailing veils",
  },
  {
    id: "off-shoulder",
    name: "Off-Shoulder",
    best: "Romantic & graceful",
    features: "Sculpted necklines, sweetheart bodices, flowing trains",
  },
  {
    id: "one-shoulder",
    name: "One-Shoulder",
    best: "Contemporary & statuesque",
    features: "Asymmetric draping, architectural folds, goddess lines",
  },
  {
    id: "bikini-bridal",
    name: "Bikini-Style Bridal",
    best: "Bare, bold & modern — resort / honeymoon",
    features: "Bridal separates with pearl embroidery, confident poolside elegance",
  },
  {
    id: "column-sheath",
    name: "Column / Sheath",
    best: "Minimal, sleek city ceremonies",
    features: "Clean bias lines, covered necklines, understated drama",
  },
  {
    id: "fit-flare",
    name: "Fit-and-Flare / Trumpet",
    best: "Curvaceous red-carpet brides",
    features: "Fitted bodice, dramatic trumpet flare, statement trains",
  },
];

const NOVIA_PALETTE = [
  { name: "Ivory", hex: "#faf7f0" },
  { name: "Pearl", hex: "#f5f0e8" },
  { name: "Champagne", hex: "#e9dcc9" },
  { name: "Blush", hex: "#f9c5d5" },
  { name: "Light pink", hex: "#f9a8d4" },
  { name: "Bright pink", hex: "#ec4899" },
  { name: "Rose gold", hex: "#e0a899" },
  { name: "Gold", hex: "#d4a017" },
  { name: "Noir", hex: "#1c1917" },
  { name: "Flamingo", hex: "#fb7185" },
  { name: "Emerald", hex: "#10b981" },
  { name: "Sapphire", hex: "#2563eb" },
];

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "la-grande-novia";

export default function NoviaPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [styleId, setStyleId] = useState<string>("");
  const [danceId, setDanceId] = useState<string>("");
  const [palette, setPalette] = useState<string[]>([]);
  const [museId, setMuseId] = useState<string | null>(null);

  const [musicOn, setMusicOn] = useState(false);
  const musicRef = useRef<{ stop: () => void } | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [kit, setKit] = useState<BrandKit | null>(null);
  const [visuals, setVisuals] = useState<BrandVisuals | null>(null);
  const [dancer, setDancer] = useState<string | null>(null);
  const [progress, setProgress] = useState<RenderProgress | null>(null);
  const [view, setView] = useState<Record<number, "illustration" | "sketch">>({});

  const [maisonName, setMaisonName] = useState("");
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [filmProgress, setFilmProgress] = useState<number | null>(null);

  useEffect(() => {
    return () => {
      musicRef.current?.stop();
    };
  }, []);

  const busy = phase === "composing" || phase === "rendering" || saving || exporting !== null;
  const style = NOVIA_STYLES.find((s) => s.id === styleId);
  const dance = TRANSFORM_DANCES.find((d) => d.id === danceId);

  const prompt = useMemo(() => {
    const parts = [
      "Found a luxurious Spanish bridal couture house: LA GRANDE NOVIA.",
      "A rich, opulent, premium bridal collection inspired by Andalusian romance and the spirit of Spanish dance.",
      style
        ? `Signature bridal silhouette: ${style.name}. Best suited for: ${style.best}. Key aesthetic features: ${style.features}.`
        : "",
      dance
        ? `The collection carries the soul of ${dance.label} (${dance.region}) — ${dance.prompt}.`
        : "The collection carries the soul of the Spanish fiesta — courtship, castanets and celebration.",
      palette.length
        ? `House palette: ${palette.join(", ")} — rich, luxurious, high-saturation couture shades.`
        : "House palette: rich bridal shades — ivory, pearl, blush, champagne, rose gold and noir.",
      "Ten wedding looks as one coherent bridal collection, escalating from the ceremony gown to the fiesta finale.",
      "Every gown is elegant and modest: the models are always fully and beautifully dressed, refined and graceful — absolutely no nudity, no bare skin beyond face and hands.",
    ].filter(Boolean);
    return parts.join(" ");
  }, [style, dance, palette]);

  const toggleMusic = () => {
    if (musicRef.current) {
      musicRef.current.stop();
      musicRef.current = null;
      setMusicOn(false);
      return;
    }
    const handle = startMusic("flamenco");
    musicRef.current = handle;
    setMusicOn(true);
  };

  const chipClass = (active: boolean) =>
    `rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-200 cursor-pointer ${
      active
        ? "border-primary bg-primary text-on-primary shadow-sm"
        : "border-border bg-on-primary text-secondary hover:border-primary/50 hover:text-primary"
    }`;

  const togglePalette = (name: string) =>
    setPalette((p) => (p.includes(name) ? p.filter((x) => x !== name) : [...p, name]));

  const handleGenerate = async () => {
    if (!styleId || busy) return;
    setError(null);
    setKit(null);
    setVisuals(null);
    setDancer(null);
    setPhase("composing");
    try {
      const composed = await generateBrandKit(prompt, museId);
      setKit(composed);
      setMaisonName(composed.name || "LA GRANDE NOVIA");
      setPhase("rendering");
      const rendered = await renderBrandVisuals(composed, museId, setProgress);
      setVisuals(rendered);
      const dancerFrame = await generateImage(
        "A graceful flamenco dancer mid-spin, wearing a modest elegant flamenco dress with a ruffled train, rose and gold palette, cinematic stage light, full-length, fully dressed and dignified, refined, no nudity",
        "cover",
        museId,
      ).catch(() => null);
      setDancer(dancerFrame);
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "The bridal atelier couldn't complete that.");
      setPhase("error");
    }
  };

  const frames = useMemo(() => {
    if (!kit || !visuals) return [];
    const f: { dataUrl: string; caption: string }[] = [];
    if (visuals.cover) f.push({ dataUrl: dataUrl(visuals.cover), caption: kit.name });
    if (visuals.logo) f.push({ dataUrl: dataUrl(visuals.logo), caption: "The House" });
    kit.creations.forEach((c, i) => {
      const v = visuals.creations[i];
      if (v?.illustration) f.push({ dataUrl: dataUrl(v.illustration), caption: c.name });
    });
    if (dancer) f.push({ dataUrl: dataUrl(dancer), caption: "La Danza" });
    return f;
  }, [kit, visuals, dancer]);

  const exportBase = `la-grande-novia-${slug(kit?.name ?? "collection")}`;

  const handleSheet = async () => {
    if (!frames.length) return;
    setExporting("sheet");
    try {
      await downloadContactSheet(
        frames,
        `${exportBase}-el-atelier.png`,
        "LA GRANDE NOVIA™",
      );
    } catch {
      setError("We couldn't compose the contact sheet.");
    } finally {
      setExporting(null);
    }
  };

  const handlePdf = async () => {
    if (!kit) return;
    setExporting("pdf");
    try {
      await exportPdf({
        title: "LA GRANDE NOVIA™",
        subtitle: kit.tagline || "A Spanish bridal maison founded in EL ATELIER",
        metaLines: [
          kit.positioning,
          dance ? `Danced to the ${dance.label} — ${dance.region}` : "",
          `EL ATELIER · ${new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}`,
        ].filter(Boolean),
        images: frames,
        sections: [
          { heading: "The House", body: [kit.positioning, kit.house_notes, kit.audience].filter(Boolean).join("\n\n") },
          ...kit.creations.map((c) => ({
            heading: c.name,
            body: [
              `${c.silhouette}${c.fit ? ` · ${c.fit} fit` : ""} · ${c.fabric}`,
              `Occasion: ${c.occasion} · Mood: ${c.mood}`,
              c.innovation ? `Innovation: ${c.innovation}` : "",
              c.variation ? `Variation: ${c.variation}` : "",
            ].filter(Boolean).join("\n"),
          })),
        ],
        filename: `${exportBase}-el-atelier.pdf`,
      });
    } catch {
      setError("We couldn't bind the PDF dossier.");
    } finally {
      setExporting(null);
    }
  };

  const handleFilm = async () => {
    if (!frames.length) return;
    setExporting("film");
    setFilmProgress(0);
    try {
      await exportFilm({
        title: "LA GRANDE NOVIA",
        frames,
        filename: `${exportBase}-el-atelier.webm`,
        soundtrack: "flamenco",
        onProgress: (f) => setFilmProgress(f),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't record the flamenco film.");
    } finally {
      setExporting(null);
      setFilmProgress(null);
    }
  };

  const handleSave = async () => {
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

  return (
    <div className="px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="eyebrow flex items-center justify-center gap-3 text-secondary">
            <span aria-hidden="true" className="h-px w-8 bg-border" />
            El atelier de la novia — bridal couture, danced
            <span aria-hidden="true" className="h-px w-8 bg-border" />
          </p>
          <h1 className="font-heading mt-3 text-3xl font-medium text-primary sm:text-5xl">
            LA GRANDE NOVIA<span className="align-super text-lg text-accent">™</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-secondary sm:text-base">
            Choose a bridal silhouette from the menu, let a Spanish dance carry
            the collection, and the atelier founds an entire bridal maison —
            ten ceremony-to-fiesta looks, rich couture shades, música española,
            and a flamenco film with its soundtrack.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {/* ---------- THE BRIDAL MENU ---------- */}
          <section className="card p-6" aria-label="The bridal menu">
            <p className="label">The bridal menu — silhouette</p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-1">
              {NOVIA_STYLES.map((s) => {
                const active = styleId === s.id;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setStyleId(active ? "" : s.id)}
                      disabled={busy}
                      aria-pressed={active}
                      className={`w-full rounded-xl border p-3 text-left transition-all duration-200 cursor-pointer ${
                        active
                          ? "border-gold bg-gold/10 shadow-sm"
                          : "border-border bg-on-primary hover:border-primary/40"
                      }`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span
                          className={`font-heading text-sm font-semibold ${
                            active ? "text-primary" : "text-secondary"
                          }`}
                        >
                          {s.name}
                        </span>
                        {active && <Check className="h-4 w-4 shrink-0 text-gold" aria-hidden="true" />}
                      </span>
                      <span className="mt-0.5 block text-[0.65rem] font-medium tracking-wide text-gold uppercase">
                        {s.best}
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-secondary">
                        {s.features}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="mt-6">
              <p className="label">The dance of the collection</p>
              <div className="flex flex-wrap gap-2">
                {TRANSFORM_DANCES.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    title={`${d.region} — ${d.prompt}`}
                    className={chipClass(danceId === d.id)}
                    onClick={() => setDanceId(danceId === d.id ? "" : d.id)}
                    disabled={busy}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              {dance && (
                <p className="mt-2 text-xs leading-relaxed text-secondary">
                  <span className="font-semibold text-primary">{dance.label}</span> · {dance.region}
                </p>
              )}
            </div>

            <div className="mt-6">
              <p className="label">Bridal shades</p>
              <div className="flex flex-wrap gap-2">
                {NOVIA_PALETTE.map((c) => {
                  const active = palette.includes(c.name);
                  return (
                    <button
                      key={c.name}
                      type="button"
                      className={chipClass(active)}
                      onClick={() => togglePalette(c.name)}
                      disabled={busy}
                    >
                      <span
                        aria-hidden="true"
                        className="mr-1.5 inline-block h-3 w-3 rounded-full border border-black/10 align-middle"
                        style={{ backgroundColor: c.hex }}
                      />
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>

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

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={toggleMusic}
                aria-pressed={musicOn}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition-all duration-200 cursor-pointer active:scale-95 ${
                  musicOn
                    ? "border-gold bg-gold/15 text-gold"
                    : "border-border bg-on-primary text-secondary hover:border-gold/50 hover:text-gold"
                }`}
              >
                {musicOn ? (
                  <Music4 className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Music2 className="h-4 w-4" aria-hidden="true" />
                )}
                {musicOn ? "Música española — playing" : "Play música española"}
              </button>
              <span className="inline-flex items-center gap-1.5 text-xs text-secondary">
                <Heart className="h-3.5 w-3.5 text-flamingo" aria-hidden="true" />
                Every look is rendered elegantly and modestly dressed.
              </span>
            </div>

            <button
              type="button"
              onClick={handleGenerate}
              disabled={!styleId || busy}
              className="btn-primary mt-6 w-full text-base"
            >
              {busy ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : (
                <Wand2 className="h-5 w-5" aria-hidden="true" />
              )}
              {phase === "composing"
                ? "Pensamiento is composing the bridal maison…"
                : phase === "rendering"
                  ? `Rendering the collection — ${progress?.done ?? 0}/${progress?.total ?? 24}`
                  : "Found the bridal maison"}
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

          {/* ---------- THE COLLECTION ---------- */}
          <section className="card flex min-h-[24rem] flex-col p-6" aria-label="The collection">
            {phase === "idle" && (
              <div className="flex h-full min-h-[22rem] flex-col items-center justify-center text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gold/10 text-gold">
                  <Layers className="h-6 w-6" aria-hidden="true" />
                </span>
                <h2 className="font-heading mt-5 text-xl font-medium text-primary">
                  The novia awaits her collection
                </h2>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-secondary">
                  Pick a bridal silhouette from the menu — from the cathedral
                  ball gown to the fiesta finale — and the atelier founds the
                  maison, dance and all.
                </p>
              </div>
            )}

            {(phase === "composing" || phase === "rendering") && (
              <div
                className="flex h-full min-h-[22rem] flex-col items-center justify-center text-center"
                role="status"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary">
                  {phase === "composing" ? (
                    <Wand2 className="h-6 w-6 anim-pulse-soft" aria-hidden="true" />
                  ) : (
                    <ImageIcon className="h-6 w-6 anim-pulse-soft" aria-hidden="true" />
                  )}
                </span>
                <h2 className="font-heading mt-6 text-xl font-medium text-primary">
                  {phase === "composing" ? "Pensamiento · LA GRANDE NOVIA" : "COUTURE VISION"}
                </h2>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-secondary">
                  {phase === "composing"
                    ? "Composing the bridal maison — the silhouette, the dance, ten looks as one collection."
                    : progress
                      ? `Rendering ${progress.label} — ${progress.done} of ${progress.total} images.`
                      : "Rendering the bridal maison — logo, cover and every gown."}
                </p>
                {phase === "rendering" && progress && (
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
                        className="h-full rounded-full bg-gold transition-[width] duration-100 linear"
                        style={{
                          width: `${Math.round((progress.done / progress.total) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {phase === "done" && kit && visuals && (
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
                    <div className="flex aspect-[16/9] items-center justify-center text-secondary">
                      Cover unavailable
                    </div>
                  )}
                </div>

                {/* Logo + tagline */}
                <div className="flex flex-col items-center gap-4 rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/10 via-on-primary to-on-primary p-6 text-center">
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
                  {dance && (
                    <p className="inline-flex items-center gap-2 rounded-full border border-border bg-on-primary px-3 py-1 text-xs text-secondary">
                      <Music2 className="h-3.5 w-3.5 text-gold" aria-hidden="true" />
                      Danced to the {dance.label} — {dance.region}
                    </p>
                  )}
                </div>

                {kit.house_notes && (
                  <p className="rounded-2xl border border-border bg-on-primary p-4 text-sm leading-relaxed text-secondary">
                    <span className="font-semibold text-primary">House notes · </span>
                    {kit.house_notes}
                  </p>
                )}

                {/* Exports */}
                <div className="rounded-2xl border border-border bg-on-primary p-4">
                  <p className="label">Take it with you — the flamenco film carries its music</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleSheet}
                      disabled={exporting !== null || frames.length === 0}
                      className="btn-secondary text-sm"
                    >
                      <Download className="h-4 w-4" aria-hidden="true" />
                      {exporting === "sheet" ? "Composing…" : "Contact sheet"}
                    </button>
                    <button
                      type="button"
                      onClick={handlePdf}
                      disabled={exporting !== null}
                      className="btn-secondary text-sm"
                    >
                      <FileText className="h-4 w-4" aria-hidden="true" />
                      {exporting === "pdf" ? "Binding…" : "PDF dossier"}
                    </button>
                    <button
                      type="button"
                      onClick={handleFilm}
                      disabled={exporting !== null || frames.length === 0}
                      className="btn-primary text-sm"
                    >
                      {exporting === "film" ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Film className="h-4 w-4" aria-hidden="true" />
                      )}
                      {exporting === "film"
                        ? filmProgress !== null
                          ? `Filming ${Math.round(filmProgress * 100)}%`
                          : "Filming…"
                        : "Film with flamenco music"}
                    </button>
                  </div>
                  {exporting === "film" && filmProgress !== null && (
                    <div
                      className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"
                      role="progressbar"
                      aria-valuenow={Math.round(filmProgress * 100)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      <div
                        className="h-full rounded-full bg-accent transition-[width] duration-200"
                        style={{ width: `${Math.round(filmProgress * 100)}%` }}
                      />
                    </div>
                  )}
                </div>

                {/* The looks */}
                <h3 className="eyebrow mt-2 text-secondary">
                  The collection — {kit.creations.length} looks
                </h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {kit.creations.map((c, i) => {
                    const v = visuals.creations[i];
                    const showSketch = view[i] === "sketch";
                    const img = showSketch ? v?.sketch : v?.illustration;
                    return (
                      <article
                        key={`${c.name}-${i}`}
                        className="overflow-hidden rounded-2xl border border-border bg-on-primary"
                      >
                        <div className="relative aspect-[3/4] overflow-hidden bg-muted">
                          {img ? (
                            <img
                              src={dataUrl(img)}
                              alt={`${showSketch ? "Design drawing" : "Illustration"} of ${c.name}`}
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
                          {v?.illustration && v?.sketch && (
                            <div className="absolute inset-x-3 bottom-3 flex justify-center">
                              <div className="flex overflow-hidden rounded-full border border-border bg-on-primary/90 backdrop-blur-sm">
                                {(
                                  [
                                    { id: "illustration", label: "Illustration", icon: ImageIcon },
                                    { id: "sketch", label: "Drawing", icon: PencilLine },
                                  ] as const
                                ).map(({ id, label, icon: Icon }) => (
                                  <button
                                    key={id}
                                    type="button"
                                    onClick={() => setView((prev) => ({ ...prev, [i]: id }))}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[0.65rem] font-semibold transition-colors duration-200 cursor-pointer ${
                                      showSketch === (id === "sketch")
                                        ? "bg-primary text-on-primary"
                                        : "text-secondary hover:text-primary"
                                    }`}
                                  >
                                    <Icon className="h-3 w-3" aria-hidden="true" />
                                    {label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <h4 className="font-heading text-base font-semibold text-primary">
                            {c.name}
                          </h4>
                          <p className="mt-1 text-xs leading-relaxed text-secondary">
                            {c.silhouette} · {c.fabric}
                          </p>
                          <dl className="mt-3 space-y-1.5 text-xs leading-relaxed">
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

                {/* La danza */}
                {dancer && (
                  <div className="overflow-hidden rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/10 via-on-primary to-on-primary">
                    <img
                      src={dataUrl(dancer)}
                      alt="A flamenco dancer in the collection"
                      className="aspect-[16/9] w-full object-cover"
                    />
                    <div className="flex items-center gap-2 p-4">
                      <Music4 className="h-4 w-4 text-gold" aria-hidden="true" />
                      <p className="text-xs leading-relaxed text-secondary">
                        La danza — the collection dances to the{" "}
                        <span className="font-semibold text-primary">
                          {dance ? dance.label : "Spanish fiesta"}
                        </span>
                        . The film above carries its soundtrack.
                      </p>
                    </div>
                  </div>
                )}

                {/* Save */}
                <div className="rounded-2xl border border-border bg-on-primary p-4">
                  <p className="label">Save the bridal maison to your atelier</p>
                  <label htmlFor="noviaName" className="label">
                    Maison name
                  </label>
                  <input
                    id="noviaName"
                    className="input"
                    value={maisonName}
                    onChange={(e) => setMaisonName(e.target.value)}
                    placeholder="e.g. LA GRANDE NOVIA"
                  />
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-primary mt-3 w-full"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Save className="h-4 w-4" aria-hidden="true" />
                    )}
                    {saving ? "Filing…" : "Save the maison"}
                  </button>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-secondary">
                    <Sparkles className="h-3.5 w-3.5 text-gold" aria-hidden="true" />
                    Saved maisons can be published as their own public website.
                  </p>
                </div>
              </div>
            )}

            {phase === "error" && (
              <div className="flex h-full min-h-[22rem] flex-col items-center justify-center text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <Heart className="h-5 w-5" aria-hidden="true" />
                </span>
                <h2 className="font-heading mt-5 text-xl font-medium text-primary">
                  The bridal atelier stumbled
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
