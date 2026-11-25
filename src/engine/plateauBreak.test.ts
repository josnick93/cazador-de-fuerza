import { describe, expect, it } from "vitest";
import { EXERCISE_CATALOG } from "@/data/exercises";
import type { Mesocycle, WorkoutLog } from "@/types";
import { generateMesocycle, type GeneratorInput } from "./generator";
import {
  alternateRepRange,
  applyPlateauBreak,
  exerciseExposures,
  nextBreakKind,
  stalledSessions,
  type Exposure,
} from "./plateauBreak";

const ex = (id: string) => EXERCISE_CATALOG.find((e) => e.id === id)!;
const input: GeneratorInput = {
  goal: "hipertrofia",
  daysPerWeek: 3,
  sessionMinutes: 60,
  equipment: "gimnasio",
  bodyweightKg: 78,
  initial1RM: { banca: 100, sentadilla: 135, pesoMuerto: 165 },
};
const meso = (): Mesocycle =>
  generateMesocycle(input, EXERCISE_CATALOG, { id: "m", createdAt: "2026-01-01" });

const exp = (e1rm: number, extra: Partial<Exposure> = {}): Exposure => ({
  e1rm,
  deload: false,
  ...extra,
});

/** Primera sesión con el ejercicio y su prescripción. */
function firstWith(m: Mesocycle, exerciseId: string) {
  for (const week of m.weeks)
    for (const session of week.sessions) {
      const pe = session.exercises.find((e) => e.exerciseId === exerciseId);
      if (pe) return { session, pe };
    }
  throw new Error(`sin ${exerciseId}`);
}

function futureOf(m: Mesocycle, fromSessionId: string, exerciseId: string) {
  const all = m.weeks.flatMap((w) => w.sessions.map((s) => ({ w, s })));
  const idx = all.findIndex(({ s }) => s.id === fromSessionId);
  return all
    .slice(idx + 1)
    .flatMap(({ w, s }) =>
      s.exercises.filter((e) => e.exerciseId === exerciseId).map((pe) => ({ phase: w.phase, pe })),
    );
}

describe("detección por ejercicio", () => {
  it("estancado si las 3 últimas sesiones no superan la mejor anterior en +1 %", () => {
    expect(stalledSessions([exp(100), exp(100.5), exp(99), exp(100.8)])).toBe(3);
    expect(stalledSessions([exp(100), exp(100.5), exp(99), exp(102)])).toBe(0);
    // Hacen falta 4 sesiones.
    expect(stalledSessions([exp(100), exp(99), exp(99)])).toBe(0);
  });

  it("no cuenta descargas y empieza de cero tras un cambio", () => {
    expect(stalledSessions([exp(100), exp(90, { deload: true }), exp(99), exp(100)])).toBe(0);
    expect(
      stalledSessions([
        exp(110),
        exp(110),
        exp(105, { plateauBreak: "descarga" }),
        exp(95),
        exp(97),
      ]),
    ).toBe(0);
  });

  it("alterna descarga → rango → variante → descarga", () => {
    expect(nextBreakKind([exp(100)])).toBe("descarga");
    expect(nextBreakKind([exp(100, { plateauBreak: "descarga" }), exp(99)])).toBe("rango");
    expect(nextBreakKind([exp(100, { plateauBreak: "rango" })])).toBe("variante");
    expect(nextBreakKind([exp(100, { plateauBreak: "variante" })])).toBe("descarga");
  });

  it("lee el historial: una entrada por sesión y marca descargas y cambios", () => {
    const set = (e1rm: number) => ({ kg: 80, reps: 8, rir: 2, e1rm, isPr: false });
    const logs: WorkoutLog[] = [
      {
        id: "b",
        sessionId: "s2",
        mesocycleId: "m",
        title: "",
        completedAt: "2026-01-08T10:00:00Z",
        durationSeconds: 0,
        xpEarned: 0,
        deload: true,
        exercises: [
          {
            exerciseId: "ex-banca-barra",
            plannedExerciseId: "ex-banca-barra",
            sets: [set(90)],
            plateauBreak: "rango",
          },
        ],
      },
      {
        id: "a",
        sessionId: "s1",
        mesocycleId: "m",
        title: "",
        completedAt: "2026-01-01T10:00:00Z",
        durationSeconds: 0,
        xpEarned: 0,
        exercises: [
          {
            exerciseId: "ex-banca-barra",
            plannedExerciseId: "ex-banca-barra",
            sets: [set(95), set(101)],
          },
          { exerciseId: "ex-remo-barra", plannedExerciseId: "ex-remo-barra", sets: [set(70)] },
        ],
      },
    ];
    expect(exerciseExposures(logs, "ex-banca-barra")).toEqual([
      { e1rm: 101, deload: false },
      { e1rm: 90, deload: true, plateauBreak: "rango" },
    ]);
  });
});

describe("rango alternativo", () => {
  it("de pocas reps a más y viceversa; fijo si es %1RM", () => {
    expect(alternateRepRange("5-7", true)).toBe("8-10");
    expect(alternateRepRange("8-10", true)).toBe("5-7");
    expect(alternateRepRange("10-15", false)).toBe("8-10");
    expect(alternateRepRange("8-12", false)).toBe("12-15");
    expect(alternateRepRange("5", true)).toBeNull();
  });
});

describe("aplicar el cambio", () => {
  const base = (m: Mesocycle, exerciseId: string) => {
    const { session, pe } = firstWith(m, exerciseId);
    return {
      mesocycle: m,
      fromSessionId: session.id,
      exercise: ex(exerciseId),
      prescription: { kg: pe.targetKg, repRange: pe.repRange, targetRir: pe.targetRir },
      workKg: 80,
      e1rm: 100,
      sessionsStalled: 3,
      catalog: EXERCISE_CATALOG,
      input,
    };
  };

  it("descarga: −10 % en la siguiente sesión, con aviso", () => {
    const m = meso();
    const p = base(m, "ex-banca-barra");
    const r = applyPlateauBreak({ ...p, kind: "descarga" })!;
    expect(r.kind).toBe("descarga");
    expect(r.nextKg).toBe(72.5);
    const future = futureOf(r.mesocycle, p.fromSessionId, "ex-banca-barra");
    const before = futureOf(m, p.fromSessionId, "ex-banca-barra");
    expect(future[0]?.pe.note).toMatch(/estancamiento/);
    const exact = future.find((f) => f.pe.repRange === p.prescription.repRange);
    expect(exact?.pe.targetKg).toBe(72.5);
    expect(exact?.pe.targetReps).toBe(8);
    // El resto también baja.
    future.forEach((f, i) => expect(f.pe.targetKg).toBeLessThan(before[i]!.pe.targetKg));
  });

  it("rango: cambia las sesiones futuras salvo la descarga y recalcula la carga", () => {
    const m = meso();
    const p = base(m, "ex-banca-barra");
    const r = applyPlateauBreak({ ...p, kind: "rango" })!;
    expect(r.kind).toBe("rango");
    const future = futureOf(r.mesocycle, p.fromSessionId, "ex-banca-barra");
    const training = future.filter((f) => f.phase !== "Descarga");
    expect(training.length).toBeGreaterThan(0);
    expect(training.every((f) => f.pe.repRange === "5-7")).toBe(true);
    expect(future.filter((f) => f.phase === "Descarga").every((f) => f.pe.repRange !== "5-7")).toBe(
      true,
    );
    expect(training[0]?.pe.targetReps).toBe(5);
    expect(training[0]?.pe.note).toMatch(/5-7/);
  });

  it("variante: mismo patrón, en todas las sesiones futuras", () => {
    const m = meso();
    const p = base(m, "ex-banca-barra");
    const r = applyPlateauBreak({ ...p, kind: "variante" })!;
    expect(r.kind).toBe("variante");
    expect(futureOf(r.mesocycle, p.fromSessionId, "ex-banca-barra")).toEqual([]);
    const swapped = r.mesocycle.weeks
      .flatMap((w) => w.sessions)
      .flatMap((s) => s.exercises)
      .find((e) => e.note?.includes("en lugar de"));
    expect(ex(swapped!.exerciseId).pattern).toBe(ex("ex-banca-barra").pattern);
  });

  it("peso corporal: salta la descarga y pasa al siguiente cambio", () => {
    const m = meso();
    const bw = m.weeks
      .flatMap((w) => w.sessions)
      .flatMap((s) => s.exercises)
      .find((e) => ex(e.exerciseId).strength.base === "pesoCorporal");
    if (!bw) return;
    const r = applyPlateauBreak({ ...base(m, bw.exerciseId), kind: "descarga" });
    expect(r?.kind).not.toBe("descarga");
  });

  it("null si no quedan sesiones con el ejercicio", () => {
    const m = meso();
    const last = m.weeks.at(-1)!.sessions.at(-1)!;
    const p = base(m, "ex-banca-barra");
    expect(applyPlateauBreak({ ...p, fromSessionId: last.id, kind: "descarga" })).toBeNull();
  });
});
