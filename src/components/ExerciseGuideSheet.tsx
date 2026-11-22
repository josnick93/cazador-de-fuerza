import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, Check, ChevronRight, Lightbulb, X } from "lucide-react";
import { ExerciseFrames } from "@/components/ExerciseFrames";
import { ExerciseThumb } from "@/components/ExerciseThumb";
import {
  getAlternatives,
  getExerciseById,
  getExerciseGuide,
  getGuideImagesCredit,
} from "@/services/strengthService";
import { EQUIPMENT_LABEL, formatRest } from "@/lib/labels";

interface ExerciseGuideSheetProps {
  exerciseId: string;
  onClose: () => void;
  /** En el entreno: permite cambiar al ejercicio que se está viendo. */
  onUse?: (exerciseId: string) => void;
  /** Ejercicio que ya se está haciendo (no muestra "Usar" para él). */
  activeExerciseId?: string;
}

export function ExerciseGuideSheet({
  exerciseId,
  onClose,
  onUse,
  activeExerciseId,
}: ExerciseGuideSheetProps) {
  // Pila de navegación: abrir una alternativa la apila y "atrás" vuelve.
  const [stack, setStack] = useState<string[]>([exerciseId]);
  const panelRef = useRef<HTMLDivElement>(null);
  const currentId = stack[stack.length - 1] ?? exerciseId;
  const exercise = getExerciseById(currentId);
  const guide = getExerciseGuide(currentId);
  const credit = getGuideImagesCredit();

  useEffect(() => {
    setStack([exerciseId]);
  }, [exerciseId]);

  useEffect(() => {
    panelRef.current?.scrollTo?.({ top: 0 });
  }, [currentId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!exercise) return null;
  const alternatives = getAlternatives(currentId);
  const canUse = onUse && currentId !== activeExerciseId;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-title"
        onClick={(e) => e.stopPropagation()}
        className="system-panel max-h-[92dvh] w-full max-w-[390px] overflow-y-auto rounded-t-2xl"
      >
        <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-card/95 px-4 py-3 backdrop-blur-md">
          {stack.length > 1 && (
            <button
              type="button"
              onClick={() => setStack((s) => s.slice(0, -1))}
              aria-label="Volver al ejercicio anterior"
              className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-surface text-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              {exercise.muscle} · {EQUIPMENT_LABEL[exercise.equipment]}
            </p>
            <h2
              id="guide-title"
              className="font-display text-lg font-bold leading-tight text-foreground"
            >
              {exercise.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ficha"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-surface text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-5 px-4 pb-6 pt-4">
          <ExerciseFrames images={guide?.images ?? []} alt={exercise.name} />

          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-md border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {exercise.compound ? "Multiarticular" : "Aislamiento"}
            </span>
            <span className="rounded-md border border-border bg-surface px-2 py-0.5 text-xs font-semibold text-muted-foreground">
              Descanso {formatRest(exercise.defaultRestSec)}
            </span>
          </div>

          {guide ? (
            <>
              <p className="text-sm text-secondary-foreground">{guide.summary}</p>

              <section aria-labelledby="guide-steps">
                <h3
                  id="guide-steps"
                  className="mb-2 font-display text-sm font-bold uppercase tracking-wider text-foreground"
                >
                  Cómo hacerlo
                </h3>
                <ol className="space-y-2">
                  {guide.steps.map((step, i) => (
                    <li key={step} className="flex gap-2.5 text-sm text-foreground">
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-primary/15 font-display text-xs font-bold text-primary">
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </section>

              <section
                aria-labelledby="guide-tips"
                className="rounded-xl border border-success/30 bg-success/5 p-3"
              >
                <h3
                  id="guide-tips"
                  className="mb-2 flex items-center gap-1.5 font-display text-sm font-bold uppercase tracking-wider text-success"
                >
                  <Lightbulb className="h-4 w-4" />
                  Consejos
                </h3>
                <ul className="space-y-1.5">
                  {guide.tips.map((tip) => (
                    <li key={tip} className="flex gap-2 text-sm text-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </section>

              <section
                aria-labelledby="guide-mistakes"
                className="rounded-xl border border-destructive/30 bg-destructive/5 p-3"
              >
                <h3
                  id="guide-mistakes"
                  className="mb-2 flex items-center gap-1.5 font-display text-sm font-bold uppercase tracking-wider text-destructive"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Errores comunes
                </h3>
                <ul className="space-y-1.5">
                  {guide.mistakes.map((m) => (
                    <li key={m} className="flex gap-2 text-sm text-foreground">
                      <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                      {m}
                    </li>
                  ))}
                </ul>
              </section>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Ficha de técnica en preparación.</p>
          )}

          {alternatives.length > 0 && (
            <section aria-labelledby="guide-alts">
              <h3
                id="guide-alts"
                className="mb-1 font-display text-sm font-bold uppercase tracking-wider text-foreground"
              >
                ¿Ocupado? Alternativas
              </h3>
              <p className="mb-2 text-xs text-muted-foreground">
                Mismo músculo, con tu equipamiento.
              </p>
              <ul className="space-y-2">
                {alternatives.map((alt) => (
                  <li key={alt.id}>
                    <button
                      type="button"
                      onClick={() => setStack((s) => [...s, alt.id])}
                      className="flex min-h-[56px] w-full items-center gap-3 rounded-xl border border-border bg-surface p-2 text-left"
                    >
                      <ExerciseThumb exerciseId={alt.id} className="h-11 w-14" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-foreground">
                          {alt.name}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {alt.pattern === exercise.pattern ? "Mismo movimiento" : "Mismo músculo"}{" "}
                          · {EQUIPMENT_LABEL[alt.equipment]}
                        </span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {guide && guide.images.length > 0 && (
            <p className="text-center text-[11px] text-muted-foreground">
              Fotos:{" "}
              <a href={credit.url} target="_blank" rel="noreferrer" className="underline">
                {credit.name}
              </a>{" "}
              ({credit.license})
            </p>
          )}
        </div>

        {canUse && (
          <div className="sticky bottom-0 border-t border-border bg-card/95 px-4 py-3 backdrop-blur-md">
            <button
              type="button"
              onClick={() => onUse(currentId)}
              className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-primary font-display text-base font-bold text-primary-foreground system-glow"
            >
              <Check className="h-5 w-5" />
              Usar este ejercicio
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
