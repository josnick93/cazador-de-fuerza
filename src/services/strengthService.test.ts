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

function finishToday(sets = [{ kg: 80, reps: 6, rir: 2, e1rm: 112, isPr: true }]) {
  const workout = getTodayWorkout();
  const first = workout.exercises[0]!;
  return completeWorkout({
    workout,
    durationSeconds: 3000,
    exercises: [{ exerciseId: first.exerciseId, plannedExerciseId: first.exerciseId, sets }],
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
    finishToday([{ kg: 82.5, reps: 7, rir: 2, e1rm: 120, isPr: true }]);
    regenerateMesocycle(getUserProfile());
    expect(getTodayWorkout().exercises[0]!.lastSessionText).toBe("Última vez: 82,5 kg × 7 @ RIR 2");
  });

  it("calcula historial, PRs y mejores marcas a partir de los registros", () => {
    seedProfile();
    expect(getBestE1rm("ex-banca-barra")).toBe(100); // 1RM inicial
    finishToday();
    expect(getBestE1rm("ex-banca-barra")).toBe(112);
    expect(getE1rmHistory("banca")).toHaveLength(1);
    expect(getRecentPRs()[0]).toMatchObject({ exerciseName: "Press Banca con Barra", e1rmKg: 112 });
  });

  it("regenerar usa el historial real para las cargas", () => {
    seedProfile();
    const before = getActiveMesocycle().weeks[0]!.sessions[0]!.exercises[0]!.targetKg;
    finishToday([{ kg: 100, reps: 6, rir: 2, e1rm: 126.7, isPr: true }]);
    const after = regenerateMesocycle(getUserProfile()).weeks[0]!.sessions[0]!.exercises[0]!;
    expect(after.targetKg).toBeGreaterThan(before);
  });

  it("detecta estancamiento con el historial real", () => {
    seedProfile();
    seedLogs(weeklyBenchLogs([95, 97.5, 99.5, 101, 102.5, 102.5, 102, 102.5]));
    expect(getStagnationAlert("banca")).toMatchObject({ weeksStalled: 3 });
    expect(getStagnationAlert("sentadilla")).toBeNull();
  });
});
