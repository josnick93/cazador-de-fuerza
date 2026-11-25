/**
 * Romper estancamientos de forma automática y determinista, ejercicio a ejercicio.
 *
 * Un ejercicio está estancado si en sus 3 últimas sesiones (sin contar descargas) no supera en más de un 1 % el
 * mejor e1RM de las anteriores, contando solo desde el último cambio anti-estancamiento (cada cambio abre un bloque
 * nuevo). Los cambios se alternan: descarga (−10 % y volver a construir) → rango de reps nuevo → variante del mismo
 * patrón de movimiento → descarga…
 */
import { targetLoad, type GeneratorInput } from "./generator";
import { detectPlateau } from "./plateau";
import { parseRepRange, type Prescription } from "./progression";
import { findAlternatives, substitutePlannedExercise } from "./substitution";
import type {
  Exercise,
  GeneratedWeek,
  Mesocycle,
  PlannedExercise,
  PlannedSession,
  PlateauBreakKind,
  WorkoutLog,
} from "@/types";

export const BREAK_WINDOW = 3;
/** Cuánto baja la descarga del ejercicio. */
export const BREAK_DELOAD_FRACTION = 0.1;
const CYCLE: PlateauBreakKind[] = ["descarga", "rango", "variante"];

export interface Exposure {
  e1rm: number;
  deload: boolean;
  plateauBreak?: PlateauBreakKind;
}

/** Una entrada por sesión en la que se hizo el ejercicio, en orden cronológico. */
export function exerciseExposures(logs: WorkoutLog[], exerciseId: string): Exposure[] {
  return [...logs]
    .sort((a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime())
    .flatMap((log) => {
      const entries = log.exercises.filter((e) => e.exerciseId === exerciseId && e.sets.length);
      if (entries.length === 0) return [];
      const e1rm = Math.max(0, ...entries.flatMap((e) => e.sets.map((s) => s.e1rm)));
      const plateauBreak = entries.find((e) => e.plateauBreak)?.plateauBreak;
      return [{ e1rm, deload: log.deload === true, ...(plateauBreak ? { plateauBreak } : {}) }];
    });
}

/** Sesiones válidas desde el último cambio anti-estancamiento. */
function currentBlock(exposures: Exposure[]): Exposure[] {
  let lastBreak = -1;
  exposures.forEach((e, i) => {
    if (e.plateauBreak) lastBreak = i;
  });
  return exposures.slice(lastBreak + 1).filter((e) => !e.deload && e.e1rm > 0);
}

/** Sesiones seguidas sin mejorar si el ejercicio está estancado; 0 si no lo está. */
export function stalledSessions(exposures: Exposure[]): number {
  const plateau = detectPlateau(
    currentBlock(exposures).map((e) => e.e1rm),
    BREAK_WINDOW,
  );
  return plateau.stalled ? plateau.weeksStalled : 0;
}

/** Mejor e1RM del bloque actual (para recalcular cargas). */
export function blockBestE1rm(exposures: Exposure[]): number {
  return Math.max(0, ...currentBlock(exposures).map((e) => e.e1rm));
}

/** El siguiente cambio del ciclo tras el último que se aplicó a este ejercicio. */
export function nextBreakKind(exposures: Exposure[]): PlateauBreakKind {
  const last = [...exposures].reverse().find((e) => e.plateauBreak)?.plateauBreak;
  return last ? CYCLE[(CYCLE.indexOf(last) + 1) % CYCLE.length]! : "descarga";
}

/** Rango nuevo para cambiar el estímulo: de pocas reps a más y viceversa. null si es fijo (%1RM). */
export function alternateRepRange(range: string, compound: boolean): string | null {
  const { min, max } = parseRepRange(range);
  if (min === max) return null;
  if (compound) return min < 8 ? "8-10" : "5-7";
  return min < 10 ? "12-15" : "8-10";
}

interface Ctx {
  week: GeneratedWeek;
  session: PlannedSession;
  /** Primera aparición del ejercicio después de la sesión actual. */
  first: boolean;
}

/** Aplica `fn` a cada aparición de `exerciseId` en las sesiones posteriores a `fromSessionId`. */
function mapFuture(
  mesocycle: Mesocycle,
  fromSessionId: string,
  exerciseId: string,
  fn: (pe: PlannedExercise, ctx: Ctx) => PlannedExercise,
): Mesocycle {
  let started = false;
  let seen = false;
  const weeks = mesocycle.weeks.map((week) => ({
    ...week,
    sessions: week.sessions.map((session) => {
      if (!started) {
        if (session.id === fromSessionId) started = true;
        return session;
      }
      return {
        ...session,
        exercises: session.exercises.map((pe) => {
          if (pe.exerciseId !== exerciseId) return pe;
          const first = !seen;
          seen = true;
          return fn(pe, { week, session, first });
        }),
      };
    }),
  }));
  return { ...mesocycle, weeks };
}

function firstFuture(
  mesocycle: Mesocycle,
  fromSessionId: string,
  exerciseId: string,
): PlannedExercise | null {
  let found: PlannedExercise | null = null;
  mapFuture(mesocycle, fromSessionId, exerciseId, (pe, { first }) => {
    if (first) found = pe;
    return pe;
  });
  return found;
}

export interface PlateauBreakInput {
  mesocycle: Mesocycle;
  fromSessionId: string;
  exercise: Exercise;
  prescription: Prescription;
  /** Carga de trabajo de hoy (la mayor). */
  workKg: number;
  /** Mejor e1RM del bloque actual, incluida la sesión de hoy. */
  e1rm: number;
  /** Sesiones seguidas sin mejorar (para el mensaje). */
  sessionsStalled: number;
  kind: PlateauBreakKind;
  catalog: Exercise[];
  input: GeneratorInput;
  knownE1rm?: Record<string, number>;
}

export interface PlateauBreakResult {
  kind: PlateauBreakKind;
  mesocycle: Mesocycle;
  message: string;
  nextKg: number;
  nextTargetReps: number;
}

const kgText = (n: number) => `${n.toString().replace(".", ",")} kg`;

function deload(p: PlateauBreakInput): PlateauBreakResult | null {
  // Con peso corporal la carga es el cuerpo + lastre: no se puede bajar como una barra.
  if (p.exercise.strength.base === "pesoCorporal" || p.workKg <= 0) return null;
  const step = p.workKg < 40 ? 1 : 2.5;
  let nextKg = Math.round((p.workKg * (1 - BREAK_DELOAD_FRACTION)) / step) * step;
  if (nextKg >= p.workKg) nextKg = p.workKg - step;
  if (nextKg <= 0) return null;
  const nextTargetReps = parseRepRange(p.prescription.repRange).min;
  const note = `Rompe el estancamiento: −10 % y vuelve a subir desde aquí.`;
  let exactDone = false;
  // La siguiente con el mismo rango, exacta (el RIR cambia cada semana); el resto del mesociclo baja lo mismo en proporción.
  const mesocycle = mapFuture(p.mesocycle, p.fromSessionId, p.exercise.id, (pe, { first }) => {
    const same = pe.repRange === p.prescription.repRange;
    const withNote = first ? { note } : {};
    if (same && !exactDone) {
      exactDone = true;
      return { ...pe, ...withNote, targetKg: nextKg, targetReps: nextTargetReps };
    }
    const s = pe.targetKg < 40 ? 1 : 2.5;
    const kg = Math.max(s, Math.round((pe.targetKg * (1 - BREAK_DELOAD_FRACTION)) / s) * s);
    return { ...pe, ...withNote, targetKg: kg };
  });
  return {
    kind: "descarga",
    mesocycle,
    message: `${p.sessionsStalled} sesiones sin mejorar: bajas a ${kgText(nextKg)} y vuelves a construir. Así se suele superar la marca en 2-3 semanas.`,
    nextKg,
    nextTargetReps,
  };
}

function changeRange(p: PlateauBreakInput): PlateauBreakResult | null {
  const range = alternateRepRange(p.prescription.repRange, p.exercise.compound);
  if (!range || p.e1rm <= 0) return null;
  const min = parseRepRange(range).min;
  let changed = false;
  const mesocycle = mapFuture(
    p.mesocycle,
    p.fromSessionId,
    p.exercise.id,
    (pe, { week, first }) => {
      const { min: lo, max: hi } = parseRepRange(pe.repRange);
      // Las descargas y las series a %1RM se quedan como están.
      if (week.phase === "Descarga" || lo === hi || pe.repRange === range) return pe;
      changed = true;
      return {
        ...pe,
        repRange: range,
        targetReps: min,
        targetKg: targetLoad(p.e1rm, range, pe.targetRir),
        ...(first ? { note: `Rompe el estancamiento: ahora ${range} reps.` } : {}),
      };
    },
  );
  if (!changed) return null;
  const next = firstFuture(mesocycle, p.fromSessionId, p.exercise.id);
  return {
    kind: "rango",
    mesocycle,
    message: `${p.sessionsStalled} sesiones sin mejorar: pasas a ${range} reps el resto del mesociclo para darle un estímulo nuevo.`,
    nextKg: next?.targetKg ?? p.workKg,
    nextTargetReps: next?.targetReps ?? min,
  };
}

function changeVariant(p: PlateauBreakInput): PlateauBreakResult | null {
  const alternatives = findAlternatives(p.exercise, p.catalog, p.input.equipment).filter(
    (a) => a.pattern === p.exercise.pattern,
  );
  if (alternatives.length === 0) return null;
  let used: Exercise | null = null;
  const mesocycle = mapFuture(
    p.mesocycle,
    p.fromSessionId,
    p.exercise.id,
    (pe, { session, first }) => {
      const inSession = new Set(session.exercises.map((e) => e.exerciseId));
      const to = alternatives.find((a) => !inSession.has(a.id));
      if (!to) return pe;
      used ??= to;
      const swapped = substitutePlannedExercise(pe, p.exercise, to, p.input, p.knownE1rm);
      return first
        ? { ...swapped, note: `Rompe el estancamiento: ${to.name} en lugar de ${p.exercise.name}.` }
        : swapped;
    },
  );
  const to = used as Exercise | null;
  if (!to) return null;
  const next = firstFuture(mesocycle, p.fromSessionId, to.id);
  return {
    kind: "variante",
    mesocycle,
    message: `${p.sessionsStalled} sesiones sin mejorar: cambias a ${to.name} el resto del mesociclo. En el siguiente vuelve ${p.exercise.name}.`,
    nextKg: next?.targetKg ?? p.workKg,
    nextTargetReps: next?.targetReps ?? parseRepRange(next?.repRange ?? "8").min,
  };
}

const APPLY: Record<PlateauBreakKind, (p: PlateauBreakInput) => PlateauBreakResult | null> = {
  descarga: deload,
  rango: changeRange,
  variante: changeVariant,
};

/**
 * Aplica el cambio pedido al resto del mesociclo; si no se puede (peso corporal, %1RM, sin variantes…), prueba
 * el siguiente del ciclo. null si no hay ninguno aplicable o no quedan sesiones con el ejercicio.
 */
export function applyPlateauBreak(p: PlateauBreakInput): PlateauBreakResult | null {
  if (!firstFuture(p.mesocycle, p.fromSessionId, p.exercise.id)) return null;
  const start = CYCLE.indexOf(p.kind);
  for (let i = 0; i < CYCLE.length; i++) {
    const kind = CYCLE[(start + i) % CYCLE.length]!;
    const result = APPLY[kind]({ ...p, kind });
    if (result) return result;
  }
  return null;
}
