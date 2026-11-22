/** Datos de MacroQuest que lee esta app (GET /api/nutrition), compartidos entre el Worker y la app. */

/** Objetivo del perfil de MacroQuest. */
export type MacroGoal = "perder" | "mantener" | "ganar";

export interface NutritionDay {
  /** YYYY-MM-DD */
  date: string;
  kcal: number;
  protein: number;
}

export interface WeightPoint {
  /** YYYY-MM-DD */
  date: string;
  kg: number;
}

export interface NutritionSnapshot {
  /** false si la cuenta no tiene datos en MacroQuest. */
  connected: boolean;
  goal: MacroGoal | null;
  /** Ritmo de cambio de peso buscado, kg/semana (magnitud). */
  rateKgWeek: number | null;
  proteinPerKg: number | null;
  /** Peso del perfil de MacroQuest (el último pesaje lo actualiza). */
  weightKg: number | null;
  days: NutritionDay[];
  weights: WeightPoint[];
}

/** Días hacia atrás que se leen del diario y de los pesajes. */
export const NUTRITION_DAYS = 56;
