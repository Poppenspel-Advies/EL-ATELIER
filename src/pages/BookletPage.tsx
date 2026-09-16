import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Download,
  FileText,
  Film,
  ImageIcon,
  Loader2,
  Music2,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { fetchAssets, fetchBrands, fetchDesigns, getAssetImageUrl, getBrandImageUrls, getImageUrl } from "../lib/api";
import type { CollectionAsset, Design, NarrationKit, SongKit } from "../lib/types";
import {
  atelierHoursFor,
  compileBookletFrames,
  estimatePrice,
  exportBookletFilm,
  exportBookletPdf,
  exportBookletSheet,
  formatUsd,
  LAPISTA_RUNWAYS,
  measurementsFor,
  type BookletDesign,
} from "../lib/booklet";
import { bookletMarkdown } from "../lib/booklet";
import { MUSIC_KINDS, type SoundtrackKind } from "../lib/export";

async function urlToDataUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) throw new Error("fetch failed");
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("read failed"));
      reader.readAsDataURL(blob);
    });
  } catch {
    return url; // fall back to the raw URL — the export may still render it
  }
}

function downloadText(text: string, filename: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 5_000);
}

interface BookletBrandResolved {
  name: string;
  tagline: string | null;
  positioning: string | null;
  house_notes: string | null;
  coverUrl: string | null;
  logoUrl: string | null;
  creationImages: (string | null)[];
}

/** Le Livret — everything the atelier made, bound into one booklet. */
export default function BookletPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [designs, setDesigns] = useState<BookletDesign[]>([]);
  const [brands, setBrands] = useState<BookletBrandResolved[]>([]);
  const [assets, setAssets] = useState<CollectionAsset[]>([]);
  const [songs, setSongs] = useState<SongKit[]>([]);
  const [narrations, setNarrations] = useState<NarrationKit[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [filmProgress, setFilmProgress] = useState<number | null>(null);
  const [soundtrack, setSoundtrack] = useState<SoundtrackKind | "silent">("atelier");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [ds, brs, assetsRaw] = await Promise.all([
        fetchDesigns(user.id),
        fetchBrands(user.id),
        fetchAssets(user.id),
      ]);

      const designsResolved = await Promise.all(
        ds.map(async (d: Design) => {
          const illustrationUrl = await getImageUrl(d.image_path);
          const illustration = illustrationUrl ? await urlToDataUrl(illustrationUrl) : null;
          return { name: d.name, brief: d.brief, illustrationUrl: illustration } as BookletDesign;
        }),
      );

      const brandsResolved = await Promise.all(
        brs.map(async (b) => {
          const urls = await getBrandImageUrls(b);
          const cover = urls?.cover ? await urlToDataUrl(urls.cover) : null;
          const logo = urls?.logo ? await urlToDataUrl(urls.logo) : null;
          const creations = await Promise.all(
            (urls?.creations ?? []).map(async (c) =>
              c.illustration ? await urlToDataUrl(c.illustration) : null,
            ),
          );
          return {
            name: b.name,
            tagline: b.tagline,
            positioning: b.kit?.positioning ?? null,
            house_notes: b.kit?.house_notes ?? null,
            coverUrl: cover,
            logoUrl: logo,
            creationImages: creations,
          };
        }),
      );

      const assetsResolved = await Promise.all(
        assetsRaw.map(async (a) => {
          const img = a.image_path ? await getAssetImageUrl(a.image_path) : null;
          if (img) {
            const durl = await urlToDataUrl(img).catch(() => img);
            return { ...a, payload: { ...a.payload, data_url: durl } };
          }
          return a;
        }),
      );

      setDesigns(designsResolved);
      setBrands(brandsResolved);
      setAssets(assetsResolved);
      setSongs(
        assetsResolved
          .filter((a) => a.kind === "song")
          .map((a) => a.payload as unknown as SongKit),
      );
      setNarrations(
        assetsResolved
          .filter((a) => a.kind === "narration")
          .map((a) => a.payload as unknown as NarrationKit),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't open the booklet.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const input = useMemo(() => {
    const total = designs.length + brands.length + assets.length + songs.length;
    return {
      title: "Le Livret",
      subtitle:
        "The complete booklet of the atelier — creations, drawings, stories, narrations, price tags, innovations, magazine articles, materials & time, measurements, inspiration, songs & music, jewellery and the digital runways of La-Pista.",
      designs,
      brands,
      assets,
      songs,
      narrations,
      collectionName: undefined,
    };
  }, [designs, brands, assets, songs, narrations]);

  const frameCount = useMemo(
    () => compileBookletFrames(input).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [input],
  );

  const handlePdf = async () => {
    setExporting("pdf");
    setError(null);
    try {
      await exportBookletPdf(input);
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't bind the booklet PDF.");
    } finally {
      setExporting(null);
    }
  };

  const handleSheet = async () => {
    setExporting("sheet");
    setError(null);
    try {
      await exportBookletSheet(input);
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't compose the contact sheet.");
    } finally {
      setExporting(null);
    }
  };

  const handleFilm = async () => {
    setExporting("film");
    setFilmProgress(0);
    setError(null);
    try {
      await exportBookletFilm(
        input,
        soundtrack === "silent" ? null : soundtrack,
        setFilmProgress,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't record the booklet film.");
    } finally {
      setExporting(null);
      setFilmProgress(null);
    }
  };

  const handleMarkdown = () => {
    downloadText(bookletMarkdown(input), "el-atelier-livret.md");
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-secondary" role="status">
          <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
          <span className="text-sm">Binding Le Livret…</span>
        </div>
      </div>
    );
  }

  const isEmpty = designs.length === 0 && brands.length === 0 && assets.length === 0;

  return (
    <div className="px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="eyebrow flex items-center justify-center gap-3 text-secondary">
            <span aria-hidden="true" className="h-px w-8 bg-border" />
            Le livret de la maison
            <span aria-hidden="true" className="h-px w-8 bg-border" />
          </p>
          <h1 className="font-heading mt-3 text-3xl font-medium text-primary sm:text-5xl">
            Le Livret
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-secondary sm:text-base">
            Everything the atelier has made is bound here — images, drawings,
            stories, narrations, price tags, innovation details, magazine
            articles, materials and the time required, the measurements of the
            model and the designs, the inspiration, the proposed songs and
            music, the jewellery, bags, accessories and shoes — and the
            proposed digital runways of <span className="font-semibold text-primary">La-Pista</span>, a brand of EL ATELIER.
          </p>
        </div>

        {error && (
          <p role="alert" className="mt-6 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}

        {isEmpty ? (
          <div className="card mt-10 flex flex-col items-center px-6 py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-violet/10 text-violet">
              <BookOpen className="h-6 w-6" aria-hidden="true" />
            </span>
            <h2 className="font-heading mt-5 text-xl font-medium text-primary">
              The booklet is waiting for its first page
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-secondary">
              Forge a design in the studio, save a story, a song or a jewellery
              suite into the collection — everything will be bound into Le
              Livret, ready to download as PDF, image or film.
            </p>
            <Link to="/studio" className="btn-primary mt-6">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Enter the studio
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {/* Exports */}
            <section className="card p-6 lg:col-span-1" aria-label="Exports">
              <p className="label">Bind the booklet</p>
              <div className="flex flex-col gap-3">
                <button type="button" onClick={handlePdf} disabled={exporting !== null} className="btn-primary w-full text-sm">
                  {exporting === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileText className="h-4 w-4" aria-hidden="true" />}
                  {exporting === "pdf" ? "Binding…" : "Download the PDF"}
                </button>
                <button type="button" onClick={handleSheet} disabled={exporting !== null || frameCount === 0} className="btn-secondary w-full text-sm">
                  {exporting === "sheet" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ImageIcon className="h-4 w-4" aria-hidden="true" />}
                  {exporting === "sheet" ? "Composing…" : "Contact sheet image"}
                </button>
                <button type="button" onClick={handleMarkdown} disabled={exporting !== null} className="btn-secondary w-full text-sm">
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Lyrics & text (.md)
                </button>

                <div className="mt-2 border-t border-border pt-4">
                  <p className="label">Film soundtrack</p>
                  <select
                    className="input cursor-pointer"
                    value={soundtrack}
                    onChange={(e) => setSoundtrack(e.target.value as SoundtrackKind | "silent")}
                    aria-label="Booklet film soundtrack"
                  >
                    {MUSIC_KINDS.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.label} — {k.description}
                      </option>
                    ))}
                    <option value="__silent__">Silent</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleFilm}
                    disabled={exporting !== null || frameCount === 0}
                    className="btn-primary mt-3 w-full text-sm"
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
                      : `Film (${frameCount} frames) with music`}
                  </button>
                  {exporting === "film" && filmProgress !== null && (
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(filmProgress * 100)} aria-valuemin={0} aria-valuemax={100}>
                      <div className="h-full rounded-full bg-accent transition-[width] duration-200" style={{ width: `${Math.round(filmProgress * 100)}%` }} />
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Contents */}
            <section className="card p-6 lg:col-span-2" aria-label="Booklet contents">
              <p className="label">Inside the booklet</p>
              <ul className="space-y-3 text-sm">
                {brands.map((b) => (
                  <li key={b.name} className="rounded-xl border border-border bg-on-primary p-3">
                    <span className="font-heading font-semibold text-primary">{b.name}</span>
                    <span className="ml-2 text-xs text-secondary">maison — {b.creationImages.length} looks</span>
                    {b.tagline && <p className="mt-1 text-xs italic text-secondary">“{b.tagline}”</p>}
                  </li>
                ))}
                {designs.map((d) => (
                  <li key={d.name} className="rounded-xl border border-border bg-on-primary p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-heading font-semibold text-primary">{d.name}</span>
                      <span className="shrink-0 rounded-full bg-gold/10 px-2.5 py-0.5 text-[0.65rem] font-bold text-gold">
                        {formatUsd(d.price ?? estimatePrice(d.brief))}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-secondary">
                      {d.brief?.silhouette} · {d.brief?.fabric}
                    </p>
                    <p className="mt-1 text-[0.65rem] text-secondary/70">
                      Materials & time · {atelierHoursFor(d.brief)} — the model · {measurementsFor(d.brief?.model_type)}
                    </p>
                  </li>
                ))}
                {assets.length > 0 && (
                  <li className="rounded-xl border border-border bg-on-primary p-3 text-xs text-secondary">
                    <span className="font-semibold text-primary">{assets.length} archived pieces</span> — jewellery, bags, shoes, accessories, stories, articles, songs and narrations
                  </li>
                )}
                {songs.length > 0 && (
                  <li className="rounded-xl border border-gold/40 bg-gold/5 p-3">
                    <span className="flex items-center gap-2 text-xs font-semibold text-primary">
                      <Music2 className="h-3.5 w-3.5 text-gold" aria-hidden="true" />
                      The songs of the collection
                    </span>
                    <ul className="mt-2 space-y-1">
                      {songs.map((s) => (
                        <li key={s.title} className="text-xs text-secondary">
                          ♫ {s.title} — {s.style}, {s.tempo}, in {s.language_label}
                        </li>
                      ))}
                    </ul>
                  </li>
                )}
              </ul>

              <div className="mt-5 border-t border-border pt-4">
                <p className="label">La-Pista — proposed digital runways</p>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {LAPISTA_RUNWAYS.map((r) => (
                    <li key={r.name} className="rounded-xl border border-border bg-on-primary p-3 text-xs">
                      <span className="font-semibold text-primary">{r.name}</span>
                      <span className="mt-0.5 block leading-relaxed text-secondary">{r.concept}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[0.65rem] leading-relaxed text-secondary/70">
                  La-Pista is a brand of EL ATELIER — the digital runway house
                  where each collection proposes its own themed show.
                </p>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
