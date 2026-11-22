import { beforeEach, describe, expect, it } from "vitest";
import { seedLogs, seedProfile, weeklyBenchLogs } from "@/test/fixtures";
import {
  completeWorkout,
  getActiveMesocycle,
  getBestE1rm,
  getE1rmHistory,
  getMesocycle,
  getRecentPRs,
  getStagnationAlert,
  getTodayWorkout,
  getUserProfile,
  regenerateMesocycle,
} from "./strengthService";

function finishToday(sets = [{ kg: 90, reps: 6, rir: 2 }]) {
  const workout = getTodayWorkout();
  const first = workout.exercises[0]!;
  return completeWorkout({
    workout,
    durationSeconds: 3000,
    exercises: [{ exerciseId: first.exerciseId, plannedExerciseId: first.exerciseId, sets }],
    profile: getUserProfile(),
  });
}

describe("strengthService (persistencia local)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("un perfil nuevo no ha hecho el onboarding", () => {
    expect(getUserProfile().onboardingCompleted).toBe(false);
  });

  it("genera y guarda el mesociclo una sola vez", () => {
    seedProfile();
    const a = getActiveMesocycle();
    expect(a.template).toBe("torso-pierna");
    expect(getActiveMesocycle().id).toBe(a.id);
  });

  it("al completar una sesión avanza a la siguiente y se refleja en el plan", () => {
    seedProfile();
    expect(getTodayWorkout().title).toBe("Torso A");
    finishToday();
    expect(getTodayWorkout().title).toBe("Pierna A");

    const week1 = getMesocycle()[0]!;
    expect(week1.isCurrent).toBe(true);
    expect(week1.days.map((d) => [d.completed, !!d.isToday])).toEqual([
      [true, false],
      [false, true],
      [false, false],
      [false, false],
    ]);
  });

  it("muestra la última serie registrada en la siguiente sesión del ejercicio", () => {
    seedProfile();
    finishToday([{ kg: 82.5, reps: 7, rir: 2 }]);
    regenerateMesocycle(getUserProfile());
    expect(getTodayWorkout().exercises[0]!.lastSessionText).toBe("Última vez: 82,5 kg × 7 @ RIR 2");
  });

  it("calcula historial, PRs y mejores marcas a partir de los registros", () => {
    seedProfile();
    expect(getBestE1rm("ex-banca-barra")).toBe(100); // 1RM inicial
    finishToday();
    expect(getBestE1rm("ex-banca-barra")).toBe(114); // 90 × (1 + 8/30)
    expect(getE1rmHistory("banca")).toHaveLength(1);
    expect(getRecentPRs()[0]).toMatchObject({
      exerciseName: "Press Banca con Barra",
      e1rmKg: 114,
      deltaKg: 0,
    });
  });

  it("regenerar usa el historial real para las cargas", () => {
    seedProfile();
    const before = getActiveMesocycle().weeks[0]!.sessions[0]!.exercises[0]!.targetKg;
    finishToday([{ kg: 100, reps: 6, rir: 2 }]);
    const after = regenerateMesocycle(getUserProfile()).weeks[0]!.sessions[0]!.exercises[0]!;
    expect(after.targetKg).toBeGreaterThan(before);
  });

  it("detecta estancamiento con el historial real", () => {
    seedProfile();
    seedLogs(weeklyBenchLogs([95, 97.5, 99.5, 101, 102.5, 102.5, 102, 102.5]));
    expect(getStagnationAlert("banca")).toMatchObject({ weeksStalled: 3 });
    expect(getStagnationAlert("sentadilla")).toBeNull();
  });

  describe("completeWorkout", () => {
    const sessionsWith = (exerciseId: string) =>
      getActiveMesocycle()
        .weeks.flatMap((w) => w.sessions)
        .flatMap((sess) => sess.exercises.filter((e) => e.exerciseId === exerciseId));

    it("aplica la progresión a las sesiones futuras del ejercicio", () => {
      seedProfile();
      const before = sessionsWith("ex-banca-barra").map((e) => e.targetKg);
      const workout = getTodayWorkout();
      const bench = workout.exercises[0]!; // 3 × 5-7 @ RIR 3 · 77,5 kg
      const { summary } = completeWorkout({
        workout,
        durationSeconds: 3000,
        exercises: workout.exercises.map((pe, i) => ({
          exerciseId: pe.exerciseId,
          plannedExerciseId: pe.exerciseId,
          sets:
            i === 0
              ? Array.from({ length: 3 }, () => ({ kg: bench.targetKg, reps: 7, rir: 3 }))
              : [],
        })),
        profile: getUserProfile(),
      });

      expect(summary.progressions).toEqual([
        {
          exerciseName: "Press Banca con Barra",
          decision: "increase-load",
          nextKg: 80,
          nextTargetReps: 5,
        },
      ]);
      const after = sessionsWith("ex-banca-barra").map((e) => e.targetKg);
      expect(after[0]).toBe(before[0]); // la sesión hecha no cambia
      after.slice(1).forEach((kg, i) => expect(kg).toBe(before[i + 1]! + 2.5));
    });

    it("no progresa un ejercicio sustituido", () => {
      seedProfile();
      const workout = getTodayWorkout();
      const { summary } = completeWorkout({
        workout,
        durationSeconds: 3000,
        exercises: [
          {
            exerciseId: "ex-press-inclinado",
            plannedExerciseId: "ex-banca-barra",
            sets: [{ kg: 65, reps: 7, rir: 3 }],
          },
        ],
        profile: getUserProfile(),
      });
      expect(summary.progressions).toEqual([]);
    });

    it("marca PRs contra el mejor histórico y suma XP", () => {
      seedProfile({ xp: 450, level: 1, nextLevelXp: 500 });
      const { summary, profilePatch, log } = finishToday([
        { kg: 90, reps: 6, rir: 2 }, // 114 > 100 (1RM inicial) → PR
        { kg: 80, reps: 6, rir: 2 }, // 101,3 < 114 → no
      ]);
      expect(log.exercises[0]!.sets.map((x) => x.isPr)).toEqual([true, false]);
      expect(summary.prNames).toEqual(["Press Banca con Barra"]);
      expect(summary.xpEarned).toBe(100 + 2 * 5 + 50);
      expect(summary.leveledUp).toBe(true);
      expect(profilePatch).toEqual({ xp: 110, level: 2, nextLevelXp: 600, hunterRank: "Rango E" });
    });

    it("al terminar el mesociclo genera el siguiente", () => {
      seedProfile({ goal: "recomposicion", daysPerWeek: 2 }); // 4 semanas × 2 = 8 sesiones
      const first = getActiveMesocycle().id;
      let last;
      for (let i = 0; i < 8; i++) last = finishToday([{ kg: 60, reps: 6, rir: 2 }]);
      expect(last!.summary.mesocycleCompleted).toBe(true);
      expect(getActiveMesocycle().id).not.toBe(first);
      expect(getTodayWorkout().questCode).toBe("MISIÓN S1 · #1");
    });
  });
});
