import { describe, expect, it } from "vitest";

import type { NutritionSnapshot } from "@/lib/nutritionApi";
import type { WorkoutLog } from "@/types";
import {
  computeVerdict,
  fallbackMacroGoal,
  nutritionWeeks,
  strengthTrend,
  weightTrendKgWeek,
  type VerdictInput,
} from "./verdict";

const TODAY = new Date("2026-11-22T12:00:00"); // domingo

const isoDaysAgo = (n: number) => {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

/** `days` días seguidos hasta hoy con las mismas kcal/proteína. */
const diary = (days: number, kcal: number, protein: number) =>
  Array.from({ length: days }, (_, i) => ({ date: isoDaysAgo(days - 1 - i), kcal, protein }));

/** Pesajes cada 3 días durante 4 semanas con una pendiente de `perWeek` kg/semana. */
const weights = (start: number, perWeek: number) =>
  Array.from({ length: 10 }, (_, i) => ({
    date: isoDaysAgo(27 - i * 3),
    kg: Math.round((start + (perWeek * (i * 3)) / 7) * 100) / 100,
  }));

const snapshot = (patch: Partial<NutritionSnapshot> = {}): NutritionSnapshot => ({
  connected: true,
  goal: "ganar",
  rateKgWeek: 0.25,
  proteinPerKg: 1.8,
  weightKg: 80,
  days: diary(14, 2900, 150),
  weights: weights(80, 0.25),
  ...patch,
});

const input = (patch: Partial<VerdictInput> = {}): VerdictInput => ({
  goal: "ganar",
  trainingGoal: "fuerza",
  nutrition: snapshot(),
  strength: { pct: 3, lifts: 2 },
  bodyweightKg: 80,
  today: TODAY,
  ...patch,
});

const workout = (daysAgo: number, kg: number): WorkoutLog => {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - daysAgo);
  return {
    id: `w${daysAgo}`,
    sessionId: "s",
    mesocycleId: "m",
    title: "T",
    completedAt: d.toISOString(),
    durationSeconds: 3600,
    xpEarned: 0,
    exercises: [
      {
        exerciseId: "ex-banca-barra",
        plannedExerciseId: "ex-banca-barra",
        sets: [{ kg, reps: 5, rir: 2, e1rm: kg, isPr: false }],
      },
    ],
  } as WorkoutLog;
};

describe("datos de apoyo", () => {
  it("agrupa la nutrición por semanas de lunes a domingo, con huecos", () => {
    const weeks = nutritionWeeks(
      snapshot({
        days: [
          { date: "2026-11-17", kcal: 2000, protein: 100 },
          { date: "2026-11-22", kcal: 3000, protein: 200 },
        ],
      }),
      TODAY,
      2,
    );
    expect(weeks[0]).toMatchObject({ weekStart: "2026-11-09", daysLogged: 0, kcal: null });
    expect(weeks[1]).toMatchObject({
      weekStart: "2026-11-16",
      label: "16/11",
      daysLogged: 2,
      kcal: 2500,
      protein: 150,
    });
  });

  it("tendencia de fuerza: últimos 14 días frente a los 14 anteriores", () => {
    const logs = [workout(20, 100), workout(3, 105)];
    expect(strengthTrend(logs, ["ex-banca-barra"], TODAY)).toEqual({ pct: 5, lifts: 1 });
    expect(strengthTrend([workout(3, 105)], ["ex-banca-barra"], TODAY)).toBeNull();
  });

  it("tendencia de peso por regresión; con pocos datos no hay tendencia", () => {
    expect(weightTrendKgWeek(weights(80, -0.5), TODAY)).toBeCloseTo(-0.5, 1);
    expect(weightTrendKgWeek([{ date: isoDaysAgo(1), kg: 80 }], TODAY)).toBeNull();
  });

  it("sin perfil de MacroQuest, la hipertrofia equivale a volumen", () => {
    expect(fallbackMacroGoal("hipertrofia")).toBe("ganar");
    expect(fallbackMacroGoal("fuerza")).toBe("mantener");
  });
});

describe("veredicto", () => {
  it("volumen con fuerza subiendo, peso a ritmo y proteína suficiente: buen camino", () => {
    const v = computeVerdict(input());
    expect(v.status).toBe("bien");
    expect(v.headline).toBe("Vas por buen camino");
    expect(v.advice).toBeNull();
  });

  it("volumen sin ganar peso y fuerza estancada: pide más kcal", () => {
    const v = computeVerdict(
      input({ nutrition: snapshot({ weights: weights(80, 0) }), strength: { pct: 0, lifts: 2 } }),
    );
    expect(v.status).toBe("atento");
    expect(v.advice).toMatch(/añade unas 200 kcal/);
  });

  it("proteína baja es lo primero que se corrige", () => {
    const v = computeVerdict(input({ nutrition: snapshot({ days: diary(14, 2900, 90) }) }));
    expect(v.checks.find((c) => c.id === "proteina")).toMatchObject({ status: "mal" });
    expect(v.status).toBe("mal");
    expect(v.advice).toBe("Sube la proteína a unos 145 g al día (36 g en cada una de 4 comidas).");
  });

  it("en definición mantener la fuerza es ir bien; perderla mucho es mal", () => {
    const cut = snapshot({ goal: "perder", rateKgWeek: 0.5, weights: weights(80, -0.5) });
    expect(
      computeVerdict(input({ goal: "perder", nutrition: cut, strength: { pct: -1, lifts: 2 } }))
        .status,
    ).toBe("bien");
    const bad = computeVerdict(
      input({ goal: "perder", nutrition: cut, strength: { pct: -6, lifts: 2 } }),
    );
    expect(bad.status).toBe("mal");
    expect(bad.advice).toMatch(/fuerza baja/);
  });

  it("en definición bajando demasiado rápido avisa", () => {
    const fast = snapshot({ goal: "perder", rateKgWeek: 0.25, weights: weights(80, -1) });
    const v = computeVerdict(
      input({ goal: "perder", nutrition: fast, strength: { pct: 0, lifts: 2 } }),
    );
    expect(v.checks.find((c) => c.id === "peso")).toMatchObject({ status: "atento" });
    expect(v.advice).toMatch(/Bajas demasiado rápido/);
  });

  it("avisa si la hipertrofia choca con un déficit en MacroQuest", () => {
    const cut = snapshot({ goal: "perder", rateKgWeek: 0.5, weights: weights(80, -0.5) });
    const v = computeVerdict(
      input({
        goal: "perder",
        trainingGoal: "hipertrofia",
        nutrition: cut,
        strength: { pct: 0, lifts: 1 },
      }),
    );
    expect(v.checks.find((c) => c.id === "objetivos")).toMatchObject({ status: "atento" });
  });

  it("sin datos de nada, lo dice en vez de inventarse un veredicto", () => {
    const v = computeVerdict(
      input({ nutrition: snapshot({ days: [], weights: [] }), strength: null }),
    );
    expect(v.status).toBe("sin-datos");
    expect(v.headline).toBe("Aún faltan datos para el veredicto");
  });
});
