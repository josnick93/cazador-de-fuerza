/**
 * Series de aproximación (calentamiento) deterministas. No cuentan para la progresión ni para el volumen.
 * Solo en ejercicios compuestos con carga externa y solo en el primero de cada músculo de la sesión:
 * los siguientes ejercicios de ese músculo ya llegan calientes.
 */
import type { Exercise } from "@/types";

export interface WarmupSet {
  kg: number;
  reps: number;
}

export const BAR_KG = 20;

/** Ejercicios con barra olímpica: empiezan con la barra vacía. */
const BARBELL_IDS = new Set([
  "ex-sentadilla",
  "ex-sentadilla-frontal",
  "ex-peso-muerto",
  "ex-peso-muerto-rumano",
  "ex-banca-barra",
  "ex-press-inclinado",
  "ex-press-militar",
  "ex-remo-barra",
]);

const BARBELL_STEPS = [
  { pct: 0.4, reps: 8 },
  { pct: 0.6, reps: 5 },
  { pct: 0.8, reps: 3 },
];
const OTHER_STEPS = [
  { pct: 0.5, reps: 10 },
  { pct: 0.75, reps: 5 },
];

/** Por debajo de esta carga de trabajo no merece la pena aproximar. */
const MIN_WORK_KG = 20;

const round = (kg: number) => Math.round(kg / 2.5) * 2.5;

export function needsWarmup(exercise: Exercise): boolean {
  return exercise.compound && exercise.strength.base !== "pesoCorporal";
}

export function warmupSets(exercise: Exercise, workKg: number): WarmupSet[] {
  if (!needsWarmup(exercise) || workKg < MIN_WORK_KG) return [];
  const barbell = BARBELL_IDS.has(exercise.id);
  const sets: WarmupSet[] = barbell && workKg > BAR_KG ? [{ kg: BAR_KG, reps: 10 }] : [];
  for (const step of barbell ? BARBELL_STEPS : OTHER_STEPS) {
    const kg = round(workKg * step.pct);
    const prev = sets[sets.length - 1]?.kg ?? 0;
    // Cada serie más pesada que la anterior y más ligera que la de trabajo.
    if (kg > prev && kg < workKg && (!barbell || kg > BAR_KG)) sets.push({ kg, reps: step.reps });
  }
  return sets;
}

/**
 * Calentamiento de cada ejercicio de la sesión (mismo orden). Vacío si no toca: no es compuesto,
 * es peso corporal o ya se calentó ese músculo con un ejercicio anterior.
 */
export function sessionWarmups(
  items: { exercise: Exercise | undefined; workKg: number }[],
): WarmupSet[][] {
  const warmed = new Set<string>();
  return items.map(({ exercise, workKg }) => {
    if (!exercise) return [];
    const first = !warmed.has(exercise.muscle);
    warmed.add(exercise.muscle);
    return first ? warmupSets(exercise, workKg) : [];
  });
}
