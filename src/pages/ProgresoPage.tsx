import { useState } from "react";
import { AlertTriangle, ArrowRight, Trophy } from "lucide-react";
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useApp } from "@/components/AppContext";
import {
  formatWeight,
  getE1rmHistory,
  getMainLifts,
  getRecentPRs,
  getStagnationAlert,
  getWeeklyNutrition,
} from "@/services/strengthService";
import type { LiftId } from "@/types";

export function ProgresoPage() {
  const { profile, openCoachWithPrompt } = useApp();
  const lifts = getMainLifts();
  const [selectedLift, setSelectedLift] = useState<LiftId>("banca");

  const e1rmHistory = getE1rmHistory(selectedLift);
  const nutrition = getWeeklyNutrition();
  const stagnation = getStagnationAlert(selectedLift);
  const recentPrs = getRecentPRs();

  const chartData = e1rmHistory.map((point, idx) => {
    const nut = nutrition[idx];
    return {
      week: point.week,
      e1rm: point.e1rmKg,
      proteinG: nut?.proteinG ?? 0,
      kcalIndex: nut ? Math.round(nut.kcal / 15) : 0, // escalado para eje secundario junto a proteína
      kcalRaw: nut?.kcal ?? 0,
    };
  });

  const latest = e1rmHistory[e1rmHistory.length - 1];
  const first = e1rmHistory[0];
  const delta = latest && first ? Math.round((latest.e1rmKg - first.e1rmKg) * 10) / 10 : 0;

  return (
    <div className="space-y-5 px-4 py-4">
      <section>
        <h1 className="font-display text-2xl font-bold text-foreground">Progreso de Fuerza</h1>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {lifts.map((lift) => {
            const active = lift.id === selectedLift;
            return (
              <button
                key={lift.id}
                type="button"
                onClick={() => setSelectedLift(lift.id)}
                className={`min-h-[48px] shrink-0 rounded-xl border px-3.5 font-display text-sm font-bold transition-colors ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                {lift.shortLabel}
              </button>
            );
          })}
        </div>
      </section>

      {stagnation && (
        <section className="rounded-2xl border border-destructive/50 bg-destructive/10 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div className="min-w-0 flex-1">
              <p className="font-display text-base font-bold text-foreground">
                {stagnation.summary}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{stagnation.cause}</p>
              <button
                type="button"
                onClick={() =>
                  openCoachWithPrompt(`¿Por qué no subo en ${stagnation.liftName.toLowerCase()}?`)
                }
                className="mt-3 inline-flex min-h-[48px] items-center gap-1.5 rounded-xl bg-destructive px-4 font-display text-sm font-bold text-destructive-foreground"
              >
                Ver por qué
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="system-panel rounded-2xl p-4">
        <div className="mb-3 flex items-baseline justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">e1RM actual (8 semanas)</p>
            <p className="tabular-nums-display text-3xl font-bold text-foreground">
              {latest ? formatWeight(latest.e1rmKg, profile.unit) : "—"}
            </p>
          </div>
          <span className="rounded-lg border border-primary/40 bg-primary/15 px-2.5 py-1 font-display text-xs font-bold text-primary">
            {delta >= 0 ? `+${delta}` : delta} kg en 8 sem
          </span>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
              <XAxis dataKey="week" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis
                yAxisId="left"
                stroke="var(--chart-1)"
                fontSize={11}
                domain={["dataMin - 4", "dataMax + 4"]}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="var(--chart-2)"
                fontSize={10}
                domain={[100, 200]}
                hide
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  borderColor: "var(--border)",
                  borderRadius: "12px",
                  fontSize: "12px",
                }}
                formatter={(value, name, item) => {
                  if (name === "e1rm") return [`${value} kg`, "e1RM"];
                  if (name === "proteinG") return [`${value} g/día`, "Proteína"];
                  if (name === "kcalIndex") {
                    const raw = (item.payload as { kcalRaw?: number })?.kcalRaw ?? 0;
                    return [`${raw} kcal`, "Kcal media"];
                  }
                  return [String(value), String(name)];
                }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="e1rm"
                stroke="var(--chart-1)"
                strokeWidth={3}
                dot={{ r: 4, fill: "var(--chart-1)" }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="proteinG"
                stroke="var(--chart-2)"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                dot={false}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="kcalIndex"
                stroke="var(--chart-3)"
                strokeWidth={1.5}
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-chart-1" />
            e1RM (kg)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-chart-2" />
            Proteína media (g)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-chart-3" />
            Kcal media
          </span>
        </div>
      </section>

      <section className="space-y-2.5">
        <h2 className="font-display text-base font-bold uppercase tracking-wider text-foreground">
          PRs recientes
        </h2>
        {recentPrs.map((pr) => (
          <div
            key={pr.id}
            className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3.5"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-gold/40 bg-gold/15 text-gold">
                <Trophy className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-display text-sm font-bold text-foreground">
                  {pr.exerciseName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {pr.setSummary} · {pr.dateLabel}
                </p>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="tabular-nums-display text-base font-bold text-foreground">
                {formatWeight(pr.e1rmKg, profile.unit)}
              </p>
              <p className="text-xs font-semibold text-success">+{pr.deltaKg} kg</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
