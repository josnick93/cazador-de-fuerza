import { describe, expect, it } from "vitest";
import { EXERCISE_CATALOG } from "@/data/exercises";
import type { GeneratorInput } from "./generator";
import { findAlternatives, substitutePlannedExercise } from "./substitution";

const ex = (id: string) => EXERCISE_CATALOG.find((e) => e.id === id)!;
const input: GeneratorInput = {
  goal: "fuerza",
  daysPerWeek: 4,
  sessionMinutes: 60,
  equipment: "gimnasio",
  bodyweightKg: 78,
  initial1RM: { banca: 100, sentadilla: 135, pesoMuerto: 165 },
};
const planned = {
  exerciseId: "ex-banca-barra",
  sets: 3,
  repRange: "5-7",
  targetRir: 2,
  targetKg: 80,
  lastSessionText: "",
};

describe("findAlternatives", () => {
  it("devuelve ejercicios del mismo músculo compatibles con el equipamiento", () => {
    const gym = findAlternatives(ex("ex-banca-barra"), EXERCISE_CATALOG, "gimnasio").map(
      (e) => e.id,
    );
    expect(gym).toEqual(["ex-press-inclinado", "ex-banca-mancuernas", "ex-flexiones-lastradas"]);
    const home = findAlternatives(ex("ex-banca-mancuernas"), EXERCISE_CATALOG, "casa").map(
      (e) => e.id,
    );
    expect(home).toEqual(["ex-flexiones-lastradas"]);
  });
});

describe("substitutePlannedExercise", () => {
  it("escala la carga por la relación de e1RM y conserva series, reps y RIR", () => {
    const r = substitutePlannedExercise(
      planned,
      ex("ex-banca-barra"),
      ex("ex-press-inclinado"),
      input,
    );
    // 80 × 85 / 100 = 68 → 67,5
    expect(r).toMatchObject({
      exerciseId: "ex-press-inclinado",
      targetKg: 67.5,
      sets: 3,
      repRange: "5-7",
      targetRir: 2,
    });
    expect(r.lastSessionText).toBe("Sustituye a Press Banca con Barra");
  });

  it("usa el historial real si existe", () => {
    const r = substitutePlannedExercise(
      planned,
      ex("ex-banca-barra"),
      ex("ex-banca-mancuernas"),
      input,
      { "ex-banca-mancuernas": 60 },
    );
    expect(r.targetKg).toBe(47.5); // 80 × 60 / 100 = 48 → 47,5
  });

  it("usa pasos de 1 kg en ejercicios ligeros y nunca deja 0", () => {
    const lateral = { ...planned, exerciseId: "ex-elevaciones-laterales", targetKg: 10 };
    const r = substitutePlannedExercise(
      lateral,
      ex("ex-elevaciones-laterales"),
      ex("ex-elevaciones-mancuernas"),
      input,
    );
    expect(r.targetKg).toBe(10);
  });
});
