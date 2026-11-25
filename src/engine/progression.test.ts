import { describe, expect, it } from "vitest";

import { EXERCISE_CATALOG } from "@/data/exercises";
import type { Mesocycle } from "@/types";
import {
  applyDoubleProgression,
  applyProgressionToMesocycle,
  extraTopRepsFor,
  incrementFor,
  parseRepRange,
} from "./progression";

const rx = { kg: 80, repRange: "6-8", targetRir: 2 };
const sets = (...rows: [number, number, number][]) =>
  rows.map(([kg, reps, rir]) => ({ kg, reps, rir }));

describe("parseRepRange", () => {
  it("parsea rangos y valores sueltos", () => {
    expect(parseRepRange("6-8")).toEqual({ min: 6, max: 8 });
    expect(parseRepRange("8–12")).toEqual({ min: 8, max: 12 });
    expect(parseRepRange("5")).toEqual({ min: 5, max: 5 });
  });
});

describe("applyDoubleProgression", () => {
  it("sube 2,5 kg y vuelve al mínimo si todas las series llegan al máximo con RIR ≥ objetivo", () => {
    const r = applyDoubleProgression(rx, sets([80, 8, 2], [80, 8, 3], [80, 9, 2]));
    expect(r).toMatchObject({ decision: "increase-load", nextKg: 82.5, nextTargetReps: 6 });
  });

  it("no sube si una serie llega al máximo con menos RIR del objetivo", () => {
    const r = applyDoubleProgression(rx, sets([80, 8, 2], [80, 8, 1], [80, 8, 2]));
    expect(r.decision).toBe("hold");
    expect(r.nextKg).toBe(80);
    expect(r.nextTargetReps).toBe(8);
  });

  it("baja 2,5 kg si el RIR medio es ≤ objetivo − 2", () => {
    const r = applyDoubleProgression(rx, sets([80, 6, 0], [80, 5, 0], [80, 5, 0]));
    expect(r).toMatchObject({ decision: "decrease-load", nextKg: 77.5, nextTargetReps: 6 });
  });

  it("si no, +1 rep sobre la peor serie", () => {
    const r = applyDoubleProgression(rx, sets([80, 7, 2], [80, 6, 2], [80, 6, 1]));
    expect(r).toMatchObject({ decision: "add-rep", nextKg: 80, nextTargetReps: 7 });
  });

  it("la rep objetivo nunca baja del mínimo del rango", () => {
    const r = applyDoubleProgression(rx, sets([80, 4, 1], [80, 4, 1]));
    expect(r).toMatchObject({ decision: "add-rep", nextTargetReps: 6 });
  });

  it("evalúa solo las series con el peso de trabajo", () => {
    const r = applyDoubleProgression(rx, sets([82.5, 8, 2], [82.5, 8, 2], [75, 5, 0]));
    expect(r).toMatchObject({ decision: "increase-load", nextKg: 85 });
  });

  it("mantiene la carga si no hay series válidas", () => {
    const r = applyDoubleProgression(rx, []);
    expect(r).toMatchObject({ decision: "hold", nextKg: 80, nextTargetReps: 6 });
  });

  it("respeta un incremento personalizado y nunca deja el peso en 0", () => {
    expect(applyDoubleProgression(rx, sets([80, 8, 2]), 5).nextKg).toBe(85);
    const light = { kg: 2.5, repRange: "10-12", targetRir: 2 };
    expect(applyDoubleProgression(light, sets([2.5, 8, 0])).nextKg).toBe(2.5);
  });
});

describe("micro-cargas", () => {
  const ex = (id: string) => EXERCISE_CATALOG.find((e) => e.id === id)!;

  it("pierna fuerte sube de 5 en 5; el resto de 2,5 en 2,5", () => {
    expect(incrementFor(ex("ex-sentadilla"), 100)).toBe(5);
    expect(incrementFor(ex("ex-prensa"), 140)).toBe(5);
    expect(incrementFor(ex("ex-sentadilla"), 90)).toBe(2.5);
    expect(incrementFor(ex("ex-banca-barra"), 120)).toBe(2.5);
    expect(incrementFor(ex("ex-sentadilla-bulgara"), 120)).toBe(2.5);
  });

  it("si el salto es grande para la carga, pide 2 reps más antes de subir", () => {
    expect(extraTopRepsFor(2.5, 30)).toBe(2);
    expect(extraTopRepsFor(2.5, 60)).toBe(0);
    const press = { kg: 30, repRange: "6-8", targetRir: 2 };
    const at8 = [1, 2, 3].map(() => ({ kg: 30, reps: 8, rir: 2 }));
    expect(applyDoubleProgression(press, at8, 2.5, 2)).toMatchObject({
      decision: "add-rep",
      nextTargetReps: 9,
    });
    const at10 = [1, 2, 3].map(() => ({ kg: 30, reps: 10, rir: 2 }));
    expect(applyDoubleProgression(press, at10, 2.5, 2)).toMatchObject({
      decision: "increase-load",
      nextKg: 32.5,
      nextTargetReps: 6,
    });
  });
});

describe("applyProgressionToMesocycle", () => {
  const pe = (exerciseId: string, targetKg: number, repRange = "6-8", targetRir = 2) => ({
    exerciseId,
    sets: 3,
    repRange,
    targetRir,
    targetKg,
    lastSessionText: "",
  });
  const session = (id: string, exercises: ReturnType<typeof pe>[]) => ({
    id,
    dayLabel: "Lun",
    title: id,
    focus: "",
    muscles: [],
    estimatedMinutes: 50,
    exercises,
  });
  const meso: Mesocycle = {
    id: "m",
    createdAt: "",
    goal: "fuerza",
    template: "torso-pierna",
    templateName: "",
    weeks: [
      {
        weekNumber: 1,
        phase: "Acumulación",
        intensityLabel: "",
        targetRir: 2,
        sessions: [
          session("s1", [pe("banca", 80), pe("remo", 70)]),
          session("s2", [pe("sentadilla", 100)]),
        ],
      },
      {
        weekNumber: 2,
        phase: "Intensificación",
        intensityLabel: "",
        targetRir: 2,
        sessions: [session("s3", [pe("banca", 80)]), session("s4", [pe("banca", 85, "4-6", 1)])],
      },
    ],
  };
  const rx = { kg: 80, repRange: "6-8", targetRir: 2 };

  it("aplica carga y reps exactas a la siguiente sesión con el mismo esquema y desplaza el resto", () => {
    const result = applyDoubleProgression(rx, sets([80, 8, 2], [80, 8, 2]));
    const next = applyProgressionToMesocycle(meso, "s1", "banca", rx, result);
    const banca = (sid: string) =>
      next.weeks.flatMap((w) => w.sessions).find((s) => s.id === sid)!.exercises[0]!;
    expect(banca("s1").targetKg).toBe(80); // la sesión hecha no cambia
    expect(banca("s3")).toMatchObject({ targetKg: 82.5, targetReps: 6 });
    expect(banca("s4").targetKg).toBe(87.5); // otra fase: +2,5
  });

  it("add-rep fija las reps objetivo sin tocar cargas futuras", () => {
    const result = applyDoubleProgression(rx, sets([80, 6, 2], [80, 6, 2]));
    const next = applyProgressionToMesocycle(meso, "s1", "banca", rx, result);
    const all = next.weeks.flatMap((w) => w.sessions);
    expect(all[2]!.exercises[0]).toMatchObject({ targetKg: 80, targetReps: 7 });
    expect(all[3]!.exercises[0]!.targetKg).toBe(85);
    expect(all[0]!.exercises[1]!.targetKg).toBe(70);
  });

  it("no modifica el mesociclo original", () => {
    const result = applyDoubleProgression(rx, sets([80, 8, 2]));
    applyProgressionToMesocycle(meso, "s1", "banca", rx, result);
    expect(meso.weeks[1]!.sessions[0]!.exercises[0]!.targetKg).toBe(80);
  });
});
