import { useEffect, useRef, useState } from "react";

/**
 * Rotating sea-shore backdrop. Every URL below was verified live (HTTP 200)
 * on the Pexels CDN; the favourite was replaced after the original clip was
 * found to be the wrong footage:
 *
 * 1. Waves breaking on a rocky coastline (Pexels 1409899, 1920x1080) —
 *    the new favourite: slow-motion sea waves rolling in and crashing over
 *    boulders along the shore. Silent video track (audio handled by the
 *    ambient SoundProvider loop).
 * 2. Ocean waves seen from above (Pexels 1093662, 1920x1080) — surf
 *    rolling across the deep, sunlit water.
 * 3. Sea waves rolling in (Pexels 856968, 1920x1080) — same shoreline
 *    series as the original favourites.
 * 4. A starfish underwater (Pexels 5358852, 1920x1080) — "sea pearl /
 *    star fish" clip.
 * 5. Golden sunlight glittering on the sea (Pexels 856980, 1920x1080) —
 *    the "shine of the wave, glitters on gold" look.
 * 6. Starfish and shells on the shore (Pexels 856969, 1920x1080) — sand +
 *    shore.
 *
 * The backdrop is always muted — the SoundProvider plays the sea ambience
 * (with a navbar toggle) so sound is continuous no matter which clip is
 * showing. If a clip fails to load, the component advances to the next one;
 * if every source fails (offline, blocked CDN) it unmounts and the CSS sea
 * scene behind it takes over.
 */
const PLAYLIST = [
  {
    src: "https://videos.pexels.com/video-files/1409899/1409899-hd_1920_1080_25fps.mp4",
    label: "Waves breaking on rocky coastline",
  },
  {
    src: "https://videos.pexels.com/video-files/1093662/1093662-hd_1920_1080_30fps.mp4",
    label: "Ocean waves from above",
  },
  {
    src: "https://videos.pexels.com/video-files/856968/856968-hd_1920_1080_25fps.mp4",
    label: "Sea waves rolling in",
  },
  {
    src: "https://videos.pexels.com/video-files/5358852/5358852-hd_1920_1080_25fps.mp4",
    label: "A starfish underwater",
  },
  {
    src: "https://videos.pexels.com/video-files/856980/856980-hd_1920_1080_25fps.mp4",
    label: "Golden sunlight glittering on the sea",
  },
  {
    src: "https://videos.pexels.com/video-files/856969/856969-hd_1920_1080_25fps.mp4",
    label: "Starfish and shells on the shore",
  },
];

const DWELL_MS = 15_000;
const FADE_MS = 1_000;

export default function VideoBackdrop({ fadeMs = FADE_MS }: { fadeMs?: number }) {
  const [failed, setFailed] = useState(false);
  const [track, setTrack] = useState(0);
  const [visible, setVisible] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Advance to the next clip after the dwell time, or when one ends.
  useEffect(() => {
    const v = videoRef.current;
    const timer = window.setTimeout(
      () => setTrack((t) => (t + 1) % PLAYLIST.length),
      DWELL_MS
    );
    const onEnded = () => setTrack((t) => (t + 1) % PLAYLIST.length);
    v?.addEventListener("ended", onEnded);
    return () => {
      window.clearTimeout(timer);
      v?.removeEventListener("ended", onEnded);
    };
  }, [track]);

  // Crossfade: fade out, swap source, play, fade in.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    setVisible(false);
    const timer = window.setTimeout(() => {
      v.src = PLAYLIST[track].src;
      v.load();
      v.play().catch(() => {});
      setVisible(true);
    }, fadeMs);
    return () => window.clearTimeout(timer);
  }, [track, fadeMs]);

  // On error: advance to the next clip; only give up once all fail.
  const handleError = () => {
    setTrack((t) => {
      const next = t + 1;
      if (next >= PLAYLIST.length) {
        setFailed(true);
        return t;
      }
      return next;
    });
  };

  if (failed) return null;

  return (
    <video
      ref={videoRef}
      className="hero-video transition-opacity duration-1000 ease-out"
      style={{ opacity: visible ? 1 : 0 }}
      muted
      loop
      playsInline
      preload="auto"
      aria-hidden="true"
      tabIndex={-1}
      onError={handleError}
    />
  );
}
