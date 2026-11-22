import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Minus,
  Plus,
  RefreshCw,
  Trophy,
  X,
} from "lucide-react";
import { useApp } from "@/components/AppContext";
import { RestTimerBar } from "@/components/RestTimerBar";
import {
  calculateE1rm,
  formatWeight,
  getExerciseById,
  getExercisesByMuscle,
  getTodayWorkout,
} from "@/services/strengthService";
import type { ActiveSetRow, WorkoutSummary } from "@/types";

const RIR_OPTIONS = [0, 1, 2, 3, 4] as const;

function buildInitialSets(
  setsCount: number,
  targetKg: number,
  targetRir: number,
): ActiveSetRow[] {
  return Array.from({ length: setsCount }, (_, idx) => ({
    id: `set-${idx + 1}`,
    setNumber: idx + 1,
    kg: targetKg,
    reps: 8,
    rir: targetRir,
    completed: false,
    isPr: false,
    e1rm: calculateE1rm(targetKg, 8, targetRir),
  }));
}

export function EntrenoActivoPage() {
  const { profile, setView } = useApp();
  const workout = getTodayWorkout();

  const [exerciseIds, setExerciseIds] = useState<string[]>(() =>
    workout.exercises.map((e) => e.exerciseId),
  );
  const [currentIdx, setCurrentIdx] = useState(0);
  const [setsByExercise, setSetsByExercise] = useState<Record<number, ActiveSetRow[]>>(() => {
    const map: Record<number, ActiveSetRow[]> = {};
    workout.exercises.forEach((planned, idx) => {
      map[idx] = buildInitialSets(planned.sets, planned.targetKg, planned.targetRir);
    });
    return map;
  });

  const [restSeconds, setRestSeconds] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [summary, setSummary] = useState<WorkoutSummary | null>(null);

  useEffect(() => {
    if (summary) return;
    const interval = window.setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [summary]);

  useEffect(() => {
    if (restSeconds <= 0) return;
    const timer = window.setInterval(() => {
      setRestSeconds((s) => (s > 1 ? s - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [restSeconds]);

  const currentPlanned = workout.exercises[currentIdx];
  const currentExerciseId = exerciseIds[currentIdx] ?? currentPlanned?.exerciseId ?? "";
  const currentExercise = getExerciseById(currentExerciseId);
  const currentSets = setsByExercise[currentIdx] ?? [];

  const updateSet = (setIdx: number, updater: (row: ActiveSetRow) => ActiveSetRow) => {
    setSetsByExercise((prev) => {
      const list = prev[currentIdx] ?? [];
      const nextList = list.map((row, i) => (i === setIdx ? updater(row) : row));
      return { ...prev, [currentIdx]: nextList };
    });
  };

  const toggleSetDone = (setIdx: number) => {
    const row = currentSets[setIdx];
    if (!row || !currentExercise) return;
    const nowCompleted = !row.completed;
    const e1rm = calculateE1rm(row.kg, row.reps, row.rir);
    const isPr = nowCompleted && e1rm > currentExercise.bestE1rmKg;

    updateSet(setIdx, (r) => ({
      ...r,
      completed: nowCompleted,
      e1rm,
      isPr,
    }));

    if (nowCompleted) {
      setRestSeconds(currentExercise.defaultRestSec);
    }
  };

  const handleSwapExercise = (newExerciseId: string) => {
    setExerciseIds((prev) => prev.map((id, i) => (i === currentIdx ? newExerciseId : id)));
    setShowSwapModal(false);
  };

  const finishWorkout = () => {
    let totalVolumeKg = 0;
    let completedSets = 0;
    const prNames: string[] = [];

    Object.entries(setsByExercise).forEach(([idxStr, rows]) => {
      const idx = Number(idxStr);
      const exId = exerciseIds[idx];
      const ex = exId ? getExerciseById(exId) : undefined;
      rows.forEach((row) => {
        if (row.completed) {
          completedSets += 1;
          totalVolumeKg += row.kg * row.reps;
          if (row.isPr && ex && !prNames.includes(ex.name)) {
            prNames.push(ex.name);
          }
        }
      });
    });

    setRestSeconds(0);
    setSummary({
      workoutTitle: workout.title,
      totalVolumeKg: Math.round(totalVolumeKg),
      completedSets,
      prsCount: prNames.length,
      prNames,
      durationSeconds: Math.max(elapsedSeconds, 60),
    });
  };

  if (summary) {
    const mins = Math.floor(summary.durationSeconds / 60);
    return (
      <div className="flex min-h-dvh flex-col justify-between px-4 py-8">
        <div className="space-y-5">
          <div className="text-center">
            <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-2xl border border-gold/50 bg-gold/15 text-gold">
              <Trophy className="h-8 w-8" />
            </div>
            <p className="font-display text-xs font-bold uppercase tracking-widest text-primary">
              MISIÓN COMPLETADA · +180 XP
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold text-foreground">
              {summary.workoutTitle}
            </h1>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div className="system-panel rounded-2xl p-3.5 text-center">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Volumen</p>
              <p className="tabular-nums-display mt-1 text-xl font-bold text-foreground">
                {formatWeight(summary.totalVolumeKg, profile.unit)}
              </p>
            </div>
            <div className="system-panel rounded-2xl p-3.5 text-center">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">PRs</p>
              <p className="tabular-nums-display mt-1 text-xl font-bold text-gold">
                {summary.prsCount}
              </p>
            </div>
            <div className="system-panel rounded-2xl p-3.5 text-center">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Duración</p>
              <p className="tabular-nums-display mt-1 text-xl font-bold text-primary">
                {mins} min
              </p>
            </div>
          </div>

          {summary.prNames.length > 0 && (
            <div className="rounded-2xl border border-gold/40 bg-gold/10 p-4">
              <p className="font-display text-sm font-bold text-gold">
                🏆 Nuevos Récords Personales
              </p>
              <ul className="mt-2 space-y-1 text-sm text-foreground">
                {summary.prNames.map((name) => (
                  <li key={name}>• {name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setView("hoy")}
          className="mt-8 flex min-h-[56px] w-full items-center justify-center rounded-xl bg-primary font-display text-lg font-bold text-primary-foreground system-glow"
        >
          Volver a Hoy
        </button>
      </div>
    );
  }

  if (!currentExercise || !currentPlanned) return null;

  const alternatives = getExercisesByMuscle(currentExercise.muscle);
  const elapsedMins = Math.floor(elapsedSeconds / 60);
  const elapsedSecs = elapsedSeconds % 60;

  return (
    <div className="flex min-h-dvh flex-col pb-28">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur-md">
        <button
          type="button"
          onClick={() => setView("hoy")}
          aria-label="Salir del entreno"
          className="grid h-12 w-12 place-items-center rounded-xl border border-border bg-surface text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="text-center">
          <p className="font-display text-xs font-bold uppercase tracking-wider text-primary">
            Ejercicio {currentIdx + 1} de {workout.exercises.length}
          </p>
          <p className="tabular-nums-display text-sm font-semibold text-muted-foreground">
            {elapsedMins}:{elapsedSecs.toString().padStart(2, "0")}
          </p>
        </div>
        <button
          type="button"
          onClick={finishWorkout}
          className="min-h-[48px] rounded-xl border border-primary/50 bg-primary/15 px-3.5 font-display text-sm font-bold text-primary"
        >
          Terminar
        </button>
      </header>

      <div className="space-y-4 px-4 py-4">
        <section className="system-panel rounded-2xl p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                {currentExercise.muscle}
              </span>
              <h1 className="mt-0.5 font-display text-2xl font-bold leading-tight text-foreground">
                {currentExercise.name}
              </h1>
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                {currentPlanned.lastSessionText}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowSwapModal(true)}
              className="flex min-h-[48px] shrink-0 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-foreground"
            >
              <RefreshCw className="h-4 w-4 text-primary" />
              Cambiar
            </button>
          </div>
        </section>

        <section className="space-y-3">
          {currentSets.map((row, idx) => (
            <div
              key={row.id}
              className={`rounded-2xl border p-3.5 transition-all ${
                row.completed
                  ? "border-success/50 bg-success/10"
                  : "border-border bg-card"
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="font-display text-sm font-bold text-foreground">
                  SERIE {row.setNumber}
                </span>
                {row.isPr ? (
                  <span className="rounded-md border border-gold/50 bg-gold/20 px-2 py-0.5 font-display text-xs font-bold text-gold">
                    🏆 Nuevo PR · {row.e1rm} kg
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    e1RM est. {calculateE1rm(row.kg, row.reps, row.rir)} kg
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl border border-border bg-surface p-2">
                  <p className="mb-1 text-center text-[11px] font-semibold uppercase text-muted-foreground">
                    Peso ({profile.unit})
                  </p>
                  <div className="flex items-center justify-between gap-1">
                    <button
                      type="button"
                      aria-label="Restar 2,5 kg"
                      onClick={() =>
                        updateSet(idx, (r) => ({ ...r, kg: Math.max(0, r.kg - 2.5) }))
                      }
                      className="grid h-12 w-11 shrink-0 place-items-center rounded-lg bg-card text-foreground active:scale-95"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="tabular-nums-display text-xl font-bold text-foreground">
                      {row.kg.toString().replace(".", ",")}
                    </span>
                    <button
                      type="button"
                      aria-label="Sumar 2,5 kg"
                      onClick={() => updateSet(idx, (r) => ({ ...r, kg: r.kg + 2.5 }))}
                      className="grid h-12 w-11 shrink-0 place-items-center rounded-lg bg-card text-foreground active:scale-95"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-surface p-2">
                  <p className="mb-1 text-center text-[11px] font-semibold uppercase text-muted-foreground">
                    Reps
                  </p>
                  <div className="flex items-center justify-between gap-1">
                    <button
                      type="button"
                      aria-label="Restar 1 rep"
                      onClick={() =>
                        updateSet(idx, (r) => ({ ...r, reps: Math.max(1, r.reps - 1) }))
                      }
                      className="grid h-12 w-11 shrink-0 place-items-center rounded-lg bg-card text-foreground active:scale-95"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="tabular-nums-display text-xl font-bold text-foreground">
                      {row.reps}
                    </span>
                    <button
                      type="button"
                      aria-label="Sumar 1 rep"
                      onClick={() => updateSet(idx, (r) => ({ ...r, reps: r.reps + 1 }))}
                      className="grid h-12 w-11 shrink-0 place-items-center rounded-lg bg-card text-foreground active:scale-95"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-3">
                <p className="mb-1.5 text-[11px] font-semibold uppercase text-muted-foreground">
                  RIR (Reps en reserva)
                </p>
                <div className="grid grid-cols-5 gap-1.5">
                  {RIR_OPTIONS.map((rirVal) => {
                    const active = row.rir === rirVal;
                    return (
                      <button
                        key={rirVal}
                        type="button"
                        onClick={() => updateSet(idx, (r) => ({ ...r, rir: rirVal }))}
                        className={`min-h-[48px] rounded-xl border font-display text-sm font-bold transition-colors ${
                          active
                            ? "border-primary bg-primary/20 text-primary"
                            : "border-border bg-surface text-muted-foreground"
                        }`}
                      >
                        {rirVal === 4 ? "4+" : rirVal}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={() => toggleSetDone(idx)}
                className={`mt-3 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl font-display text-base font-bold transition-all active:scale-[0.98] ${
                  row.completed
                    ? "border border-success/50 bg-success text-success-foreground"
                    : "bg-primary text-primary-foreground"
                }`}
              >
                <Check className="h-5 w-5" />
                {row.completed ? "Serie completada" : "Hecho"}
              </button>
            </div>
          ))}
        </section>

        <div className="flex items-center gap-2.5 pt-2">
          <button
            type="button"
            disabled={currentIdx === 0}
            onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
            className="flex min-h-[52px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-surface font-display text-sm font-bold text-foreground disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" />
            Anterior
          </button>
          {currentIdx < workout.exercises.length - 1 ? (
            <button
              type="button"
              onClick={() => setCurrentIdx((i) => i + 1)}
              className="flex min-h-[52px] flex-1 items-center justify-center gap-1.5 rounded-xl border border-primary/50 bg-primary/15 font-display text-sm font-bold text-primary"
            >
              Siguiente
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={finishWorkout}
              className="flex min-h-[52px] flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary font-display text-sm font-bold text-primary-foreground system-glow"
            >
              Finalizar misión
            </button>
          )}
        </div>
      </div>

      <RestTimerBar
        secondsLeft={restSeconds}
        onAdd30={() => setRestSeconds((s) => s + 30)}
        onSkip={() => setRestSeconds(0)}
      />

      {showSwapModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-4 backdrop-blur-sm">
          <div className="system-panel w-full max-w-[366px] rounded-2xl p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-foreground">
                Cambiar ejercicio ({currentExercise.muscle})
              </h2>
              <button
                type="button"
                onClick={() => setShowSwapModal(false)}
                aria-label="Cerrar"
                className="grid h-12 w-12 place-items-center rounded-xl bg-surface text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2">
              {alternatives.map((alt) => (
                <button
                  key={alt.id}
                  type="button"
                  onClick={() => handleSwapExercise(alt.id)}
                  className={`flex min-h-[52px] w-full items-center justify-between rounded-xl border px-3.5 text-left text-sm font-semibold ${
                    alt.id === currentExercise.id
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-surface text-foreground"
                  }`}
                >
                  <span>{alt.name}</span>
                  {alt.id === currentExercise.id && <Check className="h-4 w-4" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}