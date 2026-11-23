/**
 * Aplica los cambios de plan que propone la IA, validándolos con reglas fijas: solo ejercicios del catálogo
 * disponibles con el equipamiento, sustituciones del mismo músculo, 1-6 series, al menos 3 ejercicios por sesión
 * y nunca en sesiones ya hechas. Los pesos los calcula el motor (la IA no da kg).
 */
import {
  estimateE1rm,
  isExerciseAvailable,
  targetLoad,
  type GeneratorInput,
} from "@/engine/generator";
import { substitutePlannedExercise } from "@/engine/substitution";
import type { PlanChange } from "@/lib/planApi";
import type { Exercise, Mesocycle, PlannedExercise } from "@/types";

export const MIN_EXERCISES_PER_SESSION = 3;
const MAX_SETS = 6;

export interface PlanAdjustContext {
  catalog: Exercise[];
  input: GeneratorInput;
  knownE1rm: Record<string, number>;
  doneSessionIds: Set<string>;
  nextSessionId: string | null;
}

export interface PlanAdjustResult {
  mesocycle: Mesocycle;
  /** Descripción de cada cambio aplicado. */
  applied: string[];
  rejected: { change: PlanChange; reason: string }[];
  /** La próxima sesión ha cambiado (un entreno a medias de esa sesión ya no vale). */
  nextSessionChanged: boolean;
}

const clampSets = (n: number | null) => Math.min(MAX_SETS, Math.max(1, Math.round(n ?? 3)));

/** Aplica un cambio a una sesión; devuelve los ejercicios nuevos o el motivo del rechazo. */
function applyToSession(
  exercises: PlannedExercise[],
  change: PlanChange,
  ctx: PlanAdjustContext,
): PlannedExercise[] | string {
  const byId = (id: string | null) => ctx.catalog.find((e) => e.id === id);
  const idx = exercises.findIndex((p) => p.exerciseId === change.ejercicio);
  const target = byId(change.nuevoEjercicio);
  const inSession = (id: string) => exercises.some((p) => p.exerciseId === id);

  switch (change.tipo) {
    case "sustituir": {
      const from = byId(change.ejercicio);
      if (idx < 0 || !from) return "el ejercicio no está en la sesión";
      if (!target) return "ejercicio nuevo desconocido";
      if (target.muscle !== from.muscle) return "la sustitución debe ser del mismo músculo";
      if (!isExerciseAvailable(target, ctx.input.equipment)) return "no tienes el equipamiento";
      if (inSession(target.id)) return "el ejercicio nuevo ya está en la sesión";
      const next = [...exercises];
      next[idx] = substitutePlannedExercise(
        exercises[idx]!,
        from,
        target,
        ctx.input,
        ctx.knownE1rm,
      );
      return next;
    }
    case "series": {
      if (idx < 0) return "el ejercicio no está en la sesión";
      return exercises.map((p, i) => (i === idx ? { ...p, sets: clampSets(change.series) } : p));
    }
    case "quitar": {
      if (idx < 0) return "el ejercicio no está en la sesión";
      if (exercises.length <= MIN_EXERCISES_PER_SESSION) {
        return `una sesión necesita al menos ${MIN_EXERCISES_PER_SESSION} ejercicios`;
      }
      return exercises.filter((_, i) => i !== idx);
    }
    case "anadir": {
      if (!target) return "ejercicio nuevo desconocido";
      if (!isExerciseAvailable(target, ctx.input.equipment)) return "no tienes el equipamiento";
      if (inSession(target.id)) return "el ejercicio ya está en la sesión";
      const reference =
        [...exercises].reverse().find((p) => !byId(p.exerciseId)?.compound) ?? exercises.at(-1);
      const repRange = reference?.repRange ?? "8-12";
      const rir = Math.max(...exercises.map((p) => p.targetRir), 1);
      return [
        ...exercises,
        {
          exerciseId: target.id,
          sets: clampSets(change.series),
          repRange,
          targetRir: rir,
          targetKg: targetLoad(estimateE1rm(target, ctx.input, ctx.knownE1rm), repRange, rir),
          lastSessionText: "Añadido por el coach",
        },
      ];
    }
  }
}

function describe(change: PlanChange, ctx: PlanAdjustContext, sessions: number): string {
  const name = (id: string | null) => ctx.catalog.find((e) => e.id === id)?.name ?? id ?? "";
  const scope =
    change.alcance === "proxima"
      ? "solo la próxima"
      : sessions === 1
        ? "1 sesión"
        : `${sessions} sesiones`;
  const prefix = `${change.sesion} (${scope}):`;
  switch (change.tipo) {
    case "sustituir":
      return `${prefix} ${name(change.ejercicio)} → ${name(change.nuevoEjercicio)}`;
    case "series":
      return `${prefix} ${name(change.ejercicio)} a ${clampSets(change.series)} series`;
    case "quitar":
      return `${prefix} quitar ${name(change.ejercicio)}`;
    case "anadir":
      return `${prefix} añadir ${name(change.nuevoEjercicio)} (${clampSets(change.series)} series)`;
  }
}

/** Aplica los cambios sobre una copia del mesociclo. No guarda nada. */
export function applyPlanChanges(
  mesocycle: Mesocycle,
  changes: PlanChange[],
  ctx: PlanAdjustContext,
): PlanAdjustResult {
  const result: Mesocycle = structuredClone(mesocycle);
  const applied: string[] = [];
  const rejected: PlanAdjustResult["rejected"] = [];
  let nextSessionChanged = false;

  for (const change of changes) {
    // Sesiones pendientes con ese título, en orden: la primera es la próxima vez que toca.
    const pending = result.weeks
      .flatMap((w) => w.sessions)
      .filter((s) => !ctx.doneSessionIds.has(s.id) && s.title === change.sesion);
    const targets = change.alcance === "siempre" ? pending : pending.slice(0, 1);
    if (targets.length === 0) {
      rejected.push({ change, reason: `no hay sesiones pendientes de «${change.sesion}»` });
      continue;
    }

    let count = 0;
    let reason: string | null = null;
    for (const session of targets) {
      const next = applyToSession(session.exercises, change, ctx);
      if (typeof next === "string") {
        reason ??= next;
        continue;
      }
      session.exercises = next;
      count += 1;
      if (session.id === ctx.nextSessionId) nextSessionChanged = true;
    }
    if (count > 0) applied.push(describe(change, ctx, count));
    else rejected.push({ change, reason: reason ?? "no se pudo aplicar" });
  }

  return { mesocycle: result, applied, rejected, nextSessionChanged };
}
