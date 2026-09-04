import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FolderPlus, ImageIcon, Layers, Loader2, Plus, Sparkles } from "lucide-react";
import { useAuth } from "../lib/auth";
import {
  createCollection,
  fetchCollections,
  fetchDesigns,
  getImageUrl,
} from "../lib/api";
import type { Collection, Design } from "../lib/types";

interface DesignWithUrl extends Design {
  imageUrl: string | null;
}

export default function ArchivePage() {
  const { user } = useAuth();
  const [designs, setDesigns] = useState<DesignWithUrl[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCollection, setActiveCollection] = useState<string>("all");
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const [ds, cols] = await Promise.all([
        fetchDesigns(user.id),
        fetchCollections(user.id),
      ]);
      const withUrls = await Promise.all(
        ds.map(async (d) => ({ ...d, imageUrl: await getImageUrl(d.image_path) }))
      );
      setDesigns(withUrls);
      setCollections(cols);
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't load your archive.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreateCollection = async () => {
    if (!user || !newCollectionName.trim()) return;
    setCreating(true);
    try {
      const col = await createCollection(user.id, newCollectionName.trim());
      setCollections((c) => [...c, col]);
      setActiveCollection(col.id);
      setNewCollectionName("");
      setShowNewCollection(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't create the collection.");
    } finally {
      setCreating(false);
    }
  };

  const visible = designs.filter(
    (d) => activeCollection === "all" || d.collection_id === activeCollection
  );

  const collectionName = (id: string | null) =>
    id ? collections.find((c) => c.id === id)?.name ?? "Unsorted" : "Unsorted";

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
          <span className="text-sm">Opening the archive…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="eyebrow text-secondary">The archive</p>
            <h1 className="font-heading mt-2 text-3xl font-medium text-primary sm:text-4xl">
              Your collections
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-secondary">
              Every look you forge is filed here, with its dossier intact.
            </p>
          </div>
          <button
            type="button"
            className="btn-secondary shrink-0"
            onClick={() => setShowNewCollection((v) => !v)}
            aria-expanded={showNewCollection}
          >
            <FolderPlus className="h-4 w-4" aria-hidden="true" />
            New collection
          </button>
        </div>

        {showNewCollection && (
          <div className="card mt-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <input
              className="input flex-1"
              placeholder="Collection name, e.g. Spring 2026"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateCollection();
              }}
            />
            <button
              type="button"
              onClick={handleCreateCollection}
              disabled={creating || !newCollectionName.trim()}
              className="btn-primary"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Plus className="h-4 w-4" aria-hidden="true" />
              )}
              Create
            </button>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-6 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}

        {/* Collection filter */}
        {collections.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            <button
              type="button"
              className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-all duration-200 cursor-pointer ${
                activeCollection === "all"
                  ? "border-primary bg-primary text-on-primary"
                  : "border-border bg-on-primary text-secondary hover:border-primary/50 hover:text-primary"
              }`}
              onClick={() => setActiveCollection("all")}
            >
              All ({designs.length})
            </button>
            {collections.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`rounded-full border px-4 py-1.5 text-xs font-medium transition-all duration-200 cursor-pointer ${
                  activeCollection === c.id
                    ? "border-primary bg-primary text-on-primary"
                    : "border-border bg-on-primary text-secondary hover:border-primary/50 hover:text-primary"
                }`}
                onClick={() => setActiveCollection(c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}

        {/* Grid */}
        {visible.length === 0 ? (
          <div className="card mt-10 flex flex-col items-center px-6 py-16 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-violet/10 text-violet">
              <Layers className="h-6 w-6" aria-hidden="true" />
            </span>
            <h2 className="font-heading mt-5 text-xl font-medium text-primary">
              {designs.length === 0
                ? "Your archive awaits its first look"
                : "This collection is empty"}
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-secondary">
              {designs.length === 0
                ? "Forge a design in the studio and it will be filed here with its full dossier."
                : "Forge a new design and file it into this collection."}
            </p>
            <Link to="/studio" className="btn-primary mt-6">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Enter the studio
            </Link>
          </div>
        ) : (
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((d) => (
              <li key={d.id}>
                <Link
                  to={`/dossier/${d.id}`}
                  className="card card-hover group block overflow-hidden p-0"
                >
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
                      {collectionName(d.collection_id)}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="font-heading text-lg font-semibold text-primary transition-colors duration-200 group-hover:text-accent">
                      {d.name}
                    </h3>
                    <p className="mt-1 text-xs text-secondary">
                      {d.brief?.silhouette ?? "Couture design"} · {formatDate(d.created_at)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
