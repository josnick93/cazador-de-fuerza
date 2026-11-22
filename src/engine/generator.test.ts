import { describe, expect, it } from "vitest";
import { EXERCISE_CATALOG } from "@/data/exercises";
import { calculateE1rm } from "./e1rm";
import {
  buildPhases,
  estimateE1rm,
  generateMesocycle,
  isExerciseAvailable,
  pickTemplate,
  type GeneratorInput,
} from "./generator";
import { parseRepRange } from "./progression";

const base: GeneratorInput = {
  goal: "fuerza",
  daysPerWeek: 4,
  sessionMinutes: 60,
  equipment: "gimnasio",
  bodyweightKg: 78,
  initial1RM: { banca: 100, sentadilla: 135, pesoMuerto: 165 },
};

const byId = new Map(EXERCISE_CATALOG.map((e) => [e.id, e]));
const gen = (patch: Partial<GeneratorInput> = {}) =>
  generateMesocycle({ ...base, ...patch }, EXERCISE_CATALOG, { id: "t", createdAt: "2026-01-01" });

describe("pickTemplate", () => {
  it("elige plantilla por días y objetivo", () => {
    expect(pickTemplate("fuerza", 2)).toBe("full-body");
    expect(pickTemplate("hipertrofia", 3)).toBe("full-body");
    expect(pickTemplate("fuerza", 4)).toBe("torso-pierna");
    expect(pickTemplate("recomposicion", 5)).toBe("ppl");
    expect(pickTemplate("hipertrofia", 6)).toBe("ppl");
    expect(pickTemplate("powerlifting", 4)).toBe("powerlifting");
  });
});

describe("buildPhases", () => {
  it("termina siempre en descarga con acumulación antes que intensificación", () => {
    expect(buildPhases(4)).toEqual(["Acumulación", "Acumulación", "Intensificación", "Descarga"]);
    expect(buildPhases(5)).toEqual([
      "Acumulación",
      "Acumulación",
      "Intensificación",
      "Intensificación",
      "Descarga",
    ]);
    expect(buildPhases(6).filter((p) => p === "Acumulación")).toHaveLength(3);
  });
});

describe("generateMesocycle", () => {
  it.each([
    ["fuerza", 5],
    ["powerlifting", 5],
    ["hipertrofia", 6],
    ["recomposicion", 4],
  ] as const)("%s dura %i semanas (entre 4 y 6) con descarga final", (goal, weeks) => {
    const m = gen({ goal });
    expect(m.weeks).toHaveLength(weeks);
    expect(m.weeks.at(-1)!.phase).toBe("Descarga");
    expect(m.weeks.at(-1)!.targetRir).toBe(4);
  });

  it.each([2, 3, 4, 5, 6])("genera %i sesiones por semana con días distintos", (days) => {
    const m = gen({ daysPerWeek: days });
    for (const week of m.weeks) {
      expect(week.sessions).toHaveLength(days);
      expect(new Set(week.sessions.map((s) => s.dayLabel)).size).toBe(days);
    }
  });

  it("Torso/Pierna con 4 días", () => {
    const titles = gen().weeks[0]!.sessions.map((s) => s.title);
    expect(titles).toEqual(["Torso A", "Pierna A", "Torso B", "Pierna B"]);
  });

  it("el número de ejercicios depende de la duración", () => {
    const count = (min: number) =>
      gen({ sessionMinutes: min }).weeks[0]!.sessions[0]!.exercises.length;
    expect(count(45)).toBe(4);
    expect(count(60)).toBe(5);
    expect(count(75)).toBe(6);
  });

  it.each(["gimnasio", "mancuernas", "casa"] as const)(
    "con equipamiento %s solo usa ejercicios disponibles y no repite en una sesión",
    (equipment) => {
      const m = gen({ equipment, daysPerWeek: 6 });
      for (const session of m.weeks.flatMap((w) => w.sessions)) {
        expect(session.exercises.length).toBeGreaterThanOrEqual(3);
        const ids = session.exercises.map((e) => e.exerciseId);
        expect(new Set(ids).size).toBe(ids.length);
        for (const id of ids) expect(isExerciseAvailable(byId.get(id)!, equipment)).toBe(true);
      }
    },
  );

  it("las cargas respetan el RIR objetivo: el e1RM previsto no supera el estimado", () => {
    const m = gen();
    for (const week of m.weeks) {
      for (const pe of week.sessions.flatMap((s) => s.exercises)) {
        const ex = byId.get(pe.exerciseId)!;
        const { min } = parseRepRange(pe.repRange);
        const predicted = calculateE1rm(pe.targetKg, min, pe.targetRir);
        expect(predicted).toBeLessThanOrEqual(estimateE1rm(ex, base) + 0.5);
        expect(pe.targetKg).toBeGreaterThan(0);
      }
    }
  });

  it("intensificación sube cargas y baja reps; la descarga quita volumen y peso", () => {
    const m = gen();
    const bench = (w: number) =>
      m.weeks[w]!.sessions[0]!.exercises.find((e) => e.exerciseId === "ex-banca-barra")!;
    expect(bench(3).targetKg).toBeGreaterThan(bench(0).targetKg);
    expect(parseRepRange(bench(3).repRange).max).toBeLessThan(parseRepRange(bench(0).repRange).max);
    expect(bench(4).sets).toBeLessThan(bench(0).sets);
    expect(bench(4).targetKg).toBeLessThan(bench(0).targetKg);
  });

  it("powerlifting programa los básicos por %1RM", () => {
    const m = gen({ goal: "powerlifting", daysPerWeek: 3 });
    const squat = m.weeks[0]!.sessions[0]!.exercises[0]!;
    expect(squat.exerciseId).toBe("ex-sentadilla");
    expect(squat.targetKg).toBe(97.5); // 72% de 135
    const peak = m.weeks[3]!.sessions[0]!.exercises[0]!;
    expect(peak.targetKg).toBe(117.5); // 87% de 135
    expect(m.weeks[0]!.sessions.map((s) => s.exercises[0]!.exerciseId)).toEqual([
      "ex-sentadilla",
      "ex-banca-barra",
      "ex-peso-muerto",
    ]);
  });

  it("sin 1RM conocido estima por peso corporal; el historial real tiene prioridad", () => {
    const unknown = { ...base, initial1RM: { banca: null, sentadilla: null, pesoMuerto: null } };
    const bench = byId.get("ex-banca-barra")!;
    expect(estimateE1rm(bench, unknown)).toBe(62); // 0,8 × 78 redondeado
    expect(estimateE1rm(bench, unknown, { "ex-banca-barra": 110 })).toBe(110);
  });

  it("es determinista", () => {
    expect(gen()).toEqual(gen());
  });
});
