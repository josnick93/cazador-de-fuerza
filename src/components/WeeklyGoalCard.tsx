import { Check, Flame, Target } from "lucide-react";
import { getWeeklyGoal } from "@/services/strengthService";

const STATUS_COLOR = {
  cumplido: "text-success",
  "en-camino": "text-primary",
  justo: "text-gold",
  "no-llega": "text-muted-foreground",
} as const;

/** Objetivo semanal de entrenos en Hoy: días de la semana, progreso y racha. */
export function WeeklyGoalCard() {
  const goal = getWeeklyGoal();
  const pct = Math.min(100, Math.round((goal.done / goal.target) * 100));

  return (
    <section aria-label="Objetivo semanal" className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 font-display text-sm font-bold uppercase tracking-wider text-foreground">
          <Target className="h-4 w-4 text-primary" />
          Objetivo semanal
        </h2>
        <span className={`font-display text-lg font-bold ${STATUS_COLOR[goal.status]}`}>
          {goal.done}/{goal.target}
          {goal.extra > 0 && <span className="ml-1 text-sm">+{goal.extra}</span>}
        </span>
      </div>

      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={goal.target}
        aria-valuenow={Math.min(goal.done, goal.target)}
        aria-label={`${goal.done} de ${goal.target} entrenos esta semana`}
      >
        <div
          className={`h-full rounded-full ${goal.status === "cumplido" ? "bg-success" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <ol className="mt-3 grid grid-cols-7 gap-1.5">
        {goal.days.map((d) => (
          <li key={d.label} className="flex flex-col items-center gap-1">
            <span
              className={`grid h-8 w-8 place-items-center rounded-full border text-xs font-bold ${
                d.trained
                  ? "border-primary bg-primary text-primary-foreground"
                  : d.isToday
                    ? "border-primary text-primary"
                    : d.isFuture
                      ? "border-border text-muted-foreground"
                      : "border-border bg-surface text-muted-foreground/60"
              }`}
              aria-label={`${d.label}${d.trained ? ": entrenado" : d.isToday ? ": hoy" : ""}`}
            >
              {d.trained ? <Check className="h-4 w-4" /> : d.label}
            </span>
          </li>
        ))}
      </ol>

      <p className="mt-3 text-sm text-secondary-foreground">{goal.message}</p>
      {goal.streak > 0 && (
        <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-gold">
          <Flame className="h-3.5 w-3.5" />
          {goal.streak === 1 ? "1 semana cumplida" : `${goal.streak} semanas seguidas cumplidas`}
        </p>
      )}
    </section>
  );
}
