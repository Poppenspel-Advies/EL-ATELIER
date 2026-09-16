import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LayoutGrid } from "lucide-react";
import { useAuth } from "../lib/auth";
import { supportsWebGL } from "../lib/webgl";
import type { PortalDef } from "../lib/three/AtelierScene";

const MaisonCanvas = lazy(() => import("./MaisonCanvas"));

export const MAISON_PORTALS: PortalDef[] = [
  {
    id: "studio",
    label: "The Studio",
    sub: "Forge a piece · Found a maison",
    path: "/studio",
    color: "#F472B6",
    angle: 0.6,
    radius: 8,
    height: 2.5,
  },
  {
    id: "couture",
    label: "Couture Création",
    sub: "A masterpiece with a memory",
    path: "/couture",
    color: "#FB7185",
    angle: 2.15,
    radius: 8.6,
    height: 2.3,
  },
  {
    id: "dossier",
    label: "Atelier Dossier",
    sub: "Stories become creations",
    path: "/dossier",
    color: "#4ADE80",
    angle: 3.7,
    radius: 8.2,
    height: 2.5,
  },
  {
    id: "atelier",
    label: "The Archive",
    sub: "Every look, filed forever",
    path: "/atelier",
    color: "#A78BFA",
    angle: 5.3,
    radius: 8.8,
    height: 2.3,
  },
];

function MaisonLoader() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-[#0f0c09]">
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

/** Accessible 2D fallback when WebGL is unavailable. */
function MaisonFallback() {
  const navigate = useNavigate();
  return (
    <section className="min-h-[70vh] bg-[#0f0c09] px-6 py-20">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-[0.65rem] font-semibold tracking-[0.4em] text-accent uppercase">
          La Maison
        </p>
        <h1 className="font-heading mt-2 text-3xl font-semibold tracking-[0.18em] text-ivory">
          EL ATELIER
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-ivory/70">
          Your device cannot render the 3D maison. Enter any room from here —
          each door opens the same atelier.
        </p>
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {MAISON_PORTALS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => navigate(p.path)}
              className="maison-card cursor-pointer rounded-2xl border border-ivory/15 bg-black/30 px-5 py-4 text-left backdrop-blur-sm"
            >
              <span className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: p.color, boxShadow: `0 0 10px ${p.color}` }}
                />
                <span className="font-heading text-lg italic text-ivory">{p.label}</span>
              </span>
              <span className="mt-1 block pl-5 text-xs tracking-wide text-ivory/60">
                {p.sub}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function MaisonExperience() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const reducedMotion = useMemo(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  const webgl = useMemo(() => supportsWebGL(), []);
  const [hovered, setHovered] = useState<string | null>(null);
  const [entering, setEntering] = useState(false);
  const [leaving, setLeaving] = useState<string | null>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const t = window.setTimeout(() => setEntering(true), 40);
    return () => {
      document.body.style.overflow = "";
      document.body.style.cursor = "auto";
      window.clearTimeout(t);
    };
  }, []);

  const studioTarget = user ? "/studio" : "/auth?mode=signup";

  const handleEnterStudio = useCallback(() => {
    setLeaving("__studio");
    window.setTimeout(() => navigate(studioTarget), 480);
  }, [navigate, studioTarget]);

  const handleEnter = useCallback(
    (portal: PortalDef) => {
      setLeaving(portal.id);
      window.setTimeout(() => navigate(portal.path), 480);
    },
    [navigate],
  );

  if (!webgl) return <MaisonFallback />;

  const hoveredPortal = MAISON_PORTALS.find((p) => p.id === hovered) ?? null;
  const coreHovered = hovered === "__studio";

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#0f0c09]">
      <Suspense fallback={<MaisonLoader />}>
        <MaisonCanvas
          portals={MAISON_PORTALS}
          reducedMotion={reducedMotion}
          onHover={setHovered}
          onEnter={handleEnter}
          onEnterStudio={handleEnterStudio}
        />
      </Suspense>

      {/* Legibility vignette */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_40%,transparent_55%,rgba(0,0,0,0.55)_100%)]"
      />

      {/* HUD */}
      <div
        className={`pointer-events-none absolute inset-0 transition-opacity duration-700 ${
          entering ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Top bar */}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-5 sm:p-7">
          <div>
            <p className="text-[0.62rem] font-semibold tracking-[0.4em] text-accent uppercase">
              La Maison
            </p>
            <h1 className="font-heading mt-1 text-xl font-semibold tracking-[0.18em] text-ivory sm:text-2xl">
              EL ATELIER
            </h1>
          </div>
          <Link
            to="/?view=classic"
            className="pointer-events-auto inline-flex cursor-pointer items-center gap-2 rounded-full border border-ivory/25 px-4 py-2 text-xs font-semibold tracking-[0.12em] text-ivory uppercase backdrop-blur-sm transition-all duration-200 hover:border-ivory/60 hover:bg-ivory/10 active:scale-95"
          >
            <LayoutGrid className="h-4 w-4" aria-hidden="true" />
            Classic view
          </Link>
        </div>

        {/* Legend — keyboard/touch friendly way to enter rooms */}
        <div className="absolute bottom-24 left-5 hidden flex-col gap-2 sm:flex sm:bottom-8 sm:left-8">
          {MAISON_PORTALS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => handleEnter(p)}
              onMouseEnter={() => setHovered(p.id)}
              onMouseLeave={() => setHovered(null)}
              className="pointer-events-auto flex cursor-pointer items-center gap-3 rounded-full bg-black/30 px-4 py-2 text-left backdrop-blur-sm transition-all duration-200 hover:bg-black/50 active:scale-95"
            >
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: p.color, boxShadow: `0 0 10px ${p.color}` }}
              />
              <span className="text-xs font-medium tracking-[0.14em] text-ivory/90 uppercase">
                {p.label}
              </span>
            </button>
          ))}
        </div>

        {/* Bottom hint / hovered portal */}
        <div className="absolute inset-x-0 bottom-6 flex justify-center px-6 text-center sm:bottom-10">
          {hoveredPortal ? (
            <div className="anim-fade-in rounded-2xl border border-ivory/15 bg-black/45 px-6 py-3 backdrop-blur-md">
              <p className="font-heading text-lg italic text-ivory sm:text-xl">
                {hoveredPortal.label}
              </p>
              <p className="mt-0.5 text-xs tracking-wide text-ivory/70">
                {hoveredPortal.sub} — click to enter
              </p>
            </div>
          ) : coreHovered ? (
            <div className="anim-fade-in rounded-2xl border border-ivory/15 bg-black/45 px-6 py-3 backdrop-blur-md">
              <p className="font-heading text-lg italic text-ivory sm:text-xl">
                The Studio Door
              </p>
              <p className="mt-0.5 text-xs tracking-wide text-ivory/70">
                The heart of the maison — click to forge
              </p>
            </div>
          ) : (
            <p className="rounded-full bg-black/30 px-5 py-2 text-[0.7rem] font-medium tracking-[0.22em] text-ivory/70 uppercase backdrop-blur-sm">
              Drag to look around · Scroll to approach · Click a portal to enter
            </p>
          )}
        </div>
      </div>

      {/* Exit fade */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 bg-black transition-opacity duration-500 ${
          leaving ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
