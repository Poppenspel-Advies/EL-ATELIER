import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { MUSIC_KINDS, startMusic, type SoundtrackKind } from "./export";

/**
 * Sea sound — a hidden video that plays the audio track of the
 * "Starfish and shells on the shore" clip (Pexels 856969). It is the
 * only verified source whose audio track carries real, audible waves
 * crashing on the shore (-25.7 dB mean volume); the other sea clips
 * have silent or absent audio tracks. A <video> element (instead of
 * <audio>) guarantees every browser demuxes the sound from the MP4.
 *
 * Autoplay policies require the video to start muted; it unmutes on
 * the first user gesture (click/keypress) when the saved preference
 * is ON, and the navbar toggle controls it explicitly.
 */
const AMBIENT_SRC =
  "https://videos.pexels.com/video-files/856969/856969-hd_1920_1080_25fps.mp4";
const SOUND_KEY = "el-atelier-sound";

type SoundContextValue = {
  soundOn: boolean;
  toggleSound: () => void;
};

const SoundContext = createContext<SoundContextValue | null>(null);

export function SoundProvider({ children }: { children: ReactNode }) {
  const [soundOn, setSoundOn] = useState<boolean>(() => {
    try {
      return localStorage.getItem(SOUND_KEY) === "1";
    } catch {
      return false;
    }
  });
  const ambientRef = useRef<HTMLVideoElement>(null);

  // Start playback (muted) as soon as possible; muted autoplay is allowed.
  useEffect(() => {
    const v = ambientRef.current;
    if (v) v.play().catch(() => {});
  }, []);

  // Persist the preference.
  useEffect(() => {
    try {
      localStorage.setItem(SOUND_KEY, soundOn ? "1" : "0");
    } catch {
      /* private mode — ignore */
    }
  }, [soundOn]);

  // Browsers block unmuted playback until a user gesture. If the saved
  // preference is ON, unmute on the first gesture anywhere in the app.
  useEffect(() => {
    if (!soundOn) return;
    const enable = () => {
      const v = ambientRef.current;
      if (v) {
        v.muted = false;
        v.play().catch(() => {});
      }
      window.removeEventListener("pointerdown", enable);
      window.removeEventListener("keydown", enable);
    };
    window.addEventListener("pointerdown", enable);
    window.addEventListener("keydown", enable);
    return () => {
      window.removeEventListener("pointerdown", enable);
      window.removeEventListener("keydown", enable);
    };
  }, [soundOn]);

  const toggleSound = () => setSoundOn((on) => !on);

  return (
    <SoundContext.Provider value={{ soundOn, toggleSound }}>
      {/* Ambient sea-sound source — invisible, never focused */}
      <video
        ref={ambientRef}
        src={AMBIENT_SRC}
        loop
        muted={!soundOn}
        preload="auto"
        playsInline
        aria-hidden="true"
        tabIndex={-1}
        className="pointer-events-none fixed -left-96 -top-96 h-px w-px opacity-0"
      />
      {children}
    </SoundContext.Provider>
  );
}

export function useSound(): SoundContextValue {
  const ctx = useContext(SoundContext);
  if (!ctx) throw new Error("useSound must be used within a SoundProvider");
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  The music of the maison — one engine for the whole house.          */
/*  The player in the corner plays any of the music kinds (loud        */
/*  Spanish music included), can be stopped at any moment, and the     */
/*  films record whichever soundtrack the client chooses.              */
/* ------------------------------------------------------------------ */

export type { SoundtrackKind } from "./export";
export { MUSIC_KINDS, musicKindById } from "./export";

interface MusicContextValue {
  current: SoundtrackKind | null;
  playing: boolean;
  volume: number;
  play: (kind: SoundtrackKind) => void;
  stop: () => void;
  toggle: (kind: SoundtrackKind) => void;
  setVolume: (v: number) => void;
}

const MusicContext = createContext<MusicContextValue | null>(null);

export function MusicProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<SoundtrackKind | null>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.7);
  const handleRef = useRef<{ stop: () => void; setVolume?: (v: number) => void } | null>(null);

  useEffect(() => {
    return () => {
      handleRef.current?.stop();
    };
  }, []);

  const stop = () => {
    handleRef.current?.stop();
    handleRef.current = null;
    setPlaying(false);
    setCurrent(null);
  };

  const value = useMemo<MusicContextValue>(
    () => ({
      current,
      playing,
      volume,
      play: (kind) => {
        // Same track playing → leave it alone.
        if (handleRef.current && current === kind) return;
        handleRef.current?.stop();
        const handle = startMusic(kind);
        handleRef.current = handle;
        handle.setVolume?.(volume);
        setCurrent(kind);
        setPlaying(true);
      },
      stop,
      toggle: (kind) => {
        if (handleRef.current && current === kind) {
          stop();
        } else {
          value.play(kind);
        }
      },
      setVolume: (v) => {
        setVolumeState(v);
        handleRef.current?.setVolume?.(v);
      },
    }),
    [current, playing, volume],
  );

  return <MusicContext.Provider value={value}>{children}</MusicContext.Provider>;
}

export function useMusic(): MusicContextValue {
  const ctx = useContext(MusicContext);
  if (!ctx) throw new Error("useMusic must be used within a MusicProvider");
  return ctx;
}
