import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Loader2,
  Pencil,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import {
  deleteDesign,
  fetchCollections,
  fetchDesign,
  getImageUrl,
  moveDesignToCollection,
  renameDesign,
} from "../lib/api";
import type { Collection, Design } from "../lib/types";

export default function DossierPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [design, setDesign] = useState<Design | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const d = await fetchDesign(id);
      if (!d) {
        setError("This design no longer exists.");
        setDesign(null);
        return;
      }
      setDesign(d);
      setNameDraft(d.name);
      setImageUrl(await getImageUrl(d.image_path));
      if (user) setCollections(await fetchCollections(user.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't load this dossier.");
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRename = async () => {
    if (!design || !nameDraft.trim() || nameDraft.trim() === design.name) {
      setEditingName(false);
      return;
    }
    setBusy(true);
    try {
      await renameDesign(design.id, nameDraft.trim());
      setDesign({ ...design, name: nameDraft.trim() });
      setEditingName(false);
      setNotice("Renamed.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't rename the design.");
    } finally {
      setBusy(false);
    }
  };

  const handleMove = async (collectionId: string) => {
    if (!design) return;
    setBusy(true);
    try {
      const next = collectionId || null;
      await moveDesignToCollection(design.id, next);
      setDesign({ ...design, collection_id: next });
      setNotice(next ? "Filed into collection." : "Moved to unsorted.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't move the design.");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!design) return;
    setBusy(true);
    try {
      await deleteDesign(design);
      navigate("/archive");
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't delete the design.");
      setBusy(false);
    }
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
          <span className="text-sm">Opening the dossier…</span>
        </div>
      </div>
    );
  }

  if (!design) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <h1 className="font-heading text-2xl font-medium text-primary">Dossier not found</h1>
        <p className="mt-2 max-w-sm text-sm text-secondary">{error}</p>
        <Link to="/archive" className="btn-secondary mt-6">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to the archive
        </Link>
      </div>
    );
  }

  const brief = design.brief;

  return (
    <div className="px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <Link
          to="/archive"
          className="inline-flex items-center gap-2 text-sm text-secondary transition-colors duration-200 hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to the archive
        </Link>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.05fr_1fr]">
          {/* ---------- IMAGE ---------- */}
          <div>
            <div className="overflow-hidden rounded-3xl border border-border bg-on-primary shadow-lg shadow-primary/5">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={`Illustration of ${design.name}`}
                  className="mx-auto aspect-[3/4] w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[3/4] w-full items-center justify-center text-border">
                  <p className="text-sm">Illustration unavailable</p>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link to="/studio" className="btn-secondary text-sm">
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Forge again
              </Link>
              {confirmDelete ? (
                <div className="flex items-center gap-2 rounded-full border border-destructive/40 bg-destructive/5 px-3 py-1.5">
                  <span className="text-xs font-medium text-destructive">Delete this design?</span>
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

          {/* ---------- BRIEF ---------- */}
          <div className="flex flex-col gap-6">
            <div>
              <p className="eyebrow text-secondary">Dossier · {formatDate(design.created_at)}</p>
              {editingName ? (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    className="input font-heading text-2xl font-semibold text-primary"
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleRename();
                      if (e.key === "Escape") {
                        setNameDraft(design.name);
                        setEditingName(false);
                      }
                    }}
                    autoFocus
                    aria-label="Design name"
                  />
                  <button
                    type="button"
                    onClick={handleRename}
                    disabled={busy}
                    className="btn-primary shrink-0 px-4"
                    aria-label="Save name"
                  >
                    <Check className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-3">
                  <h1 className="font-heading text-3xl font-medium text-primary sm:text-4xl">
                    {design.name}
                  </h1>
                  <button
                    type="button"
                    onClick={() => setEditingName(true)}
                    className="btn-ghost p-2"
                    aria-label="Rename design"
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              )}

              {notice && (
                <p role="status" className="mt-3 text-sm text-green">
                  {notice}
                </p>
              )}
              {error && (
                <p role="alert" className="mt-3 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {error}
                </p>
              )}
            </div>

            {brief && (
              <>
                <section className="card p-6" aria-label="Design brief">
                  <h2 className="eyebrow text-secondary">The brief</h2>
                  <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
                    <div>
                      <dt className="font-medium tracking-wide text-secondary/70 uppercase text-xs">
                        Silhouette
                      </dt>
                      <dd className="mt-1 font-medium text-primary">{brief.silhouette}</dd>
                    </div>
                    <div>
                      <dt className="font-medium tracking-wide text-secondary/70 uppercase text-xs">
                        Fabric
                      </dt>
                      <dd className="mt-1 font-medium text-primary">{brief.fabric}</dd>
                    </div>
                    <div>
                      <dt className="font-medium tracking-wide text-secondary/70 uppercase text-xs">
                        Occasion
                      </dt>
                      <dd className="mt-1 font-medium text-primary">{brief.occasion}</dd>
                    </div>
                    <div>
                      <dt className="font-medium tracking-wide text-secondary/70 uppercase text-xs">
                        Mood
                      </dt>
                      <dd className="mt-1 font-medium text-primary">{brief.mood}</dd>
                    </div>
                  </dl>

                  {brief.palette.length > 0 && (
                    <div className="mt-5">
                      <dt className="font-medium tracking-wide text-secondary/70 uppercase text-xs">
                        Palette
                      </dt>
                      <dd className="mt-2 flex flex-wrap items-center gap-2">
                        {brief.palette.map((hex) => (
                          <span
                            key={hex}
                            title={hex}
                            className="h-7 w-7 rounded-full border border-black/10"
                            style={{ backgroundColor: hex }}
                          />
                        ))}
                      </dd>
                    </div>
                  )}

                  {brief.styling_notes && (
                    <div className="mt-5">
                      <dt className="font-medium tracking-wide text-secondary/70 uppercase text-xs">
                        Styling notes
                      </dt>
                      <dd className="mt-1 text-sm leading-relaxed text-secondary">
                        {brief.styling_notes}
                      </dd>
                    </div>
                  )}

                  {brief.collection_notes && (
                    <div className="mt-5">
                      <dt className="font-medium tracking-wide text-secondary/70 uppercase text-xs">
                        Collection notes
                      </dt>
                      <dd className="mt-1 text-sm leading-relaxed text-secondary">
                        {brief.collection_notes}
                      </dd>
                    </div>
                  )}

                  {brief.model_type && (
                    <div className="mt-5">
                      <dt className="font-medium tracking-wide text-secondary/70 uppercase text-xs">
                        Model
                      </dt>
                      <dd className="mt-1 text-sm text-secondary">{brief.model_type}</dd>
                    </div>
                  )}
                </section>

                <section className="card p-6" aria-label="Original vision">
                  <h2 className="eyebrow text-secondary">Original vision</h2>
                  <p className="mt-3 text-sm leading-relaxed text-secondary">{design.prompt}</p>
                </section>

                <section className="card p-6" aria-label="Collection">
                  <h2 className="eyebrow text-secondary">Collection</h2>
                  <div className="mt-3">
                    <select
                      className="input cursor-pointer"
                      value={design.collection_id ?? ""}
                      onChange={(e) => handleMove(e.target.value)}
                      disabled={busy}
                      aria-label="Move design to collection"
                    >
                      <option value="">Unsorted</option>
                      {collections.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </section>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
