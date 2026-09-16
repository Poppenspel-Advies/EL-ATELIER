import { lazy, Suspense, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Aperture,
  Box,
  Feather,
  FileText,
  Layers,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import VideoBackdrop from "../components/VideoBackdrop";
import { supportsWebGL } from "../lib/webgl";

const MaisonExperience = lazy(() => import("../components/MaisonExperience"));

const MODULES = [
  {
    n: "01",
    name: "Pensamiento",
    color: "pink",
    icon: Feather,
    tagline: "The thinking mind",
    text: "Your vision is distilled into a precise couture brief — silhouette, fabric, palette, mood, and the story behind the piece.",
  },
  {
    n: "02",
    name: "COUTURE VISION",
    color: "cyan",
    icon: Aperture,
    tagline: "The rendering eye",
    text: "A full-length couture illustration, rendered in a consistent editorial style by the latest image intelligence.",
  },
  {
    n: "03",
    name: "Archive",
    color: "violet",
    icon: Layers,
    tagline: "The memory of the maison",
    text: "Every look is filed into collections. Build seasonal ateliers and revisit any design, any time.",
  },
  {
    n: "04",
    name: "Dossier",
    color: "green",
    icon: FileText,
    tagline: "The record of record",
    text: "Each design keeps its full brief — notes, palette, provenance and prompt — preserved like a couture file.",
  },
] as const;

const STEPS = [
  {
    title: "Describe your vision",
    text: "Write freely, or guide the atelier with silhouettes, fabrics, occasions and moods.",
  },
  {
    title: "Pensamiento composes the brief",
    text: "The intelligence of the maison turns your words into a structured couture brief.",
  },
  {
    title: "COUTURE VISION renders the look",
    text: "A full illustration is drawn, then filed into your archive with its dossier.",
  },
];

function MaisonLandingFallback() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-[#0f0c09]">
      <p className="font-heading text-2xl font-semibold tracking-[0.3em] text-ivory">
        EL ATELIER
      </p>
      <p className="text-[0.65rem] font-semibold tracking-[0.45em] text-accent uppercase">
        La maison s'ouvre…
      </p>
      <div className="maison-shimmer h-px w-44" aria-hidden="true" />
    </div>
  );
}

export default function Home() {
  const [params] = useSearchParams();
  const webgl = useMemo(() => supportsWebGL(), []);
  const show3d = params.get("view") !== "classic" && webgl;

  return show3d ? (
    <Suspense fallback={<MaisonLandingFallback />}>
      <MaisonExperience />
    </Suspense>
  ) : (
    <HomeClassic webgl={webgl} />
  );
}

/* ------------------------------------------------------------------ */
/* Classic 2D landing — also the fallback when WebGL is unavailable.   */
/* ------------------------------------------------------------------ */
function HomeClassic({ webgl }: { webgl: boolean }) {
  const { user } = useAuth();
  const studioTarget = user ? "/studio" : "/auth?mode=signup";

  return (
    <div className="overflow-hidden">
      {/* ---------- HERO ---------- */}
      <section className="relative px-4 pt-24 pb-20 sm:px-6 sm:pt-32 sm:pb-28">
        {/* Deep blue sea backdrop (live ocean video over a CSS sea fallback) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
        >
          <div className="sea-gradient absolute inset-0" />
          <div className="sea-vignette absolute inset-0" />
          <VideoBackdrop />
          <div className="sea-texture absolute inset-0" />

          {/* Animated wave layers */}
          <svg
            className="sea-wave sea-wave--slow"
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
          >
            <path
              d="M0 60 C 120 15 280 10 400 48 S 700 95 820 55 S 1100 12 1200 52 L 1200 120 L 0 120 Z"
              fill="rgba(255,255,255,0.06)"
            />
          </svg>
          <svg
            className="sea-wave sea-wave--mid"
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
          >
            <path
              d="M0 55 C 150 10 320 100 480 58 S 800 100 950 52 S 1120 12 1200 50 L 1200 120 L 0 120 Z"
              fill="rgba(255,255,255,0.12)"
            />
          </svg>
          <svg
            className="sea-wave sea-wave--fast"
            viewBox="0 0 1200 120"
            preserveAspectRatio="none"
          >
            <path
              d="M0 62 C 140 20 300 95 460 60 S 780 100 940 54 S 1120 14 1200 56 L 1200 120 L 0 120 Z"
              fill="rgba(255,255,255,0.2)"
            />
          </svg>

          {/* Sea-sand shore */}
          <div className="sea-sand" />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <p className="anim-fade-up eyebrow flex items-center justify-center gap-3 text-on-primary/80">
            <span aria-hidden="true" className="h-px w-8 bg-on-primary/40" />
            Maison de couture intelligente
            <span aria-hidden="true" className="h-px w-8 bg-on-primary/40" />
          </p>

          {/* Brand writing */}
          <h1
            className="anim-fade-up font-heading mt-6 text-5xl leading-none font-semibold tracking-[0.14em] text-on-primary sm:text-7xl lg:text-8xl"
            style={{
              animationDelay: "80ms",
              textShadow: "0 2px 32px oklch(0.15 0.07 250 / 0.55)",
            }}
          >
            EL ATELIER
          </h1>
          <p
            className="anim-fade-up mt-5 text-[0.7rem] font-medium tracking-[0.5em] text-on-primary/75 uppercase"
            style={{ animationDelay: "150ms" }}
          >
            Couture Intelligence
          </p>

          <p
            className="anim-fade-up font-heading mt-8 text-xl italic text-on-primary/90 sm:text-2xl"
            style={{ animationDelay: "220ms" }}
          >
            Where thought
            <br className="sm:hidden" /> becomes <em className="not-italic text-aqua">couture.</em>
          </p>

          <p
            className="anim-fade-up mx-auto mt-6 max-w-2xl text-base leading-relaxed text-on-primary/85 sm:text-lg"
            style={{ animationDelay: "290ms" }}
          >
            EL ATELIER is a private atelier for couture intelligence. Describe a
            vision, and the maison returns a precise design brief and a full
            couture illustration — filed forever in your archive.
          </p>

          <div
            className="anim-fade-up mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap"
            style={{ animationDelay: "360ms" }}
          >
            <Link
              to={studioTarget}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-on-primary px-7 py-3.5 text-sm font-semibold text-primary shadow-lg shadow-primary/20 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.97]"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Enter the Studio
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              to="/atelier"
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-on-primary/50 px-7 py-3.5 text-sm font-semibold text-on-primary backdrop-blur-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-on-primary/10 active:scale-[0.97]"
            >
              Explore the Archive
            </Link>
            {webgl && (
              <Link
                to="/?view=3d"
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-on-primary/50 px-7 py-3.5 text-sm font-semibold text-on-primary backdrop-blur-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-on-primary/10 active:scale-[0.97]"
              >
                <Box className="h-4 w-4" aria-hidden="true" />
                Enter the Maison in 3D
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ---------- MODULES ---------- */}
      <section className="px-4 py-16 sm:px-6 sm:py-20" aria-labelledby="modules-heading">
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow text-secondary">The four modules</p>
          <h2
            id="modules-heading"
            className="font-heading mt-3 text-3xl font-medium text-primary sm:text-4xl"
          >
            An atelier in four acts
          </h2>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {MODULES.map((m, i) => (
              <article
                key={m.name}
                className={`card card-hover anim-fade-up p-6 ${m.color === "pink" ? "glow-pink" : m.color === "cyan" ? "glow-cyan" : m.color === "violet" ? "glow-violet" : "glow-green"}`}
                style={{ animationDelay: `${i * 90}ms` }}
              >
                <div className="flex items-center justify-between">
                  <span
                    aria-hidden="true"
                    className={`flex h-11 w-11 items-center justify-center rounded-full ${
                      m.color === "pink"
                        ? "bg-pink/10 text-pink"
                        : m.color === "cyan"
                          ? "bg-cyan/10 text-cyan"
                          : m.color === "violet"
                            ? "bg-violet/10 text-violet"
                            : "bg-green/10 text-green"
                    }`}
                  >
                    <m.icon className="h-5 w-5" />
                  </span>
                  <span className="font-heading text-2xl italic text-border">{m.n}</span>
                </div>
                <p
                  className={`eyebrow mt-6 ${
                    m.color === "pink"
                      ? "text-pink"
                      : m.color === "cyan"
                        ? "text-cyan"
                        : m.color === "violet"
                          ? "text-violet"
                          : "text-green"
                  }`}
                >
                  {m.tagline}
                </p>
                <h3 className="font-heading mt-1 text-xl font-semibold text-primary">
                  {m.name}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-secondary">{m.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- HOW IT WORKS ---------- */}
      <section className="px-4 py-16 sm:px-6 sm:py-20" aria-labelledby="process-heading">
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow text-secondary">The couture ritual</p>
          <h2
            id="process-heading"
            className="font-heading mt-3 text-3xl font-medium text-primary sm:text-4xl"
          >
            Three movements
          </h2>

          <ol className="mt-10 grid gap-5 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="card p-6">
                <span className="font-heading text-3xl italic text-flamingo">
                  0{i + 1}
                </span>
                <h3 className="font-heading mt-3 text-lg font-semibold text-primary">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-secondary">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- CTA BAND ---------- */}
      <section className="px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="relative overflow-hidden rounded-3xl">
            {/* Sea & sand backdrop — the same shore as the hero */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-0"
            >
              <div className="sea-gradient absolute inset-0" />
              <div className="sea-vignette absolute inset-0" />
              <VideoBackdrop />
              <div className="sea-texture absolute inset-0" />

              {/* Animated wave layers */}
              <svg
                className="sea-wave sea-wave--slow"
                viewBox="0 0 1200 120"
                preserveAspectRatio="none"
              >
                <path
                  d="M0 60 C 120 15 280 10 400 48 S 700 95 820 55 S 1100 12 1200 52 L 1200 120 L 0 120 Z"
                  fill="rgba(255,255,255,0.06)"
                />
              </svg>
              <svg
                className="sea-wave sea-wave--mid"
                viewBox="0 0 1200 120"
                preserveAspectRatio="none"
              >
                <path
                  d="M0 55 C 150 10 320 100 480 58 S 800 100 950 52 S 1120 12 1200 50 L 1200 120 L 0 120 Z"
                  fill="rgba(255,255,255,0.12)"
                />
              </svg>
              <svg
                className="sea-wave sea-wave--fast"
                viewBox="0 0 1200 120"
                preserveAspectRatio="none"
              >
                <path
                  d="M0 62 C 140 20 300 95 460 60 S 780 100 940 54 S 1120 14 1200 56 L 1200 120 L 0 120 Z"
                  fill="rgba(255,255,255,0.2)"
                />
              </svg>

              {/* Sea-sand shore */}
              <div className="sea-sand sea-sand--tall" />
            </div>

            {/* Content */}
            <div className="relative z-10 flex min-h-[420px] flex-col items-center justify-center px-8 py-16 text-center sm:px-16">
              <h2 className="font-heading text-3xl font-medium text-ivory sm:text-4xl">
                Your first look awaits.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-ivory/80 sm:text-base">
                Enter the studio, describe a vision, and let Pensamiento and
                COUTURE VISION begin their work.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  to={studioTarget}
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-on-primary px-6 py-3 text-sm font-semibold text-primary transition-all duration-200 ease-out hover:-translate-y-0.5 active:scale-[0.97]"
                >
                  Forge a design
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  to="/atelier"
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-ivory/40 px-6 py-3 text-sm font-semibold text-ivory transition-all duration-200 ease-out hover:bg-ivory/10 hover:-translate-y-0.5 active:scale-[0.97]"
                >
                  View the archive
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
