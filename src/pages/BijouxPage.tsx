import { useEffect, useRef, useState } from "react";
import {
  Download,
  FileText,
  Film,
  Gem,
  ImagePlus,
  Loader2,
  Mic,
  Square,
  Trash2,
  Video,
  Wand2,
} from "lucide-react";
import {
  CREATIVE_DIRECTOR,
  dataUrl,
  generateBijouxKit,
  generateImage,
  MUSES,
} from "../lib/gemini";
import {
  audioToWav,
  compressImageFile,
  extractVideoFrames,
} from "../lib/media";
import {
  downloadBrandedImage,
  downloadContactSheet,
  exportFilm,
  exportPdf,
} from "../lib/export";
import type { BijouxItem, BijouxKit, MediaInput } from "../lib/types";

type Phase = "idle" | "composing" | "rendering" | "done" | "error";

interface MediaRef {
  input: MediaInput;
  label: string;
  preview?: string;
}

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "") || "bijoux";

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
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
}

/**
 * COUTURE BIJOUX™ — the jewellery that completes the creation.
 * Feed the atelier a prompt, images, a voice note or a video, and it
 * designs the matching jewellery suite + innovative shoes, ready to
 * export as branded images, a PDF dossier or a film.
 */
export default function BijouxPage() {
  const [prompt, setPrompt] = useState("");
  const [museId, setMuseId] = useState<string | null>(null);
  const [media, setMedia] = useState<MediaRef[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [kit, setKit] = useState<BijouxKit | null>(null);
  const [images, setImages] = useState<Record<string, string | null>>({});
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [filter, setFilter] = useState<"all" | "bijoux" | "shoes" | "accessories">("all");
  const [exporting, setExporting] = useState<string | null>(null);
  const [filmProgress, setFilmProgress] = useState<number | null>(null);

  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const busy = phase === "composing" || phase === "rendering" || exporting !== null;

  const canGenerate = prompt.trim().length >= 3 || media.length > 0;

  const chipClass = (active: boolean) =>
    `rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-200 cursor-pointer ${
      active
        ? "border-primary bg-primary text-on-primary shadow-sm"
        : "border-border bg-on-primary text-secondary hover:border-primary/50 hover:text-primary"
    }`;

  const addFiles = async (files: FileList | null, kind: "image" | "video") => {
    if (!files) return;
    setError(null);
    try {
      const added: MediaRef[] = [];
      for (const file of Array.from(files)) {
        if (kind === "image") {
          const input = await compressImageFile(file);
          added.push({
            input,
            label: file.name.slice(0, 24),
            preview: `data:image/jpeg;base64,${input.data}`,
          });
        } else {
          const frames = await extractVideoFrames(file, 5);
          for (const f of frames) {
            added.push({
              input: f,
              label: `${file.name.slice(0, 18)} · frame`,
              preview: `data:image/jpeg;base64,${f.data}`,
            });
          }
        }
      }
      setMedia((m) => [...m, ...added].slice(0, 9));
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't read that file.");
    }
  };

  const toggleRecording = async () => {
    if (recording) {
      recorderRef.current?.stop();
      setRecording(false);
      return;
    }
    setError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Voice capture isn't supported in this browser.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        try {
          const blob = new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" });
          const wav = await audioToWav(blob);
          setMedia((m) =>
            [...m, { input: wav, label: "Voice note", preview: undefined }].slice(0, 9),
          );
        } catch {
          setError("We couldn't read that voice note — please try recording again.");
        }
      };
      rec.start();
      recorderRef.current = rec;
      setRecording(true);
    } catch {
      setError("Microphone access was denied — text, images and video still work.");
    }
  };

  const handleGenerate = async () => {
    if (!canGenerate || busy) return;
    setError(null);
    setKit(null);
    setImages({});
    setPhase("composing");
    try {
      const composed = await generateBijouxKit(
        prompt.trim(),
        media.map((m) => m.input),
        museId,
      );
      setKit(composed);

      setPhase("rendering");
      setProgress({ done: 0, total: composed.items.length });
      const rendered: Record<string, string | null> = {};
      let done = 0;
      await mapLimit(composed.items, 2, async (item) => {
        rendered[item.id] = await generateImage(
          item.image_prompt,
          item.id === "shoes" ? "shoe" : "bijoux",
          museId,
        ).catch(() => null);
        done += 1;
        setProgress({ done, total: composed.items.length });
      });
      setImages(rendered);
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "The bijoux atelier couldn't complete that.");
      setPhase("error");
    }
  };

  const visibleItems = (kit?.items ?? []).filter((it) => {
    if (filter === "all") return true;
    if (filter === "shoes") return it.id === "shoes";
    if (filter === "accessories") return it.id === "bag" || it.id === "tiara";
    return it.id !== "shoes" && it.id !== "bag" && it.id !== "tiara";
  });

  const exportBase = `couture-bijoux-${slug(kit?.items[0]?.name ?? "suite")}`;

  const handleItemImage = async (item: BijouxItem) => {
    const b64 = images[item.id];
    if (!b64) return;
    setExporting(item.id);
    try {
      await downloadBrandedImage(dataUrl(b64), `${slug(item.name)}-el-atelier.png`, item.name);
    } catch {
      setError("We couldn't export that image.");
    } finally {
      setExporting(null);
    }
  };

  const handleContactSheet = async () => {
    const items = (kit?.items ?? []).filter((it) => images[it.id]);
    if (!items.length) return;
    setExporting("sheet");
    try {
      await downloadContactSheet(
        items.map((it) => ({ dataUrl: dataUrl(images[it.id]!), caption: it.name })),
        `${exportBase}-el-atelier.png`,
        "COUTURE BIJOUX",
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
        title: "COUTURE BIJOUX™",
        subtitle: kit.concept,
        metaLines: [
          kit.inspiration,
          `Signed — ${CREATIVE_DIRECTOR.name}, ${CREATIVE_DIRECTOR.title}`,
          `EL ATELIER · ${new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}`,
        ],
        images: kit.items
          .filter((it) => images[it.id])
          .map((it) => ({ dataUrl: dataUrl(images[it.id]!), caption: it.name })),
        sections: kit.items.map((it) => ({
          heading: `${it.kind} — ${it.name}`,
          body: [
            `Materials: ${it.material}`,
            `Craftsmanship: ${it.craftsmanship}`,
            `Styling: ${it.styling}`,
          ].join("\n"),
        })),
        filename: `${exportBase}-el-atelier.pdf`,
      });
    } catch {
      setError("We couldn't export the PDF dossier.");
    } finally {
      setExporting(null);
    }
  };

  const handleFilm = async () => {
    const items = (kit?.items ?? []).filter((it) => images[it.id]);
    if (!items.length) return;
    setExporting("film");
    setFilmProgress(0);
    try {
      await exportFilm({
        title: "COUTURE BIJOUX",
        frames: items.map((it) => ({ dataUrl: dataUrl(images[it.id]!), caption: it.name })),
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
            The jewellery that completes the creation
            <span aria-hidden="true" className="h-px w-8 bg-border" />
          </p>
          <h1 className="font-heading mt-3 text-3xl font-medium text-primary sm:text-5xl">
            COUTURE BIJOUX<span className="align-super text-lg text-accent">™</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-secondary sm:text-base">
            Every creation deserves its jewels. Describe a piece — or hand the
            atelier a moodboard, a voice note or a film — and the Creative
            Director designs the matching jewellery suite, shoes and accessories
            that complete it.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {/* ---------- THE VISION ---------- */}
          <section className="card p-6" aria-label="The vision">
            <label htmlFor="bijouxPrompt" className="label">
              The creation / the vision
            </label>
            <textarea
              id="bijouxPrompt"
              rows={4}
              className="input resize-y"
              placeholder="A midnight velvet gown embroidered with falling stars, worn to a winter premiere…"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={busy}
            />

            <p className="label mt-6">References — images, video or your voice</p>
            <div className="flex flex-wrap gap-2">
              <label
                className={`inline-flex items-center gap-2 rounded-full border border-border bg-on-primary px-3.5 py-1.5 text-xs font-medium text-secondary transition-all duration-200 hover:border-primary/50 hover:text-primary cursor-pointer ${
                  busy ? "pointer-events-none opacity-50" : ""
                }`}
              >
                <ImagePlus className="h-3.5 w-3.5" aria-hidden="true" />
                Add images
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="sr-only"
                  disabled={busy}
                  onChange={(e) => {
                    void addFiles(e.target.files, "image");
                    e.target.value = "";
                  }}
                />
              </label>
              <label
                className={`inline-flex items-center gap-2 rounded-full border border-border bg-on-primary px-3.5 py-1.5 text-xs font-medium text-secondary transition-all duration-200 hover:border-primary/50 hover:text-primary cursor-pointer ${
                  busy ? "pointer-events-none opacity-50" : ""
                }`}
              >
                <Video className="h-3.5 w-3.5" aria-hidden="true" />
                Add video
                <input
                  type="file"
                  accept="video/*"
                  className="sr-only"
                  disabled={busy}
                  onChange={(e) => {
                    void addFiles(e.target.files, "video");
                    e.target.value = "";
                  }}
                />
              </label>
              <button
                type="button"
                onClick={toggleRecording}
                disabled={busy}
                className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all duration-200 cursor-pointer ${
                  recording
                    ? "border-destructive bg-destructive text-on-primary"
                    : "border-border bg-on-primary text-secondary hover:border-primary/50 hover:text-primary"
                }`}
              >
                {recording ? (
                  <>
                    <Square className="h-3 w-3 fill-current" aria-hidden="true" />
                    Stop — recording
                  </>
                ) : (
                  <>
                    <Mic className="h-3.5 w-3.5" aria-hidden="true" />
                    Record a voice note
                  </>
                )}
              </button>
            </div>

            {media.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2" aria-label="References">
                {media.map((m, i) => (
                  <li
                    key={`${m.label}-${i}`}
                    className="flex items-center gap-2 rounded-full border border-border bg-on-primary py-1 pl-1 pr-2 text-xs text-secondary"
                  >
                    {m.preview ? (
                      <img
                        src={m.preview}
                        alt=""
                        className="h-6 w-6 rounded-full border border-border object-cover"
                      />
                    ) : (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-primary">
                        <Mic className="h-3 w-3" aria-hidden="true" />
                      </span>
                    )}
                    <span className="max-w-[8rem] truncate">{m.label}</span>
                    <button
                      type="button"
                      onClick={() => setMedia((all) => all.filter((_, j) => j !== i))}
                      disabled={busy}
                      aria-label={`Remove ${m.label}`}
                      className="rounded-full p-0.5 text-secondary transition-colors duration-200 hover:text-destructive cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

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
              disabled={!canGenerate || busy}
              className="btn-primary mt-6 w-full text-base"
            >
              {busy ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : (
                <Wand2 className="h-5 w-5" aria-hidden="true" />
              )}
              {phase === "composing"
                ? "The Director is designing the suite…"
                : phase === "rendering"
                  ? `COUTURE VISION is rendering ${progress.done}/${progress.total}…`
                  : "Design the bijoux suite"}
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

          {/* ---------- THE SUITE ---------- */}
          <section className="card flex min-h-[24rem] flex-col p-6" aria-label="The suite">
            {phase === "idle" && (
              <div className="flex h-full min-h-[20rem] flex-col items-center justify-center text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gold/10 text-gold">
                  <Gem className="h-6 w-6" aria-hidden="true" />
                </span>
                <h2 className="font-heading mt-5 text-xl font-medium text-primary">
                  The jewellery that completes the creation
                </h2>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-secondary">
                  A necklace, earrings, a bracelet, a ring, an evening bag, a
                  tiara and innovative shoes — one family, designed around
                  your vision.
                </p>
              </div>
            )}

            {busy && !kit && (
              <div
                className="flex h-full min-h-[20rem] flex-col items-center justify-center text-center"
                role="status"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-on-primary">
                  <Gem className="h-6 w-6 anim-pulse-soft" aria-hidden="true" />
                </span>
                <h2 className="font-heading mt-6 text-xl font-medium text-primary">
                  {phase === "composing" ? "Elianne Vérin" : "COUTURE VISION"}
                </h2>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-secondary">
                  {phase === "composing"
                    ? "The Creative Director is studying your vision — and your references — to design the complete suite."
                    : "Rendering the jewellery and the shoes."}
                </p>
              </div>
            )}

            {phase === "done" && kit && (
              <div className="anim-fade-in flex flex-col gap-5">
                <div className="rounded-2xl border border-gold/40 bg-gradient-to-br from-gold/10 via-on-primary to-on-primary p-5">
                  <div className="flex items-center gap-2">
                    <Gem className="h-4 w-4 text-gold" aria-hidden="true" />
                    <h3 className="font-heading text-sm font-semibold tracking-wide text-primary uppercase">
                      The concept
                    </h3>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-secondary">{kit.concept}</p>
                  {kit.inspiration && (
                    <p className="mt-3 text-xs leading-relaxed text-secondary italic">
                      <span className="font-semibold text-primary not-italic">Inspired by · </span>
                      {kit.inspiration}
                    </p>
                  )}
                  {kit.director_note && (
                    <p className="mt-4 border-t border-gold/20 pt-3 text-xs leading-relaxed text-secondary italic">
                      “{kit.director_note}”
                      <span className="mt-1 block font-medium text-primary not-italic">
                        — {CREATIVE_DIRECTOR.name}, {CREATIVE_DIRECTOR.title}
                      </span>
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {(
                    [
                      { id: "all", label: "The whole suite" },
                      { id: "bijoux", label: "Bijoux" },
                      { id: "shoes", label: "Shoes" },
                      { id: "accessories", label: "Accessories" },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFilter(f.id)}
                      className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 cursor-pointer ${
                        filter === f.id
                          ? "bg-primary text-on-primary"
                          : "text-secondary hover:bg-muted hover:text-primary"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                <ul className="grid gap-4 sm:grid-cols-2">
                  {visibleItems.map((item) => {
                    const b64 = images[item.id];
                    return (
                      <li key={item.id} className="overflow-hidden rounded-2xl border border-border bg-on-primary">
                        <div className="relative aspect-square overflow-hidden bg-muted">
                          {b64 ? (
                            <img
                              src={dataUrl(b64)}
                              alt={`${item.name} — ${item.kind}`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-border">
                              <Gem className="h-8 w-8" aria-hidden="true" />
                            </div>
                          )}
                          {b64 && (
                            <button
                              type="button"
                              onClick={() => handleItemImage(item)}
                              disabled={exporting !== null}
                              className="absolute right-2 top-2 inline-flex items-center gap-1.5 rounded-full bg-on-primary/85 px-3 py-1.5 text-xs font-semibold text-primary backdrop-blur-sm transition-all duration-200 hover:bg-on-primary cursor-pointer active:scale-95"
                            >
                              <Download className="h-3.5 w-3.5" aria-hidden="true" />
                              {exporting === item.id ? "Exporting…" : "Image"}
                            </button>
                          )}
                        </div>
                        <div className="p-4">
                          <p className="text-[0.65rem] font-medium tracking-wide text-gold uppercase">
                            {item.kind}
                          </p>
                          <h3 className="font-heading mt-1 text-lg font-semibold text-primary">
                            {item.name}
                          </h3>
                          {item.palette.length > 0 && (
                            <div className="mt-2 flex items-center gap-1.5">
                              {item.palette.map((hex) => (
                                <span
                                  key={hex}
                                  title={hex}
                                  className="h-4 w-4 rounded-full border border-black/10"
                                  style={{ backgroundColor: hex }}
                                />
                              ))}
                            </div>
                          )}
                          <p className="mt-2 text-xs leading-relaxed text-secondary">
                            <span className="font-semibold text-primary">Materials · </span>
                            {item.material}
                          </p>
                          {item.craftsmanship && (
                            <p className="mt-1.5 text-xs leading-relaxed text-secondary">
                              <span className="font-semibold text-primary">Savoir-faire · </span>
                              {item.craftsmanship}
                            </p>
                          )}
                          {item.styling && (
                            <p className="mt-1.5 text-xs leading-relaxed text-secondary italic">
                              {item.styling}
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <div className="rounded-2xl border border-border bg-on-primary p-4">
                  <p className="label">Take it with you — every export carries the maison mark</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleContactSheet}
                      disabled={exporting !== null}
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
                      disabled={exporting !== null}
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
                        : "Film the suite"}
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
              </div>
            )}

            {phase === "error" && (
              <div className="flex h-full min-h-[20rem] flex-col items-center justify-center text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                  <Gem className="h-5 w-5" aria-hidden="true" />
                </span>
                <h2 className="font-heading mt-5 text-xl font-medium text-primary">
                  The bijoux atelier stumbled
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
