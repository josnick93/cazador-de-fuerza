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
 * 1. Todas llegan al máximo del rango con RIR ≥ objetivo → +incremento y reps al mínimo.
 * 2. RIR medio ≤ objetivo − 2 (demasiado duro) → −incremento y reps al mínimo.
 * 3. Si no → +1 rep sobre la peor serie (sin pasar del máximo).
 */
export function applyDoubleProgression(
  prescription: Prescription,
  sets: PerformedSet[],
  incrementKg = DEFAULT_INCREMENT_KG,
): ProgressionResult {
  const range = parseRepRange(prescription.repRange);
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
      reason: `Todas las series a ${range.max} reps con RIR ≥ ${prescription.targetRir}: +${incrementKg} kg.`,
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
