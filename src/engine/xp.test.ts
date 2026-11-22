import { describe, expect, it } from "vitest";
import { addXp, rankForLevel, sessionXp } from "./xp";

describe("xp", () => {
  it("da XP por sesión, serie y PR; nada si no hubo series", () => {
    expect(sessionXp(15, 2)).toBe(100 + 75 + 100);
    expect(sessionXp(0, 0)).toBe(0);
  });

  it("sube de nivel y arrastra el sobrante", () => {
    const r = addXp({ level: 1, xp: 450, nextLevelXp: 500, hunterRank: "Rango E" }, 200);
    expect(r).toEqual({
      level: 2,
      xp: 150,
      nextLevelXp: 600,
      hunterRank: "Rango E",
      leveledUp: true,
    });
  });

  it("puede subir varios niveles de golpe y cambia de rango", () => {
    // 1250 XP: nivel 5 (gasta 500), nivel 6 (gasta 600), sobran 150; siguiente 720 → 700.
    const r = addXp({ level: 4, xp: 0, nextLevelXp: 500, hunterRank: "Rango E" }, 1250);
    expect(r).toMatchObject({ level: 6, xp: 150, nextLevelXp: 700 });
    expect(r.hunterRank).toBe("Rango D");
    expect(addXp({ level: 1, xp: 0, nextLevelXp: 500, hunterRank: "Rango E" }, 10).leveledUp).toBe(
      false,
    );
  });

  it("asigna rangos por nivel", () => {
    expect([1, 5, 10, 15, 20, 30].map(rankForLevel)).toEqual([
      "Rango E",
      "Rango D",
      "Rango C",
      "Rango B",
      "Rango A",
      "Rango S",
    ]);
  });
});
