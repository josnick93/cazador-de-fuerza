import { ChevronRight, Clock, Flame, Play, Swords } from "lucide-react";
import { useApp } from "@/components/AppContext";
import { WeeklyGoalCard } from "@/components/WeeklyGoalCard";
import { formatWeight, getExerciseById, getTodayWorkout } from "@/services/strengthService";
import { getWorkoutDraft } from "@/services/workoutDraftService";

export function HoyPage() {
  const { profile, startWorkout } = useApp();
  const workout = getTodayWorkout();
  const draft = getWorkoutDraft(workout.id);
  const doneByExercise = (idx: number) =>
    draft?.setsByExercise[idx]?.filter((row) => row.completed).length ?? 0;

  return (
    <div className="space-y-5 px-4 py-4">
      <WeeklyGoalCard />

      <section className="system-panel relative overflow-hidden rounded-2xl p-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/15 px-2.5 py-1 font-display text-xs font-bold tracking-wider text-primary">
            <Swords className="h-3.5 w-3.5" />
            {workout.questCode}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Clock className="h-3.5 w-3.5 text-primary" />~{workout.estimatedMinutes} min
          </span>
        </div>

        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          {workout.title}
        </h1>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {workout.muscles.map((muscle) => (
            <span
              key={muscle}
              className="rounded-lg border border-border bg-surface px-2.5 py-1 text-xs font-medium text-secondary-foreground"
            >
              {muscle}
            </span>
          ))}
        </div>

        <button
          type="button"
          onClick={() => startWorkout()}
          className="mt-4 flex min-h-[56px] w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 font-display text-lg font-bold tracking-wide text-primary-foreground system-glow transition-transform active:scale-[0.98]"
        >
          <Play className="h-5 w-5 fill-current" />
          {draft ? "Continuar entreno" : "Empezar entreno"}
        </button>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-bold uppercase tracking-wider text-foreground">
            Objetivos de la sesión
          </h2>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
            <Flame className="h-3.5 w-3.5" />
            {workout.exercises.length} ejercicios
          </span>
        </div>

        <div className="space-y-2.5">
          {workout.exercises.map((planned, index) => {
            const exercise = getExerciseById(planned.exerciseId);
            if (!exercise) return null;
            return (
              <button
                type="button"
                key={planned.exerciseId}
                onClick={() => startWorkout(index)}
                className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-3.5 text-left active:scale-[0.99]"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-primary/30 bg-surface font-display text-sm font-bold text-primary">
                  0{index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-base font-bold text-foreground">
                    {exercise.name}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-primary">
                    {planned.sets} ×{" "}
                    {planned.targetReps
                      ? `${planned.targetReps} (${planned.repRange})`
                      : planned.repRange}{" "}
                    @ RIR {planned.targetRir} · {formatWeight(planned.targetKg, profile.unit)}
                  </p>
                  <p
                    className={`mt-0.5 text-xs ${
                      planned.note && doneByExercise(index) === 0
                        ? "font-semibold text-gold"
                        : "text-muted-foreground"
                    }`}
                  >
                    {doneByExercise(index) > 0
                      ? `${doneByExercise(index)}/${planned.sets} series hechas`
                      : (planned.note ?? planned.lastSessionText)}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
