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
