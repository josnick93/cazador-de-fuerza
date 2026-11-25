import type { Exercise, Mesocycle } from "@/types";

export interface RepRange {
  min: number;
  max: number;
}

export interface PerformedSet {
  kg: number;
  reps: number;
  rir: number;
}

export interface Prescription {
  kg: number;
  repRange: string;
  targetRir: number;
}

export type ProgressionDecision = "increase-load" | "decrease-load" | "add-rep" | "hold";

export interface ProgressionResult {
  decision: ProgressionDecision;
  nextKg: number;
  nextTargetReps: number;
  reason: string;
}

export const DEFAULT_INCREMENT_KG = 2.5;
export const BIG_INCREMENT_KG = 5;
/** A partir de esta carga, los básicos de pierna suben de 5 en 5 (5 kg ≤ 5 %). */
export const BIG_INCREMENT_FROM_KG = 100;
/** Si el salto supera esta fracción de la carga, hay que pasar del máximo del rango antes de subir. */
const LIGHT_JUMP_FRACTION = 0.06;
export const LIGHT_EXTRA_REPS = 2;

/**
 * Salto de carga del ejercicio (micro-cargas): sentadilla, peso muerto, prensa y demás compuestos de pierna con
 * carga externa suben 5 kg desde 100 kg; el resto, 2,5 kg (lo mínimo con discos de 1,25 kg por lado o el siguiente
 * paso de la máquina o mancuerna).
 */
export function incrementFor(exercise: Exercise | undefined, workKg: number): number {
  // Pierna con carga externa (sentadillas, pesos muertos, prensa…); los de peso corporal + lastre no.
  const heavyLower =
    exercise !== undefined &&
    exercise.muscle === "Piernas" &&
    (exercise.strength.base === "sentadilla" || exercise.strength.base === "pesoMuerto");
  return heavyLower && workKg >= BIG_INCREMENT_FROM_KG ? BIG_INCREMENT_KG : DEFAULT_INCREMENT_KG;
}

/**
 * Reps de más (sobre el máximo del rango) antes de subir peso cuando el salto es grande para la carga
 * (p. ej. +2,5 kg en un militar de 30 kg o en unas laterales): así el salto no te hunde y no te estancas.
 */
export function extraTopRepsFor(incrementKg: number, workKg: number): number {
  return workKg > 0 && incrementKg / workKg > LIGHT_JUMP_FRACTION ? LIGHT_EXTRA_REPS : 0;
}

/** "6-8" → {6, 8}; "5" → {5, 5}. */
export function parseRepRange(range: string): RepRange {
  const nums = range.match(/\d+/g)?.map(Number) ?? [];
  const min = nums[0] ?? 8;
  const max = nums[1] ?? min;
  return { min: Math.min(min, max), max: Math.max(min, max) };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Doble progresión con RIR. Se evalúan las series hechas con el peso de trabajo
 * (el mayor kg usado en la sesión):
 * 1. Todas llegan al máximo del rango (+ `extraTopReps` si el salto es grande) con RIR ≥ objetivo →
 *    +incremento y reps al mínimo.
 * 2. RIR medio ≤ objetivo − 2 (demasiado duro) → −incremento y reps al mínimo.
 * 3. Si no → +1 rep sobre la peor serie (sin pasar del máximo).
 */
export function applyDoubleProgression(
  prescription: Prescription,
  sets: PerformedSet[],
  incrementKg = DEFAULT_INCREMENT_KG,
  extraTopReps = 0,
): ProgressionResult {
  const base = parseRepRange(prescription.repRange);
  const top = base.max + extraTopReps;
  const range = { min: base.min, max: top };
  const valid = sets.filter((s) => s.kg > 0 && s.reps > 0);

  if (valid.length === 0) {
    return {
      decision: "hold",
      nextKg: prescription.kg,
      nextTargetReps: range.min,
      reason: "Sin series registradas: se mantiene la carga.",
    };
  }

  const workKg = Math.max(...valid.map((s) => s.kg));
  const working = valid.filter((s) => s.kg === workKg);
  const minReps = Math.min(...working.map((s) => s.reps));
  const avgRir = working.reduce((acc, s) => acc + s.rir, 0) / working.length;

  const allAtTop = working.every((s) => s.reps >= range.max && s.rir >= prescription.targetRir);
  if (allAtTop) {
    return {
      decision: "increase-load",
      nextKg: round2(workKg + incrementKg),
      nextTargetReps: range.min,
      reason: `Todas las series a ${top} reps con RIR ≥ ${prescription.targetRir}: +${incrementKg} kg.`,
    };
  }

  if (avgRir <= prescription.targetRir - 2) {
    return {
      decision: "decrease-load",
      nextKg: round2(Math.max(incrementKg, workKg - incrementKg)),
      nextTargetReps: range.min,
      reason: `RIR medio ${round2(avgRir)} muy por debajo del objetivo (${prescription.targetRir}): −${incrementKg} kg.`,
    };
  }

  const nextReps = Math.min(range.max, Math.max(range.min, minReps + 1));
  if (nextReps === minReps) {
    return {
      decision: "hold",
      nextKg: workKg,
      nextTargetReps: nextReps,
      reason: `Ya en ${range.max} reps pero sin el RIR objetivo: se mantiene hasta dominarlo.`,
    };
  }
  return {
    decision: "add-rep",
    nextKg: workKg,
    nextTargetReps: nextReps,
    reason: `Mismo peso, objetivo ${nextReps} reps por serie.`,
  };
}

/**
 * Lleva el resultado de la progresión al resto del mesociclo (sesiones posteriores a
 * `fromSessionId`). La siguiente aparición con el mismo esquema (rango + RIR) recibe la carga y
 * reps exactas; las demás (otra fase, descarga, %1RM) se desplazan la misma diferencia de carga.
 */
export function applyProgressionToMesocycle(
  mesocycle: Mesocycle,
  fromSessionId: string,
  exerciseId: string,
  prescription: Prescription,
  result: ProgressionResult,
): Mesocycle {
  const delta = round2(result.nextKg - prescription.kg);
  let started = false;
  let exactApplied = false;

  const weeks = mesocycle.weeks.map((week) => ({
    ...week,
    sessions: week.sessions.map((session) => {
      if (!started) {
        if (session.id === fromSessionId) started = true;
        return session;
      }
      return {
        ...session,
        exercises: session.exercises.map((pe) => {
          if (pe.exerciseId !== exerciseId) return pe;
          const sameScheme =
            pe.repRange === prescription.repRange && pe.targetRir === prescription.targetRir;
          if (sameScheme && !exactApplied) {
            exactApplied = true;
            return { ...pe, targetKg: result.nextKg, targetReps: result.nextTargetReps };
          }
          if (delta === 0) return pe;
          return {
            ...pe,
            targetKg: round2(Math.max(DEFAULT_INCREMENT_KG / 2, pe.targetKg + delta)),
          };
        }),
      };
    }),
  }));

  return { ...mesocycle, weeks };
}
