/**
 * Resúmenes deterministas para la pestaña Amigos: semana actual, racha, marcas de los básicos y actividad.
 * Lo calcula el servidor a partir de los entrenos sincronizados de cada uno.
 */
import { EXERCISE_CATALOG } from "@/data/exercises";
import type { FeedItem, FriendLift, FriendSummary } from "@/lib/friendsApi";
import type { UserProfile, WorkoutLog } from "@/types";
import { bestE1rm } from "./history";

export const SOCIAL_LIFTS = [
  { id: "ex-banca-barra", label: "Banca" },
  { id: "ex-sentadilla", label: "Sentadilla" },
  { id: "ex-peso-muerto", label: "Peso muerto" },
  { id: "ex-press-militar", label: "Militar" },
  { id: "ex-dominadas", label: "Dominadas" },
];
const TOTAL_LIFTS = ["ex-banca-barra", "ex-sentadilla", "ex-peso-muerto"];

/** Semanas hacia atrás que se miran (racha y marcas). */
export const SOCIAL_WEEKS = 26;

const DAY = 86_400_000;

/** Lunes 00:00 UTC de la semana de `ms`. */
export function weekStartUtc(ms: number): number {
  const d = new Date(ms);
  const day = (d.getUTCDay() + 6) % 7; // lunes = 0
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - day * DAY;
}

const exerciseName = (id: string) => EXERCISE_CATALOG.find((e) => e.id === id)?.name ?? id;

const prsOf = (log: WorkoutLog) =>
  log.exercises
    .filter((ex) => ex.sets.some((s) => s.isPr))
    .map((ex) => exerciseName(ex.exerciseId));

export function streakWeeks(logs: WorkoutLog[], nowMs: number): number {
  const weeks = new Set(logs.map((l) => weekStartUtc(Date.parse(l.completedAt))));
  let week = weekStartUtc(nowMs);
  // La semana en curso aún puede llegar: si está vacía, la racha cuenta desde la anterior.
  if (!weeks.has(week)) week -= 7 * DAY;
  let streak = 0;
  while (weeks.has(week)) {
    streak++;
    week -= 7 * DAY;
  }
  return streak;
}

/** Nombre visible: el del perfil de la app; si no lo cambió, el de pila de Google. Nunca el correo. */
export function displayName(profileName: string | undefined, googleName: string | null): string {
  const own = profileName?.trim();
  if (own && own !== "Cazador") return own.slice(0, 30);
  const first = googleName?.trim().split(/\s+/)[0];
  return first ? first.slice(0, 30) : (own ?? "Cazador");
}

export function summarizeAthlete(
  id: string,
  name: string,
  profile: Partial<UserProfile>,
  logs: WorkoutLog[],
  nowMs: number,
): FriendSummary {
  const weekStart = weekStartUtc(nowMs);
  const week = logs.filter((l) => Date.parse(l.completedAt) >= weekStart);
  const lifts: FriendLift[] = SOCIAL_LIFTS.map((l) => ({
    ...l,
    e1rm: bestE1rm(logs, l.id),
  })).filter((l) => l.e1rm > 0);
  const best = (liftId: string) => lifts.find((l) => l.id === liftId)?.e1rm ?? 0;
  const total = TOTAL_LIFTS.every((l) => best(l) > 0)
    ? Math.round(TOTAL_LIFTS.reduce((sum, l) => sum + best(l), 0))
    : null;
  const last = logs.reduce<string | null>(
    (acc, l) => (acc === null || l.completedAt > acc ? l.completedAt : acc),
    null,
  );
  return {
    id,
    name,
    rank: profile.hunterRank ?? "Rango E",
    level: profile.level ?? 1,
    weekWorkouts: week.length,
    weekXp: week.reduce((sum, l) => sum + (l.xpEarned ?? 0), 0),
    weekPrs: week.reduce((sum, l) => sum + prsOf(l).length, 0),
    streakWeeks: streakWeeks(logs, nowMs),
    lifts,
    total,
    lastWorkoutAt: last,
  };
}

/** Clasificación semanal: XP de la semana, luego entrenos, luego nivel. */
export function rankAthletes(list: FriendSummary[]): FriendSummary[] {
  return [...list].sort(
    (a, b) =>
      b.weekXp - a.weekXp ||
      b.weekWorkouts - a.weekWorkouts ||
      b.level - a.level ||
      a.name.localeCompare(b.name),
  );
}

export function buildFeed(
  athletes: { id: string; name: string; logs: WorkoutLog[] }[],
  nowMs: number,
  limit = 20,
  days = 14,
): FeedItem[] {
  const since = nowMs - days * DAY;
  return athletes
    .flatMap(({ id, name, logs }) =>
      logs
        .filter((l) => Date.parse(l.completedAt) >= since)
        .map((l) => ({
          userId: id,
          name,
          title: l.title,
          completedAt: l.completedAt,
          xp: l.xpEarned ?? 0,
          prs: prsOf(l),
        })),
    )
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
    .slice(0, limit);
}
