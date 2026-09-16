import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  Check,
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
import { estimatePrice, formatUsd } from "../lib/booklet";
import type { DesignBrief } from "../lib/types";

type Phase = "idle" | "composing" | "rendering" | "done" | "error";

const OCCASIONS = ["Royal wedding", "Coronation", "State gala", "Opera première", "Private commission"];

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "bespoke";

/** ATELIER BESPOKE™ — the one-of-one commissioned couture creation. */
export default function BespokePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [client, setClient] = useState("");
  const [occasion, setOccasion] = useState<string | null>(null);
  const [vision, setVision] = useState("");
  const [museId, setMuseId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [brief, setBrief] = useState<DesignBrief | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const commission = useRef0();
  const busy = phase === "composing" || phase === "rendering" || saving;

  const chipClass = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 cursor-pointer ${
      active
        ? "border-primary bg-primary text-on-primary shadow-sm"
        : "border-border bg-on-primary text-secondary hover:border-primary/50 hover:text-primary"
    }`;

  const handleGenerate = async () => {
    if (!vision.trim() || busy) return;
    setError(null);
    setBrief(null);
    setImage(null);
    setPhase("composing");
    try {
      const composed = await generateBrief(
        [
          "ATELIER BESPOKE — a one-of-one commissioned couture creation.",
          `Commissioned by: ${client.trim() || "a private client"}.`,
          occasion ? `Occasion: ${occasion}.` : "",
          "The vision:",
          vision.trim(),
          "One-of-one, never to be repeated — the house's highest bespoke craft.",
          "Elegant and modest, fully and beautifully dressed, refined and dignified.",
        ]
          .filter(Boolean)
          .join(" "),
        museId,
      );
      setBrief(composed);
      setName(composed.name || "");
      setPhase("rendering");
      const rendered = await generateImage(composed.image_prompt, "illustration", museId);
      setImage(rendered);
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "The bespoke atelier couldn't complete that.");
      setPhase("error");
    }
  };

  const handleSave = async () => {
    if (!user || !brief || !image) return;
    if (!name.trim()) {
      setError("Please give the commission a name.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const bespokePremium = 25000;
      const price = estimatePrice(brief) + bespokePremium;
      const priceLabel = `${formatUsd(price)} (${formatUsd(estimatePrice(brief))} couture + ${formatUsd(bespokePremium)} one-of-one)`;
      const tags = ["ATELIER BESPOKE", "one-of-one", occasion ?? "", "commissioned"].filter((t): t is string => Boolean(t));
      const design = await saveDesign({
        userId: user.id,
        name: name.trim(),
        prompt: `ATELIER BESPOKE · ${client.trim() || "private client"} · ${vision.trim()}`,
        brief,
        imageBase64: image,
        collectionId: null,
      });
      await saveAsset({
        userId: user.id,
        kind: "collection",
        name: `ATELIER BESPOKE — ${brief.name}`,
        payload: {
          price_label: priceLabel,
          commission: `No. ${design.id.slice(0, 8).toUpperCase()}`,
          client: client.trim() || "private client",
          occasion: occasion ?? null,
          provenance: "One-of-one, cut and finished by hand in EL ATELIER.",
        },
        imageBase64: image,
        price,
        tags,
        designId: design.id,
      });
      navigate(`/dossier/${design.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't save this commission.");
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
        `atelier-bespoke-${slug(brief?.name ?? "commission")}-el-atelier.png`,
        brief?.name ?? "ATELIER BESPOKE",
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
            One-of-one commissioned couture
            <span aria-hidden="true" className="h-px w-8 bg-border" />
          </p>
          <h1 className="font-heading mt-3 text-3xl font-medium text-primary sm:text-5xl">
            ATELIER BESPOKE<span className="align-super text-lg text-accent">™</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-secondary sm:text-base">
            A single creation, commissioned once and never repeated — cut and
            finished by hand in EL ATELIER, with its commission number,
            provenance and price tag.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <section className="card p-6" aria-label="The commission">
            <label htmlFor="bespokeClient" className="label">
              The client
            </label>
            <input
              id="bespokeClient"
              className="input"
              placeholder="The client's name (optional)"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              disabled={busy}
            />

            <p className="label mt-6">The occasion</p>
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

            <label htmlFor="bespokeVision" className="label mt-6">
              The vision
            </label>
            <textarea
              id="bespokeVision"
              rows={4}
              className="input resize-y"
              placeholder="A coronation gown for an empress of the northern sea…"
              value={vision}
              onChange={(e) => setVision(e.target.value)}
              disabled={busy}
            />

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

            <button
              type="button"
              onClick={handleGenerate}
              disabled={!vision.trim() || busy}
              className="btn-primary mt-6 w-full text-base"
            >
              {busy ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : (
                <Wand2 className="h-5 w-5" aria-hidden="true" />
              )}
              {phase === "composing"
                ? "Pensamiento is composing the commission…"
                : phase === "rendering"
                  ? "COUTURE VISION is rendering…"
                  : "Commission the creation"}
            </button>

            {error && (
              <p role="alert" className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </p>
            )}
          </section>

          <section className="card flex min-h-[24rem] flex-col p-6" aria-label="The one-of-one">
            {phase === "idle" && (
              <div className="flex h-full min-h-[22rem] flex-col items-center justify-center text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gold/10 text-gold">
                  <BadgeCheck className="h-6 w-6" aria-hidden="true" />
                </span>
                <h2 className="font-heading mt-5 text-xl font-medium text-primary">
                  A creation, commissioned once
                </h2>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-secondary">
                  Write the vision and the maison forges the one-of-one, with
                  its commission number and price tag.
                </p>
              </div>
            )}

            {busy && !brief && (
              <div className="flex h-full min-h-[22rem] flex-col items-center justify-center text-center" role="status">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary">
                  <BadgeCheck className="h-6 w-6 anim-pulse-soft" aria-hidden="true" />
                </span>
                <h2 className="font-heading mt-6 text-xl font-medium text-primary">
                  {phase === "composing" ? "Pensamiento" : "COUTURE VISION"}
                </h2>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-secondary">
                  {phase === "composing" ? "Composing the one-of-one." : "Rendering the signed creation."}
                </p>
              </div>
            )}

            {phase === "done" && brief && (
              <div className="anim-fade-in flex flex-col gap-4">
                <div className="overflow-hidden rounded-2xl border border-border bg-on-primary">
                  {image ? (
                    <img
                      src={dataUrl(image)}
                      alt={`${brief.name} — ATELIER BESPOKE`}
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
                        {formatUsd(estimatePrice(brief) + 25000)}
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
                  <p className="label">File the one-of-one</p>
                  <label htmlFor="bespokeName" className="label">
                    Commission name
                  </label>
                  <input
                    id="bespokeName"
                    className="input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="The One-of-One"
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
                <h2 className="font-heading mt-5 text-xl font-medium text-primary">The bespoke atelier stumbled</h2>
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

/** Stable commission counter per session (no re-render churn). */
import { useRef } from "react";
function useRef0(): string {
  const ref = useRef<string | null>(null);
  if (ref.current === null) {
    ref.current = `B-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  }
  return ref.current;
}
