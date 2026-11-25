import { describe, expect, it } from "vitest";
import type { WorkoutLog } from "@/types";
import { weekStartLocal, weeklyGoal, weeklyGoalMessage } from "./weeklyGoal";

// Miércoles 25-11-2026, 18:00 (hora local).
const NOW = new Date(2026, 10, 25, 18);
const at = (day: number, hour = 10, month = 10): WorkoutLog => ({
  id: `l-${month}-${day}-${hour}`,
  sessionId: "s",
  mesocycleId: "m",
  title: "",
  completedAt: new Date(2026, month, day, hour).toISOString(),
  durationSeconds: 0,
  exercises: [],
  xpEarned: 0,
});

describe("objetivo semanal", () => {
  it("la semana empieza el lunes", () => {
    expect(weekStartLocal(NOW)).toEqual(new Date(2026, 10, 23));
    expect(weekStartLocal(new Date(2026, 10, 29, 23))).toEqual(new Date(2026, 10, 23));
  });

  it("cuenta los entrenos de la semana y marca los días", () => {
    const g = weeklyGoal([at(23), at(25), at(20)], 3, NOW);
    expect(g.done).toBe(2);
    expect(g.days.map((d) => d.trained)).toEqual([true, false, true, false, false, false, false]);
    expect(g.days[2]?.isToday).toBe(true);
    expect(g.days[3]?.isFuture).toBe(true);
    // Hoy ya entrenado: quedan jueves a domingo.
    expect(g.daysLeft).toBe(4);
    expect(g.status).toBe("en-camino");
    expect(weeklyGoalMessage(g)).toBe("Te falta 1 entreno; quedan 4 días.");
  });

  it("sin margen y sin posibilidad", () => {
    // Domingo sin entrenar con 1 pendiente: justo.
    const sunday = new Date(2026, 10, 29, 9);
    expect(weeklyGoal([at(23), at(25)], 3, sunday).status).toBe("justo");
    expect(weeklyGoal([at(23)], 3, sunday).status).toBe("no-llega");
  });

  it("cumplido, extras y racha de semanas", () => {
    const logs = [
      // Semana del 9: 3 (cumplida). Semana del 16: 3 (cumplida). Semana del 2: 1 (no).
      at(3),
      at(9),
      at(11),
      at(13),
      at(16),
      at(18),
      at(20),
      // Semana actual: 4.
      at(23),
      at(24),
      at(25, 9),
      at(25, 19),
    ];
    const g = weeklyGoal(logs, 3, NOW);
    expect(g.status).toBe("cumplido");
    expect(g.extra).toBe(1);
    expect(g.streak).toBe(3);
    expect(weeklyGoalMessage(g)).toMatch(/1 entreno extra/);
  });

  it("la semana en curso sin cumplir no rompe la racha", () => {
    const g = weeklyGoal([at(16), at(18), at(20), at(23)], 3, NOW);
    expect(g.streak).toBe(1);
    expect(weeklyGoal([at(23)], 3, NOW).streak).toBe(0);
  });
});
