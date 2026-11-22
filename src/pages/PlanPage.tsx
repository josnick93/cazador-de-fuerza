import { useState } from "react";
import { Check, ChevronDown, Circle, Play, Target } from "lucide-react";
import { useApp } from "@/components/AppContext";
import { getActiveMesocycle, getMesocycle } from "@/services/strengthService";
import type { MesocycleDay, MesocyclePhase, MesocycleWeek } from "@/types";

const PHASES: { id: MesocyclePhase; short: string; desc: string }[] = [
  { id: "Acumulación", short: "Acum.", desc: "Volumen alto, RIR 2-3" },
  { id: "Intensificación", short: "Intens.", desc: "Cargas altas, RIR 1-2" },
  { id: "Descarga", short: "Desc.", desc: "Recuperar, -40% volumen" },
];

const PHASE_STYLES: Record<MesocyclePhase, { bar: string; text: string; badge: string }> = {
  Acumulación: {
    bar: "bg-mana",
    text: "text-mana",
    badge: "border-mana/40 bg-mana/15 text-mana",
  },
  Intensificación: {
    bar: "bg-primary",
    text: "text-primary",
    badge: "border-primary/40 bg-primary/15 text-primary",
  },
  Descarga: {
    bar: "bg-success",
    text: "text-success",
    badge: "border-success/40 bg-success/15 text-success",
  },
};

function DayRow({ day, onStart }: { day: MesocycleDay; onStart: () => void }) {
  const status = day.completed ? "done" : day.isToday ? "today" : "pending";

  return (
    <div
      className={`flex min-h-[56px] items-center gap-3 rounded-xl border px-3 py-2.5 ${
        status === "today"
          ? "border-primary/60 bg-primary/10"
          : status === "done"
            ? "border-success/30 bg-success/5"
            : "border-border bg-surface"
      }`}
    >
      <span className="w-9 shrink-0 font-display text-sm font-bold text-muted-foreground">
        {day.dayLabel}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{day.sessionTitle}</p>
        <p className="truncate text-xs text-muted-foreground">{day.focus}</p>
      </div>
      {status === "done" && (
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-success">
          <Check className="h-4 w-4" />
          Hecho
        </span>
      )}
      {status === "today" && (
        <button
          type="button"
          onClick={onStart}
          className="inline-flex min-h-[48px] shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3 font-display text-sm font-bold text-primary-foreground system-glow active:scale-[0.98]"
        >
          <Play className="h-4 w-4 fill-current" />
          Hoy
        </button>
      )}
      {status === "pending" && (
        <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
          <Circle className="h-3.5 w-3.5" />
          Pendiente
        </span>
      )}
    </div>
  );
}

function WeekCard({
  week,
  expanded,
  onToggle,
  onStart,
}: {
  week: MesocycleWeek;
  expanded: boolean;
  onToggle: () => void;
  onStart: () => void;
}) {
  const style = PHASE_STYLES[week.phase];
  const done = week.days.filter((d) => d.completed).length;
  const total = week.days.length;
  const allDone = done === total;

  return (
    <section
      aria-current={week.isCurrent ? "step" : undefined}
      className={`relative rounded-2xl border ${
        week.isCurrent ? "system-panel border-primary/60 system-glow" : "border-border bg-card"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex min-h-[64px] w-full items-center gap-3 p-3.5 text-left"
      >
        <div
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border font-display text-base font-bold ${
            allDone
              ? "border-success/50 bg-success/15 text-success"
              : week.isCurrent
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface text-muted-foreground"
          }`}
        >
          {allDone ? <Check className="h-5 w-5" /> : `S${week.weekNumber}`}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-display text-base font-bold text-foreground">
              Semana {week.weekNumber}
            </span>
            <span
              className={`rounded-md border px-1.5 py-0.5 text-[11px] font-semibold ${style.badge}`}
            >
              {week.phase}
            </span>
            {week.isCurrent && (
              <span className="rounded-md bg-primary px-1.5 py-0.5 font-display text-[11px] font-bold text-primary-foreground">
                ACTUAL
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {week.intensityLabel} · {done}/{total} sesiones
          </p>
        </div>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {expanded && (
        <div className="space-y-2 px-3.5 pb-3.5">
          {week.days.map((day) => (
            <DayRow key={`${week.weekNumber}-${day.dayLabel}`} day={day} onStart={onStart} />
          ))}
        </div>
      )}
    </section>
  );
}

export function PlanPage() {
  const { profile, setView } = useApp();
  const weeks = getMesocycle();
  const { templateName } = getActiveMesocycle();
  const current = weeks.find((w) => w.isCurrent) ?? weeks[0];
  const [expanded, setExpanded] = useState<Set<number>>(
    () => new Set(current ? [current.weekNumber] : []),
  );

  const allDays = weeks.flatMap((w) => w.days);
  const doneDays = allDays.filter((d) => d.completed).length;
  const progressPct = allDays.length ? Math.round((doneDays / allDays.length) * 100) : 0;

  const toggleWeek = (weekNumber: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(weekNumber)) next.delete(weekNumber);
      else next.add(weekNumber);
      return next;
    });

  return (
    <div className="space-y-5 px-4 py-4">
      <section className="system-panel rounded-2xl p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/15 px-2.5 py-1 font-display text-xs font-bold tracking-wider text-primary">
            <Target className="h-3.5 w-3.5" />
            MESOCICLO ACTIVO
          </span>
          <span className="text-xs font-medium text-muted-foreground">
            {templateName} · {profile.daysPerWeek} días/sem
          </span>
        </div>
        <h1 className="mt-2 font-display text-2xl font-bold text-foreground">
          Semana {current?.weekNumber ?? 1} de {weeks.length}
        </h1>
        <p className="text-sm text-muted-foreground">
          Fase de{" "}
          <span className={current ? PHASE_STYLES[current.phase].text : ""}>{current?.phase}</span>{" "}
          · {current?.intensityLabel}
        </p>

        <div className="mt-4">
          <div className="mb-1.5 flex justify-between text-xs">
            <span className="text-muted-foreground">Progreso del mesociclo</span>
            <span className="font-semibold text-foreground">
              {doneDays}/{allDays.length} sesiones
            </span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={progressPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progreso del mesociclo"
            className="h-2 w-full overflow-hidden rounded-full bg-surface"
          >
            <div className="h-full rounded-full bg-primary" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </section>

      <section aria-label="Fases del mesociclo">
        <div className="flex gap-1">
          {weeks.map((w) => (
            <div
              key={w.weekNumber}
              className={`h-2 flex-1 rounded-full ${PHASE_STYLES[w.phase].bar} ${
                w.isCurrent ? "ring-2 ring-foreground/80 ring-offset-2 ring-offset-background" : ""
              } ${w.weekNumber > (current?.weekNumber ?? 0) ? "opacity-35" : ""}`}
            />
          ))}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {PHASES.map((phase) => {
            const count = weeks.filter((w) => w.phase === phase.id).length;
            const isCurrentPhase = current?.phase === phase.id;
            return (
              <div
                key={phase.id}
                className={`rounded-xl border p-2.5 ${
                  isCurrentPhase ? "border-primary/50 bg-primary/5" : "border-border bg-card"
                }`}
              >
                <p className={`font-display text-xs font-bold ${PHASE_STYLES[phase.id].text}`}>
                  {phase.id}
                </p>
                <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
                  {count} sem · {phase.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-base font-bold uppercase tracking-wider text-foreground">
          Calendario de misiones
        </h2>
        {weeks.map((week) => (
          <WeekCard
            key={week.weekNumber}
            week={week}
            expanded={expanded.has(week.weekNumber)}
            onToggle={() => toggleWeek(week.weekNumber)}
            onStart={() => setView("entreno")}
          />
        ))}
      </section>
    </div>
  );
}
