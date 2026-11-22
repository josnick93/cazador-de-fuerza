import type { NutritionSnapshot } from "@/lib/nutritionApi";
import { DEFAULT_PROFILE } from "@/data/defaultProfile";
import { STORAGE_KEYS } from "@/services/storage";
import type { UserProfile, WorkoutLog } from "@/types";

export const TEST_PROFILE: UserProfile = {
  ...DEFAULT_PROFILE,
  name: "Cazador Jin",
  bodyweightKg: 78,
  onboardingCompleted: true,
  initial1RM: { banca: 100, sentadilla: 135, pesoMuerto: 165 },
};

export function seedProfile(patch: Partial<UserProfile> = {}): UserProfile {
  const profile = { ...TEST_PROFILE, ...patch };
  window.localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile));
  return profile;
}

export function seedLogs(logs: WorkoutLog[]): void {
  window.localStorage.setItem(STORAGE_KEYS.workouts, JSON.stringify(logs));
}

/** Un registro de banca por semana (la más antigua primero) con el e1RM indicado. */
export function weeklyBenchLogs(e1rms: number[], now = new Date()): WorkoutLog[] {
  return e1rms.map((e1rm, i) => {
    const date = new Date(now);
    date.setDate(date.getDate() - (e1rms.length - 1 - i) * 7);
    return {
      id: `seed-${i}`,
      sessionId: `old-${i}`,
      mesocycleId: "old",
      title: "Torso A",
      completedAt: date.toISOString(),
      durationSeconds: 3000,
      xpEarned: 0,
      exercises: [
        {
          exerciseId: "ex-banca-barra",
          plannedExerciseId: "ex-banca-barra",
          sets: [{ kg: 80, reps: 6, rir: 2, e1rm, isPr: false }],
        },
      ],
    };
  });
}

/** Datos de MacroQuest en la caché local: 14 días de diario y pesajes de 4 semanas (volumen a 0,25 kg/sem). */
export function seedMacroQuest(
  patch: Partial<NutritionSnapshot> = {},
  { protein = 150, now = new Date() }: { protein?: number; now?: Date } = {},
): void {
  const day = (n: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  };
  const snapshot: NutritionSnapshot = {
    connected: true,
    goal: "ganar",
    rateKgWeek: 0.25,
    proteinPerKg: 1.8,
    weightKg: 80,
    days: Array.from({ length: 14 }, (_, i) => ({ date: day(13 - i), kcal: 2900, protein })),
    weights: Array.from({ length: 10 }, (_, i) => ({
      date: day(27 - i * 3),
      kg: Math.round((80 + (0.25 * i * 3) / 7) * 100) / 100,
    })),
    ...patch,
  };
  window.localStorage.setItem(
    STORAGE_KEYS.nutrition,
    JSON.stringify({ snapshot, fetchedAt: now.toISOString() }),
  );
}
