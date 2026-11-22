import { differenceInCalendarDays, format, startOfWeek } from "date-fns";
import type { LoggedSet, WeeklyE1rmPoint, WorkoutLog } from "@/types";

export interface SetWithContext extends LoggedSet {
  exerciseId: string;
  completedAt: string;
  logId: string;
}

export function allSets(logs: WorkoutLog[], exerciseIds?: string[]): SetWithContext[] {
  const filter = exerciseIds ? new Set(exerciseIds) : null;
  return logs.flatMap((log) =>
    log.exercises
      .filter((ex) => !filter || filter.has(ex.exerciseId))
      .flatMap((ex) =>
        ex.sets.map((set) => ({
          ...set,
          exerciseId: ex.exerciseId,
          completedAt: log.completedAt,
          logId: log.id,
        })),
      ),
  );
}

export function formatSet(set: Pick<LoggedSet, "kg" | "reps" | "rir">): string {
  return `${set.kg.toString().replace(".", ",")} kg × ${set.reps} @ RIR ${set.rir}`;
}

export function bestE1rm(logs: WorkoutLog[], exerciseId: string): number {
  return allSets(logs, [exerciseId]).reduce((max, s) => Math.max(max, s.e1rm), 0);
}

/** Mejor e1RM por semana (lunes-domingo) de las semanas con datos, las `limit` más recientes. */
export function weeklyBestE1rm(
  logs: WorkoutLog[],
  exerciseIds: string[],
  limit = 8,
): WeeklyE1rmPoint[] {
  const byWeek = new Map<string, { start: Date; best: SetWithContext }>();
  for (const set of allSets(logs, exerciseIds)) {
    const start = startOfWeek(new Date(set.completedAt), { weekStartsOn: 1 });
    const key = start.toISOString();
    const current = byWeek.get(key);
    if (!current || set.e1rm > current.best.e1rm) byWeek.set(key, { start, best: set });
  }
  return [...byWeek.values()]
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .slice(-limit)
    .map((w, i) => ({
      week: format(w.start, "dd/MM"),
      weekIndex: i + 1,
      e1rmKg: w.best.e1rm,
      bestSet: formatSet(w.best),
    }));
}

export function relativeDayLabel(iso: string, now = new Date()): string {
  const days = differenceInCalendarDays(now, new Date(iso));
  if (days <= 0) return "Hoy";
  if (days === 1) return "Ayer";
  if (days < 7) return `Hace ${days} días`;
  const weeks = Math.floor(days / 7);
  return weeks === 1 ? "Hace 1 semana" : `Hace ${weeks} semanas`;
}
