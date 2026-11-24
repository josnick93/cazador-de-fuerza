/**
 * Discos por lado para ejercicios con barra. Las máquinas, poleas y mancuernas van por peso total: no se calcula.
 * Juego de discos estándar de gimnasio (kg); con estos valores el reparto voraz es el óptimo.
 */

/** Barra olímpica (20 kg). */
export const OLYMPIC_BAR_KG = 20;
/** Barra Z (curl, press francés): suele pesar unos 10 kg. */
export const EZ_BAR_KG = 10;

export const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25] as const;

const BAR_BY_EXERCISE: Record<string, number> = {
  "ex-sentadilla": OLYMPIC_BAR_KG,
  "ex-sentadilla-frontal": OLYMPIC_BAR_KG,
  "ex-peso-muerto": OLYMPIC_BAR_KG,
  "ex-peso-muerto-rumano": OLYMPIC_BAR_KG,
  "ex-banca-barra": OLYMPIC_BAR_KG,
  "ex-press-inclinado": OLYMPIC_BAR_KG,
  "ex-press-militar": OLYMPIC_BAR_KG,
  "ex-remo-barra": OLYMPIC_BAR_KG,
  "ex-press-frances": EZ_BAR_KG,
  "ex-curl-barra": EZ_BAR_KG,
};

/** Peso de la barra del ejercicio, o null si no va con barra cargada con discos. */
export function barKgFor(exerciseId: string): number | null {
  return BAR_BY_EXERCISE[exerciseId] ?? null;
}

export interface PlateLoad {
  barKg: number;
  /** Discos de un lado, de más pesado a más ligero. */
  perSide: number[];
  /** Kg que no se pueden poner con discos (total − lo cargado). 0 si cuadra. */
  remainderKg: number;
}

const EPS = 1e-6;

export function plateLoad(totalKg: number, barKg: number): PlateLoad | null {
  if (totalKg < barKg - EPS) return null;
  let side = (totalKg - barKg) / 2;
  const perSide: number[] = [];
  for (const plate of PLATES_KG) {
    while (side >= plate - EPS) {
      perSide.push(plate);
      side -= plate;
    }
  }
  return { barKg, perSide, remainderKg: Math.round(side * 2 * 100) / 100 };
}
