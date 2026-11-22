import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { EXERCISE_CATALOG } from "@/data/exercises";
import { EXERCISE_GUIDES } from "@/data/exerciseGuides";
import {
  getExerciseGuide,
  getExerciseThumbnail,
  searchExerciseLibrary,
} from "@/services/strengthService";

describe("biblioteca de ejercicios", () => {
  it("todos los ejercicios del catálogo tienen ficha completa y sin huérfanas", () => {
    for (const ex of EXERCISE_CATALOG) {
      const guide = getExerciseGuide(ex.id);
      expect(guide, ex.id).not.toBeNull();
      expect(guide!.steps.length, ex.id).toBeGreaterThanOrEqual(3);
      expect(guide!.tips.length, ex.id).toBeGreaterThanOrEqual(2);
      expect(guide!.mistakes.length, ex.id).toBeGreaterThanOrEqual(2);
    }
    const ids = new Set(EXERCISE_CATALOG.map((e) => e.id));
    expect(Object.keys(EXERCISE_GUIDES).filter((id) => !ids.has(id))).toEqual([]);
  });

  it("las fotos referenciadas existen en public/", () => {
    for (const ex of EXERCISE_CATALOG) {
      for (const src of getExerciseGuide(ex.id)!.images) {
        expect(existsSync(resolve("public", `.${src}`)), src).toBe(true);
      }
    }
  });

  it("sin fuente de fotos no hay imágenes ni miniatura", () => {
    expect(getExerciseGuide("ex-flexiones-pike")!.images).toEqual([]);
    expect(getExerciseThumbnail("ex-flexiones-pike")).toBeNull();
    expect(getExerciseThumbnail("ex-sentadilla")).toBe("/exercises/ex-sentadilla/0.webp");
  });

  it("busca sin acentos ni mayúsculas y con varias palabras", () => {
    expect(searchExerciseLibrary({ query: "JALON" }).map((e) => e.id)).toEqual([
      "ex-jalon-pecho",
      "ex-jalon-neutro",
    ]);
    expect(searchExerciseLibrary({ query: "remo polea" }).map((e) => e.id)).toEqual([
      "ex-remo-polea",
    ]);
  });

  it("filtra por músculo y equipamiento exacto, ordenado por músculo", () => {
    const home = searchExerciseLibrary({ equipment: "casa" });
    expect(home.length).toBeGreaterThan(0);
    expect(home.every((e) => e.equipment === "casa")).toBe(true);
    expect(home[0]!.muscle).toBe("Pecho");

    const legs = searchExerciseLibrary({ muscle: "Piernas", equipment: "gimnasio" });
    expect(legs.every((e) => e.muscle === "Piernas" && e.equipment === "gimnasio")).toBe(true);
    expect(legs.map((e) => e.id)).toContain("ex-sentadilla-hack");
  });
});
