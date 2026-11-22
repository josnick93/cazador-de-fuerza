import { roundDownToStep } from "@/engine/e1rm";
import { estimateE1rm, isExerciseAvailable, type GeneratorInput } from "@/engine/generator";
import type { Equipment, Exercise, PlannedExercise } from "@/types";

/**
 * Alternativas del mismo grupo muscular disponibles con el equipamiento (sin el actual).
 * Primero las del mismo patrón de movimiento (sustituto directo), luego el resto del músculo;
 * dentro de cada grupo se respeta el orden del catálogo.
 */
export function findAlternatives(
  current: Exercise,
  catalog: Exercise[],
  equipment: Equipment,
): Exercise[] {
  const options = catalog.filter(
    (e) => e.id !== current.id && e.muscle === current.muscle && isExerciseAvailable(e, equipment),
  );
  return [
    ...options.filter((e) => e.pattern === current.pattern),
    ...options.filter((e) => e.pattern !== current.pattern),
  ];
}

/**
 * Sustituye un ejercicio planificado conservando series, reps y RIR. La carga se escala por la
 * relación de e1RM entre ambos ejercicios, así se mantienen los ajustes de progresión previos.
 */
export function substitutePlannedExercise(
  planned: PlannedExercise,
  from: Exercise,
  to: Exercise,
  input: GeneratorInput,
  knownE1rm: Record<string, number> = {},
): PlannedExercise {
  const fromE1rm = estimateE1rm(from, input, knownE1rm);
  const toE1rm = estimateE1rm(to, input, knownE1rm);
  const scaled = fromE1rm > 0 ? (planned.targetKg * toE1rm) / fromE1rm : 0;
  const step = toE1rm < 40 ? 1 : 2.5;
  return {
    ...planned,
    exerciseId: to.id,
    targetKg: Math.max(step, roundDownToStep(scaled, step)),
    lastSessionText: `Sustituye a ${from.name}`,
  };
}
