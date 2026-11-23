/** Acceso seguro a localStorage (SSR, modo privado, cuota llena o JSON corrupto). */
export const STORAGE_KEYS = {
  profile: "ironquest_profile_v1",
  mesocycle: "ironquest_mesocycle_v1",
  workouts: "ironquest_workouts_v1",
  /** Copia local de los datos de MacroQuest (no se sincroniza: se vuelve a pedir). */
  nutrition: "ironquest_nutrition_v1",
  /** Entreno en curso (solo este dispositivo; ver workoutDraftService). */
  activeWorkout: "ironquest_active_workout_v1",
} as const;

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = storage()?.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    storage()?.setItem(key, JSON.stringify(value));
  } catch {
    // Sin espacio o almacenamiento bloqueado: la app sigue funcionando en memoria.
  }
}

export function removeKey(key: string): void {
  try {
    storage()?.removeItem(key);
  } catch {
    // Ignorar
  }
}
