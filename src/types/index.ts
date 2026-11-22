export type Goal = "fuerza" | "hipertrofia" | "powerlifting" | "recomposicion";
export type Equipment = "gimnasio" | "mancuernas" | "casa";
export type WeightUnit = "kg" | "lb";
export type MuscleGroup = "Pecho" | "Espalda" | "Piernas" | "Hombros" | "Brazos" | "Core";

export type LiftId = "banca" | "sentadilla" | "peso-muerto" | "press-militar" | "dominadas";

export type MesocyclePhase = "Acumulación" | "Intensificación" | "Descarga";

export interface UserProfile {
  name: string;
  hunterRank: string;
  level: number;
  xp: number;
  nextLevelXp: number;
  goal: Goal;
  daysPerWeek: number;
  sessionMinutes: number;
  equipment: Equipment;
  bodyweightKg: number;
  unit: WeightUnit;
  macroQuestSync: boolean;
  isPremium: boolean;
  onboardingCompleted: boolean;
  initial1RM: {
    banca: number | null;
    sentadilla: number | null;
    pesoMuerto: number | null;
  };
}

export type MovementPattern =
  | "sentadilla"
  | "bisagra"
  | "empuje-horizontal"
  | "empuje-vertical"
  | "tiron-horizontal"
  | "tiron-vertical"
  | "pierna-accesorio"
  | "hombro-accesorio"
  | "biceps"
  | "triceps";

/** Base para estimar el e1RM de un ejercicio: un 1RM inicial o el peso corporal. */
export type StrengthBase = "banca" | "sentadilla" | "pesoMuerto" | "pesoCorporal";

export interface Exercise {
  id: string;
  liftId?: LiftId;
  name: string;
  muscle: MuscleGroup;
  /** Equipamiento mínimo necesario. "gimnasio" ⊃ "mancuernas" ⊃ "casa". */
  equipment: Equipment;
  pattern: MovementPattern;
  compound: boolean;
  /** e1RM estimado = base × ratio. Con pesoCorporal la carga incluye el cuerpo. */
  strength: { base: StrengthBase; ratio: number };
  defaultRestSec: number;
}

export interface PlannedExercise {
  exerciseId: string;
  sets: number;
  repRange: string;
  targetRir: number;
  targetKg: number;
  lastSessionText: string;
}

export interface WorkoutPlan {
  id: string;
  title: string;
  questCode: string;
  estimatedMinutes: number;
  muscles: MuscleGroup[];
  exercises: PlannedExercise[];
}

export interface ActiveSetRow {
  id: string;
  setNumber: number;
  kg: number;
  reps: number;
  rir: number; // 0, 1, 2, 3, 4 (4 = 4+)
  completed: boolean;
  isPr: boolean;
  e1rm: number;
}

export interface WeeklyE1rmPoint {
  week: string;
  weekIndex: number;
  e1rmKg: number;
  bestSet: string;
}

export interface WeeklyNutritionPoint {
  week: string;
  weekIndex: number;
  proteinG: number;
  kcal: number;
}

export interface PersonalRecord {
  id: string;
  exerciseName: string;
  liftId: LiftId;
  e1rmKg: number;
  setSummary: string;
  dateLabel: string;
  deltaKg: number;
}

export interface StagnationAlert {
  liftId: LiftId;
  liftName: string;
  weeksStalled: number;
  summary: string;
  cause: string;
}

export interface MesocycleDay {
  dayLabel: string;
  sessionTitle: string;
  focus: string;
  completed: boolean;
  isToday?: boolean;
}

export interface MesocycleWeek {
  weekNumber: number;
  phase: MesocyclePhase;
  intensityLabel: string;
  isCurrent: boolean;
  days: MesocycleDay[];
}

export interface CoachWeeklyReview {
  weekLabel: string;
  headline: string;
  cause: string;
  changes: string[];
}

export interface CoachMessage {
  id: string;
  role: "coach" | "user";
  text: string;
  timestamp: string;
}

export interface WorkoutSummary {
  workoutTitle: string;
  totalVolumeKg: number;
  completedSets: number;
  prsCount: number;
  prNames: string[];
  durationSeconds: number;
}

export type TemplateId = "full-body" | "torso-pierna" | "ppl" | "powerlifting";

export interface PlannedSession {
  id: string;
  dayLabel: string;
  title: string;
  focus: string;
  muscles: MuscleGroup[];
  estimatedMinutes: number;
  exercises: PlannedExercise[];
}

export interface GeneratedWeek {
  weekNumber: number;
  phase: MesocyclePhase;
  intensityLabel: string;
  targetRir: number;
  sessions: PlannedSession[];
}

export interface Mesocycle {
  id: string;
  createdAt: string;
  goal: Goal;
  template: TemplateId;
  templateName: string;
  weeks: GeneratedWeek[];
}

export interface LoggedSet {
  kg: number;
  reps: number;
  rir: number;
  e1rm: number;
  isPr: boolean;
}

export interface LoggedExercise {
  exerciseId: string;
  /** Ejercicio original del plan (difiere de exerciseId si se sustituyó). */
  plannedExerciseId: string;
  sets: LoggedSet[];
}

export interface WorkoutLog {
  id: string;
  sessionId: string;
  mesocycleId: string;
  title: string;
  completedAt: string;
  durationSeconds: number;
  exercises: LoggedExercise[];
  xpEarned: number;
}
