/**
 * Entreno en curso guardado en este dispositivo: salir de la pantalla (o cerrar la app) no pierde las series,
 * el ejercicio actual ni los temporizadores. No se sincroniza: al terminar se guarda el entreno y se borra.
 */
import { STORAGE_KEYS, readJson, removeKey, writeJson } from "@/services/storage";
import type { ActiveSetRow, PlannedExercise } from "@/types";

/** Un borrador más antiguo que esto se descarta (entreno abandonado). */
const MAX_AGE_MS = 12 * 3600 * 1000;

export interface WorkoutDraft {
  workoutId: string;
  plannedList: PlannedExercise[];
  currentIdx: number;
  setsByExercise: Record<number, ActiveSetRow[]>;
  /** Inicio del entreno (ms): el cronómetro sigue contando aunque salgas. */
  startedAt: number;
  /** Fin del descanso en curso (ms) o null. */
  restEndsAt: number | null;
}

export function getWorkoutDraft(workoutId: string, now = Date.now()): WorkoutDraft | null {
  const draft = readJson<WorkoutDraft | null>(STORAGE_KEYS.activeWorkout, null);
  if (!draft || draft.workoutId !== workoutId || now - draft.startedAt > MAX_AGE_MS) return null;
  return draft;
}

export function saveWorkoutDraft(draft: WorkoutDraft): void {
  writeJson(STORAGE_KEYS.activeWorkout, draft);
}

export function clearWorkoutDraft(): void {
  removeKey(STORAGE_KEYS.activeWorkout);
}
