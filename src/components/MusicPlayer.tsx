import { useEffect, useRef, useState } from "react";
import { AudioLines, Music2, Pause, Play, Volume2, X } from "lucide-react";
import { MUSIC_KINDS, musicKindById } from "../lib/export";
import { useMusic } from "../lib/sound";

/**
 * The music of the maison — a floating player in the corner of the house.
 * Play any of the atelier's soundtracks (loud Spanish music included),
 * stop it at any moment, and turn the volume down without leaving the page.
 */
export default function MusicPlayer() {
  const { current, playing, play, stop, toggle, volume, setVolume } = useMusic();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onClick);
    };
  }, [open]);

  const meta = musicKindById(current);

  return (
    <div
      ref={panelRef}
      className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2"
    >
      {open && (
        <div
          role="dialog"
          aria-label="The music of the maison"
          className="anim-fade-in w-72 overflow-hidden rounded-2xl border border-border bg-on-primary/95 shadow-xl backdrop-blur-md"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="label m-0">The music of the maison</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close music player"
              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-secondary transition-colors duration-200 hover:bg-muted hover:text-primary"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="p-3">
            <ul className="max-h-64 space-y-1 overflow-y-auto pr-1">
              {MUSIC_KINDS.map((kind) => {
                const active = current === kind.id;
                return (
                  <li key={kind.id}>
                    <button
                      type="button"
                      onClick={() => toggle(kind.id)}
                      aria-pressed={active}
                      className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2 text-left transition-colors duration-200 ${
                        active ? "bg-gold/15 text-gold" : "hover:bg-muted hover:text-primary"
                      }`}
                    >
                      <span className="min-w-0">
                        <span className={`block text-sm font-semibold ${active ? "text-gold" : "text-primary"}`}>
                          {kind.label}
                          {kind.loud && (
                            <span className="ml-1.5 rounded-full bg-destructive/10 px-1.5 py-0.5 align-middle text-[0.55rem] font-bold tracking-wide text-destructive uppercase">
                              Loud
                            </span>
                          )}
                        </span>
                        <span className="block truncate text-[0.65rem] text-secondary">
                          {kind.description}
                        </span>
                      </span>
                      {active && playing ? (
                        <Pause className="h-4 w-4 shrink-0" aria-hidden="true" />
                      ) : (
                        <Play className="h-4 w-4 shrink-0" aria-hidden="true" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="mt-3 flex items-center gap-2 border-t border-border px-1 pt-3">
              <Volume2 className="h-4 w-4 text-secondary" aria-hidden="true" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                aria-label="Music volume"
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-[var(--color-gold)]"
              />
              {current && (
                <button
                  type="button"
                  onClick={stop}
                  className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[0.65rem] font-semibold text-secondary transition-colors duration-200 hover:border-destructive/40 hover:text-destructive"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                  Stop
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => (current && playing ? stop() : current ? play(current) : setOpen((o) => !o))}
        aria-label={
          current && playing
            ? `Stop the music (${meta?.label ?? ""})`
            : current
              ? `Play ${meta?.label ?? "the music"}`
              : "Open the music of the maison"
        }
        className="inline-flex h-13 w-13 cursor-pointer items-center justify-center gap-2 rounded-full bg-primary p-3.5 text-on-primary shadow-lg transition-all duration-200 hover:shadow-xl active:scale-95"
      >
        {current && playing ? (
          <Pause className="h-5 w-5" aria-hidden="true" />
        ) : current ? (
          <Play className="h-5 w-5" aria-hidden="true" />
        ) : (
          <Music2 className="h-5 w-5" aria-hidden="true" />
        )}
      </button>

      {current && playing && (
        <span className="pointer-events-none absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-gold">
          <AudioLines className="h-2.5 w-2.5 text-on-primary" aria-hidden="true" />
        </span>
      )}
    </div>
  );
}
