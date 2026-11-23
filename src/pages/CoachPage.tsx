import { useEffect, useRef, useState, type FormEvent } from "react";
import { Bot, ClipboardList, LogIn, RefreshCw, Send, Sparkles } from "lucide-react";
import { useApp } from "@/components/AppContext";
import type { CoachTurn } from "@/lib/coachApi";
import {
  getCachedReview,
  requestWeeklyReview,
  sendCoachMessage,
  type CachedReview,
} from "@/services/coachService";
import { getWeeklyVerdict } from "@/services/strengthService";
import type { CoachMessage } from "@/types";

export const QUICK_PROMPTS = [
  "¿Por qué no subo en banca?",
  "Ajusta mi semana",
  "Hoy tengo poco tiempo",
] as const;

const GREETING: CoachMessage = {
  id: "greeting",
  role: "coach",
  text: "Soy tu Coach del Sistema. Conozco tus entrenos y, si lo tienes conectado, lo que comes y lo que pesas en MacroQuest. Pregúntame lo que quieras sobre tu progreso.",
  timestamp: "",
};

function nowLabel(): string {
  const d = new Date();
  return `Hoy · ${d.getHours().toString().padStart(2, "0")}:${d
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

function dateLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

function remainingLabel(remaining: number | null | undefined): string | null {
  if (remaining === undefined) return null;
  if (remaining === null) return "Consultas sin límite";
  return remaining === 1
    ? "Te queda 1 consulta esta semana"
    : `Te quedan ${remaining} consultas esta semana`;
}

export function CoachPage() {
  const { coachPendingPrompt, clearCoachPendingPrompt, account, setView } = useApp();
  const signedIn = account.user !== null;
  const verdict = getWeeklyVerdict();

  const [review, setReview] = useState<CachedReview | null>(() => getCachedReview());
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [messages, setMessages] = useState<CoachMessage[]>([GREETING]);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [remaining, setRemaining] = useState<number | null | undefined>(undefined);
  const mounted = useRef(true);
  const handledPrompt = useRef<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const askReview = async () => {
    setReviewLoading(true);
    setReviewError(null);
    const result = await requestWeeklyReview();
    if (!mounted.current) return;
    setReviewLoading(false);
    setRemaining(result.remaining);
    if (result.ok) setReview({ review: result.review, createdAt: new Date().toISOString() });
    else setReviewError(result.error);
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !signedIn) return;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    // Historial para el modelo: sin el saludo ni los avisos de error.
    const history: CoachTurn[] = messages
      .filter((m) => m.id !== GREETING.id && !m.id.startsWith("e-"))
      .map((m) => ({ role: m.role, text: m.text }));
    setMessages((prev) => [
      ...prev,
      { id: `u-${id}`, role: "user", text: trimmed, timestamp: nowLabel() },
    ]);
    setDraft("");
    setTyping(true);
    const result = await sendCoachMessage(trimmed, history);
    if (!mounted.current) return;
    setTyping(false);
    setRemaining(result.remaining);
    setMessages((prev) => [
      ...prev,
      result.ok
        ? { id: `c-${id}`, role: "coach", text: result.reply, timestamp: nowLabel() }
        : { id: `e-${id}`, role: "coach", text: result.error, timestamp: nowLabel() },
    ]);
  };

  useEffect(() => {
    if (!coachPendingPrompt || !signedIn || handledPrompt.current === coachPendingPrompt) return;
    handledPrompt.current = coachPendingPrompt;
    void send(coachPendingPrompt);
    clearCoachPendingPrompt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachPendingPrompt, signedIn]);

  // Flag en vez de cancelar: StrictMode desmonta/monta en dev y perdería la respuesta.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (messages.length > 1 || typing) {
      endRef.current?.scrollIntoView?.({ behavior: "smooth", block: "end" });
    }
  }, [messages.length, typing]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!typing) void send(draft);
  };

  const quota = remainingLabel(remaining);

  return (
    <div className="flex flex-col gap-5 px-4 pt-4">
      <section className="system-panel rounded-2xl p-4" aria-labelledby="weekly-review-title">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-gold/40 bg-gold/15 px-2.5 py-1 font-display text-xs font-bold tracking-wider text-gold">
            <ClipboardList className="h-3.5 w-3.5" />
            REVISIÓN SEMANAL
          </span>
          {review && signedIn && (
            <span className="text-xs text-muted-foreground">{dateLabel(review.createdAt)}</span>
          )}
        </div>

        {signedIn && review ? (
          <>
            <h1
              id="weekly-review-title"
              className="font-display text-xl font-bold leading-tight text-foreground"
            >
              {review.review.titular}
            </h1>
            <p className="mt-2 text-sm text-secondary-foreground">{review.review.causa}</p>
            <p className="mt-4 font-display text-xs font-bold uppercase tracking-wider text-primary">
              Cambios para esta semana
            </p>
            <ol className="mt-2 space-y-2">
              {review.review.cambios.map((change, i) => (
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
          </>
        ) : (
          <>
            <h1
              id="weekly-review-title"
              className="font-display text-xl font-bold leading-tight text-foreground"
            >
              {verdict ? verdict.headline : "Tu revisión de la semana"}
            </h1>
            <p className="mt-2 text-sm text-secondary-foreground">
              {verdict?.advice ??
                (signedIn
                  ? "Pide al coach que revise tus entrenos y tu nutrición: te dirá la causa de cómo vas y 3 cambios concretos."
                  : "Entra con Google para que el coach revise tus entrenos y tu nutrición de MacroQuest.")}
            </p>
          </>
        )}

        {signedIn ? (
          <button
            type="button"
            onClick={() => void askReview()}
            disabled={reviewLoading}
            className="mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-primary/50 bg-primary/15 font-display text-sm font-bold text-primary disabled:opacity-60"
          >
            {reviewLoading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                El coach está analizando tus datos…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {review ? "Nueva revisión con IA" : "Pedir revisión al coach"}
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setView("perfil")}
            className="mt-4 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-primary/50 bg-primary/15 font-display text-sm font-bold text-primary"
          >
            <LogIn className="h-4 w-4" />
            Entrar para usar el coach
          </button>
        )}
        {reviewError && (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {reviewError}
          </p>
        )}
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
                    : msg.id.startsWith("e-")
                      ? "rounded-bl-md border border-destructive/40 bg-destructive/10 text-foreground"
                      : "rounded-bl-md border border-border bg-card text-foreground"
                }`}
              >
                <p className="whitespace-pre-line">{msg.text}</p>
                {msg.timestamp && (
                  <p
                    className={`mt-1 text-[10px] ${
                      msg.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"
                    }`}
                  >
                    {msg.timestamp}
                  </p>
                )}
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
        {signedIn ? (
          <>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={typing}
                  onClick={() => void send(prompt)}
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
                maxLength={1000}
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
            {quota && <p className="text-center text-[11px] text-muted-foreground">{quota}</p>}
          </>
        ) : (
          <p className="pb-1 text-center text-sm text-muted-foreground">
            Entra con Google en Perfil para chatear con el coach.
          </p>
        )}
      </div>
    </div>
  );
}
