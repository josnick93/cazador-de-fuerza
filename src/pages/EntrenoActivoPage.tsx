import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  Info,
  Equal,
  Flame,
  Minus,
  Plus,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Trophy,
  X,
} from "lucide-react";
import { useApp } from "@/components/AppContext";
import { ExerciseGuideSheet } from "@/components/ExerciseGuideSheet";
import { ExerciseThumb } from "@/components/ExerciseThumb";
import { RestTimerBar } from "@/components/RestTimerBar";
import {
  calculateE1rm,
  formatWeight,
  getBestE1rm,
  getExerciseById,
  getAlternatives,
  completeWorkout,
  getSessionWarmups,
  getTodayWorkout,
  substituteExercise,
} from "@/services/strengthService";
import { parseRepRange } from "@/engine/progression";
import { useWakeLock } from "@/hooks/useWakeLock";
import { playRestAlert, unlockRestAlert } from "@/lib/restAlert";
import {
  clearWorkoutDraft,
  getWorkoutDraft,
  saveWorkoutDraft,
} from "@/services/workoutDraftService";
import type {
  ActiveSetRow,
  Exercise,
  PlannedExercise,
  ProgressionNote,
  WorkoutSummary,
} from "@/types";

const RIR_OPTIONS = [0, 1, 2, 3, 4] as const;

const PROGRESSION_META: Record<
  ProgressionNote["decision"],
  { icon: typeof TrendingUp; color: string }
> = {
  "increase-load": { icon: TrendingUp, color: "text-success" },
  "add-rep": { icon: Plus, color: "text-primary" },
  hold: { icon: Equal, color: "text-muted-foreground" },
  "decrease-load": { icon: TrendingDown, color: "text-destructive" },
};

function buildInitialSets(planned: PlannedExercise): ActiveSetRow[] {
  const reps = planned.targetReps ?? parseRepRange(planned.repRange).min;
  return Array.from({ length: planned.sets }, (_, idx) => ({
    id: `set-${idx + 1}`,
    setNumber: idx + 1,
    kg: planned.targetKg,
    reps,
    rir: planned.targetRir,
    completed: false,
    isPr: false,
    e1rm: calculateE1rm(planned.targetKg, reps, planned.targetRir),
  }));
}

export function EntrenoActivoPage() {
  const { profile, setView, updateProfile, workoutStartIdx } = useApp();
  const [workout] = useState(() => getTodayWorkout());
  // Entreno a medias en este dispositivo: se retoma tal cual (series, ejercicio y temporizadores).
  const [draft] = useState(() => getWorkoutDraft(workout.id));

  // Plan efectivo por ejercicio (cambia al sustituir); workout.exercises guarda el original.
  const [plannedList, setPlannedList] = useState<PlannedExercise[]>(
    () => draft?.plannedList ?? workout.exercises,
  );
  const [currentIdx, setCurrentIdx] = useState(() => {
    const idx = workoutStartIdx ?? draft?.currentIdx ?? 0;
    return idx >= 0 && idx < workout.exercises.length ? idx : 0;
  });
  const [setsByExercise, setSetsByExercise] = useState<Record<number, ActiveSetRow[]>>(() => {
    if (draft) return draft.setsByExercise;
    const map: Record<number, ActiveSetRow[]> = {};
    workout.exercises.forEach((planned, idx) => {
      map[idx] = buildInitialSets(planned);
    });
    return map;
  });

  // Cronómetro y descanso por marcas de tiempo: siguen corriendo aunque salgas de la pantalla.
  const [startedAt] = useState(() => draft?.startedAt ?? Date.now());
  const [restEndsAt, setRestEndsAt] = useState<number | null>(() => draft?.restEndsAt ?? null);
  const [now, setNow] = useState(() => Date.now());
  const elapsedSeconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  const restSeconds = restEndsAt ? Math.max(0, Math.ceil((restEndsAt - now) / 1000)) : 0;
  const setRestSeconds = (seconds: number) =>
    setRestEndsAt(seconds > 0 ? Date.now() + seconds * 1000 : null);
  // Series de aproximación hechas por ejercicio (índices). Solo guía: no se registran.
  const warmups = useMemo(() => getSessionWarmups(plannedList), [plannedList]);
  const [warmupDone, setWarmupDone] = useState<Record<number, number[]>>(
    () => draft?.warmupDone ?? {},
  );
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [guideId, setGuideId] = useState<string | null>(null);
  const [summary, setSummary] = useState<WorkoutSummary | null>(null);

  useEffect(() => {
    if (summary) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [summary]);

  // Pantalla siempre encendida durante el entreno.
  useWakeLock(!summary);

  // Fin del descanso: aviso (si acaba de terminar, no al retomar un borrador antiguo) y se cierra la barra.
  useEffect(() => {
    if (restEndsAt === null || now < restEndsAt) return;
    if (now - restEndsAt < 5000) playRestAlert();
    setRestEndsAt(null);
  }, [now, restEndsAt]);

  useEffect(() => {
    if (summary) return;
    saveWorkoutDraft({
      workoutId: workout.id,
      plannedList,
      currentIdx,
      setsByExercise,
      startedAt,
      restEndsAt,
      warmupDone,
    });
  }, [
    summary,
    workout.id,
    plannedList,
    currentIdx,
    setsByExercise,
    startedAt,
    restEndsAt,
    warmupDone,
  ]);

  const originalPlanned = workout.exercises[currentIdx];
  const currentPlanned = plannedList[currentIdx];
  const currentExercise = currentPlanned ? getExerciseById(currentPlanned.exerciseId) : undefined;
  const currentSets = setsByExercise[currentIdx] ?? [];
  const currentWarmups = warmups[currentIdx] ?? [];
  const currentWarmupDone = warmupDone[currentIdx] ?? [];

  const toggleWarmup = (i: number) => {
    const done = currentWarmupDone.includes(i);
    setWarmupDone((prev) => ({
      ...prev,
      [currentIdx]: done
        ? (prev[currentIdx] ?? []).filter((x) => x !== i)
        : [...(prev[currentIdx] ?? []), i],
    }));
    if (!done) {
      unlockRestAlert();
      setRestSeconds(60);
    }
  };

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
    const best = getBestE1rm(currentExercise.id);
    const isPr = nowCompleted && best > 0 && e1rm > best;

    updateSet(setIdx, (r) => ({
      ...r,
      completed: nowCompleted,
      e1rm,
      isPr,
    }));

    if (nowCompleted) {
      unlockRestAlert();
      setRestSeconds(currentExercise.defaultRestSec);
    }
  };

  const handleSwapExercise = (newExerciseId: string) => {
    if (!originalPlanned) return;
    // Siempre desde el original: volver a él recupera exactamente su carga.
    const next = substituteExercise(originalPlanned, newExerciseId);
    setPlannedList((prev) => prev.map((p, i) => (i === currentIdx ? next : p)));
    setSetsByExercise((prev) => ({
      ...prev,
      [currentIdx]: (prev[currentIdx] ?? []).map((row) =>
        row.completed
          ? row
          : {
              ...row,
              kg: next.targetKg,
              isPr: false,
              e1rm: calculateE1rm(next.targetKg, row.reps, row.rir),
            },
      ),
    }));
    setShowSwapModal(false);
    setGuideId(null);
  };

  const finishWorkout = () => {
    const durationSeconds = Math.max(elapsedSeconds, 60);
    const exercises = workout.exercises.map((planned, idx) => ({
      exerciseId: plannedList[idx]?.exerciseId ?? planned.exerciseId,
      plannedExerciseId: planned.exerciseId,
      sets: (setsByExercise[idx] ?? [])
        .filter((row) => row.completed)
        .map(({ kg, reps, rir }) => ({ kg, reps, rir })),
    }));

    setRestSeconds(0);
    clearWorkoutDraft();
    if (exercises.every((ex) => ex.sets.length === 0)) {
      // Sin series no se registra nada: la misión sigue pendiente.
      setSummary({
        workoutTitle: workout.title,
        totalVolumeKg: 0,
        completedSets: 0,
        prsCount: 0,
        prNames: [],
        durationSeconds,
        xpEarned: 0,
        leveledUp: false,
        newLevel: profile.level,
        newRank: profile.hunterRank,
        progressions: [],
        mesocycleCompleted: false,
      });
      return;
    }

    const result = completeWorkout({ workout, durationSeconds, exercises, profile });
    updateProfile(result.profilePatch);
    setSummary(result.summary);
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
              {summary.completedSets > 0
                ? `MISIÓN COMPLETADA · +${summary.xpEarned} XP`
                : "MISIÓN SIN REGISTRAR"}
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
              <p className="tabular-nums-display mt-1 text-xl font-bold text-primary">{mins} min</p>
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

          {summary.leveledUp && (
            <div
              role="status"
              className="rounded-2xl border border-primary/50 bg-primary/10 p-4 text-center system-glow"
            >
              <p className="font-display text-lg font-bold text-primary">
                ¡Subes a nivel {summary.newLevel}!
              </p>
              <p className="text-sm text-muted-foreground">{summary.newRank}</p>
            </div>
          )}

          {summary.progressions.length > 0 && (
            <div className="system-panel rounded-2xl p-4">
              <p className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
                Próxima sesión
              </p>
              <ul className="mt-2 space-y-2">
                {summary.progressions.map((p) => {
                  const meta = PROGRESSION_META[p.decision];
                  return (
                    <li key={p.exerciseName} className="flex items-center gap-2.5 text-sm">
                      <meta.icon className={`h-4 w-4 shrink-0 ${meta.color}`} />
                      <span className="min-w-0 flex-1 truncate text-foreground">
                        {p.exerciseName}
                      </span>
                      <span className={`shrink-0 font-semibold ${meta.color}`}>
                        {formatWeight(p.nextKg, profile.unit)} × {p.nextTargetReps}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {summary.mesocycleCompleted && (
            <div role="status" className="rounded-2xl border border-success/50 bg-success/10 p-4">
              <p className="font-display text-sm font-bold text-success">Mesociclo completado</p>
              <p className="mt-1 text-sm text-foreground">
                Hemos generado tu siguiente mesociclo con tus nuevas marcas.
              </p>
            </div>
          )}
        </div>

        <div className="mt-8 space-y-2.5">
          <button
            type="button"
            onClick={() => setView("progreso")}
            className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-xl bg-primary font-display text-lg font-bold text-primary-foreground system-glow"
          >
            <BarChart3 className="h-5 w-5" />
            Ver progreso
          </button>
          <button
            type="button"
            onClick={() => setView("hoy")}
            className="flex min-h-[52px] w-full items-center justify-center rounded-xl border border-border bg-surface font-display text-base font-bold text-foreground"
          >
            Volver a Hoy
          </button>
        </div>
      </div>
    );
  }

  if (!currentExercise || !currentPlanned) return null;

  const originalExercise = originalPlanned
    ? getExerciseById(originalPlanned.exerciseId)
    : undefined;
  const swapOptions = [
    currentExercise,
    ...(originalExercise && originalExercise.id !== currentExercise.id ? [originalExercise] : []),
    ...getAlternatives(originalPlanned?.exerciseId ?? currentExercise.id).filter(
      (e) => e.id !== currentExercise.id,
    ),
  ];
  const basePattern = (originalExercise ?? currentExercise).pattern;
  const swapGroups: { title: string; items: Exercise[] }[] = [
    { title: "Mismo movimiento", items: swapOptions.filter((e) => e.pattern === basePattern) },
    { title: "Mismo músculo", items: swapOptions.filter((e) => e.pattern !== basePattern) },
  ].filter((g) => g.items.length > 0);
  const projectedKg = (exerciseId: string) =>
    exerciseId === currentExercise.id
      ? currentPlanned.targetKg
      : originalPlanned
        ? substituteExercise(originalPlanned, exerciseId).targetKg
        : currentPlanned.targetKg;
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
          <div className="flex items-start gap-3">
            <ExerciseThumb exerciseId={currentExercise.id} className="h-14 w-16" />
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
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setGuideId(currentExercise.id)}
              className="flex min-h-[48px] items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-border bg-surface px-2 text-[13px] font-semibold text-foreground"
            >
              <BookOpen className="h-4 w-4 text-primary" />
              Técnica
            </button>
            <button
              type="button"
              onClick={() => setShowSwapModal(true)}
              className="flex min-h-[48px] items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-border bg-surface px-2 text-[13px] font-semibold text-foreground"
            >
              <RefreshCw className="h-4 w-4 text-primary" />
              Máquina ocupada
            </button>
          </div>
        </section>

        {currentWarmups.length > 0 && (
          <section
            aria-label="Calentamiento"
            className="rounded-2xl border border-gold/30 bg-gold/5 p-3.5"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-display text-sm font-bold text-gold">
                <Flame className="h-4 w-4" />
                CALENTAMIENTO
              </span>
              <span className="text-xs text-muted-foreground">No cuenta para el progreso</span>
            </div>
            <ul className="space-y-2">
              {currentWarmups.map((w, i) => {
                const done = currentWarmupDone.includes(i);
                return (
                  <li key={`${w.kg}-${w.reps}`}>
                    <button
                      type="button"
                      onClick={() => toggleWarmup(i)}
                      aria-pressed={done}
                      className={`flex min-h-[48px] w-full items-center gap-3 rounded-xl border px-3 text-left text-sm font-semibold transition-colors active:scale-[0.98] ${
                        done
                          ? "border-success/50 bg-success/10 text-muted-foreground"
                          : "border-border bg-surface text-foreground"
                      }`}
                    >
                      <span
                        className={`grid h-7 w-7 shrink-0 place-items-center rounded-md border ${
                          done
                            ? "border-success bg-success text-success-foreground"
                            : "border-border text-muted-foreground"
                        }`}
                      >
                        {done ? <Check className="h-4 w-4" /> : i + 1}
                      </span>
                      <span className="tabular-nums-display flex-1 text-base">
                        {formatWeight(w.kg, profile.unit)} × {w.reps}
                      </span>
                      {i === 0 && w.kg === 20 && (
                        <span className="text-xs text-muted-foreground">Barra vacía</span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section className="space-y-3">
          {currentSets.map((row, idx) => (
            <div
              key={row.id}
              className={`rounded-2xl border p-3.5 transition-all ${
                row.completed ? "border-success/50 bg-success/10" : "border-border bg-card"
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
                      onClick={() => updateSet(idx, (r) => ({ ...r, kg: Math.max(0, r.kg - 2.5) }))}
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
        onAdd30={() => setRestSeconds(restSeconds + 30)}
        onSkip={() => setRestSeconds(0)}
      />

      {showSwapModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm"
          onClick={() => setShowSwapModal(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="swap-title"
            onClick={(e) => e.stopPropagation()}
            className="system-panel max-h-[85dvh] w-full max-w-[390px] overflow-y-auto rounded-t-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border bg-card/95 px-4 py-3 backdrop-blur-md">
              <div className="min-w-0">
                <h2 id="swap-title" className="font-display text-lg font-bold text-foreground">
                  Cambiar ejercicio
                </h2>
                <p className="text-xs text-muted-foreground">
                  {currentExercise.muscle} · el peso se recalcula solo
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSwapModal(false)}
                aria-label="Cerrar"
                className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-surface text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4 px-4 pb-6 pt-3">
              {swapGroups.map((group) => (
                <section key={group.title}>
                  <h3 className="mb-2 font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    {group.title}
                  </h3>
                  <ul className="space-y-2">
                    {group.items.map((alt) => {
                      const selected = alt.id === currentExercise.id;
                      return (
                        <li key={alt.id} className="flex items-stretch gap-2">
                          <button
                            type="button"
                            onClick={() => handleSwapExercise(alt.id)}
                            className={`flex min-h-[56px] min-w-0 flex-1 items-center gap-2.5 rounded-xl border p-2 text-left text-sm font-semibold ${
                              selected
                                ? "border-primary bg-primary/15 text-primary"
                                : "border-border bg-surface text-foreground"
                            }`}
                          >
                            <ExerciseThumb exerciseId={alt.id} className="h-10 w-12" />
                            <span className="min-w-0 flex-1">{alt.name}</span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {formatWeight(projectedKg(alt.id), profile.unit)}
                            </span>
                            {selected && <Check className="h-4 w-4 shrink-0" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => setGuideId(alt.id)}
                            aria-label={`Ver técnica de ${alt.name}`}
                            className="grid w-12 shrink-0 place-items-center rounded-xl border border-border bg-surface text-muted-foreground"
                          >
                            <Info className="h-5 w-5" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          </div>
        </div>
      )}

      {guideId && (
        <ExerciseGuideSheet
          exerciseId={guideId}
          activeExerciseId={currentExercise.id}
          onClose={() => setGuideId(null)}
          onUse={handleSwapExercise}
        />
      )}
    </div>
  );
}
