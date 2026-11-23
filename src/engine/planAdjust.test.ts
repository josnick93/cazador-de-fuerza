import { describe, expect, it } from "vitest";

import { EXERCISE_CATALOG } from "@/data/exercises";
import { generateMesocycle, type GeneratorInput } from "@/engine/generator";
import type { PlanChange } from "@/lib/planApi";
import { applyPlanChanges, type PlanAdjustContext } from "./planAdjust";

const input: GeneratorInput = {
  goal: "fuerza",
  daysPerWeek: 4,
  sessionMinutes: 60,
  equipment: "gimnasio",
  bodyweightKg: 80,
  initial1RM: { banca: 100, sentadilla: 140, pesoMuerto: 170 },
};
const meso = generateMesocycle(input, EXERCISE_CATALOG, {
  id: "m1",
  createdAt: "2026-11-01T00:00:00.000Z",
});
const sessions = meso.weeks.flatMap((w) => w.sessions);
const first = sessions[0]!;
const ctx = (patch: Partial<PlanAdjustContext> = {}): PlanAdjustContext => ({
  catalog: EXERCISE_CATALOG,
  input,
  knownE1rm: {},
  doneSessionIds: new Set(),
  nextSessionId: first.id,
  ...patch,
});
const change = (patch: Partial<PlanChange>): PlanChange => ({
  tipo: "series",
  sesion: first.title,
  alcance: "proxima",
  ejercicio: first.exercises[0]!.exerciseId,
  nuevoEjercicio: null,
  series: 4,
  motivo: "",
  ...patch,
});
const sameTitle = (m: typeof meso) =>
  m.weeks.flatMap((w) => w.sessions).filter((s) => s.title === first.title);

describe("ajuste del plan con IA", () => {
  it("«próxima» cambia solo la próxima sesión con ese título; «siempre», todas las pendientes", () => {
    const once = applyPlanChanges(meso, [change({ series: 5 })], ctx());
    const [a, b] = sameTitle(once.mesocycle);
    expect(a!.exercises[0]!.sets).toBe(5);
    expect(b!.exercises[0]!.sets).toBe(first.exercises[0]!.sets);
    expect(once.nextSessionChanged).toBe(true);
    expect(once.applied[0]).toMatch(/solo la próxima/);

    const always = applyPlanChanges(
      meso,
      [change({ alcance: "siempre", series: 5 })],
      ctx({ doneSessionIds: new Set([first.id]) }),
    );
    const titled = sameTitle(always.mesocycle);
    expect(titled[0]!.exercises[0]!.sets).toBe(first.exercises[0]!.sets); // ya hecha: no se toca
    expect(titled.slice(1).every((s) => s.exercises[0]!.sets === 5)).toBe(true);
    expect(always.nextSessionChanged).toBe(false);
    expect(meso.weeks[0]!.sessions[0]!.exercises[0]!.sets).toBe(first.exercises[0]!.sets); // no muta el original
  });

  it("sustituye por otro del mismo músculo y el motor recalcula el peso", () => {
    const bench = first.exercises.find((p) => p.exerciseId === "ex-banca-barra");
    const session = bench
      ? first
      : sessions.find((s) => s.exercises.some((p) => p.exerciseId === "ex-banca-barra"))!;
    const res = applyPlanChanges(
      meso,
      [
        change({
          tipo: "sustituir",
          sesion: session.title,
          ejercicio: "ex-banca-barra",
          nuevoEjercicio: "ex-press-maquina",
          series: null,
        }),
      ],
      ctx(),
    );
    const changed = res.mesocycle.weeks
      .flatMap((w) => w.sessions)
      .find((s) => s.title === session.title)!;
    const machine = changed.exercises.find((p) => p.exerciseId === "ex-press-maquina")!;
    expect(machine.targetKg).toBeGreaterThan(0);
    expect(res.applied[0]).toContain("Press Banca con Barra → Press de Pecho en Máquina");
  });

  it("rechaza lo que no cumple las reglas", () => {
    const ex0 = first.exercises[0]!.exerciseId;
    const res = applyPlanChanges(
      meso,
      [
        change({ tipo: "sustituir", nuevoEjercicio: "ex-curl-barra" }), // otro músculo (salvo que fuera brazos)
        change({ tipo: "anadir", ejercicio: null, nuevoEjercicio: ex0 }), // ya está
        change({ tipo: "anadir", ejercicio: null, nuevoEjercicio: "ex-inventado" }),
        change({ sesion: "Sesión que no existe" }),
      ],
      ctx(),
    );
    expect(res.applied).toEqual([]);
    expect(res.rejected.map((r) => r.reason)).toEqual([
      "la sustitución debe ser del mismo músculo",
      "el ejercicio ya está en la sesión",
      "ejercicio nuevo desconocido",
      "no hay sesiones pendientes de «Sesión que no existe»",
    ]);
  });

  it("no deja una sesión con menos de 3 ejercicios y limita las series a 1-6", () => {
    let m = meso;
    const ids = first.exercises.map((p) => p.exerciseId);
    for (const id of ids)
      m = applyPlanChanges(m, [change({ tipo: "quitar", ejercicio: id })], ctx()).mesocycle;
    expect(sameTitle(m)[0]!.exercises).toHaveLength(3);
    const many = applyPlanChanges(meso, [change({ series: 12 })], ctx());
    expect(sameTitle(many.mesocycle)[0]!.exercises[0]!.sets).toBe(6);
  });

  it("añade un ejercicio disponible con peso calculado por el motor", () => {
    const res = applyPlanChanges(
      meso,
      [change({ tipo: "anadir", ejercicio: null, nuevoEjercicio: "ex-face-pull", series: 3 })],
      ctx(),
    );
    const added = sameTitle(res.mesocycle)[0]!.exercises.at(-1)!;
    expect(added).toMatchObject({
      exerciseId: "ex-face-pull",
      sets: 3,
      lastSessionText: "Añadido por el coach",
    });
    expect(added.targetKg).toBeGreaterThan(0);
    const home = applyPlanChanges(
      meso,
      [change({ tipo: "anadir", ejercicio: null, nuevoEjercicio: "ex-face-pull" })],
      ctx({ input: { ...input, equipment: "casa" } }),
    );
    expect(home.rejected[0]!.reason).toBe("no tienes el equipamiento");
  });
});
