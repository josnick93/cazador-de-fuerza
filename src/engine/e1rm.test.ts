import { describe, expect, it } from "vitest";
import { calculateE1rm, roundDownToStep, weightForReps } from "./e1rm";

describe("e1rm", () => {
  it("calcula e1RM con reps + RIR", () => {
    expect(calculateE1rm(80, 8, 2)).toBe(106.7);
    expect(calculateE1rm(0, 8, 2)).toBe(0);
  });

  it("redondea hacia abajo a múltiplos de 2,5", () => {
    expect(roundDownToStep(81.9)).toBe(80);
    expect(roundDownToStep(82.5)).toBe(82.5);
  });

  it("weightForReps es la inversa conservadora de calculateE1rm", () => {
    const kg = weightForReps(106.7, 8, 2);
    expect(kg).toBe(80);
    expect(calculateE1rm(kg, 8, 2)).toBeLessThanOrEqual(106.7);
  });
});
