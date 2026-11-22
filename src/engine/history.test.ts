import { describe, expect, it } from "vitest";
import type { WorkoutLog } from "@/types";
import { bestE1rm, relativeDayLabel, weeklyBestE1rm } from "./history";

function log(id: string, date: string, exerciseId: string, e1rms: number[]): WorkoutLog {
  return {
    id,
    sessionId: id,
    mesocycleId: "m",
    title: "T",
    completedAt: date,
    durationSeconds: 3000,
    xpEarned: 0,
    exercises: [
      {
        exerciseId,
        plannedExerciseId: exerciseId,
        sets: e1rms.map((e1rm) => ({ kg: 80, reps: 5, rir: 2, e1rm, isPr: false })),
      },
    ],
  };
}

describe("history", () => {
  const logs = [
    log("a", "2026-11-02T10:00:00", "ex-banca-barra", [95, 97]),
    log("b", "2026-11-05T10:00:00", "ex-banca-barra", [99]),
    log("c", "2026-11-10T10:00:00", "ex-banca-barra", [98]),
    log("d", "2026-11-10T11:00:00", "ex-sentadilla", [140]),
  ];

  it("agrupa el mejor e1RM por semana empezando en lunes", () => {
    const weeks = weeklyBestE1rm(logs, ["ex-banca-barra"]);
    expect(weeks.map((w) => [w.week, w.e1rmKg])).toEqual([
      ["02/11", 99],
      ["09/11", 98],
    ]);
    expect(weeks[0]!.weekIndex).toBe(1);
  });

  it("limita a las semanas más recientes", () => {
    expect(weeklyBestE1rm(logs, ["ex-banca-barra"], 1).map((w) => w.week)).toEqual(["09/11"]);
  });

  it("calcula el mejor e1RM histórico por ejercicio", () => {
    expect(bestE1rm(logs, "ex-banca-barra")).toBe(99);
    expect(bestE1rm(logs, "ex-remo-barra")).toBe(0);
  });

  it("etiqueta fechas relativas", () => {
    const now = new Date("2026-11-22T12:00:00");
    expect(relativeDayLabel("2026-11-22T08:00:00", now)).toBe("Hoy");
    expect(relativeDayLabel("2026-11-21T08:00:00", now)).toBe("Ayer");
    expect(relativeDayLabel("2026-11-18T08:00:00", now)).toBe("Hace 4 días");
    expect(relativeDayLabel("2026-11-08T08:00:00", now)).toBe("Hace 2 semanas");
  });
});
