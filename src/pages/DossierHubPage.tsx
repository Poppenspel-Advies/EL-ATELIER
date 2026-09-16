import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookOpenText,
  Copy,
  Download,
  FileText,
  Film,
  Globe2,
  ImageIcon,
  Layers,
  Loader2,
  RefreshCw,
  Sparkles,
  Shirt,
  Wand2,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import {
  fetchBrands,
  fetchDesigns,
  getBrandImageUrls,
  getImageUrl,
} from "../lib/api";
import {
  CREATIVE_DIRECTOR,
  dataUrl,
  generateDossierStory,
  generateImage,
} from "../lib/gemini";
import { downloadContactSheet, exportFilm, exportPdf } from "../lib/export";
import { copyText } from "../lib/share";
import type { Brand, Design, DossierStory } from "../lib/types";
import TransformationPanel from "../components/TransformationPanel";

interface DesignWithUrl extends Design {
  imageUrl: string | null;
}

interface BrandWithCover extends Brand {
  coverUrl: string | null;
}

type Tab = "looks" | "maisons";

/**
 * ATELIER DOSSIER™ — from creative stories to creation. Every saved look is
 * a dossier: its story, its brief, and the atelier's power to transform it.
 */
export default function DossierHubPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("looks");
  const [designs, setDesigns] = useState<DesignWithUrl[]>([]);
  const [brands, setBrands] = useState<BrandWithCover[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [expandedTab, setExpandedTab] = useState<"story" | "transform">("story");
  const [stories, setStories] = useState<Record<string, DossierStory>>({});
  const [storyImages, setStoryImages] = useState<Record<string, (string | null)[]>>({});
  const [composingStoryId, setComposingStoryId] = useState<string | null>(null);
  const [storyError, setStoryError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [exportingStory, setExportingStory] = useState<string | null>(null);
  const [filmProgress, setFilmProgress] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [ds, brs] = await Promise.all([fetchDesigns(user.id), fetchBrands(user.id)]);
      const withUrls = await Promise.all(
        ds.map(async (d) => ({ ...d, imageUrl: await getImageUrl(d.image_path) })),
      );
      const brandsWithCover = await Promise.all(
        brs.map(async (b) => {
          const urls = await getBrandImageUrls(b);
          return { ...b, coverUrl: urls?.cover ?? null };
        }),
      );
      setDesigns(withUrls);
      setBrands(brandsWithCover);
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't open the dossier.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const mapLimit = async <T, R>(
    items: T[],
    limit: number,
    fn: (item: T) => Promise<R>,
  ): Promise<R[]> => {
    const results: R[] = new Array(items.length);
    let cursor = 0;
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const i = cursor++;
        results[i] = await fn(items[i]);
      }
    });
    await Promise.all(workers);
    return results;
  };

  const composeStory = async (d: DesignWithUrl) => {
    if (!d.brief || composingStoryId) return;
    setComposingStoryId(d.id);
    setStoryError(null);
    try {
      const story = await generateDossierStory(d.brief, d.prompt);
      setStories((s) => ({ ...s, [d.id]: story }));
      const imgs = await mapLimit(story.editorial_prompts, 2, (p) =>
        generateImage(p, "cover").catch(() => null),
      );
      setStoryImages((s) => ({ ...s, [d.id]: imgs }));
    } catch (e) {
      setStoryError(
        e instanceof Error ? e.message : "The archivist couldn't compose this story.",
      );
    } finally {
      setComposingStoryId(null);
    }
  };

  const copyPost = async (text: string) => {
    const ok = await copyText(text);
    setNotice(ok ? "Caption copied to your clipboard." : "We couldn't copy that caption.");
    window.setTimeout(() => setNotice(null), 3000);
  };

  const dossierSlug = (d: DesignWithUrl) =>
    `atelier-dossier-${d.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-el-atelier`;

  const storyFrames = (d: DesignWithUrl) =>
    (storyImages[d.id] ?? [])
      .filter((b): b is string => !!b)
      .map((b, i) => ({
        dataUrl: dataUrl(b),
        caption: `${stories[d.id]?.title ?? "Editorial"} ${i + 1}`,
      }));

  const handleStoryPdf = async (d: DesignWithUrl) => {
    const story = stories[d.id];
    if (!story) return;
    setExportingStory(d.id);
    try {
      await exportPdf({
        title: story.title,
        subtitle: story.subtitle,
        metaLines: [
          `A dossier of EL ATELIER · ${d.name}`,
          `Signed — ${CREATIVE_DIRECTOR.name}, ${CREATIVE_DIRECTOR.title}`,
        ],
        images: storyFrames(d),
        sections: [
          { heading: "The Story", body: story.narrative.join("\n\n") },
          { heading: story.magazine_title, body: story.article.join("\n\n") },
        ],
        filename: `${dossierSlug(d)}.pdf`,
      });
    } catch {
      setStoryError("We couldn't bind the dossier PDF.");
    } finally {
      setExportingStory(null);
    }
  };

  const handleStorySheet = async (d: DesignWithUrl) => {
    const frames = storyFrames(d);
    if (!frames.length) return;
    setExportingStory(d.id);
    try {
      await downloadContactSheet(
        frames,
        `${dossierSlug(d)}.png`,
        stories[d.id]?.title ?? "ATELIER DOSSIER",
      );
    } catch {
      setStoryError("We couldn't compose the contact sheet.");
    } finally {
      setExportingStory(null);
    }
  };

  const handleStoryFilm = async (d: DesignWithUrl) => {
    const frames = storyFrames(d);
    if (!frames.length) return;
    setExportingStory(d.id);
    setFilmProgress(0);
    try {
      await exportFilm({
        title: stories[d.id]?.title ?? "ATELIER DOSSIER",
        frames,
        filename: `${dossierSlug(d)}.webm`,
        onProgress: (f) => setFilmProgress(f),
      });
    } catch (e) {
      setStoryError(e instanceof Error ? e.message : "We couldn't record the film.");
    } finally {
      setExportingStory(null);
      setFilmProgress(null);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-secondary" role="status">
          <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
          <span className="text-sm">Opening the dossier…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="eyebrow flex items-center justify-center gap-3 text-secondary">
            <span aria-hidden="true" className="h-px w-8 bg-border" />
            The record of the maison
            <span aria-hidden="true" className="h-px w-8 bg-border" />
          </p>
          <h1 className="font-heading mt-3 text-3xl font-medium text-primary sm:text-5xl">
            ATELIER DOSSIER<span className="align-super text-lg text-accent">™</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-secondary sm:text-base">
            From creative stories to creation — every look you forge becomes a
            dossier, and every dossier can be transformed into a new city, a
            new garment, a new direction.
          </p>
        </div>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Dossier sections"
          className="mx-auto mt-10 inline-flex w-full max-w-xs rounded-full border border-border bg-on-primary p-1 sm:max-w-none sm:w-auto"
        >
          {(
            [
              { id: "looks", label: `Looks (${designs.length})`, icon: Shirt },
              { id: "maisons", label: `Maisons (${brands.length})`, icon: Layers },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              type="button"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200 cursor-pointer ${
                tab === id
                  ? "bg-primary text-on-primary shadow-sm"
                  : "text-secondary hover:text-primary"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>

        {error && (
          <p role="alert" className="mt-6 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}

        {/* ---------- LOOKS ---------- */}
        {tab === "looks" &&
          (designs.length === 0 ? (
            <div className="card mt-10 flex flex-col items-center px-6 py-16 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-violet/10 text-violet">
                <BookOpenText className="h-6 w-6" aria-hidden="true" />
              </span>
              <h2 className="font-heading mt-5 text-xl font-medium text-primary">
                No dossiers yet
              </h2>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-secondary">
                Every creation you save becomes a dossier here — with its
                story, its brief, and the power to transform it.
              </p>
              <Link to="/studio" className="btn-primary mt-6">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Forge your first creation
              </Link>
            </div>
          ) : (
            <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {designs.map((d) => (
                <li key={d.id} className="card card-hover flex flex-col overflow-hidden p-0">
                  <div className="relative aspect-[3/4] overflow-hidden bg-muted">
                    {d.imageUrl ? (
                      <img
                        src={d.imageUrl}
                        alt={`Illustration of ${d.name}`}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-border">
                        <ImageIcon className="h-10 w-10" aria-hidden="true" />
                      </div>
                    )}
                    <span className="absolute left-3 top-3 rounded-full bg-on-primary/85 px-3 py-1 text-[0.65rem] font-medium tracking-wide text-secondary backdrop-blur-sm">
                      Dossier · {formatDate(d.created_at)}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="font-heading text-lg font-semibold text-primary">{d.name}</h3>
                    <p className="mt-1 text-xs text-secondary">
                      {d.brief?.silhouette ?? "Couture design"}
                      {d.brief?.fit ? ` · ${d.brief.fit} fit` : ""}
                      {d.brief?.occasion ? ` · ${d.brief.occasion}` : ""}
                    </p>
                    {d.prompt && (
                      <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-secondary italic">
                        “{d.prompt}”
                      </p>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2 pt-1">
                      <Link to={`/dossier/${d.id}`} className="btn-secondary flex-1 text-sm">
                        Open dossier
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setExpandedTab("story");
                          setExpanded(
                            expanded === d.id && expandedTab === "story" ? null : d.id,
                          );
                        }}
                        aria-expanded={expanded === d.id && expandedTab === "story"}
                        className={`flex-1 text-sm ${
                          expanded === d.id && expandedTab === "story"
                            ? "btn-primary"
                            : "btn-secondary"
                        }`}
                      >
                        <BookOpenText className="h-4 w-4" aria-hidden="true" />
                        {expanded === d.id && expandedTab === "story" ? "Close" : "The story"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setExpandedTab("transform");
                          setExpanded(
                            expanded === d.id && expandedTab === "transform" ? null : d.id,
                          );
                        }}
                        aria-expanded={expanded === d.id && expandedTab === "transform"}
                        className={`flex-1 text-sm ${
                          expanded === d.id && expandedTab === "transform"
                            ? "btn-primary"
                            : "btn-secondary"
                        }`}
                      >
                        <RefreshCw className="h-4 w-4" aria-hidden="true" />
                        {expanded === d.id && expandedTab === "transform" ? "Close" : "Transform"}
                      </button>
                    </div>
                  </div>
                  {expanded === d.id && d.brief && (
                    <div className="anim-fade-in border-t border-border p-4">
                      <div
                        role="tablist"
                        aria-label="Dossier actions"
                        className="inline-flex rounded-full border border-border bg-on-primary p-1"
                      >
                        {(
                          [
                            { id: "story", label: "The story", icon: BookOpenText },
                            { id: "transform", label: "Transform", icon: RefreshCw },
                          ] as const
                        ).map(({ id, label, icon: Icon }) => (
                          <button
                            key={id}
                            role="tab"
                            type="button"
                            aria-selected={expandedTab === id}
                            onClick={() => setExpandedTab(id)}
                            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition-all duration-200 cursor-pointer ${
                              expandedTab === id
                                ? "bg-primary text-on-primary shadow-sm"
                                : "text-secondary hover:text-primary"
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                            {label}
                          </button>
                        ))}
                      </div>

                      {notice && (
                        <p role="status" className="mt-3 text-xs text-green">
                          {notice}
                        </p>
                      )}

                      {expandedTab === "transform" ? (
                        <div className="mt-4">
                          <TransformationPanel
                            sourceBrief={d.brief}
                            sourcePrompt={d.prompt}
                            museId={null}
                          />
                        </div>
                      ) : (
                        <div className="mt-4">
                          {storyError && (
                            <p
                              role="alert"
                              className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive"
                            >
                              {storyError}
                            </p>
                          )}
                          {composingStoryId === d.id ? (
                            <div
                              className="flex flex-col items-center gap-3 py-10 text-center"
                              role="status"
                            >
                              <Loader2 className="h-6 w-6 animate-spin text-accent" aria-hidden="true" />
                              <p className="text-sm text-secondary">
                                The archivist is writing the complete story — narrative,
                                magazine article and editorial imagery…
                              </p>
                            </div>
                          ) : stories[d.id] ? (
                            (() => {
                              const story = stories[d.id];
                              if (!story) return null;
                              const frames = storyFrames(d);
                              return (
                                <article className="anim-fade-in rounded-2xl border border-border bg-on-primary p-5">
                                  <p className="eyebrow text-secondary">
                                    ATELIER DOSSIER<span className="text-accent">™</span>
                                  </p>
                                  <h4 className="font-heading mt-2 text-2xl font-medium text-primary">
                                    {story.title}
                                  </h4>
                                  {story.subtitle && (
                                    <p className="mt-1 text-sm text-secondary">{story.subtitle}</p>
                                  )}
                                  {story.pull_quote && (
                                    <blockquote className="mt-4 border-l-2 border-gold pl-4 font-heading text-base italic text-primary">
                                      “{story.pull_quote}”
                                    </blockquote>
                                  )}
                                  {story.narrative.length > 0 && (
                                    <div className="mt-4 space-y-3">
                                      {story.narrative.map((p, i) => (
                                        <p key={i} className="text-xs leading-relaxed text-secondary">
                                          {p}
                                        </p>
                                      ))}
                                    </div>
                                  )}
                                  {(storyImages[d.id] ?? []).length > 0 && (
                                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                      {(storyImages[d.id] ?? []).map((b, i) => (
                                        <div
                                          key={i}
                                          className="overflow-hidden rounded-xl border border-border bg-muted"
                                        >
                                          {b ? (
                                            <img
                                              src={dataUrl(b)}
                                              alt={`Editorial ${i + 1}`}
                                              className="aspect-[16/10] w-full object-cover"
                                            />
                                          ) : (
                                            <div className="flex aspect-[16/10] items-center justify-center text-border">
                                              <ImageIcon className="h-6 w-6" aria-hidden="true" />
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {story.magazine_title && (
                                    <div className="mt-5 border-t border-border pt-4">
                                      <p className="font-heading text-lg font-semibold text-primary">
                                        {story.magazine_title}
                                      </p>
                                      <div className="mt-2 space-y-3">
                                        {story.article.map((p, i) => (
                                          <p key={i} className="text-xs leading-relaxed text-secondary">
                                            {p}
                                          </p>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {story.social_posts.length > 0 && (
                                    <div className="mt-5 border-t border-border pt-4">
                                      <p className="label">Ready to post</p>
                                      <ul className="mt-2 space-y-2">
                                        {story.social_posts.map((post, i) => (
                                          <li
                                            key={i}
                                            className="flex items-start justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2"
                                          >
                                            <p className="text-xs leading-relaxed text-secondary">
                                              “{post}”
                                            </p>
                                            <button
                                              type="button"
                                              onClick={() => copyPost(post)}
                                              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[0.65rem] font-semibold text-primary transition-all duration-200 hover:border-primary/50 cursor-pointer active:scale-95"
                                            >
                                              <Copy className="h-3 w-3" aria-hidden="true" />
                                              Copy
                                            </button>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  {story.director_note && (
                                    <p className="mt-4 text-xs leading-relaxed text-secondary italic">
                                      “{story.director_note}”
                                      <span className="mt-1 block font-medium text-primary not-italic">
                                        — {CREATIVE_DIRECTOR.name}, {CREATIVE_DIRECTOR.title}
                                      </span>
                                    </p>
                                  )}
                                  <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
                                    <button
                                      type="button"
                                      onClick={() => handleStoryPdf(d)}
                                      disabled={exportingStory === d.id}
                                      className="btn-secondary text-sm"
                                    >
                                      <FileText className="h-4 w-4" aria-hidden="true" />
                                      {exportingStory === d.id ? "Binding…" : "PDF dossier"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleStorySheet(d)}
                                      disabled={exportingStory === d.id || frames.length === 0}
                                      className="btn-secondary text-sm"
                                    >
                                      <Download className="h-4 w-4" aria-hidden="true" />
                                      Images
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleStoryFilm(d)}
                                      disabled={exportingStory === d.id || frames.length === 0}
                                      className="btn-primary text-sm"
                                    >
                                      {exportingStory === d.id && filmProgress !== null ? (
                                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                      ) : (
                                        <Film className="h-4 w-4" aria-hidden="true" />
                                      )}
                                      {exportingStory === d.id && filmProgress !== null
                                        ? `Filming ${Math.round(filmProgress * 100)}%`
                                        : "Film"}
                                    </button>
                                  </div>
                                  {exportingStory === d.id && filmProgress !== null && (
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
                                </article>
                              );
                            })()
                          ) : (
                            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-10 text-center">
                              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-violet/10 text-violet">
                                <Wand2 className="h-5 w-5" aria-hidden="true" />
                              </span>
                              <p className="max-w-md text-sm leading-relaxed text-secondary">
                                The complete story of{" "}
                                <span className="font-semibold text-primary">{d.name}</span> — its
                                narrative, a magazine article, editorial imagery and ready-to-post
                                captions.
                              </p>
                              <button
                                type="button"
                                onClick={() => composeStory(d)}
                                className="btn-primary"
                              >
                                <Sparkles className="h-4 w-4" aria-hidden="true" />
                                Compose the story
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ))}

        {/* ---------- MAISONS ---------- */}
        {tab === "maisons" &&
          (brands.length === 0 ? (
            <div className="card mt-10 flex flex-col items-center px-6 py-16 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-violet/10 text-violet">
                <Layers className="h-6 w-6" aria-hidden="true" />
              </span>
              <h2 className="font-heading mt-5 text-xl font-medium text-primary">
                No maisons founded yet
              </h2>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-secondary">
                Found a maison in the studio and its whole world — ten looks —
                will appear here as one dossier.
              </p>
              <Link to="/studio" className="btn-primary mt-6">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Found a maison
              </Link>
            </div>
          ) : (
            <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {brands.map((b) => (
                <li key={b.id}>
                  <Link
                    to={`/maison/${b.id}`}
                    className="card card-hover group block overflow-hidden p-0"
                  >
                    <div className="relative aspect-[16/9] overflow-hidden bg-muted">
                      {b.coverUrl ? (
                        <img
                          src={b.coverUrl}
                          alt={`${b.name} campaign cover`}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-border">
                          <ImageIcon className="h-10 w-10" aria-hidden="true" />
                        </div>
                      )}
                      {b.published && b.slug && (
                        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-green/90 px-2.5 py-1 text-[0.65rem] font-semibold text-on-primary backdrop-blur-sm">
                          <Globe2 className="h-3 w-3" aria-hidden="true" />
                          Live website
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-heading text-lg font-semibold text-primary">
                        {b.name}
                      </h3>
                      <p className="mt-1 text-xs text-secondary">
                        {b.tagline || "Couture house"} · {b.kit?.creations?.length ?? 0} looks
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ))}
      </div>
    </div>
  );
}
