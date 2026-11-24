import { describe, expect, it } from "vitest";

import { barKgFor, plateLoad } from "./plates";

describe("discos por lado", () => {
  it("reparte de mayor a menor", () => {
    expect(plateLoad(100, 20)).toEqual({ barKg: 20, perSide: [25, 15], remainderKg: 0 });
    expect(plateLoad(62.5, 20)).toEqual({
      barKg: 20,
      perSide: [20, 1.25],
      remainderKg: 0,
    });
  });

  it("solo barra, menos que la barra y pesos que no cuadran", () => {
    expect(plateLoad(20, 20)?.perSide).toEqual([]);
    expect(plateLoad(15, 20)).toBeNull();
    expect(plateLoad(46, 20)).toEqual({ barKg: 20, perSide: [10, 2.5], remainderKg: 1 });
  });

  it("solo los ejercicios con barra; la Z pesa 10 kg", () => {
    expect(barKgFor("ex-banca-barra")).toBe(20);
    expect(barKgFor("ex-curl-barra")).toBe(10);
    expect(barKgFor("ex-prensa")).toBeNull();
    expect(barKgFor("ex-banca-mancuernas")).toBeNull();
  });
});
