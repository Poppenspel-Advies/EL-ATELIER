import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  ExternalLink,
  Globe2,
  ImageIcon,
  Loader2,
  PencilLine,
  Share2,
  Trash2,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import {
  deleteBrand,
  fetchBrand,
  getBrandImageUrls,
  publishBrand,
  unpublishBrand,
} from "../lib/api";
import type { Brand, BrandVisuals } from "../lib/types";
import { museById } from "../lib/gemini";
import { copyText, downloadImage, shareLink, slugify } from "../lib/share";

export default function BrandPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [brand, setBrand] = useState<Brand | null>(null);
  const [visuals, setVisuals] = useState<BrandVisuals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<Record<number, "illustration" | "sketch">>({});
  const [slugDraft, setSlugDraft] = useState("");
  const [domainDraft, setDomainDraft] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const b = await fetchBrand(id);
      if (!b) {
        setError("This maison no longer exists.");
        setBrand(null);
        return;
      }
      if (user && b.user_id !== user.id) {
        setError("You don't have access to this maison.");
        setBrand(null);
        return;
      }
      setBrand(b);
      setSlugDraft(b.slug ?? slugify(b.name));
      setDomainDraft(b.domain ?? "");
      setVisuals(await getBrandImageUrls(b));
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't load this maison.");
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async () => {
    if (!brand) return;
    setBusy(true);
    try {
      await deleteBrand(brand);
      navigate("/atelier");
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't delete the maison.");
      setBusy(false);
    }
  };

  const handlePublish = async () => {
    if (!brand) return;
    setPublishing(true);
    setError(null);
    setNotice(null);
    try {
      const slug = slugDraft.trim() || slugify(brand.name);
      const updated = await publishBrand({
        brandId: brand.id,
        slug,
        domain: domainDraft.trim() || null,
      });
      setBrand(updated);
      setSlugDraft(slug);
      setNotice("Your maison website is live.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't publish the maison website.");
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    if (!brand) return;
    setPublishing(true);
    setError(null);
    setNotice(null);
    try {
      await unpublishBrand(brand.id);
      setBrand({ ...brand, published: false });
      setNotice("Website unpublished.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't unpublish the maison website.");
    } finally {
      setPublishing(false);
    }
  };

  const handleCopyLink = async () => {
    const ok = await copyText(`${window.location.origin}/showcase/${brand?.slug}`);
    setNotice(ok ? "Website link copied." : "Couldn't copy the link.");
  };

  const handleDownloadCover = async () => {
    if (!brand || !visuals?.cover) return;
    setBusy(true);
    try {
      await downloadImage(visuals.cover, `${brand.name.replace(/[^a-z0-9]+/gi, "-")}-cover.png`);
      setNotice("Cover downloaded.");
    } catch {
      setError("We couldn't download the cover.");
    } finally {
      setBusy(false);
    }
  };

  const handleShare = async () => {
    const result = await shareLink({
      title: `${brand?.name ?? "A maison"} · EL ATELIER`,
      text: `${brand?.name ?? "A couture maison"} — founded in EL ATELIER.`,
      url: window.location.href,
    });
    if (result === "copy") setNotice("Maison link copied.");
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-secondary" role="status">
          <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
          <span className="text-sm">Opening the maison…</span>
        </div>
      </div>
    );
  }

  if (!brand) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <h1 className="font-heading text-2xl font-medium text-primary">Maison not found</h1>
        <p className="mt-2 max-w-sm text-sm text-secondary">{error}</p>
        <Link to="/atelier" className="btn-secondary mt-6">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to the atelier
        </Link>
      </div>
    );
  }

  const kit = brand.kit;
  const muse = museById(brand.muse);

  return (
    <div className="px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <Link
          to="/atelier"
          className="inline-flex items-center gap-2 text-sm text-secondary transition-colors duration-200 hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to the atelier
        </Link>

        {/* Cover */}
        <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-on-primary shadow-lg shadow-primary/5">
          {visuals?.cover ? (
            <img
              src={visuals.cover}
              alt={`${brand.name} campaign cover`}
              className="aspect-[16/9] w-full object-cover"
            />
          ) : (
            <div className="flex aspect-[16/9] w-full items-center justify-center bg-gradient-to-br from-violet/15 via-pink/10 to-cyan/10 text-border">
              <ImageIcon className="h-10 w-10" aria-hidden="true" />
            </div>
          )}
        </div>

        {/* Header */}
        <div className="mt-8 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          {visuals?.logo && (
            <img
              src={visuals.logo}
              alt={`${brand.name} logo`}
              className="h-28 w-28 shrink-0 rounded-2xl border border-border object-cover shadow-md"
            />
          )}
          <div className="flex-1">
            <p className="eyebrow text-secondary">Maison · {formatDate(brand.created_at)}</p>
            <h1 className="font-heading mt-2 text-3xl font-medium text-primary sm:text-4xl">
              {brand.name}
            </h1>
            {brand.tagline && (
              <p className="mt-2 text-sm italic text-secondary">“{brand.tagline}”</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {muse && (
                <span className="rounded-full border border-border bg-on-primary px-3 py-1 text-xs font-medium text-secondary">
                  Muse · {muse.label}
                </span>
              )}
              {kit?.palette && kit.palette.length > 0 && (
                <span className="flex items-center gap-1.5">
                  {kit.palette.map((hex) => (
                    <span
                      key={hex}
                      title={hex}
                      aria-label={`Color ${hex}`}
                      className="h-4 w-4 rounded-full border border-black/10"
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {visuals?.cover && (
              <button
                type="button"
                onClick={handleDownloadCover}
                disabled={busy}
                className="btn-secondary text-sm"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Cover
              </button>
            )}
            <button type="button" onClick={handleShare} className="btn-secondary text-sm">
              <Share2 className="h-4 w-4" aria-hidden="true" />
              Share
            </button>
            <Link to="/studio" className="btn-secondary text-sm">
              Found again
            </Link>
            {confirmDelete ? (
              <div className="flex items-center gap-2 rounded-full border border-destructive/40 bg-destructive/5 px-3 py-1.5">
                <span className="text-xs font-medium text-destructive">Delete this maison?</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={busy}
                  className="rounded-full bg-destructive px-3 py-1 text-xs font-semibold text-on-primary transition-transform duration-200 active:scale-97 cursor-pointer hover:opacity-90"
                >
                  {busy ? "Deleting…" : "Yes"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-full px-2 py-1 text-xs font-medium text-secondary transition-colors duration-200 hover:text-primary cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="btn-ghost text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Delete
              </button>
            )}
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-6 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="mt-6 rounded-xl bg-green/10 px-4 py-3 text-sm text-green">
            <Check className="mr-1.5 inline h-4 w-4" aria-hidden="true" />
            {notice}
          </p>
        )}

        {/* Story */}
        {kit && (
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {kit.positioning && (
              <section className="card p-6">
                <h2 className="eyebrow text-secondary">Positioning</h2>
                <p className="mt-3 text-sm leading-relaxed text-secondary">{kit.positioning}</p>
              </section>
            )}
            {kit.house_notes && (
              <section className="card p-6">
                <h2 className="eyebrow text-secondary">House notes</h2>
                <p className="mt-3 text-sm leading-relaxed text-secondary">{kit.house_notes}</p>
              </section>
            )}
            {kit.audience && (
              <section className="card p-6">
                <h2 className="eyebrow text-secondary">Audience</h2>
                <p className="mt-3 text-sm leading-relaxed text-secondary">{kit.audience}</p>
              </section>
            )}
          </div>
        )}

        {/* Publish the maison website */}
        <section className="card mt-10 p-6" aria-label="Publish the maison website">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan/10 text-cyan">
              <Globe2 className="h-4.5 w-4.5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-heading text-base font-semibold text-primary">
                The maison's own website
              </h2>
              <p className="text-xs text-secondary">
                Publish a public website for this maison — all ten looks, on its own address.
              </p>
            </div>
          </div>

          {brand.published && brand.slug ? (
            <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-green/30 bg-green/5 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-green">
                <Check className="h-4 w-4" aria-hidden="true" />
                Live at{" "}
                {brand.domain ?? `${window.location.origin}/showcase/${brand.slug}`}
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  to={`/showcase/${brand.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary text-sm"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  View website
                </Link>
                <button type="button" onClick={handleCopyLink} className="btn-secondary text-sm">
                  <Copy className="h-4 w-4" aria-hidden="true" />
                  Copy link
                </button>
                <button
                  type="button"
                  onClick={handleUnpublish}
                  disabled={publishing}
                  className="btn-ghost text-sm text-destructive hover:bg-destructive/10"
                >
                  {publishing ? "Unpublishing…" : "Unpublish"}
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-5 flex flex-col gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="brandSlug" className="label">
                    Website address
                  </label>
                  <div className="flex items-center gap-1 rounded-xl border border-border bg-on-primary px-3">
                    <span className="shrink-0 text-xs text-secondary/70">
                      {window.location.origin}/showcase/
                    </span>
                    <input
                      id="brandSlug"
                      className="w-full bg-transparent py-2.5 text-sm text-primary outline-none"
                      value={slugDraft}
                      onChange={(e) => setSlugDraft(slugify(e.target.value))}
                      placeholder="maison-abysse"
                      aria-label="Website slug"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="brandDomain" className="label">
                    Custom domain <span className="text-secondary/60">(optional)</span>
                  </label>
                  <input
                    id="brandDomain"
                    className="input"
                    value={domainDraft}
                    onChange={(e) => setDomainDraft(e.target.value)}
                    placeholder="maisonabysse.com"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handlePublish}
                disabled={publishing}
                className="btn-primary w-full sm:w-auto"
              >
                {publishing ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Globe2 className="h-4 w-4" aria-hidden="true" />
                )}
                {publishing ? "Publishing…" : "Publish the maison"}
              </button>
              <p className="text-xs text-secondary">
                Point your custom domain's CNAME at this site — or simply share
                the EL ATELIER address.
              </p>
            </div>
          )}
        </section>

        {/* Collection */}
        {kit && (
          <div className="mt-10">
            <h2 className="eyebrow text-secondary">
              The collection — {kit.creations.length} looks
            </h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {kit.creations.map((c, i) => {
                const v = visuals?.creations?.[i];
                const showSketch = view[i] === "sketch";
                const img = showSketch ? v?.sketch : v?.illustration;
                return (
                  <article
                    key={`${c.name}-${i}`}
                    className="card card-hover overflow-hidden p-0"
                  >
                    <div className="relative aspect-[3/4] overflow-hidden bg-muted">
                      {img ? (
                        <img
                          src={img}
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
                                onClick={() =>
                                  setView((prev) => ({ ...prev, [i]: id }))
                                }
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
                      <h3 className="font-heading text-base font-semibold text-primary">{c.name}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-secondary">
                        {c.silhouette} · {c.fabric}
                      </p>
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
          </div>
        )}

        {/* Original vision */}
        <section className="card mt-10 p-6">
          <h2 className="eyebrow text-secondary">Original vision</h2>
          <p className="mt-3 text-sm leading-relaxed text-secondary">{brand.prompt}</p>
        </section>
      </div>
    </div>
  );
}
