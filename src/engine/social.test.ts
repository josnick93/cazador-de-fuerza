import { describe, expect, it } from "vitest";

import type { WorkoutLog } from "@/types";
import {
  buildFeed,
  displayName,
  rankAthletes,
  streakWeeks,
  summarizeAthlete,
  weekStartUtc,
} from "./social";

const NOW = Date.parse("2026-11-25T12:00:00Z"); // miércoles
const DAY = 86_400_000;

const log = (daysAgo: number, kg: number, isPr = false, xp = 100): WorkoutLog =>
  ({
    id: `w${daysAgo}-${kg}`,
    sessionId: "s",
    mesocycleId: "m",
    title: `Torso ${daysAgo}`,
    completedAt: new Date(NOW - daysAgo * DAY).toISOString(),
    durationSeconds: 3600,
    xpEarned: xp,
    exercises: [
      {
        exerciseId: "ex-banca-barra",
        plannedExerciseId: "ex-banca-barra",
        sets: [{ kg, reps: 1, rir: 0, e1rm: kg, isPr }],
      },
    ],
  }) as WorkoutLog;

describe("amigos: resumen", () => {
  it("la semana empieza el lunes", () => {
    expect(new Date(weekStartUtc(NOW)).toISOString()).toBe("2026-11-23T00:00:00.000Z");
  });

  it("racha de semanas seguidas, aunque esta semana aún no haya entrenado", () => {
    expect(streakWeeks([log(1, 80), log(8, 80), log(15, 80)], NOW)).toBe(3);
    expect(streakWeeks([log(8, 80), log(15, 80)], NOW)).toBe(2);
    expect(streakWeeks([log(1, 80), log(22, 80)], NOW)).toBe(1);
    expect(streakWeeks([], NOW)).toBe(0);
  });

  it("semana actual, PRs y marcas de los básicos", () => {
    const s = summarizeAthlete(
      "u1",
      "Ana",
      { hunterRank: "Rango C", level: 7 },
      [log(1, 90, true, 150), log(10, 85)],
      NOW,
    );
    expect(s).toMatchObject({
      rank: "Rango C",
      level: 7,
      weekWorkouts: 1,
      weekXp: 150,
      weekPrs: 1,
      total: null,
    });
    expect(s.lifts).toEqual([{ id: "ex-banca-barra", label: "Banca", e1rm: 90 }]);
  });

  it("nombre: el del perfil, si no el de pila de Google; nunca el correo", () => {
    expect(displayName("Jose", "José Ángel C")).toBe("Jose");
    expect(displayName("Cazador", "José Ángel C")).toBe("José");
    expect(displayName(undefined, null)).toBe("Cazador");
  });

  it("clasificación por XP de la semana y actividad ordenada por fecha", () => {
    const a = summarizeAthlete("a", "A", {}, [log(1, 80, false, 50)], NOW);
    const b = summarizeAthlete("b", "B", {}, [log(2, 80, false, 200)], NOW);
    expect(rankAthletes([a, b]).map((x) => x.id)).toEqual(["b", "a"]);
    const feed = buildFeed(
      [
        { id: "a", name: "A", logs: [log(1, 80, true), log(30, 80)] },
        { id: "b", name: "B", logs: [log(3, 80)] },
      ],
      NOW,
    );
    expect(feed.map((f) => f.userId)).toEqual(["a", "b"]);
    expect(feed[0]!.prs).toEqual(["Press Banca con Barra"]);
  });
});
