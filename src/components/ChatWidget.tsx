import { useEffect, useRef, useState } from "react";
import {
  Martini,
  Mic2,
  Send,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { chatWithMaison } from "../lib/gemini";
import type { ChatMessage } from "../lib/gemini";

const SUGGESTIONS = [
  "Suggest a gala gown for a museum opening",
  "What is Couture Création?",
  "How do I transform a saved look?",
];

const VOICE_SUPPORTED =
  typeof window !== "undefined" && "speechSynthesis" in window;

function speak(text: string) {
  if (!VOICE_SUPPORTED) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text.replace(/[™®]/g, ""));
  utter.rate = 1.02;
  utter.pitch = 1;
  window.speechSynthesis.speak(utter);
}

export default function ChatWidget() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [greeted, setGreeted] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || busy) return;
    setError(null);
    const next: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const reply = await chatWithMaison(next);
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
      if (voiceOn) speak(reply);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "The concierge couldn't be reached — try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  // Greeting the first time the panel opens.
  useEffect(() => {
    if (open && !greeted && messages.length === 0) {
      setGreeted(true);
      setMessages([
        {
          role: "assistant",
          content:
            "Bonjour. I'm the house concierge — On the House. Ask me anything about EL ATELIER, or let me help you find the words for your next creation. The first one is on the house.",
        },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, greeted]);

  // Scroll to the newest message.
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  // Manage focus and Escape.
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!user) return null;

  return (
    <>
      {/* Floating trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="on-the-house-panel"
        aria-label={open ? "Close the house concierge" : "Open the house concierge"}
        className="fixed right-4 bottom-4 z-50 inline-flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-primary text-on-primary shadow-xl shadow-primary/30 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-2xl active:scale-95 sm:right-6 sm:bottom-6"
      >
        {open ? (
          <X className="h-6 w-6" aria-hidden="true" />
        ) : (
          <span className="relative inline-flex items-center justify-center">
            <Martini className="h-6 w-6" aria-hidden="true" />
            <span
              aria-hidden="true"
              className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-flamingo ring-2 ring-on-primary"
            />
          </span>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div
          id="on-the-house-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="concierge-title"
          className="fixed right-4 bottom-20 z-50 flex w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-3xl border border-border bg-on-primary shadow-2xl shadow-primary/10 anim-fade-in sm:right-6 sm:bottom-24"
        >
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-border bg-muted/60 px-4 py-3">
            <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Martini className="h-5 w-5" aria-hidden="true" />
              <span
                aria-hidden="true"
                className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-on-primary bg-green"
              />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id="concierge-title" className="font-heading text-sm font-semibold text-primary">
                On the House
              </h2>
              <p className="truncate text-[0.65rem] text-secondary">
                The concierge of EL ATELIER · cocktail hour, always
              </p>
            </div>
            <button
              type="button"
              onClick={() => setVoiceOn((v) => !v)}
              aria-pressed={voiceOn}
              disabled={!VOICE_SUPPORTED}
              title={voiceOn ? "Voice replies on" : "Voice replies off"}
              className={`inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition-all duration-200 active:scale-95 ${
                voiceOn
                  ? "bg-primary text-on-primary"
                  : "text-secondary hover:bg-muted hover:text-primary"
              } disabled:opacity-40`}
            >
              {voiceOn ? (
                <Volume2 className="h-4.5 w-4.5" aria-hidden="true" />
              ) : (
                <VolumeX className="h-4.5 w-4.5" aria-hidden="true" />
              )}
              <span className="sr-only">
                {voiceOn ? "Turn voice replies off" : "Turn voice replies on"}
              </span>
            </button>
          </div>

          {/* Messages */}
          <div
            ref={listRef}
            className="flex max-h-[22rem] min-h-[12rem] flex-col gap-3 overflow-y-auto px-4 py-4"
            aria-live="polite"
          >
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "rounded-br-sm bg-primary text-on-primary"
                      : "rounded-bl-sm bg-muted text-primary"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  {m.role === "assistant" && VOICE_SUPPORTED && (
                    <button
                      type="button"
                      onClick={() => speak(m.content)}
                      className="mt-1.5 inline-flex cursor-pointer items-center gap-1 text-[0.65rem] font-semibold text-secondary transition-colors duration-200 hover:text-primary"
                      aria-label="Hear this reply"
                    >
                      <Mic2 className="h-3 w-3" aria-hidden="true" />
                      Hear it
                    </button>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex justify-start">
                <div
                  className="flex items-center gap-2 rounded-2xl rounded-bl-sm bg-muted px-3.5 py-2.5 text-xs text-secondary"
                  role="status"
                >
                  <Sparkles className="h-3.5 w-3.5 animate-pulse" aria-hidden="true" />
                  The concierge is thinking…
                </div>
              </div>
            )}
          </div>

          {error && (
            <p role="alert" className="mx-4 mb-2 rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {error}
            </p>
          )}

          {/* Suggestions */}
          {messages.length <= 1 && !busy && (
            <div className="flex flex-wrap gap-1.5 px-4 pb-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="cursor-pointer rounded-full border border-border px-3 py-1.5 text-[0.65rem] font-medium text-secondary transition-all duration-200 hover:border-primary/50 hover:text-primary active:scale-95"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Composer */}
          <form
            className="flex items-center gap-2 border-t border-border px-3 py-3"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <label htmlFor="concierge-input" className="sr-only">
              Message the concierge
            </label>
            <input
              id="concierge-input"
              ref={inputRef}
              className="input flex-1 py-2 text-sm"
              placeholder="Ask the concierge…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="btn-primary h-10 w-10 shrink-0 rounded-full p-0"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
