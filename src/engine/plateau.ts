export const PLATEAU_WINDOW_WEEKS = 3;
export const PLATEAU_MIN_GAIN = 0.01;

export interface PlateauResult {
  stalled: boolean;
  /** Semanas consecutivas (al final) sin superar el máximo previo en más de un 1%. */
  weeksStalled: number;
  recentBest: number;
  previousBest: number;
}

/**
 * Estancamiento: el mejor e1RM de las últimas 3 semanas no supera en más de un 1%
 * el máximo de las semanas anteriores. `weeklyE1rm` va en orden cronológico (una
 * entrada por semana; 0 = semana sin datos). Hacen falta al menos 4 semanas.
 */
export function detectPlateau(
  weeklyE1rm: number[],
  window = PLATEAU_WINDOW_WEEKS,
  minGain = PLATEAU_MIN_GAIN,
): PlateauResult {
  const empty = { stalled: false, weeksStalled: 0, recentBest: 0, previousBest: 0 };
  if (weeklyE1rm.length < window + 1) return empty;

  const previous = weeklyE1rm.slice(0, -window);
  const recent = weeklyE1rm.slice(-window);
  const previousBest = Math.max(...previous);
  const recentBest = Math.max(...recent);
  if (previousBest <= 0 || recent.every((v) => v <= 0)) {
    return { ...empty, recentBest, previousBest };
  }

  const stalled = recentBest <= previousBest * (1 + minGain);

  // Semanas desde el último "salto" (> +1% sobre el máximo acumulado hasta entonces).
  let runningMax = weeklyE1rm[0] ?? 0;
  let lastBreakthrough = 0;
  weeklyE1rm.forEach((v, i) => {
    if (i > 0 && v > runningMax * (1 + minGain)) lastBreakthrough = i;
    runningMax = Math.max(runningMax, v);
  });
  const weeksStalled = stalled ? weeklyE1rm.length - 1 - lastBreakthrough : 0;

  return { stalled, weeksStalled, recentBest, previousBest };
}
