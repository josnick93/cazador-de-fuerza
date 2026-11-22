/** e1RM = kg × (1 + (reps + RIR) / 30). Devuelve 0 si la serie no es válida. */
export function calculateE1rm(kg: number, reps: number, rir: number): number {
  if (kg <= 0 || reps <= 0) return 0;
  const safeRir = Math.max(0, rir);
  return Math.round(kg * (1 + (reps + safeRir) / 30) * 10) / 10;
}

/** Redondea hacia abajo al múltiplo de `step` más cercano (discos de 1,25 kg por lado). */
export function roundDownToStep(kg: number, step = 2.5): number {
  if (kg <= 0) return 0;
  return Math.floor(kg / step + 1e-9) * step;
}

/** Inversa de calculateE1rm: peso para hacer `reps` dejando `rir` en reserva. */
export function weightForReps(e1rm: number, reps: number, rir: number, step = 2.5): number {
  if (e1rm <= 0 || reps <= 0) return 0;
  return roundDownToStep(e1rm / (1 + (reps + Math.max(0, rir)) / 30), step);
}
