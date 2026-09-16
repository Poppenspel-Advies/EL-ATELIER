import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Globe2, ImageIcon, Loader2, Sparkles } from "lucide-react";
import { fetchPublishedBrand, getPublicBrandImageUrls } from "../lib/api";
import type { Brand, BrandVisuals } from "../lib/types";

/**
 * The public maison website — one per published brand, served at
 * /showcase/:slug. No authentication required; the brand's custom domain
 * (when configured) is surfaced here as the live address.
 */
export default function ShowcasePage() {
  const slug = window.location.pathname.split("/").filter(Boolean).pop() ?? "";
  const [brand, setBrand] = useState<Brand | null>(null);
  const [visuals, setVisuals] = useState<BrandVisuals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const b = await fetchPublishedBrand(slug);
        if (!alive) return;
        if (!b) {
          setBrand(null);
          setError("This maison website does not exist or is not published.");
          return;
        }
        setBrand(b);
        setVisuals(await getPublicBrandImageUrls(b));
      } catch (e) {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "We couldn't open this maison website.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

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

  if (!brand || !brand.kit) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <h1 className="font-heading text-2xl font-medium text-primary">Maison not found</h1>
        <p className="mt-2 max-w-sm text-sm text-secondary">{error}</p>
        <Link to="/" className="btn-secondary mt-6">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Return to EL ATELIER
        </Link>
      </div>
    );
  }

  const kit = brand.kit;

  return (
    <div className="px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-6xl">
        {/* Live domain strip */}
        <div className="mb-8 flex flex-wrap items-center justify-center gap-2 text-xs text-secondary">
          <Globe2 className="h-3.5 w-3.5 text-green" aria-hidden="true" />
          {brand.domain ? (
            <span>
              Live at{" "}
              <span className="font-semibold text-primary">{brand.domain}</span>
            </span>
          ) : (
            <span>
              Live at{" "}
              <span className="font-semibold text-primary">
                {window.location.origin}/showcase/{brand.slug}
              </span>
            </span>
          )}
          <span aria-hidden="true">·</span>
          <span>founded in EL ATELIER</span>
        </div>

        {/* Cover */}
        <div className="overflow-hidden rounded-3xl border border-border bg-on-primary shadow-lg shadow-primary/5">
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
        <div className="mt-10 flex flex-col items-center gap-6 text-center">
          {visuals?.logo && (
            <img
              src={visuals.logo}
              alt={`${brand.name} logo`}
              className="h-28 w-28 rounded-full border border-border object-cover shadow-md"
            />
          )}
          <div>
            <h1 className="font-heading text-4xl font-medium text-primary sm:text-5xl">
              {brand.name}
            </h1>
            {brand.tagline && (
              <p className="mt-3 text-base italic text-secondary">“{brand.tagline}”</p>
            )}
            {kit.palette.length > 0 && (
              <div className="mt-4 flex items-center justify-center gap-2">
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
        </div>

        {/* Story */}
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

        {/* The collection */}
        <div className="mt-12">
          <h2 className="eyebrow text-secondary">
            The collection — {kit.creations.length} looks
          </h2>
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {kit.creations.map((c, i) => {
              const v = visuals?.creations?.[i];
              const img = v?.illustration ?? v?.sketch;
              return (
                <li
                  key={`${c.name}-${i}`}
                  className="card card-hover overflow-hidden p-0"
                >
                  <div className="relative aspect-[3/4] overflow-hidden bg-muted">
                    {img ? (
                      <img
                        src={img}
                        alt={`Illustration of ${c.name}`}
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
                    <h3 className="font-heading text-base font-semibold text-primary">
                      {c.name}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-secondary">
                      {c.silhouette}
                      {c.fit ? ` · ${c.fit} fit` : ""} · {c.fabric}
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
                </li>
              );
            })}
          </ul>
        </div>

        {/* Footer */}
        <div className="mt-14 flex flex-col items-center gap-3 rounded-3xl border border-border bg-on-primary px-6 py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="text-sm text-secondary">
            This maison was founded in{" "}
            <span className="font-semibold text-primary">EL ATELIER</span> — a
            private atelier of couture intelligence.
          </p>
          <Link to="/" className="btn-secondary mt-2">
            Visit EL ATELIER
            <ArrowLeft className="h-4 w-4 rotate-180" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
