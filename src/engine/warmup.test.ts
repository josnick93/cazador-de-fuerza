import { describe, expect, it } from "vitest";

import { EXERCISE_CATALOG } from "@/data/exercises";
import { sessionWarmups, warmupSets } from "./warmup";

const ex = (id: string) => EXERCISE_CATALOG.find((e) => e.id === id)!;

describe("calentamiento", () => {
  it("con barra: barra vacía y 40/60/80 % redondeado a 2,5 kg", () => {
    expect(warmupSets(ex("ex-sentadilla"), 100)).toEqual([
      { kg: 20, reps: 10 },
      { kg: 40, reps: 8 },
      { kg: 60, reps: 5 },
      { kg: 80, reps: 3 },
    ]);
  });

  it("con poca carga no repite la barra ni pasa de la carga de trabajo", () => {
    expect(warmupSets(ex("ex-press-militar"), 30)).toEqual([
      { kg: 20, reps: 10 },
      { kg: 25, reps: 3 },
    ]);
    expect(warmupSets(ex("ex-press-militar"), 15)).toEqual([]);
  });

  it("mancuernas o máquina: dos aproximaciones sin barra", () => {
    expect(warmupSets(ex("ex-banca-mancuernas"), 30)).toEqual([
      { kg: 15, reps: 10 },
      { kg: 22.5, reps: 5 },
    ]);
  });

  it("aislamiento y peso corporal no calientan", () => {
    expect(warmupSets(ex("ex-curl-barra"), 40)).toEqual([]);
    expect(warmupSets(ex("ex-dominadas"), 40)).toEqual([]);
  });

  it("solo el primer ejercicio de cada músculo", () => {
    const w = sessionWarmups([
      { exercise: ex("ex-banca-barra"), workKg: 80 },
      { exercise: ex("ex-press-inclinado"), workKg: 60 },
      { exercise: ex("ex-sentadilla"), workKg: 100 },
    ]);
    expect(w[0]).toHaveLength(4);
    expect(w[1]).toEqual([]);
    expect(w[2]).toHaveLength(4);
  });
});
