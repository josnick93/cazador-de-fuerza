import type { UserProfile } from "@/types";

export const DEFAULT_PROFILE: UserProfile = {
  name: "Cazador",
  hunterRank: "Rango E",
  level: 1,
  xp: 0,
  nextLevelXp: 500,
  goal: "fuerza",
  daysPerWeek: 4,
  sessionMinutes: 60,
  equipment: "gimnasio",
  bodyweightKg: 75,
  unit: "kg",
  macroQuestSync: true,
  isPremium: false,
  onboardingCompleted: false,
  initial1RM: { banca: null, sentadilla: null, pesoMuerto: null },
};
