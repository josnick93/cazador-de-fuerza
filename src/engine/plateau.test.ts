import { describe, expect, it } from "vitest";
import { detectPlateau } from "./plateau";

describe("detectPlateau", () => {
  it("detecta estancamiento si las 3 últimas semanas no superan +1% el máximo previo", () => {
    const r = detectPlateau([95, 97.5, 99.5, 101, 102.5, 102.5, 102, 102.5]);
    expect(r).toEqual({ stalled: true, weeksStalled: 3, recentBest: 102.5, previousBest: 102.5 });
  });

  it("no hay estancamiento si alguna semana reciente supera el +1%", () => {
    const r = detectPlateau([124, 126.5, 128.5, 131, 133.5, 135, 136.5, 138]);
    expect(r.stalled).toBe(false);
    expect(r.weeksStalled).toBe(0);
  });

  it("una subida de exactamente +1% sigue contando como estancamiento", () => {
    expect(detectPlateau([100, 100, 100, 101]).stalled).toBe(true);
    expect(detectPlateau([100, 100, 100, 101.1]).stalled).toBe(false);
  });

  it("cuenta más de 3 semanas si el estancamiento viene de antes", () => {
    const r = detectPlateau([90, 100, 99, 100, 100.5, 99]);
    expect(r).toMatchObject({ stalled: true, weeksStalled: 4 });
  });

  it("detecta regresiones (e1RM reciente por debajo del máximo)", () => {
    expect(detectPlateau([110, 108, 105, 104]).stalled).toBe(true);
  });

  it("necesita al menos 4 semanas con datos", () => {
    expect(detectPlateau([100, 100, 100]).stalled).toBe(false);
    expect(detectPlateau([0, 0, 0, 0]).stalled).toBe(false);
  });
});
