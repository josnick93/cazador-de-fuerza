import { EXERCISE_CATALOG, MAIN_LIFTS } from "@/data/exercises";
import { EXERCISE_GUIDES, GUIDE_IMAGES_CREDIT } from "@/data/exerciseGuides";
import { DEFAULT_PROFILE } from "@/data/defaultProfile";
import { generateMesocycle } from "@/engine/generator";
import { allSets, bestE1rm, formatSet, relativeDayLabel, weeklyBestE1rm } from "@/engine/history";
import { detectPlateau } from "@/engine/plateau";
import {
  applyDoubleProgression,
  applyProgressionToMesocycle,
  type PerformedSet,
} from "@/engine/progression";
import { addXp, sessionXp } from "@/engine/xp";
import { findAlternatives, substitutePlannedExercise } from "@/engine/substitution";
import { MOCK_WEEKLY_NUTRITION } from "@/mocks/nutrition";
import { MOCK_INITIAL_COACH_MESSAGES, MOCK_WEEKLY_REVIEW } from "@/mocks/workouts";
import { uniqueId } from "@/lib/id";
import { STORAGE_KEYS, readJson, removeKey, writeJson } from "@/services/storage";
import { EPOCH, markDirty, resetSyncMeta } from "@/services/syncService";
import type {
  Equipment,
  ExerciseGuide,
  CoachMessage,
  CoachWeeklyReview,
  Exercise,
  GeneratedWeek,
  LiftId,
  LoggedExercise,
  LoggedSet,
  Mesocycle,
  MesocycleWeek,
  MuscleGroup,
  PersonalRecord,
  PlannedExercise,
  PlannedSession,
  ProgressionNote,
  StagnationAlert,
  UserProfile,
  WeeklyE1rmPoint,
  WeeklyNutritionPoint,
  WeightUnit,
  WorkoutLog,
  WorkoutPlan,
  WorkoutSummary,
} from "@/types";

import { calculateE1rm } from "@/engine/e1rm";

export { calculateE1rm };

export function formatWeight(kg: number, unit: WeightUnit): string {
  const value = unit === "lb" ? Math.round(kg * 2.20462 * 2) / 2 : Math.round(kg * 10) / 10;
  return `${value.toString().replace(".", ",")} ${unit}`;
}

// ── Perfil ──────────────────────────────────────────────────────────────────

export function getDefaultProfile(): UserProfile {
  return { ...DEFAULT_PROFILE, initial1RM: { ...DEFAULT_PROFILE.initial1RM } };
}

export function getUserProfile(): UserProfile {
  const saved = readJson<Partial<UserProfile> | null>(STORAGE_KEYS.profile, null);
  return saved ? { ...getDefaultProfile(), ...saved } : getDefaultProfile();
}

export function saveUserProfile(profile: UserProfile): void {
  writeJson(STORAGE_KEYS.profile, profile);
  markDirty("profile", "me");
}

// ── Ejercicios ──────────────────────────────────────────────────────────────

export function getAllExercises(): Exercise[] {
  return EXERCISE_CATALOG;
}

export function getExerciseById(exerciseId: string): Exercise | undefined {
  return EXERCISE_CATALOG.find((ex) => ex.id === exerciseId);
}

export function getExercisesByMuscle(muscle: MuscleGroup): Exercise[] {
  return EXERCISE_CATALOG.filter((ex) => ex.muscle === muscle);
}

export function getMainLifts() {
  return MAIN_LIFTS;
}

function liftExerciseId(liftId: LiftId): string | undefined {
  return EXERCISE_CATALOG.find((ex) => ex.liftId === liftId)?.id;
}

/** Alternativas al ejercicio (mismo músculo) según el equipamiento del perfil. */
export function getAlternatives(exerciseId: string): Exercise[] {
  const current = getExerciseById(exerciseId);
  return current ? findAlternatives(current, EXERCISE_CATALOG, getUserProfile().equipment) : [];
}

export function getExerciseGuide(exerciseId: string): ExerciseGuide | null {
  const content = EXERCISE_GUIDES[exerciseId];
  if (!content) return null;
  const { source, summary, steps, tips, mistakes } = content;
  return {
    exerciseId,
    summary,
    steps,
    tips,
    mistakes,
    images: source ? [0, 1].map((i) => `/exercises/${exerciseId}/${i}.webp`) : [],
  };
}

export interface LibraryFilters {
  query?: string;
  muscle?: MuscleGroup | "todos";
  equipment?: Equipment | "todo";
}

const normalizeText = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const MUSCLE_ORDER: MuscleGroup[] = ["Pecho", "Espalda", "Piernas", "Hombros", "Brazos", "Core"];

/** Biblioteca filtrada por texto (sin acentos), músculo y equipamiento exacto; ordenada por músculo. */
export function searchExerciseLibrary(filters: LibraryFilters = {}): Exercise[] {
  const words = normalizeText(filters.query ?? "")
    .split(/\s+/)
    .filter(Boolean);
  return EXERCISE_CATALOG.filter((ex) => {
    if (filters.muscle && filters.muscle !== "todos" && ex.muscle !== filters.muscle) return false;
    if (filters.equipment && filters.equipment !== "todo" && ex.equipment !== filters.equipment) {
      return false;
    }
    const haystack = normalizeText(`${ex.name} ${ex.muscle}`);
    return words.every((w) => haystack.includes(w));
  }).sort((a, b) => MUSCLE_ORDER.indexOf(a.muscle) - MUSCLE_ORDER.indexOf(b.muscle));
}

/** Atribución de las fotos de la biblioteca. */
export function getGuideImagesCredit() {
  return GUIDE_IMAGES_CREDIT;
}

/** Miniatura (foto inicial) del ejercicio, o null si no tiene fotos. */
export function getExerciseThumbnail(exerciseId: string): string | null {
  return EXERCISE_GUIDES[exerciseId]?.source ? `/exercises/${exerciseId}/0.webp` : null;
}

/** Sustituye el ejercicio planificado recalculando la carga para el nuevo. */
export function substituteExercise(
  planned: PlannedExercise,
  toExerciseId: string,
): PlannedExercise {
  const from = getExerciseById(planned.exerciseId);
  const to = getExerciseById(toExerciseId);
  if (!from || !to || from.id === to.id) return planned;
  const next = substitutePlannedExercise(planned, from, to, getUserProfile(), getKnownE1rms());
  const last = allSets(getWorkoutLogs(), [to.id]).at(-1);
  return last ? { ...next, lastSessionText: `Última vez: ${formatSet(last)}` } : next;
}

// ── Entrenos registrados ────────────────────────────────────────────────────

export function getWorkoutLogs(): WorkoutLog[] {
  return readJson<WorkoutLog[]>(STORAGE_KEYS.workouts, []);
}

export function saveWorkoutLog(log: WorkoutLog): void {
  writeJson(STORAGE_KEYS.workouts, [...getWorkoutLogs().filter((l) => l.id !== log.id), log]);
  markDirty("workouts", log.id);
}

/** Mejor e1RM registrado; para los básicos, el 1RM inicial del onboarding cuenta como marca. */
export function getBestE1rm(exerciseId: string): number {
  const logged = bestE1rm(getWorkoutLogs(), exerciseId);
  const { initial1RM } = getUserProfile();
  const baseline =
    exerciseId === liftExerciseId("banca")
      ? initial1RM.banca
      : exerciseId === liftExerciseId("sentadilla")
        ? initial1RM.sentadilla
        : exerciseId === liftExerciseId("peso-muerto")
          ? initial1RM.pesoMuerto
          : null;
  return Math.max(logged, baseline ?? 0);
}

/** Mejor e1RM registrado por ejercicio, para alimentar el generador. */
export function getKnownE1rms(): Record<string, number> {
  const known: Record<string, number> = {};
  for (const set of allSets(getWorkoutLogs())) {
    known[set.exerciseId] = Math.max(known[set.exerciseId] ?? 0, set.e1rm);
  }
  return known;
}

// ── Mesociclo ───────────────────────────────────────────────────────────────

export function getActiveMesocycle(): Mesocycle {
  const saved = readJson<Mesocycle | null>(STORAGE_KEYS.mesocycle, null);
  // Generado solo porque faltaba: pierde contra el de la nube (no es una decisión del usuario).
  return saved ?? regenerateMesocycle(getUserProfile(), { auto: true });
}

export function saveMesocycle(mesocycle: Mesocycle, { auto = false } = {}): void {
  writeJson(STORAGE_KEYS.mesocycle, mesocycle);
  markDirty("mesocycle", "me", auto ? EPOCH : undefined);
}

/** Crea un mesociclo nuevo para el perfil usando el historial real como referencia de cargas. */
export function regenerateMesocycle(profile: UserProfile, { auto = false } = {}): Mesocycle {
  const mesocycle = generateMesocycle(profile, EXERCISE_CATALOG, { knownE1rm: getKnownE1rms() });
  saveMesocycle(mesocycle, { auto });
  return mesocycle;
}

function completedSessionIds(mesocycle: Mesocycle): Set<string> {
  return new Set(
    getWorkoutLogs()
      .filter((l) => l.mesocycleId === mesocycle.id)
      .map((l) => l.sessionId),
  );
}

export interface SessionRef {
  week: GeneratedWeek;
  session: PlannedSession;
  index: number;
}

/** Próxima sesión pendiente (la "misión de hoy"); null si el mesociclo está completo. */
export function getNextSession(mesocycle = getActiveMesocycle()): SessionRef | null {
  const done = completedSessionIds(mesocycle);
  let index = 0;
  for (const week of mesocycle.weeks) {
    for (const session of week.sessions) {
      index += 1;
      if (!done.has(session.id)) return { week, session, index };
    }
  }
  return null;
}

export function getMesocycle(): MesocycleWeek[] {
  const mesocycle = getActiveMesocycle();
  const done = completedSessionIds(mesocycle);
  const next = getNextSession(mesocycle);
  const currentWeek = next?.week.weekNumber ?? mesocycle.weeks.length;

  return mesocycle.weeks.map((week) => ({
    weekNumber: week.weekNumber,
    phase: week.phase,
    intensityLabel: week.intensityLabel,
    isCurrent: week.weekNumber === currentWeek,
    days: week.sessions.map((session) => ({
      dayLabel: session.dayLabel,
      sessionTitle: session.title,
      focus: session.focus,
      completed: done.has(session.id),
      isToday: next?.session.id === session.id,
    })),
  }));
}

function toWorkoutPlan(ref: SessionRef): WorkoutPlan {
  const logs = getWorkoutLogs();
  return {
    id: ref.session.id,
    title: ref.session.title,
    questCode: `MISIÓN S${ref.week.weekNumber} · #${ref.index}`,
    estimatedMinutes: ref.session.estimatedMinutes,
    muscles: ref.session.muscles,
    exercises: ref.session.exercises.map((pe) => {
      const last = allSets(logs, [pe.exerciseId]).at(-1);
      return {
        ...pe,
        lastSessionText: last ? `Última vez: ${formatSet(last)}` : pe.lastSessionText,
      };
    }),
  };
}

/** Sesión de hoy: la próxima pendiente o, si el mesociclo terminó, la última. */
export function getTodayWorkout(): WorkoutPlan {
  const mesocycle = getActiveMesocycle();
  const next = getNextSession(mesocycle);
  if (next) return toWorkoutPlan(next);
  const week = mesocycle.weeks.at(-1)!;
  const session = week.sessions.at(-1)!;
  const total = mesocycle.weeks.reduce((n, w) => n + w.sessions.length, 0);
  return toWorkoutPlan({ week, session, index: total });
}

export interface CompleteWorkoutInput {
  workout: WorkoutPlan;
  durationSeconds: number;
  /** Mismo orden que workout.exercises; exerciseId puede diferir si se sustituyó. */
  exercises: { exerciseId: string; plannedExerciseId: string; sets: PerformedSet[] }[];
  profile: UserProfile;
}

export interface CompleteWorkoutResult {
  log: WorkoutLog;
  summary: WorkoutSummary;
  /** Cambios de XP/nivel/rango para guardar en el perfil. */
  profilePatch: Pick<UserProfile, "xp" | "level" | "nextLevelXp" | "hunterRank">;
}

/**
 * Cierra la sesión: marca PRs contra el mejor histórico, guarda el registro, aplica la doble
 * progresión al resto del mesociclo, calcula XP y, si el mesociclo terminó, genera el siguiente.
 */
export function completeWorkout(input: CompleteWorkoutInput): CompleteWorkoutResult {
  let mesocycle = getActiveMesocycle();
  const progressions: ProgressionNote[] = [];
  const prNames: string[] = [];
  let totalVolumeKg = 0;
  let completedSets = 0;

  const exercises: LoggedExercise[] = input.exercises
    .filter((ex) => ex.sets.length > 0)
    .map((ex) => {
      let best = getBestE1rm(ex.exerciseId);
      const sets: LoggedSet[] = ex.sets.map((set) => {
        const e1rm = calculateE1rm(set.kg, set.reps, set.rir);
        const isPr = best > 0 && e1rm > best;
        best = Math.max(best, e1rm);
        completedSets += 1;
        totalVolumeKg += set.kg * set.reps;
        return { kg: set.kg, reps: set.reps, rir: set.rir, e1rm, isPr };
      });
      const exercise = getExerciseById(ex.exerciseId);
      if (sets.some((s) => s.isPr) && exercise) prNames.push(exercise.name);
      return { exerciseId: ex.exerciseId, plannedExerciseId: ex.plannedExerciseId, sets };
    });

  // Progresión: solo si se hizo el ejercicio del plan (un sustituto no aparece en sesiones futuras).
  input.workout.exercises.forEach((planned, idx) => {
    const done = input.exercises[idx];
    if (!done || done.sets.length === 0 || done.exerciseId !== planned.exerciseId) return;
    const prescription = {
      kg: planned.targetKg,
      repRange: planned.repRange,
      targetRir: planned.targetRir,
    };
    const result = applyDoubleProgression(prescription, done.sets);
    mesocycle = applyProgressionToMesocycle(
      mesocycle,
      input.workout.id,
      planned.exerciseId,
      prescription,
      result,
    );
    progressions.push({
      exerciseName: getExerciseById(planned.exerciseId)?.name ?? planned.exerciseId,
      decision: result.decision,
      nextKg: result.nextKg,
      nextTargetReps: result.nextTargetReps,
    });
  });
  saveMesocycle(mesocycle);

  const xpEarned = sessionXp(completedSets, prNames.length);
  const log: WorkoutLog = {
    id: uniqueId("log"),
    sessionId: input.workout.id,
    mesocycleId: mesocycle.id,
    title: input.workout.title,
    completedAt: new Date().toISOString(),
    durationSeconds: input.durationSeconds,
    exercises,
    xpEarned,
  };
  saveWorkoutLog(log);

  const { leveledUp, ...progress } = addXp(input.profile, xpEarned);
  const profilePatch = {
    xp: progress.xp,
    level: progress.level,
    nextLevelXp: progress.nextLevelXp,
    hunterRank: progress.hunterRank,
  };

  const mesocycleCompleted = getNextSession(mesocycle) === null;
  if (mesocycleCompleted) regenerateMesocycle({ ...input.profile, ...profilePatch });

  return {
    log,
    profilePatch,
    summary: {
      workoutTitle: input.workout.title,
      totalVolumeKg: Math.round(totalVolumeKg),
      completedSets,
      prsCount: prNames.length,
      prNames,
      durationSeconds: input.durationSeconds,
      xpEarned,
      leveledUp,
      newLevel: progress.level,
      newRank: progress.hunterRank,
      progressions,
      mesocycleCompleted,
    },
  };
}

// ── Progreso ────────────────────────────────────────────────────────────────

export function getE1rmHistory(liftId: LiftId): WeeklyE1rmPoint[] {
  const exerciseId = liftExerciseId(liftId);
  return exerciseId ? weeklyBestE1rm(getWorkoutLogs(), [exerciseId]) : [];
}

export function getWeeklyNutrition(): WeeklyNutritionPoint[] {
  return MOCK_WEEKLY_NUTRITION;
}

/** Un PR por ejercicio y sesión (su mejor serie marcada como PR), los más recientes primero. */
export function getRecentPRs(limit = 4): PersonalRecord[] {
  const logs = [...getWorkoutLogs()].sort(
    (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime(),
  );
  const bestSoFar = new Map<string, number>();
  const prs: PersonalRecord[] = [];

  for (const log of logs) {
    for (const ex of log.exercises) {
      const previous = bestSoFar.get(ex.exerciseId) ?? 0;
      const top = ex.sets.filter((set) => set.isPr).sort((a, b) => b.e1rm - a.e1rm)[0];
      if (top) {
        const exercise = getExerciseById(ex.exerciseId);
        prs.push({
          id: `${log.id}:${ex.exerciseId}`,
          exerciseName: exercise?.name ?? ex.exerciseId,
          liftId: exercise?.liftId ?? "banca",
          e1rmKg: top.e1rm,
          setSummary: formatSet(top),
          dateLabel: relativeDayLabel(log.completedAt),
          deltaKg: previous > 0 ? Math.round((top.e1rm - previous) * 10) / 10 : 0,
        });
      }
      const sessionBest = ex.sets.reduce((max, set) => Math.max(max, set.e1rm), 0);
      bestSoFar.set(ex.exerciseId, Math.max(previous, sessionBest));
    }
  }
  return prs.reverse().slice(0, limit);
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

// ── Coach (mock hasta la Fase 4) ────────────────────────────────────────────

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

// ── Utilidades ──────────────────────────────────────────────────────────────

/** Borra todos los datos locales (perfil, mesociclo e historial). */
export function resetLocalData(): void {
  Object.values(STORAGE_KEYS).forEach(removeKey);
  resetSyncMeta();
}
