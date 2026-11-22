import { useEffect, useRef, useState, type FormEvent } from "react";
import { Bot, ClipboardList, Send, Sparkles } from "lucide-react";
import { useApp } from "@/components/AppContext";
import {
  getCoachReply,
  getInitialCoachMessages,
  getWeeklyReview,
} from "@/services/strengthService";
import type { CoachMessage } from "@/types";

export const QUICK_PROMPTS = [
  "¿Por qué no subo en banca?",
  "Ajusta mi semana",
  "Hoy tengo poco tiempo",
] as const;

const REPLY_DELAY_MS = 700;

function nowLabel(): string {
  const d = new Date();
  return `Hoy · ${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

export function CoachPage() {
  const { coachPendingPrompt, clearCoachPendingPrompt } = useApp();
  const review = getWeeklyReview();
  const [messages, setMessages] = useState<CoachMessage[]>(() => getInitialCoachMessages());
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const mounted = useRef(true);
  const handledPrompt = useRef<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const initialCount = useRef(messages.length);

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setMessages((prev) => [
      ...prev,
      { id: `u-${id}`, role: "user", text: trimmed, timestamp: nowLabel() },
    ]);
    setDraft("");
    setTyping(true);
    window.setTimeout(() => {
      if (!mounted.current) return;
      setMessages((prev) => [
        ...prev,
        { id: `c-${id}`, role: "coach", text: getCoachReply(trimmed), timestamp: nowLabel() },
      ]);
      setTyping(false);
    }, REPLY_DELAY_MS);
  };

  useEffect(() => {
    if (!coachPendingPrompt || handledPrompt.current === coachPendingPrompt) return;
    handledPrompt.current = coachPendingPrompt;
    send(coachPendingPrompt);
    clearCoachPendingPrompt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachPendingPrompt]);

  // Flag en vez de clearTimeout: StrictMode desmonta/monta en dev y cancelaría la respuesta.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (messages.length > initialCount.current || typing) {
      endRef.current?.scrollIntoView?.({ behavior: "smooth", block: "end" });
    }
  }, [messages.length, typing]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!typing) send(draft);
  };

  return (
    <div className="flex flex-col gap-5 px-4 pt-4">
      <section className="system-panel rounded-2xl p-4" aria-labelledby="weekly-review-title">
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-gold/40 bg-gold/15 px-2.5 py-1 font-display text-xs font-bold tracking-wider text-gold">
            <ClipboardList className="h-3.5 w-3.5" />
            REVISIÓN SEMANAL
          </span>
        </div>
        <p className="text-xs font-medium text-muted-foreground">{review.weekLabel}</p>
        <h1
          id="weekly-review-title"
          className="mt-1 font-display text-xl font-bold leading-tight text-foreground"
        >
          {review.headline}
        </h1>
        <p className="mt-2 text-sm text-secondary-foreground">{review.cause}</p>
        <p className="mt-4 font-display text-xs font-bold uppercase tracking-wider text-primary">
          3 cambios para esta semana
        </p>
        <ol className="mt-2 space-y-2">
          {review.changes.map((change, i) => (
            <li
              key={change}
              className="flex gap-2.5 rounded-xl border border-border bg-surface p-3 text-sm text-foreground"
            >
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-primary/15 font-display text-xs font-bold text-primary">
                {i + 1}
              </span>
              <span>{change}</span>
            </li>
          ))}
        </ol>
      </section>

      <section aria-label="Chat con el coach" className="space-y-3">
        <h2 className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-wider text-foreground">
          <Bot className="h-4 w-4 text-primary" />
          Coach del Sistema
        </h2>

        <div className="space-y-3" role="log" aria-live="polite">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                  msg.role === "user"
                    ? "rounded-br-md bg-primary text-primary-foreground"
                    : "rounded-bl-md border border-border bg-card text-foreground"
                }`}
              >
                <p className="whitespace-pre-line">{msg.text}</p>
                <p
                  className={`mt-1 text-[10px] ${
                    msg.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                  }`}
                >
                  {msg.timestamp}
                </p>
              </div>
            </div>
          ))}
          {typing && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-md border border-border bg-card px-3.5 py-2.5 text-sm text-muted-foreground">
                El coach está analizando…
              </div>
            </div>
          )}
          <div ref={endRef} className="scroll-mb-[230px]" />
        </div>
      </section>

      <div className="sticky bottom-[76px] z-20 -mx-4 space-y-2 border-t border-border/60 bg-background/95 px-4 pb-2 pt-3 backdrop-blur-md">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={typing}
              onClick={() => send(prompt)}
              className="inline-flex min-h-[48px] shrink-0 items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-3 text-sm font-semibold text-primary disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {prompt}
            </button>
          ))}
        </div>
        <form onSubmit={onSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Pregunta a tu coach…"
            aria-label="Mensaje para el coach"
            className="min-h-[48px] flex-1 rounded-xl border border-input bg-surface px-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
          <button
            type="submit"
            aria-label="Enviar mensaje"
            disabled={typing || !draft.trim()}
            className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
