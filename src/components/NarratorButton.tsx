import { useEffect, useMemo, useRef, useState } from "react";
import { Mic, Square, Volume2 } from "lucide-react";

/**
 * The narrator — the voice of the house. Reads a script aloud with the
 * browser's speech synthesis, in the client's chosen language. The Creative
 * Director's narration for a creation or a brand is heard, and stopped,
 * here; the same script is filed in the collection and printed in the
 * booklet.
 */

export type NarratorLanguage = "en-US" | "en-GB" | "es" | "fr" | "it";

export const NARRATOR_LANGUAGES: {
  id: NarratorLanguage;
  label: string;
}[] = [
  { id: "en-US", label: "English (US)" },
  { id: "en-GB", label: "English (UK)" },
  { id: "es", label: "Español" },
  { id: "fr", label: "Français" },
  { id: "it", label: "Italiano" },
];

function pickVoice(lang: NarratorLanguage): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  const norm = lang.toLowerCase();
  return (
    voices.find((v) => v.lang.toLowerCase() === norm && /female|woman|zira|helena|monica/i.test(v.name)) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(norm)) ??
    null
  );
}

export default function NarratorButton({
  script,
  title,
  defaultLanguage = "en-US",
  compact = false,
}: {
  script: string[];
  title: string;
  defaultLanguage?: NarratorLanguage;
  compact?: boolean;
}) {
  const [lang, setLang] = useState<NarratorLanguage>(defaultLanguage);
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(true);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const langRef = useRef(lang);
  langRef.current = lang;

  const fullScript = useMemo(() => script.filter(Boolean).join("\n\n"), [script]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setSupported(false);
      return;
    }
    const load = () => setSupported(true);
    window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener?.("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener?.("voiceschanged", load);
  }, []);

  useEffect(() => {
    return () => {
      utteranceRef.current && window.speechSynthesis?.cancel();
    };
  }, []);

  const stop = () => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    utteranceRef.current = null;
  };

  const narrate = () => {
    if (speaking) {
      stop();
      return;
    }
    if (!window.speechSynthesis || !fullScript.trim()) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(fullScript);
    u.lang = langRef.current;
    u.rate = 0.98;
    u.pitch = 0.95;
    const voice = pickVoice(langRef.current);
    if (voice) u.voice = voice;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    utteranceRef.current = u;
    setSpeaking(true);
    window.speechSynthesis.speak(u);
  };

  if (!supported) {
    return null;
  }

  return (
    <div className={`inline-flex flex-wrap items-center gap-2 ${compact ? "scale-90 origin-left" : ""}`}>
      <label className="sr-only" htmlFor={`narrator-lang-${title.replace(/\s+/g, "-")}`}>
        Narration language
      </label>
      <select
        id={`narrator-lang-${title.replace(/\s+/g, "-")}`}
        value={lang}
        onChange={(e) => setLang(e.target.value as NarratorLanguage)}
        aria-label="Narration language"
        className="cursor-pointer rounded-full border border-border bg-on-primary px-3 py-1.5 text-xs font-medium text-secondary outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        {NARRATOR_LANGUAGES.map((l) => (
          <option key={l.id} value={l.id}>
            {l.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={narrate}
        aria-pressed={speaking}
        aria-label={speaking ? `Stop the narration of ${title}` : `Narrate ${title}`}
        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95 ${
          speaking
            ? "border-destructive bg-destructive/10 text-destructive"
            : "border-gold/40 bg-gold/10 text-gold hover:border-gold hover:bg-gold/15"
        }`}
      >
        {speaking ? (
          <>
            <Square className="h-3.5 w-3.5" aria-hidden="true" />
            Stop narration
          </>
        ) : (
          <>
            <Mic className="h-3.5 w-3.5" aria-hidden="true" />
            Narrate
          </>
        )}
      </button>
      {speaking && (
        <span className="inline-flex items-center gap-1 text-xs text-secondary" role="status">
          <Volume2 className="h-3.5 w-3.5 anim-pulse-soft" aria-hidden="true" />
          The narrator speaks…
        </span>
      )}
    </div>
  );
}
