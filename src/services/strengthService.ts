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

import { detectPlateau } from "@/engine/plateau";

export { calculateE1rm } from "@/engine/e1rm";

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

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** Causa probable cruzando con nutrición (MacroQuest): caída de proteína/kcal o fatiga. */
function explainPlateau(weeksStalled: number): string {
  const nutrition = getWeeklyNutrition();
  const recent = nutrition.slice(-weeksStalled);
  const before = nutrition.slice(0, -weeksStalled);
  const proteinBefore = Math.round(avg(before.map((n) => n.proteinG)));
  const proteinNow = Math.round(avg(recent.map((n) => n.proteinG)));
  const kcalDrop = Math.round(avg(before.map((n) => n.kcal)) - avg(recent.map((n) => n.kcal)));

  if (proteinBefore > 0 && proteinNow < proteinBefore * 0.9) {
    const kcalText = kcalDrop >= 150 ? ` y tus calorías bajaron ${kcalDrop} kcal` : "";
    return `Tu proteína media cayó de ${proteinBefore} g a ${proteinNow} g/día en las últimas ${weeksStalled} semanas${kcalText}.`;
  }
  if (kcalDrop >= 250) {
    return `Tus calorías medias bajaron ${kcalDrop} kcal en las últimas ${weeksStalled} semanas: estás en déficit.`;
  }
  return "Tu nutrición es estable: probablemente acumulas fatiga. Valora una descarga o cambiar el rango de reps.";
}

export function getStagnationAlert(liftId: LiftId): StagnationAlert | null {
  const history = getE1rmHistory(liftId);
  const plateau = detectPlateau(history.map((p) => p.e1rmKg));
  if (!plateau.stalled) return null;

  const liftName = MAIN_LIFTS.find((l) => l.id === liftId)?.shortLabel ?? "Ejercicio";
  return {
    liftId,
    liftName,
    weeksStalled: plateau.weeksStalled,
    summary: `${liftName} estancada ${plateau.weeksStalled} semanas`,
    cause: explainPlateau(plateau.weeksStalled),
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
