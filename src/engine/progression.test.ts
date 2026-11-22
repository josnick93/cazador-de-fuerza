import { describe, expect, it } from "vitest";
import { applyDoubleProgression, parseRepRange } from "./progression";

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
