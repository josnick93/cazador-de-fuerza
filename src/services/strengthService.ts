import { MAIN_LIFTS, MOCK_EXERCISES } from "@/mocks/exercises";
import { MOCK_WEEKLY_NUTRITION } from "@/mocks/nutrition";
import { MOCK_E1RM_HISTORY, MOCK_RECENT_PRS } from "@/mocks/sets";
import {
  MOCK_INITIAL_COACH_MESSAGES,
  MOCK_MESOCYCLE,
  MOCK_TODAY_WORKOUT,
  MOCK_USER_PROFILE,
  MOCK_WEEKLY_REVIEW,
} from "@/mocks/workouts";
import type {
  CoachMessage,
  CoachWeeklyReview,
  Exercise,
  LiftId,
  MesocycleWeek,
  MuscleGroup,
  PersonalRecord,
  StagnationAlert,
  UserProfile,
  WeeklyE1rmPoint,
  WeeklyNutritionPoint,
  WeightUnit,
  WorkoutPlan,
} from "@/types";

/**
 * Fórmula de e1RM solicitada: e1RM = kg × (1 + (reps + RIR) / 30)
 */
export function calculateE1rm(kg: number, reps: number, rir: number): number {
  if (kg <= 0 || reps <= 0) return 0;
  const safeRir = Math.max(0, rir);
  return Math.round(kg * (1 + (reps + safeRir) / 30) * 10) / 10;
}

export function formatWeight(kg: number, unit: WeightUnit): string {
  const value = unit === "lb" ? Math.round(kg * 2.20462 * 2) / 2 : Math.round(kg * 10) / 10;
  return `${value.toString().replace(".", ",")} ${unit}`;
}

export function getUserProfile(): UserProfile {
  return { ...MOCK_USER_PROFILE };
}

export function getTodayWorkout(): WorkoutPlan {
  return {
    ...MOCK_TODAY_WORKOUT,
    exercises: MOCK_TODAY_WORKOUT.exercises.map((item) => ({ ...item })),
  };
}

export function getAllExercises(): Exercise[] {
  return MOCK_EXERCISES;
}

export function getExerciseById(exerciseId: string): Exercise | undefined {
  return MOCK_EXERCISES.find((ex) => ex.id === exerciseId);
}

export function getExercisesByMuscle(muscle: MuscleGroup): Exercise[] {
  return MOCK_EXERCISES.filter((ex) => ex.muscle === muscle);
}

export function getMainLifts() {
  return MAIN_LIFTS;
}

export function getE1rmHistory(liftId: LiftId): WeeklyE1rmPoint[] {
  return MOCK_E1RM_HISTORY[liftId] ?? [];
}

export function getWeeklyNutrition(): WeeklyNutritionPoint[] {
  return MOCK_WEEKLY_NUTRITION;
}

export function getRecentPRs(): PersonalRecord[] {
  return MOCK_RECENT_PRS;
}

export function getStagnationAlert(liftId: LiftId): StagnationAlert | null {
  const history = getE1rmHistory(liftId);
  if (history.length < 4) return null;

  const lastFour = history.slice(-4);
  const baseline = lastFour[0];
  const recentThree = lastFour.slice(1);
  if (!baseline || recentThree.length < 3) return null;

  const hasImproved = recentThree.some((point) => point.e1rmKg > baseline.e1rmKg);
  if (hasImproved) return null;

  const liftMeta = MAIN_LIFTS.find((l) => l.id === liftId);
  const liftName = liftMeta?.shortLabel ?? "Ejercicio";

  return {
    liftId,
    liftName,
    weeksStalled: 3,
    summary: `${liftName} estancada 3 semanas`,
    cause:
      "Tu proteína media cayó de 165 g a 125 g/día en las últimas 3 semanas y acumulaste fatiga en RIR 1.",
  };
}

export function getMesocycle(): MesocycleWeek[] {
  return MOCK_MESOCYCLE;
}

export function getWeeklyReview(): CoachWeeklyReview {
  return MOCK_WEEKLY_REVIEW;
}

export function getInitialCoachMessages(): CoachMessage[] {
  return MOCK_INITIAL_COACH_MESSAGES;
}

export function getCoachReply(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (lower.includes("banca") || lower.includes("subo") || lower.includes("estanc")) {
    return "Tu Press Banca lleva 3 semanas en 102,5 kg de e1RM. Los datos de MacroQuest muestran que tu proteína bajó a 125 g/día (-24%) y tus calorías bajaron 350 kcal justo en S6-S8. Plan inmediato: sube proteína a 160 g/día, descansa 2:30 min entre series y trabaja el top set a 5 reps @ RIR 2 esta semana.";
  }
  if (lower.includes("semana") || lower.includes("ajusta")) {
    return "He reajustado tu Semana 3 (Intensificación): mantengo Sentadilla y Peso Muerto como están porque progresan bien, pero bajo 1 serie accesoria de empuje para que llegues fresco al Press Banca del lunes.";
  }
  if (lower.includes("tiempo") || lower.includes("rápido") || lower.includes("poco")) {
    return "Modo Misión Rápida (32 min): haz solo los 3 básicos de hoy — Press Banca (3×6 @ RIR 2), Remo con Barra (3×6 @ RIR 2) y Press Militar (2×8 @ RIR 2) con 2 min de descanso. Conservas el 85% del estímulo de fuerza.";
  }
  return "Recibido, Cazador. Prioriza cumplir el RIR objetivo (RIR 2 en acumulados) y mantén tu ingesta por encima de 160 g de proteína para desbloquear el siguiente rango de fuerza.";
}
