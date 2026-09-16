import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Globe2,
  ImageIcon,
  Loader2,
  Music2,
  PencilLine,
  Save,
  Sparkles,
  Shirt,
  Theater,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { createCollection, fetchCollections, saveAsset, saveDesign } from "../lib/api";
import {
  dataUrl,
  generatePieceVisuals,
  generateSong,
  SONG_LANGUAGES,
  TRANSFORM_CITIES,
  TRANSFORM_DANCES,
  TRANSFORM_DIRECTIONS,
  TRANSFORM_GARMENTS,
  transformCreation,
} from "../lib/gemini";
import type {
  Collection,
  DesignBrief,
  SongKit,
  SongLanguageId,
} from "../lib/types";

interface Props {
  sourceBrief: DesignBrief;
  sourcePrompt: string;
  museId?: string | null;
}

type Phase = "idle" | "composing" | "rendering" | "done" | "error";

/**
 * The Transformation menu — re-imagine an existing creation for a new
 * city, garment type and artistic direction, then save the result to the
 * archive. Used on studio results and saved dossiers.
 */
export default function TransformationPanel({
  sourceBrief,
  sourcePrompt,
  museId,
}: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [cityId, setCityId] = useState<string>("");
  const [garmentId, setGarmentId] = useState<string>("");
  const [directionId, setDirectionId] = useState<string>("");
  const [danceId, setDanceId] = useState<string>("");

  // Optional songs & music — compose a song for the transformed creation.
  const [songLang, setSongLang] = useState<SongLanguageId>("es");
  const [song, setSong] = useState<SongKit | null>(null);
  const [composingSong, setComposingSong] = useState(false);
  const [songError, setSongError] = useState<string | null>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [brief, setBrief] = useState<DesignBrief | null>(null);
  const [visuals, setVisuals] = useState<{
    illustration: string | null;
    sketch: string | null;
  } | null>(null);
  const [view, setView] = useState<"illustration" | "sketch">("illustration");

  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionId, setCollectionId] = useState<string>("");
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

  const busy = phase === "composing" || phase === "rendering" || saving || composingSong;
  const ready = cityId && garmentId && directionId;

  const city = TRANSFORM_CITIES.find((c) => c.id === cityId);
  const garment = TRANSFORM_GARMENTS.find((g) => g.id === garmentId);
  const direction = TRANSFORM_DIRECTIONS.find((d) => d.id === directionId);
  const dance = TRANSFORM_DANCES.find((d) => d.id === danceId);

  const chipClass = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 cursor-pointer ${
      active
        ? "border-primary bg-primary text-on-primary shadow-sm"
        : "border-border bg-on-primary text-secondary hover:border-primary/50 hover:text-primary"
    }`;

  const handleTransform = async () => {
    if (!ready || busy) return;
    setError(null);
    setPhase("composing");
    try {
      const composed = await transformCreation(
        sourceBrief,
        { city: cityId, garment: garmentId, direction: directionId },
        museId,
        danceId || null,
      );
      setBrief(composed);
      setName(composed.name || "");
      setPhase("rendering");
      const rendered = await generatePieceVisuals(composed, museId);
      setVisuals(rendered);
      setView(rendered.illustration ? "illustration" : "sketch");
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "The atelier couldn't transform this creation.");
      setPhase("error");
    }
  };

  const handleComposeSong = async () => {
    if (composingSong || !sourceBrief) return;
    setComposingSong(true);
    setSongError(null);
    try {
      const composed = await generateSong(
        [
          "Compose a song for this couture creation:",
          sourceBrief.name,
          `Silhouette: ${sourceBrief.silhouette} · Fabric: ${sourceBrief.fabric}`,
          `Mood: ${sourceBrief.mood}`,
          city ? `Transplanted to ${city.label}.` : "",
        ]
          .filter(Boolean)
          .join(" "),
        songLang,
      );
      setSong(composed);
    } catch (e) {
      setSongError(
        e instanceof Error ? e.message : "The atelier couldn't compose that song.",
      );
    } finally {
      setComposingSong(false);
    }
  };

  const handleSave = async () => {
    if (!user || !brief || !visuals?.illustration) return;
    if (!name.trim()) {
      setError("Please give the transformed design a name.");
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
        prompt: [
          "Transformed from:",
          sourceBrief.name,
          `City: ${city?.label ?? cityId}`,
          `Garment: ${garment?.label ?? garmentId}`,
          `Direction: ${direction?.label ?? directionId}`,
          dance ? `Spanish dance: ${dance.label} (${dance.region})` : "",
          sourcePrompt,
        ]
          .filter(Boolean)
          .join(" · "),
        brief,
        imageBase64: visuals.illustration,
        collectionId: targetCollectionId,
      });
      if (song) {
        await saveAsset({
          userId: user.id,
          kind: "song",
          name: song.title,
          payload: song as unknown as Record<string, unknown>,
          collectionId: targetCollectionId,
          designId: design.id,
          tags: ["song", "music", city?.label, garment?.label].filter(
            (t): t is string => Boolean(t),
          ),
        });
      }
      navigate(`/dossier/${design.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't save this transformed design.");
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

  return (
    <section className="rounded-2xl border border-border bg-on-primary p-5">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan/10 text-cyan">
          <Globe2 className="h-4.5 w-4.5" aria-hidden="true" />
        </span>
        <div>
          <h3 className="font-heading text-base font-semibold text-primary">
            Transformation
          </h3>
          <p className="text-xs text-secondary">
            Transplant “{sourceBrief.name}” into a new city, garment and direction.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div>
          <p className="label">City</p>
          <div className="flex flex-wrap gap-1.5">
            {TRANSFORM_CITIES.map((c) => (
              <button
                key={c.id}
                type="button"
                className={chipClass(cityId === c.id)}
                onClick={() => setCityId(cityId === c.id ? "" : c.id)}
                disabled={busy}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="label">Garment</p>
          <div className="flex flex-wrap gap-1.5">
            {TRANSFORM_GARMENTS.map((g) => (
              <button
                key={g.id}
                type="button"
                className={chipClass(garmentId === g.id)}
                onClick={() => setGarmentId(garmentId === g.id ? "" : g.id)}
                disabled={busy}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="label">Artistic direction</p>
          <div className="flex flex-wrap gap-1.5">
            {TRANSFORM_DIRECTIONS.map((d) => (
              <button
                key={d.id}
                type="button"
                className={chipClass(directionId === d.id)}
                onClick={() => setDirectionId(directionId === d.id ? "" : d.id)}
                disabled={busy}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <p className="label">
          Spanish dance <span className="text-secondary/60">— optional</span>
        </p>
        <div className="flex flex-wrap gap-1.5">
          {TRANSFORM_DANCES.map((d) => (
            <button
              key={d.id}
              type="button"
              title={d.region}
              className={chipClass(danceId === d.id)}
              onClick={() => setDanceId(danceId === d.id ? "" : d.id)}
              disabled={busy}
            >
              {d.label}
            </button>
          ))}
        </div>
        {dance && (
          <p className="mt-2 text-xs text-secondary">
            {dance.label} · {dance.region}
          </p>
        )}
      </div>

      <div className="mt-4">
        <p className="label">
          Songs & music <span className="text-secondary/60">— optional</span>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={songLang}
            onChange={(e) => setSongLang(e.target.value as SongLanguageId)}
            aria-label="Song language"
            className="input w-auto cursor-pointer"
            disabled={busy}
          >
            {SONG_LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleComposeSong}
            disabled={busy}
            className="btn-secondary text-xs"
          >
            {composingSong ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Music2 className="h-4 w-4" aria-hidden="true" />
            )}
            {composingSong
              ? "Composing…"
              : song
                ? "Compose another song"
                : "Compose a song"}
          </button>
        </div>
        {songError && (
          <p role="alert" className="mt-2 text-xs text-destructive">
            {songError}
          </p>
        )}
        {song && (
          <div className="mt-3 rounded-xl border border-gold/40 bg-gold/5 p-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Music2 className="h-4 w-4 text-gold" aria-hidden="true" />
              {song.title}
              <span className="text-[0.65rem] font-normal text-secondary">
                {song.style} · {song.tempo} · {song.language_label}
              </span>
            </p>
            <p className="mt-2 line-clamp-3 whitespace-pre-line text-xs leading-relaxed text-secondary">
              {song.lyrics.join("\n")}
            </p>
            <p className="mt-1 text-[0.65rem] text-secondary/70">
              The song is filed in the collection when you save the transformation.
            </p>
          </div>
        )}
      </div>

      {!busy && (
        <button
          type="button"
          onClick={handleTransform}
          disabled={!ready}
          className="btn-primary mt-5 w-full"
        >
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
          Transform
        </button>
      )}

      {busy && phase !== "done" && (
        <div
          className="mt-5 flex items-center justify-center gap-3 rounded-xl bg-muted px-4 py-4 text-sm text-secondary"
          role="status"
        >
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {phase === "composing"
            ? "Pensamiento is re-imagining the creation…"
            : "COUTURE VISION is rendering the transformed design…"}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {phase === "done" && brief && visuals && (
        <div className="anim-fade-in mt-5 grid gap-4 sm:grid-cols-[0.9fr_1fr]">
          {/* Transformed image */}
          <div className="overflow-hidden rounded-xl border border-border bg-on-primary">
            {imgSrc ? (
              <img
                src={imgSrc}
                alt={
                  view === "illustration"
                    ? `Illustration of ${brief.name}`
                    : `Design drawing of ${brief.name}`
                }
                className="mx-auto max-h-[22rem] w-auto object-contain"
              />
            ) : (
              <div className="flex aspect-[3/4] items-center justify-center text-secondary">
                The transformed imagery could not be rendered.
              </div>
            )}
            {visuals.illustration && visuals.sketch && (
              <div className="flex items-center justify-center gap-2 border-t border-border p-2">
                {(
                  [
                    { id: "illustration", label: "Illustration", icon: ImageIcon },
                    { id: "sketch", label: "Drawing", icon: PencilLine },
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

          {/* Result + save */}
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-border bg-on-primary p-4">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green" aria-hidden="true" />
                <h4 className="font-heading text-lg font-semibold text-primary">
                  {brief.name}
                </h4>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div>
                  <dt className="font-medium tracking-wide text-secondary/70 uppercase">
                    Silhouette
                  </dt>
                  <dd className="mt-0.5 font-medium text-primary">{brief.silhouette}</dd>
                </div>
                <div>
                  <dt className="font-medium tracking-wide text-secondary/70 uppercase">
                    Fabric
                  </dt>
                  <dd className="mt-0.5 font-medium text-primary">{brief.fabric}</dd>
                </div>
                <div>
                  <dt className="font-medium tracking-wide text-secondary/70 uppercase">
                    Occasion
                  </dt>
                  <dd className="mt-0.5 font-medium text-primary">{brief.occasion}</dd>
                </div>
                <div>
                  <dt className="font-medium tracking-wide text-secondary/70 uppercase">
                    Mood
                  </dt>
                  <dd className="mt-0.5 font-medium text-primary">{brief.mood}</dd>
                </div>
              </dl>
              {brief.innovation && (
                <p className="mt-3 text-xs leading-relaxed text-secondary">
                  <span className="font-semibold text-primary">Innovation · </span>
                  {brief.innovation}
                </p>
              )}
              {brief.variation && (
                <p className="mt-2 text-xs leading-relaxed text-secondary">
                  <span className="font-semibold text-primary">Variation · </span>
                  {brief.variation}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-border bg-on-primary p-4">
              <p className="label">Save the transformation</p>
              <label htmlFor="transformName" className="label">
                Design name
              </label>
              <input
                id="transformName"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Solstice Gown — Zürich"
              />
              <label htmlFor="transformCollection" className="label mt-3">
                Collection
              </label>
              <div className="flex gap-2">
                <select
                  id="transformCollection"
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
                  <Shirt className="h-4 w-4" aria-hidden="true" />
                  New
                </button>
              </div>
              {showNewCollection && (
                <input
                  className="input mt-2"
                  placeholder="Collection name, e.g. Paris → Swiss"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                />
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !visuals.illustration}
                className="btn-primary mt-3 w-full"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Save className="h-4 w-4" aria-hidden="true" />
                )}
                {saving ? "Filing…" : "Save to archive"}
              </button>
            </div>
          </div>
        </div>
      )}

      {phase === "error" && !busy && (
        <button type="button" onClick={handleTransform} className="btn-secondary mt-4 w-full">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Try again
        </button>
      )}

      {phase === "idle" && (
        <p className="mt-4 flex items-center gap-2 text-xs text-secondary">
          <Theater className="h-3.5 w-3.5" aria-hidden="true" />
          Pick a city, garment and direction, then transform.
        </p>
      )}
    </section>
  );
}
