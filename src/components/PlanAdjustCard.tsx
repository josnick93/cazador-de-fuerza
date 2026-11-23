import { useState } from "react";
import { Check, LogIn, RefreshCw, Sparkles, Wand2, X } from "lucide-react";
import { useApp } from "@/components/AppContext";
import type { PlanAdjustResult } from "@/engine/planAdjust";
import { PLAN_MAX_REQUEST_CHARS, type PlanProposal } from "@/lib/planApi";
import { requestPlanAdjustment } from "@/services/coachService";
import { applyPlanProposal, previewPlanProposal } from "@/services/strengthService";

const SUGGESTIONS = [
  "Hoy tengo 40 minutos",
  "Me molesta el hombro",
  "Quiero más volumen de pecho",
] as const;

type State =
  | { step: "idle" }
  | { step: "loading" }
  | { step: "proposal"; proposal: PlanProposal; preview: PlanAdjustResult }
  | { step: "done"; applied: string[] };

/** «Ajustar con IA»: la IA propone cambios de ejercicios y series; el motor los valida y calcula los pesos. */
export function PlanAdjustCard({ onApplied }: { onApplied: () => void }) {
  const { account, setView } = useApp();
  const [request, setRequest] = useState("");
  const [state, setState] = useState<State>({ step: "idle" });
  const [error, setError] = useState<string | null>(null);

  if (!account.user) {
    return (
      <section className="rounded-2xl border border-dashed border-border p-4">
        <p className="flex items-center gap-1.5 font-display text-sm font-bold text-foreground">
          <Wand2 className="h-4 w-4 text-primary" />
          Ajustar el plan con IA
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Entra con Google para pedir al coach cambios en tu plan («hoy tengo poco tiempo»…).
        </p>
        <button
          type="button"
          onClick={() => setView("perfil")}
          className="mt-3 inline-flex min-h-[48px] items-center gap-1.5 rounded-xl border border-primary/50 bg-primary/15 px-4 font-display text-sm font-bold text-primary"
        >
          <LogIn className="h-4 w-4" />
          Entrar
        </button>
      </section>
    );
  }

  const propose = async (text: string) => {
    const peticion = text.trim();
    if (!peticion) return;
    setRequest(peticion);
    setError(null);
    setState({ step: "loading" });
    const result = await requestPlanAdjustment(peticion);
    if (!result.ok) {
      setError(result.error);
      setState({ step: "idle" });
      return;
    }
    setState({
      step: "proposal",
      proposal: result.proposal,
      preview: previewPlanProposal(result.proposal),
    });
  };

  const apply = (proposal: PlanProposal) => {
    const result = applyPlanProposal(proposal);
    setState({ step: "done", applied: result.applied });
    setRequest("");
    onApplied();
  };

  return (
    <section className="system-panel rounded-2xl p-4" aria-labelledby="plan-ai-title">
      <h2
        id="plan-ai-title"
        className="flex items-center gap-1.5 font-display text-sm font-bold uppercase tracking-wider text-primary"
      >
        <Wand2 className="h-4 w-4" />
        Ajustar con IA
      </h2>

      {state.step === "proposal" ? (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-foreground">{state.proposal.resumen}</p>
          {state.preview.applied.length > 0 ? (
            <ul className="space-y-1.5">
              {state.preview.applied.map((line) => (
                <li
                  key={line}
                  className="flex gap-2 rounded-xl bg-surface p-2.5 text-sm text-foreground"
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  {line}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No hay cambios que aplicar.</p>
          )}
          {state.preview.rejected.length > 0 && (
            <ul className="space-y-1 text-xs text-muted-foreground">
              {state.preview.rejected.map(({ change, reason }) => (
                <li
                  key={`${change.tipo}-${change.sesion}-${change.ejercicio}-${change.nuevoEjercicio}`}
                >
                  Descartado ({change.sesion}): {reason}
                </li>
              ))}
            </ul>
          )}
          <p className="text-[11px] text-muted-foreground">
            Los pesos los calcula la app con tu historial, no la IA.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setState({ step: "idle" })}
              className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl border border-border bg-surface font-display text-sm font-bold text-foreground"
            >
              <X className="h-4 w-4" />
              Descartar
            </button>
            <button
              type="button"
              disabled={state.preview.applied.length === 0}
              onClick={() => apply(state.proposal)}
              className="flex min-h-[48px] items-center justify-center gap-1.5 rounded-xl bg-primary font-display text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              Aplicar
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {state.step === "done" && (
            <p
              role="status"
              className="rounded-xl border border-success/40 bg-success/10 p-2.5 text-sm text-success"
            >
              Plan actualizado: {state.applied.length}{" "}
              {state.applied.length === 1 ? "cambio" : "cambios"}.
            </p>
          )}
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                disabled={state.step === "loading"}
                onClick={() => void propose(s)}
                className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-3 text-sm font-semibold text-primary disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {s}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void propose(request);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              maxLength={PLAN_MAX_REQUEST_CHARS}
              placeholder="¿Qué quieres cambiar?"
              aria-label="Qué quieres cambiar del plan"
              className="min-h-[48px] flex-1 rounded-xl border border-input bg-surface px-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            <button
              type="submit"
              aria-label="Proponer cambios"
              disabled={state.step === "loading" || !request.trim()}
              className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
            >
              {state.step === "loading" ? (
                <RefreshCw className="h-5 w-5 animate-spin" />
              ) : (
                <Wand2 className="h-5 w-5" />
              )}
            </button>
          </form>
          {state.step === "loading" && (
            <p className="text-xs text-muted-foreground">El coach está preparando los cambios…</p>
          )}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
