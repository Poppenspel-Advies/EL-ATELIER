import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Award,
  Check,
  Download,
  FileText,
  Film,
  ImageIcon,
  Loader2,
  PencilLine,
  Save,
  Sparkles,
  Wand2,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { createCollection, fetchCollections, saveDesign } from "../lib/api";
import {
  CREATIVE_DIRECTOR,
  dataUrl,
  generateBrief,
  generateContentCreation,
  generateImage,
  generatePieceVisuals,
  MUSES,
} from "../lib/gemini";
import {
  downloadBrandedImage,
  downloadContactSheet,
  exportFilm,
  exportPdf,
} from "../lib/export";
import type { Collection, ContentCreation, DesignBrief } from "../lib/types";

type Phase = "idle" | "brief" | "content" | "rendering" | "done" | "error";

const OCCASIONS = [
  "Red carpet",
  "Wedding",
  "Gala",
  "Editorial shoot",
  "Anniversary soirée",
  "Runway",
  "Museum opening",
  "Private dinner",
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

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "creation";

/**
 * COUTURE CRÉATION™ — the full pipeline: a vision becomes a brief,
 * the brief becomes a content creation (the campaign world), and the
 * content creation becomes the signed designs. Every export carries
 * the maison mark, signed by the Creative Director.
 */
export default function CouturePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [memory, setMemory] = useState("");
  const [occasion, setOccasion] = useState<string | null>(null);
  const [museId, setMuseId] = useState<string | null>(null);
  const [palette, setPalette] = useState<string[]>([]);

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [brief, setBrief] = useState<DesignBrief | null>(null);
  const [content, setContent] = useState<ContentCreation | null>(null);
  const [moodboard, setMoodboard] = useState<string | null>(null);
  const [visuals, setVisuals] = useState<{
    illustration: string | null;
    sketch: string | null;
  } | null>(null);
  const [view, setView] = useState<"illustration" | "sketch">("illustration");
  const [exporting, setExporting] = useState<string | null>(null);
  const [filmProgress, setFilmProgress] = useState<number | null>(null);

  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionId, setCollectionId] = useState("");
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchCollections(user.id)
      .then(setCollections)
      .catch(() => setCollections([]));
  }, [user]);

  const prompt = useMemo(() => {
    const parts: string[] = [];
    if (occasion) parts.push(`occasion: ${occasion}`);
    if (palette.length) parts.push(`palette: ${palette.join(", ")}`);
    const guided = parts.join("; ");
    return [
      "Craft a signature couture masterpiece that carries this memory:",
      memory.trim(),
      guided,
    ]
      .filter(Boolean)
      .join(" ");
  }, [memory, occasion, palette]);

  const busy = phase !== "idle" && phase !== "done" && phase !== "error" || saving || exporting !== null;

  const togglePalette = (name: string) =>
    setPalette((p) => (p.includes(name) ? p.filter((x) => x !== name) : [...p, name]));

  const chipClass = (active: boolean) =>
    `rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-200 cursor-pointer ${
      active
        ? "border-primary bg-primary text-on-primary shadow-sm"
        : "border-border bg-on-primary text-secondary hover:border-primary/50 hover:text-primary"
    }`;

  const handleGenerate = async () => {
    if (!memory.trim() || busy) return;
    setError(null);
    setBrief(null);
    setContent(null);
    setMoodboard(null);
    setVisuals(null);
    try {
      setPhase("brief");
      const composed = await generateBrief(prompt, museId);
      setBrief(composed);
      setName(composed.name || "");

      setPhase("content");
      const created = await generateContentCreation(prompt, composed, museId);
      setContent(created);

      setPhase("rendering");
      const [mood, rendered] = await Promise.all([
        generateImage(
          created.moodboard_prompt || composed.image_prompt,
          "cover",
          museId,
        ).catch(() => null),
        generatePieceVisuals(composed, museId),
      ]);
      setMoodboard(mood);
      setVisuals(rendered);
      setView(rendered.illustration ? "illustration" : "sketch");
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "The atelier couldn't craft this masterpiece.");
      setPhase("error");
    }
  };

  const handleSave = async () => {
    if (!user || !brief || !visuals?.illustration) return;
    if (!name.trim()) {
      setError("Please give the masterpiece a name.");
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
        name: name.trim(),
        prompt: ["COUTURE CRÉATION — memory:", memory.trim(), prompt].join(" · "),
        brief,
        imageBase64: visuals.illustration,
        collectionId: targetCollectionId,
      });
      navigate(`/dossier/${design.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't save this masterpiece.");
    } finally {
      setSaving(false);
    }
  };

  const imgSrc = visuals
    ? dataUrl(
        view === "illustration"
          ? visuals.illustration ?? visuals.sketch!
          : visuals.sketch ?? visuals.illustration!,
      )
    : null;

  const exportFrames = [
    moodboard ? { dataUrl: dataUrl(moodboard), caption: "The Campaign" } : null,
    visuals?.illustration
      ? { dataUrl: dataUrl(visuals.illustration), caption: brief?.name ?? "Illustration" }
      : null,
    visuals?.sketch
      ? { dataUrl: dataUrl(visuals.sketch), caption: "Design Drawing" }
      : null,
  ].filter(Boolean) as { dataUrl: string; caption: string }[];

  const exportBase = `couture-creation-${slug(brief?.name ?? "masterpiece")}`;

  const handleBrandedImage = async () => {
    if (!imgSrc) return;
    setExporting("image");
    try {
      await downloadBrandedImage(
        imgSrc,
        `${exportBase}-el-atelier.png`,
        view === "illustration" ? (brief?.name ?? "Illustration") : "Design Drawing",
      );
    } catch {
      setError("We couldn't export that image.");
    } finally {
      setExporting(null);
    }
  };

  const handleContactSheet = async () => {
    if (!exportFrames.length) return;
    setExporting("sheet");
    try {
      await downloadContactSheet(exportFrames, `${exportBase}-el-atelier.png`, "COUTURE CRÉATION");
    } catch {
      setError("We couldn't compose the contact sheet.");
    } finally {
      setExporting(null);
    }
  };

  const handlePdf = async () => {
    if (!brief) return;
    setExporting("pdf");
    try {
      await exportPdf({
        title: content?.title ?? brief.name,
        subtitle: content?.subtitle ?? (content ? content.campaign_concept : brief.silhouette),
        metaLines: [
          `Signed — ${CREATIVE_DIRECTOR.name}, ${CREATIVE_DIRECTOR.title}`,
          `EL ATELIER · ${new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}`,
        ],
        images: exportFrames,
        sections: [
          {
            heading: "The Brief",
            body: [
              `${brief.name} — ${brief.silhouette}, ${brief.fit ?? "tailored"} fit`,
              `Fabric: ${brief.fabric}`,
              `Occasion: ${brief.occasion} · Mood: ${brief.mood}`,
              `Styling: ${brief.styling_notes}`,
              brief.innovation ? `Innovation: ${brief.innovation}` : "",
              brief.director_note ? `Director's note: ${brief.director_note}` : "",
            ]
              .filter(Boolean)
              .join("\n\n"),
          },
          ...(content
            ? [
                {
                  heading: "The Campaign",
                  body: [
                    content.campaign_concept,
                    content.lookbook_concept,
                    ...content.editorial_copy,
                  ]
                    .filter(Boolean)
                    .join("\n\n"),
                },
              ]
            : []),
        ],
        filename: `${exportBase}-el-atelier.pdf`,
      });
    } catch {
      setError("We couldn't export the PDF dossier.");
    } finally {
      setExporting(null);
    }
  };

  const handleFilm = async () => {
    if (!exportFrames.length) return;
    setExporting("film");
    setFilmProgress(0);
    try {
      await exportFilm({
        title: "COUTURE CRÉATION",
        frames: exportFrames,
        filename: `${exportBase}-el-atelier.webm`,
        onProgress: (f) => setFilmProgress(f),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't record the film.");
    } finally {
      setExporting(null);
      setFilmProgress(null);
    }
  };

  return (
    <div className="px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="eyebrow flex items-center justify-center gap-3 text-secondary">
            <span aria-hidden="true" className="h-px w-8 bg-border" />
            From vision to brief, to campaign, to creation
            <span aria-hidden="true" className="h-px w-8 bg-border" />
          </p>
          <h1 className="font-heading mt-3 text-3xl font-medium text-primary sm:text-5xl">
            COUTURE CRÉATION<span className="align-super text-lg text-accent">™</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-secondary sm:text-base">
            Every masterpiece carries its own memory. Write it — a first waltz,
            a sleepless dawn, a sea you left behind — and the atelier forges the
            design brief, the campaign world and the signed couture piece that
            carries it.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {/* ---------- THE MEMORY ---------- */}
          <section className="card p-6" aria-label="The memory">
            <label htmlFor="memory" className="label">
              The memory
            </label>
            <textarea
              id="memory"
              rows={5}
              className="input resize-y"
              placeholder="A first waltz in a rain-lit ballroom, her hand on your shoulder, the smell of wet stone and gardenia…"
              value={memory}
              onChange={(e) => setMemory(e.target.value)}
              disabled={busy}
            />

            <div className="mt-6">
              <p className="label">The occasion</p>
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

            <div className="mt-6">
              <p className="label">Palette of the memory</p>
              <div className="flex flex-wrap gap-2">
                {PALETTE.map((c) => {
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

            <button
              type="button"
              onClick={handleGenerate}
              disabled={!memory.trim() || busy}
              className="btn-primary mt-6 w-full text-base"
            >
              {busy ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : (
                <Wand2 className="h-5 w-5" aria-hidden="true" />
              )}
              {phase === "brief"
                ? "Pensamiento is composing the brief…"
                : phase === "content"
                  ? "The Creative Director is shaping the campaign…"
                  : phase === "rendering"
                    ? "COUTURE VISION is rendering…"
                    : "Forge the creation"}
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

          {/* ---------- THE MASTERPIECE ---------- */}
          <section className="card flex min-h-[24rem] flex-col p-6" aria-label="The masterpiece">
            {phase === "idle" && (
              <div className="flex h-full min-h-[20rem] flex-col items-center justify-center text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gold/10 text-gold">
                  <Award className="h-6 w-6" aria-hidden="true" />
                </span>
                <h2 className="font-heading mt-5 text-xl font-medium text-primary">
                  A masterpiece carries its memory
                </h2>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-secondary">
                  Write the memory on the left. The maison returns the brief,
                  the campaign world, and the signed illustration.
                </p>
              </div>
            )}

            {busy && !brief && (
              <div
                className="flex h-full min-h-[20rem] flex-col items-center justify-center text-center"
                role="status"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary">
                  <Award className="h-6 w-6 anim-pulse-soft" aria-hidden="true" />
                </span>
                <h2 className="font-heading mt-6 text-xl font-medium text-primary">
                  {phase === "brief" ? "Pensamiento" : phase === "content" ? CREATIVE_DIRECTOR.name : "COUTURE VISION"}
                </h2>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-secondary">
                  {phase === "brief"
                    ? "Distilling the memory into a couture brief — silhouette, fit, fabric, palette and the story behind the piece."
                    : phase === "content"
                      ? "Building the campaign world — concept, editorial copy and the moodboard."
                      : "Rendering the signed illustration and design drawing."}
                </p>
              </div>
            )}

            {phase === "done" && brief && (
              <div className="anim-fade-in flex flex-col gap-4">
                {/* Exports */}
                <div className="rounded-2xl border border-border bg-on-primary p-4">
                  <p className="label">Take it with you — every export carries the maison mark</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleBrandedImage}
                      disabled={exporting !== null || !imgSrc}
                      className="btn-secondary text-sm"
                    >
                      <Download className="h-4 w-4" aria-hidden="true" />
                      {exporting === "image" ? "Exporting…" : "Branded image"}
                    </button>
                    <button
                      type="button"
                      onClick={handleContactSheet}
                      disabled={exporting !== null || exportFrames.length === 0}
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
                      disabled={exporting !== null || exportFrames.length === 0}
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
                        : "Film the creation"}
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

                {/* Director's brief */}
                <div className="rounded-2xl border border-border bg-on-primary p-5">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-gold" aria-hidden="true" />
                    <h3 className="font-heading text-sm font-semibold tracking-wide text-primary uppercase">
                      The brief · {brief.name}
                    </h3>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                    <div>
                      <dt className="font-medium tracking-wide text-secondary/70 uppercase">Silhouette</dt>
                      <dd className="mt-0.5 font-medium text-primary">{brief.silhouette}</dd>
                    </div>
                    {brief.fit && (
                      <div>
                        <dt className="font-medium tracking-wide text-secondary/70 uppercase">Fit</dt>
                        <dd className="mt-0.5 font-medium text-primary">{brief.fit}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="font-medium tracking-wide text-secondary/70 uppercase">Fabric</dt>
                      <dd className="mt-0.5 font-medium text-primary">{brief.fabric}</dd>
                    </div>
                    <div>
                      <dt className="font-medium tracking-wide text-secondary/70 uppercase">Occasion</dt>
                      <dd className="mt-0.5 font-medium text-primary">{brief.occasion}</dd>
                    </div>
                  </dl>
                  {brief.palette.length > 0 && (
                    <div className="mt-4 flex items-center gap-2">
                      {brief.palette.map((hex) => (
                        <span
                          key={hex}
                          title={hex}
                          className="h-6 w-6 rounded-full border border-black/10"
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
                  {brief.director_note && (
                    <p className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-secondary italic">
                      “{brief.director_note}”
                      <span className="mt-1 block font-medium text-primary not-italic">
                        — {CREATIVE_DIRECTOR.name}, {CREATIVE_DIRECTOR.title}
                      </span>
                    </p>
                  )}
                </div>

                {/* Content creation */}
                {content && (
                  <div className="rounded-2xl border border-border bg-on-primary p-5">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-gold" aria-hidden="true" />
                      <h3 className="font-heading text-sm font-semibold tracking-wide text-primary uppercase">
                        Content creation — {content.title}
                      </h3>
                    </div>
                    {content.subtitle && (
                      <p className="font-heading mt-2 text-lg font-medium text-primary">
                        {content.subtitle}
                      </p>
                    )}
                    {moodboard ? (
                      <img
                        src={dataUrl(moodboard)}
                        alt="Campaign moodboard"
                        className="mt-3 aspect-[16/9] w-full rounded-xl border border-border object-cover"
                      />
                    ) : (
                      <div className="mt-3 flex aspect-[16/9] w-full items-center justify-center rounded-xl bg-muted text-secondary">
                        The moodboard could not be rendered.
                      </div>
                    )}
                    {content.campaign_concept && (
                      <p className="mt-3 text-xs leading-relaxed text-secondary">
                        {content.campaign_concept}
                      </p>
                    )}
                    {content.lookbook_concept && (
                      <p className="mt-2 text-xs leading-relaxed text-secondary italic">
                        <span className="font-semibold text-primary not-italic">Lookbook · </span>
                        {content.lookbook_concept}
                      </p>
                    )}
                    {content.editorial_copy.length > 0 && (
                      <div className="mt-3 border-t border-border pt-3">
                        {content.editorial_copy.slice(0, 3).map((para, i) => (
                          <p key={i} className="mt-2 text-xs leading-relaxed text-secondary">
                            {para}
                          </p>
                        ))}
                      </div>
                    )}
                    {content.director_note && (
                      <p className="mt-3 text-xs leading-relaxed text-secondary italic">
                        “{content.director_note}”
                      </p>
                    )}
                  </div>
                )}

                {/* Designs */}
                {visuals && (
                  <div className="overflow-hidden rounded-2xl border border-border bg-on-primary">
                    {imgSrc ? (
                      <img
                        src={imgSrc}
                        alt={
                          view === "illustration"
                            ? `Illustration of ${brief.name}`
                            : `Design drawing of ${brief.name}`
                        }
                        className="mx-auto max-h-[24rem] w-auto object-contain"
                      />
                    ) : (
                      <div className="flex aspect-[3/4] items-center justify-center text-secondary">
                        The imagery could not be rendered.
                      </div>
                    )}
                    {visuals.illustration && visuals.sketch && (
                      <div className="flex items-center justify-center gap-2 border-t border-border p-2">
                        {(
                          [
                            { id: "illustration", label: "Illustration", icon: ImageIcon },
                            { id: "sketch", label: "Design drawing", icon: PencilLine },
                          ] as const
                        ).map(({ id, label, icon: Icon }) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setView(id)}
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 cursor-pointer ${
                              view === id
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
                )}

                {/* Memory certificate */}
                <div className="rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/10 via-on-primary to-on-primary p-5">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-gold" aria-hidden="true" />
                    <h3 className="font-heading text-sm font-semibold tracking-wide text-primary uppercase">
                      Memory certificate
                    </h3>
                  </div>
                  <p className="font-heading mt-3 text-2xl font-medium text-primary">{brief.name}</p>
                  <p className="mt-2 text-xs leading-relaxed text-secondary italic">
                    “{memory.trim()}”
                  </p>
                  <p className="mt-3 flex items-center gap-1.5 text-[0.65rem] tracking-wide text-secondary/70 uppercase">
                    <Check className="h-3 w-3 text-green" aria-hidden="true" />
                    Signed by the atelier · {new Date().toLocaleDateString()}
                  </p>
                </div>

                {/* Save */}
                <div className="rounded-2xl border border-border bg-on-primary p-4">
                  <p className="label">File the masterpiece in your archive</p>
                  <label htmlFor="coutureName" className="label">
                    Masterpiece name
                  </label>
                  <input
                    id="coutureName"
                    className="input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. The First Waltz"
                  />
                  <label htmlFor="coutureCollection" className="label mt-3">
                    Collection
                  </label>
                  <div className="flex gap-2">
                    <select
                      id="coutureCollection"
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
                      New
                    </button>
                  </div>
                  {showNewCollection && (
                    <input
                      className="input mt-2"
                      placeholder="Collection name, e.g. Memories 2026"
                      value={newCollectionName}
                      onChange={(e) => setNewCollectionName(e.target.value)}
                    />
                  )}
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || !visuals?.illustration}
                    className="btn-primary mt-3 w-full"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Save className="h-4 w-4" aria-hidden="true" />
                    )}
                    {saving ? "Filing…" : "Save the masterpiece"}
                  </button>
                </div>
              </div>
            )}

            {phase === "error" && (
              <div className="flex h-full min-h-[20rem] flex-col items-center justify-center text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <Sparkles className="h-5 w-5" aria-hidden="true" />
                </span>
                <h2 className="font-heading mt-5 text-xl font-medium text-primary">
                  The atelier stumbled
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
