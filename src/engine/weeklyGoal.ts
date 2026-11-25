/**
 * Objetivo semanal de constancia: entrenos de la semana (lunes-domingo, hora local) frente a los días por semana
 * del perfil, y racha de semanas cumplidas. Un entreno extra cuenta, pero no hace falta.
 */
import type { WorkoutLog } from "@/types";

export type WeeklyGoalStatus = "cumplido" | "en-camino" | "justo" | "no-llega";

export interface WeekDay {
  label: string;
  trained: boolean;
  isToday: boolean;
  isFuture: boolean;
}

export interface WeeklyGoal {
  target: number;
  done: number;
  /** Entrenos por encima del objetivo. */
  extra: number;
  /** Días que quedan de la semana, hoy incluido si aún no has entrenado hoy. */
  daysLeft: number;
  status: WeeklyGoalStatus;
  days: WeekDay[];
  /** Semanas seguidas cumplidas (la actual cuenta si ya está cumplida). */
  streak: number;
}

const LABELS = ["L", "M", "X", "J", "V", "S", "D"];

/** Medianoche del lunes de la semana de `date` (hora local). */
export function weekStartLocal(date: Date): Date {
  const day = (date.getDay() + 6) % 7; // lunes = 0
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() - day);
}

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export function weeklyGoal(logs: WorkoutLog[], daysPerWeek: number, now: Date): WeeklyGoal {
  const target = Math.max(1, Math.round(daysPerWeek));
  const start = weekStartLocal(now);
  const dates = logs.map((l) => new Date(l.completedAt));

  // Entrenos por semana (clave = lunes).
  const perWeek = new Map<string, number>();
  for (const d of dates) {
    const k = dayKey(weekStartLocal(d));
    perWeek.set(k, (perWeek.get(k) ?? 0) + 1);
  }
  const done = perWeek.get(dayKey(start)) ?? 0;

  const trainedDays = new Set(dates.map(dayKey));
  const todayKey = dayKey(now);
  const days: WeekDay[] = LABELS.map((label, i) => {
    const d = addDays(start, i);
    const key = dayKey(d);
    return {
      label,
      trained: trainedDays.has(key),
      isToday: key === todayKey,
      isFuture: d.getTime() > now.getTime() && key !== todayKey,
    };
  });

  const todayIdx = (now.getDay() + 6) % 7;
  const daysLeft = 7 - todayIdx - (trainedDays.has(todayKey) ? 1 : 0);
  const remaining = target - done;
  const status: WeeklyGoalStatus =
    remaining <= 0
      ? "cumplido"
      : remaining > daysLeft
        ? "no-llega"
        : remaining === daysLeft
          ? "justo"
          : "en-camino";

  // Racha: semanas anteriores cumplidas seguidas, más la actual si ya está cumplida.
  let streak = status === "cumplido" ? 1 : 0;
  let week = addDays(start, -7);
  while ((perWeek.get(dayKey(week)) ?? 0) >= target) {
    streak++;
    week = addDays(week, -7);
  }

  return { target, done, extra: Math.max(0, -remaining), daysLeft, status, days, streak };
}

/** Frase corta para la tarjeta de Hoy. */
export function weeklyGoalMessage(goal: WeeklyGoal): string {
  const remaining = goal.target - goal.done;
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  switch (goal.status) {
    case "cumplido":
      return goal.extra > 0
        ? `Objetivo cumplido y ${plural(goal.extra, "entreno extra", "entrenos extra")}. Descansa bien: también es progresar.`
        : "¡Objetivo cumplido! Si te apetece otro, suma; si no, a recuperar.";
    case "justo":
      return `Te ${remaining === 1 ? "falta" : "faltan"} ${plural(remaining, "entreno", "entrenos")} y ${remaining === 1 ? "queda" : "quedan"} ${plural(goal.daysLeft, "día", "días")}: sin margen.`;
    case "en-camino":
      return `Te ${remaining === 1 ? "falta" : "faltan"} ${plural(remaining, "entreno", "entrenos")}; ${goal.daysLeft === 1 ? "queda" : "quedan"} ${plural(goal.daysLeft, "día", "días")}.`;
    case "no-llega":
      return "Esta semana no da para el objetivo: haz los que puedas, cada entreno cuenta.";
  }
}
