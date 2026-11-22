import { beforeEach, describe, expect, it } from "vitest";

import { fetchNutrition, getCachedNutrition } from "@/services/nutritionService";
import {
  getStagnationAlert,
  getWeeklyNutrition,
  getWeeklyVerdict,
} from "@/services/strengthService";
import { seedLogs, seedMacroQuest, seedProfile, weeklyBenchLogs } from "@/test/fixtures";

describe("veredicto con datos de MacroQuest", () => {
  beforeEach(() => window.localStorage.clear());

  it("sin datos de MacroQuest no hay veredicto ni nutrición", () => {
    seedProfile();
    expect(getWeeklyVerdict()).toBeNull();
    expect(getWeeklyNutrition()).toEqual([]);
  });

  it("con la sincronización desactivada no se usan aunque estén guardados", () => {
    seedProfile({ macroQuestSync: false });
    seedMacroQuest();
    expect(getWeeklyVerdict()).toBeNull();
  });

  it("cruza la fuerza de los básicos con la nutrición y el peso", () => {
    seedProfile({ macroQuestSync: true });
    seedLogs(weeklyBenchLogs([95, 97, 100, 103]));
    seedMacroQuest();
    const verdict = getWeeklyVerdict()!;
    expect(verdict.goal).toBe("ganar");
    expect(verdict.checks.find((c) => c.id === "fuerza")?.status).toBe("bien");
    expect(verdict.status).toBe("bien");
    expect(getWeeklyNutrition().at(-1)).toMatchObject({ kcal: 2900, proteinG: 150 });
  });

  it("el estancamiento explica la causa con la nutrición real", () => {
    seedProfile({ macroQuestSync: true });
    seedLogs(weeklyBenchLogs([100, 100, 100, 100, 100, 100]));
    seedMacroQuest();
    expect(getStagnationAlert("banca")?.cause).toMatch(
      /Conecta MacroQuest|fatiga|proteína|calorías/,
    );
  });

  it("guarda en local lo que devuelve el servidor y conserva la caché si falla", async () => {
    const body = {
      connected: true,
      goal: "perder",
      rateKgWeek: 0.5,
      proteinPerKg: 2,
      weightKg: 75,
      days: [],
      weights: [],
    };
    const ok = await fetchNutrition(async () => Response.json(body));
    expect(ok?.snapshot.goal).toBe("perder");
    expect(await fetchNutrition(async () => new Response("no", { status: 401 }))).toBeNull();
    expect(getCachedNutrition()?.snapshot.goal).toBe("perder");
  });
});
