import type { WeeklyNutritionPoint } from "@/types";

// Proteína y kcal bajan en las últimas 3 semanas (S6-S8), coincidiendo con el estancamiento de banca
export const MOCK_WEEKLY_NUTRITION: WeeklyNutritionPoint[] = [
  { week: "S1", weekIndex: 1, proteinG: 164, kcal: 2650 },
  { week: "S2", weekIndex: 2, proteinG: 166, kcal: 2680 },
  { week: "S3", weekIndex: 3, proteinG: 162, kcal: 2620 },
  { week: "S4", weekIndex: 4, proteinG: 168, kcal: 2700 },
  { week: "S5", weekIndex: 5, proteinG: 165, kcal: 2640 },
  { week: "S6", weekIndex: 6, proteinG: 128, kcal: 2310 },
  { week: "S7", weekIndex: 7, proteinG: 122, kcal: 2260 },
  { week: "S8", weekIndex: 8, proteinG: 125, kcal: 2290 },
];
