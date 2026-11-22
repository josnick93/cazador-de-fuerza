/**
 * Veredicto semanal «¿Vas por buen camino?»: cruza la tendencia de fuerza (e1RM de los básicos) con la nutrición
 * y el peso de MacroQuest según el objetivo de allí. Reglas deterministas, sin IA.
 */
import { addDays, format, parseISO, startOfWeek } from "date-fns";

import { allSets } from "@/engine/history";
import type { MacroGoal, NutritionSnapshot, WeightPoint } from "@/lib/nutritionApi";
import type { Goal, WorkoutLog } from "@/types";

export type CheckStatus = "bien" | "atento" | "mal" | "sin-datos";

export interface VerdictCheck {
  id: "fuerza" | "peso" | "proteina" | "registro" | "objetivos";
  label: string;
  status: CheckStatus;
  detail: string;
}

export interface Verdict {
  status: CheckStatus;
  headline: string;
  /** Lo primero que conviene cambiar; null si todo va bien. */
  advice: string | null;
  goal: MacroGoal;
  checks: VerdictCheck[];
}

export interface NutritionWeek {
  /** Lunes de la semana, YYYY-MM-DD. */
  weekStart: string;
  /** dd/MM */
  label: string;
  daysLogged: number;
  kcal: number | null;
  protein: number | null;
  weightKg: number | null;
}

const DAY = 86_400_000;
const ymd = (d: Date) => format(d, "yyyy-MM-dd");
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const fmt = (n: number, decimals = 1) => n.toFixed(decimals).replace(".", ",");
const signed = (n: number, decimals = 1) => `${n > 0 ? "+" : ""}${fmt(n, decimals)}`;

/** Semanas de lunes a domingo, las `weeks` últimas hasta la actual (incluidas las vacías). */
export function nutritionWeeks(
  snapshot: NutritionSnapshot,
  today: Date,
  weeks = 8,
): NutritionWeek[] {
  const current = startOfWeek(today, { weekStartsOn: 1 });
  return Array.from({ length: weeks }, (_, i) => {
    const start = addDays(current, -7 * (weeks - 1 - i));
    const from = ymd(start);
    const to = ymd(addDays(start, 7));
    const days = snapshot.days.filter((d) => d.date >= from && d.date < to && d.kcal > 0);
    const weights = snapshot.weights.filter((w) => w.date >= from && w.date < to);
    const kcal = avg(days.map((d) => d.kcal));
    const protein = avg(days.map((d) => d.protein));
    const weight = avg(weights.map((w) => w.kg));
    return {
      weekStart: from,
      label: format(start, "dd/MM"),
      daysLogged: days.length,
      kcal: kcal === null ? null : Math.round(kcal),
      protein: protein === null ? null : Math.round(protein),
      weightKg: weight === null ? null : Math.round(weight * 10) / 10,
    };
  });
}

/**
 * Cambio medio de fuerza: mejor e1RM de los últimos 14 días frente a los 14 anteriores, por ejercicio,
 * promediado entre los que tienen datos en ambos periodos. null si ninguno los tiene.
 */
export function strengthTrend(
  logs: WorkoutLog[],
  exerciseIds: string[],
  today: Date,
): { pct: number; lifts: number } | null {
  const now = today.getTime();
  const changes: number[] = [];
  for (const id of exerciseIds) {
    let recent = 0;
    let previous = 0;
    for (const set of allSets(logs, [id])) {
      const age = now - new Date(set.completedAt).getTime();
      if (age < 0) continue;
      if (age <= 14 * DAY) recent = Math.max(recent, set.e1rm);
      else if (age <= 28 * DAY) previous = Math.max(previous, set.e1rm);
    }
    if (recent > 0 && previous > 0) changes.push((recent / previous - 1) * 100);
  }
  const mean = avg(changes);
  return mean === null ? null : { pct: Math.round(mean * 10) / 10, lifts: changes.length };
}

/** Tendencia del peso en kg/semana (regresión lineal de los pesajes de los últimos 28 días). */
export function weightTrendKgWeek(weights: WeightPoint[], today: Date): number | null {
  const from = ymd(addDays(today, -28));
  const points = weights
    .filter((w) => w.date >= from && w.date <= ymd(today))
    .map((w) => ({ x: parseISO(w.date).getTime() / DAY, y: w.kg }));
  if (points.length < 2) return null;
  const xs = points.map((p) => p.x);
  if (Math.max(...xs) - Math.min(...xs) < 7) return null;
  const mx = avg(xs)!;
  const my = avg(points.map((p) => p.y))!;
  const num = points.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0);
  const den = points.reduce((s, p) => s + (p.x - mx) ** 2, 0);
  return Math.round((num / den) * 7 * 100) / 100;
}

/** Objetivo equivalente cuando MacroQuest no tiene perfil. */
export function fallbackMacroGoal(goal: Goal): MacroGoal {
  return goal === "hipertrofia" ? "ganar" : "mantener";
}

export interface VerdictInput {
  goal: MacroGoal;
  /** Objetivo de entrenamiento en esta app (para avisar si choca con el de MacroQuest). */
  trainingGoal: Goal;
  nutrition: NutritionSnapshot;
  strength: { pct: number; lifts: number } | null;
  bodyweightKg: number;
  today: Date;
}

const DEFAULT_RATE = 0.25;
const DEFAULT_PROTEIN = 1.6;

function weightCheck(goal: MacroGoal, slope: number | null, rate: number): VerdictCheck {
  const label = "Peso";
  if (slope === null) {
    return {
      id: "peso",
      label,
      status: "sin-datos",
      detail: "Pésate en MacroQuest 2-3 veces por semana.",
    };
  }
  const trend = `${signed(slope, 2)} kg/semana`;
  if (goal === "ganar") {
    if (slope < rate * 0.25)
      return { id: "peso", label, status: "atento", detail: `${trend}: no estás ganando peso.` };
    if (slope > rate * 2)
      return { id: "peso", label, status: "atento", detail: `${trend}: subes demasiado rápido.` };
    return { id: "peso", label, status: "bien", detail: `${trend}, al ritmo de tu volumen.` };
  }
  if (goal === "perder") {
    if (slope > -rate * 0.25)
      return { id: "peso", label, status: "atento", detail: `${trend}: no estás bajando.` };
    if (slope < -rate * 2)
      return { id: "peso", label, status: "atento", detail: `${trend}: bajas demasiado rápido.` };
    return { id: "peso", label, status: "bien", detail: `${trend}, al ritmo de tu definición.` };
  }
  return Math.abs(slope) <= 0.2
    ? { id: "peso", label, status: "bien", detail: `${trend}: estable.` }
    : { id: "peso", label, status: "atento", detail: `${trend}: tu peso se mueve.` };
}

function strengthCheck(goal: MacroGoal, strength: VerdictInput["strength"]): VerdictCheck {
  const label = "Fuerza";
  if (!strength) {
    return {
      id: "fuerza",
      label,
      status: "sin-datos",
      detail: "Hacen falta 4 semanas de entrenos con los básicos.",
    };
  }
  const detail = `${signed(strength.pct)} % en las últimas 2 semanas`;
  if (strength.pct >= 1)
    return { id: "fuerza", label, status: "bien", detail: `${detail}: subiendo.` };
  if (goal === "perder") {
    if (strength.pct >= -2)
      return { id: "fuerza", label, status: "bien", detail: `${detail}: la mantienes en déficit.` };
    if (strength.pct >= -4)
      return { id: "fuerza", label, status: "atento", detail: `${detail}: empieza a bajar.` };
    return { id: "fuerza", label, status: "mal", detail: `${detail}: estás perdiendo fuerza.` };
  }
  if (strength.pct >= -2)
    return { id: "fuerza", label, status: "atento", detail: `${detail}: estancada.` };
  return { id: "fuerza", label, status: "mal", detail: `${detail}: está bajando.` };
}

export function computeVerdict(input: VerdictInput): Verdict {
  const { goal, nutrition, today } = input;
  const rate =
    nutrition.rateKgWeek && nutrition.rateKgWeek > 0 ? nutrition.rateKgWeek : DEFAULT_RATE;
  const proteinTarget =
    nutrition.proteinPerKg && nutrition.proteinPerKg > 0 ? nutrition.proteinPerKg : DEFAULT_PROTEIN;
  const lastWeight = nutrition.weights.at(-1)?.kg ?? nutrition.weightKg ?? input.bodyweightKg;

  const week = ymd(addDays(today, -6));
  const twoWeeks = ymd(addDays(today, -13));
  const logged7 = nutrition.days.filter((d) => d.date >= week && d.kcal > 0).length;
  const recentDays = nutrition.days.filter((d) => d.date >= twoWeeks && d.kcal > 0);
  const proteinAvg = avg(recentDays.map((d) => d.protein));
  const slope = weightTrendKgWeek(nutrition.weights, today);

  const checks: VerdictCheck[] = [
    strengthCheck(goal, input.strength),
    weightCheck(goal, slope, rate),
  ];

  if (proteinAvg === null) {
    checks.push({
      id: "proteina",
      label: "Proteína",
      status: "sin-datos",
      detail: "Registra tus comidas en MacroQuest.",
    });
  } else {
    const perKg = proteinAvg / lastWeight;
    const ratio = perKg / proteinTarget;
    checks.push({
      id: "proteina",
      label: "Proteína",
      status: ratio >= 0.9 ? "bien" : ratio >= 0.75 ? "atento" : "mal",
      detail: `${fmt(perKg)} g/kg de media (objetivo ${fmt(proteinTarget)} g/kg).`,
    });
  }

  checks.push({
    id: "registro",
    label: "Registro",
    status: logged7 >= 5 ? "bien" : logged7 >= 3 ? "atento" : "sin-datos",
    detail: `${logged7}/7 días registrados en MacroQuest esta semana.`,
  });

  if (input.trainingGoal === "hipertrofia" && goal === "perder") {
    checks.push({
      id: "objetivos",
      label: "Objetivos",
      status: "atento",
      detail:
        "Buscas hipertrofia pero estás en déficit en MacroQuest: ganarás músculo más despacio.",
    });
  }

  const byId = (id: VerdictCheck["id"]) => checks.find((c) => c.id === id)!;
  const core = [byId("fuerza"), byId("peso")];
  let status: CheckStatus;
  if (core.every((c) => c.status === "sin-datos") && byId("proteina").status === "sin-datos") {
    status = "sin-datos";
  } else if (checks.some((c) => c.status === "mal")) {
    status = "mal";
  } else if (checks.some((c) => c.status === "atento")) {
    status = "atento";
  } else {
    status = "bien";
  }

  const headline = {
    bien: "Vas por buen camino",
    atento: "Vas bien, pero ajusta un detalle",
    mal: "Algo está frenando tu progreso",
    "sin-datos": "Aún faltan datos para el veredicto",
  }[status];

  return {
    status,
    headline,
    advice: adviceFor(checks, goal, slope, rate, proteinTarget * lastWeight),
    goal,
    checks,
  };
}

function adviceFor(
  checks: VerdictCheck[],
  goal: MacroGoal,
  slope: number | null,
  rate: number,
  proteinGrams: number,
): string | null {
  const status = (id: VerdictCheck["id"]) => checks.find((c) => c.id === id)?.status;
  const protein = status("proteina");
  if (protein === "mal" || protein === "atento") {
    const target = Math.round(proteinGrams / 5) * 5;
    return `Sube la proteína a unos ${target} g al día (${Math.round(target / 4)} g en cada una de 4 comidas).`;
  }
  if (status("peso") === "atento" && slope !== null) {
    if (goal === "ganar") {
      return slope < rate
        ? "No estás ganando peso: añade unas 200 kcal al día."
        : "Ganas peso demasiado rápido: quita unas 150 kcal al día.";
    }
    if (goal === "perder") {
      return slope > -rate
        ? "No estás bajando: quita unas 200 kcal al día o muévete más."
        : "Bajas demasiado rápido: añade unas 200 kcal para no perder fuerza.";
    }
    return "Tu peso se mueve: ajusta unas 150 kcal al día en sentido contrario.";
  }
  const strength = status("fuerza");
  if (strength === "mal") {
    return "Tu fuerza baja: revisa sueño y descanso, o haz una semana de descarga.";
  }
  if (strength === "atento") {
    return "Fuerza estancada con la nutrición en orden: probablemente es fatiga; valora una descarga.";
  }
  if (status("registro") !== "bien") {
    return "Registra comidas y pesajes en MacroQuest al menos 5 días por semana para afinar el veredicto.";
  }
  if (status("objetivos") === "atento") {
    return "Alinea los objetivos: en MacroQuest pon mantener o volumen si quieres priorizar la hipertrofia.";
  }
  return null;
}
