import { weightForReps } from "@/engine/e1rm";
import { parseRepRange } from "@/engine/progression";
import type {
  Equipment,
  Exercise,
  GeneratedWeek,
  Goal,
  Mesocycle,
  MesocyclePhase,
  MovementPattern,
  MuscleGroup,
  PlannedExercise,
  PlannedSession,
  StrengthBase,
  TemplateId,
  UserProfile,
} from "@/types";

export type GeneratorInput = Pick<
  UserProfile,
  "goal" | "daysPerWeek" | "sessionMinutes" | "equipment" | "bodyweightKg" | "initial1RM"
>;

export interface GeneratorOptions {
  /** e1RM conocido por ejercicio (historial real); tiene prioridad sobre las estimaciones. */
  knownE1rm?: Record<string, number>;
  id?: string;
  createdAt?: string;
}

interface Slot {
  pattern: MovementPattern;
  /** Índice de variante dentro de las opciones compatibles del patrón. */
  variant?: number;
  /** Básico de powerlifting programado por %1RM. */
  percent?: boolean;
}

interface SessionTemplate {
  title: string;
  slots: Slot[];
}

const TEMPLATE_NAMES: Record<TemplateId, string> = {
  "full-body": "Full Body",
  "torso-pierna": "Torso / Pierna",
  ppl: "Empuje / Tirón / Pierna",
  powerlifting: "Powerlifting",
};

const DAY_LABELS: Record<number, string[]> = {
  2: ["Lun", "Jue"],
  3: ["Lun", "Mié", "Vie"],
  4: ["Lun", "Mar", "Jue", "Vie"],
  5: ["Lun", "Mar", "Mié", "Vie", "Sáb"],
  6: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"],
};

const s = (pattern: MovementPattern, variant = 0, percent = false): Slot => ({
  pattern,
  variant,
  percent,
});

const FULL_BODY: SessionTemplate[] = [
  {
    title: "Full Body A",
    slots: [
      s("sentadilla"),
      s("empuje-horizontal"),
      s("tiron-horizontal"),
      s("empuje-vertical"),
      s("biceps"),
      s("triceps"),
    ],
  },
  {
    title: "Full Body B",
    slots: [
      s("bisagra"),
      s("empuje-horizontal", 1),
      s("tiron-vertical"),
      s("pierna-accesorio"),
      s("hombro-accesorio"),
      s("triceps", 1),
    ],
  },
  {
    title: "Full Body C",
    slots: [
      s("sentadilla", 1),
      s("empuje-vertical", 1),
      s("tiron-horizontal", 1),
      s("bisagra", 1),
      s("biceps", 1),
      s("hombro-accesorio", 1),
    ],
  },
];

const TORSO_A: SessionTemplate = {
  title: "Torso A",
  slots: [
    s("empuje-horizontal"),
    s("tiron-horizontal"),
    s("empuje-vertical"),
    s("tiron-vertical"),
    s("triceps"),
    s("biceps"),
  ],
};
const PIERNA_A: SessionTemplate = {
  title: "Pierna A",
  slots: [s("sentadilla"), s("bisagra", 1), s("pierna-accesorio"), s("pierna-accesorio", 1)],
};
const TORSO_B: SessionTemplate = {
  title: "Torso B",
  slots: [
    s("empuje-vertical"),
    s("tiron-vertical"),
    s("empuje-horizontal", 1),
    s("tiron-horizontal", 1),
    s("hombro-accesorio"),
    s("biceps", 1),
  ],
};
const PIERNA_B: SessionTemplate = {
  title: "Pierna B",
  slots: [s("bisagra"), s("sentadilla", 1), s("pierna-accesorio", 1), s("pierna-accesorio")],
};

function ppl(suffix: string, v: number): SessionTemplate[] {
  return [
    {
      title: `Empuje${suffix}`,
      slots: [
        s("empuje-horizontal", v),
        s("empuje-vertical", v),
        s("empuje-horizontal", v + 1),
        s("hombro-accesorio", v),
        s("triceps", v),
        s("triceps", v + 1),
      ],
    },
    {
      title: `Tirón${suffix}`,
      slots: [
        s("tiron-vertical", v),
        s("tiron-horizontal", v),
        s("tiron-horizontal", v + 1),
        s("tiron-vertical", v + 1),
        s("biceps", v),
        s("biceps", v + 1),
      ],
    },
    {
      title: `Pierna${suffix}`,
      slots: [
        s("sentadilla", v),
        s("bisagra", v + 1),
        s("pierna-accesorio", v),
        s("pierna-accesorio", v + 1),
      ],
    },
  ];
}

const PL_SQUAT: SessionTemplate = {
  title: "Sentadilla",
  slots: [
    s("sentadilla", 0, true),
    s("empuje-horizontal", 1),
    s("pierna-accesorio"),
    s("tiron-horizontal"),
  ],
};
const PL_BENCH: SessionTemplate = {
  title: "Press Banca",
  slots: [s("empuje-horizontal", 0, true), s("tiron-vertical"), s("empuje-vertical"), s("triceps")],
};
const PL_DEAD: SessionTemplate = {
  title: "Peso Muerto",
  slots: [
    s("bisagra", 0, true),
    s("empuje-horizontal", 1),
    s("tiron-horizontal", 1),
    s("pierna-accesorio", 1),
  ],
};

function sessionTemplates(template: TemplateId, days: number): SessionTemplate[] {
  switch (template) {
    case "full-body":
      return FULL_BODY.slice(0, days);
    case "torso-pierna":
      return [TORSO_A, PIERNA_A, TORSO_B, PIERNA_B];
    case "ppl":
      return days >= 6 ? [...ppl(" A", 0), ...ppl(" B", 1)] : [...ppl("", 0), TORSO_B, PIERNA_B];
    case "powerlifting": {
      if (days === 2) {
        return [
          { title: "Sentadilla + Banca", slots: [PL_SQUAT.slots[0]!, ...PL_BENCH.slots] },
          {
            title: "Peso Muerto + Banca",
            slots: [
              PL_DEAD.slots[0]!,
              s("empuje-horizontal", 1, false),
              s("tiron-horizontal"),
              s("pierna-accesorio"),
            ],
          },
        ];
      }
      const cycle = [PL_SQUAT, PL_BENCH, PL_DEAD];
      const extra: SessionTemplate[] = [
        {
          title: "Banca Volumen",
          slots: [
            s("empuje-horizontal", 0, true),
            s("tiron-horizontal", 1),
            s("hombro-accesorio"),
            s("biceps"),
          ],
        },
        {
          title: "Sentadilla Técnica",
          slots: [s("sentadilla", 1), s("bisagra", 1), s("tiron-vertical", 1), s("triceps", 1)],
        },
        {
          title: "Accesorios",
          slots: [s("empuje-vertical"), s("tiron-vertical"), s("pierna-accesorio"), s("biceps", 1)],
        },
      ];
      return [...cycle, ...extra].slice(0, days);
    }
  }
}

export function pickTemplate(goal: Goal, daysPerWeek: number): TemplateId {
  if (goal === "powerlifting") return "powerlifting";
  if (daysPerWeek <= 3) return "full-body";
  if (daysPerWeek === 4) return "torso-pierna";
  return "ppl";
}

/** En descarga se calcula la carga sobre un e1RM un 10% menor. */
export const DELOAD_E1RM_FACTOR = 0.9;

const WEEKS_BY_GOAL: Record<Goal, number> = {
  fuerza: 5,
  powerlifting: 5,
  hipertrofia: 6,
  recomposicion: 4,
};

const REP_RANGES: Record<
  Goal,
  { compound: [string, string]; accessory: string } // [acumulación, intensificación]
> = {
  fuerza: { compound: ["5-7", "3-5"], accessory: "8-10" },
  hipertrofia: { compound: ["8-10", "6-8"], accessory: "10-15" },
  recomposicion: { compound: ["6-8", "5-7"], accessory: "8-12" },
  powerlifting: { compound: ["5-8", "4-6"], accessory: "8-12" },
};

const SESSION_SHAPE: Record<number, { exercises: number; compoundSets: number; accSets: number }> =
  {
    45: { exercises: 4, compoundSets: 3, accSets: 2 },
    60: { exercises: 5, compoundSets: 3, accSets: 3 },
    75: { exercises: 6, compoundSets: 4, accSets: 3 },
  };

function sessionShape(minutes: number) {
  if (minutes <= 50) return SESSION_SHAPE[45]!;
  if (minutes <= 65) return SESSION_SHAPE[60]!;
  return SESSION_SHAPE[75]!;
}

/** Fases: última semana descarga; del resto, la primera mitad (redondeo arriba) acumulación. */
export function buildPhases(weeks: number): MesocyclePhase[] {
  const training = weeks - 1;
  const acc = Math.ceil(training / 2);
  return Array.from({ length: weeks }, (_, i) =>
    i === weeks - 1 ? "Descarga" : i < acc ? "Acumulación" : "Intensificación",
  );
}

function rirFor(phases: MesocyclePhase[], idx: number): number {
  const phase = phases[idx];
  if (phase === "Descarga") return 4;
  const samePhase = phases.map((p, i) => (p === phase ? i : -1)).filter((i) => i >= 0);
  const pos = samePhase.indexOf(idx);
  if (phase === "Acumulación") return pos === 0 ? 3 : 2;
  return pos === samePhase.length - 1 ? 1 : 2;
}

const EQUIPMENT_ACCESS: Record<Equipment, Equipment[]> = {
  gimnasio: ["gimnasio", "mancuernas", "casa"],
  mancuernas: ["mancuernas", "casa"],
  casa: ["casa"],
};

export function isExerciseAvailable(exercise: Exercise, equipment: Equipment): boolean {
  return EQUIPMENT_ACCESS[equipment].includes(exercise.equipment);
}

/** 1RM de referencia; si el usuario no lo sabe, estimación conservadora por peso corporal. */
export function baseStrength(input: GeneratorInput, base: StrengthBase): number {
  const bw = input.bodyweightKg;
  switch (base) {
    case "banca":
      return input.initial1RM.banca ?? Math.round(bw * 0.8);
    case "sentadilla":
      return input.initial1RM.sentadilla ?? Math.round(bw * 1.1);
    case "pesoMuerto":
      return input.initial1RM.pesoMuerto ?? Math.round(bw * 1.35);
    case "pesoCorporal":
      return bw;
  }
}

export function estimateE1rm(
  exercise: Exercise,
  input: GeneratorInput,
  knownE1rm: Record<string, number> = {},
): number {
  const known = knownE1rm[exercise.id];
  if (known && known > 0) return known;
  return (
    Math.round(baseStrength(input, exercise.strength.base) * exercise.strength.ratio * 10) / 10
  );
}

/** Carga para la rep mínima del rango con el RIR objetivo (pasos de 1 kg en ejercicios ligeros). */
export function targetLoad(e1rm: number, repRange: string, rir: number): number {
  const { min } = parseRepRange(repRange);
  const step = e1rm < 40 ? 1 : 2.5;
  return Math.max(step, weightForReps(e1rm, min, rir, step));
}

function pickExercise(
  catalog: Exercise[],
  pattern: MovementPattern,
  equipment: Equipment,
  variant: number,
): Exercise | undefined {
  const options = catalog.filter((e) => e.pattern === pattern && isExerciseAvailable(e, equipment));
  if (options.length === 0) return undefined;
  return options[variant % options.length];
}

/** Powerlifting: %1RM de semanas de entrenamiento de 72% a 87%; descarga al 65%. */
function plScheme(weekIdx: number, totalWeeks: number) {
  const training = totalWeeks - 1;
  if (weekIdx === totalWeeks - 1) return { pct: 0.65, reps: 3, sets: 2 };
  const t = training > 1 ? weekIdx / (training - 1) : 0;
  const pct = Math.round((0.72 + t * 0.15) * 100) / 100;
  const reps = Math.max(2, Math.round(5 - t * 3));
  return { pct, reps, sets: weekIdx === training - 1 ? 3 : 4 };
}

function formatKg(kg: number): string {
  return `${kg.toString().replace(".", ",")} kg`;
}

export function generateMesocycle(
  input: GeneratorInput,
  catalog: Exercise[],
  options: GeneratorOptions = {},
): Mesocycle {
  const days = Math.min(6, Math.max(2, Math.round(input.daysPerWeek)));
  const template = pickTemplate(input.goal, days);
  const sessions = sessionTemplates(template, days);
  const labels = DAY_LABELS[days]!;
  const totalWeeks = WEEKS_BY_GOAL[input.goal];
  const phases = buildPhases(totalWeeks);
  const shape = sessionShape(input.sessionMinutes);
  const ranges = REP_RANGES[input.goal];

  const weeks: GeneratedWeek[] = phases.map((phase, weekIdx) => {
    const rir = rirFor(phases, weekIdx);
    const deload = phase === "Descarga";
    const pl = plScheme(weekIdx, totalWeeks);

    const weekSessions: PlannedSession[] = sessions.map((tpl, dayIdx) => {
      const seen = new Set<string>();
      const exercises: { planned: PlannedExercise; exercise: Exercise }[] = [];

      for (const slot of tpl.slots) {
        if (exercises.length >= shape.exercises) break;
        const exercise = pickExercise(catalog, slot.pattern, input.equipment, slot.variant ?? 0);
        if (!exercise || seen.has(exercise.id)) continue;
        seen.add(exercise.id);

        const e1rm = estimateE1rm(exercise, input, options.knownE1rm);
        let planned: PlannedExercise;

        if (slot.percent && exercise.strength.base !== "pesoCorporal") {
          const oneRm = baseStrength(input, exercise.strength.base) * exercise.strength.ratio;
          const repRange = String(pl.reps);
          planned = {
            exerciseId: exercise.id,
            sets: pl.sets,
            repRange,
            targetRir: deload ? 4 : Math.max(1, rir),
            targetKg: Math.max(2.5, Math.round((oneRm * pl.pct) / 2.5) * 2.5),
            lastSessionText: `${Math.round(pl.pct * 100)}% de tu 1RM (${formatKg(Math.round(oneRm))})`,
          };
        } else {
          const baseSets = exercise.compound ? shape.compoundSets : shape.accSets;
          const repRange = exercise.compound
            ? phase === "Intensificación"
              ? ranges.compound[1]
              : ranges.compound[0]
            : ranges.accessory;
          planned = {
            exerciseId: exercise.id,
            sets: deload ? Math.max(1, Math.round(baseSets * 0.6)) : baseSets,
            repRange,
            targetRir: rir,
            targetKg: targetLoad(deload ? e1rm * DELOAD_E1RM_FACTOR : e1rm, repRange, rir),
            lastSessionText:
              exercise.strength.base === "pesoCorporal"
                ? "Carga total (cuerpo + lastre) estimada"
                : "Carga estimada desde tu 1RM",
          };
        }
        exercises.push({ planned, exercise });
      }

      const muscles = [...new Set(exercises.map((e) => e.exercise.muscle))] as MuscleGroup[];
      const restMinutes = exercises.reduce(
        (acc, { planned, exercise }) => acc + (planned.sets * (exercise.defaultRestSec + 40)) / 60,
        0,
      );
      const first = exercises[0];
      const focus = first
        ? `${first.exercise.name} ${first.planned.sets}×${first.planned.repRange} @ RIR ${first.planned.targetRir}`
        : tpl.title;

      return {
        id: `s${weekIdx + 1}-d${dayIdx + 1}`,
        dayLabel: labels[dayIdx] ?? `D${dayIdx + 1}`,
        title: deload ? `${tpl.title} · Técnica` : tpl.title,
        focus,
        muscles,
        estimatedMinutes: Math.round(restMinutes + 8),
        exercises: exercises.map((e) => e.planned),
      };
    });

    const intensityLabel = deload
      ? "RIR 4 · -40% volumen"
      : template === "powerlifting"
        ? `${Math.round(pl.pct * 100)}% 1RM · RIR ${rir}`
        : phase === "Acumulación"
          ? `RIR ${rir} · Volumen`
          : `RIR ${rir} · Cargas altas`;

    return {
      weekNumber: weekIdx + 1,
      phase,
      intensityLabel,
      targetRir: rir,
      sessions: weekSessions,
    };
  });

  return {
    id: options.id ?? `meso-${Date.now().toString(36)}`,
    createdAt: options.createdAt ?? new Date().toISOString(),
    goal: input.goal,
    template,
    templateName: TEMPLATE_NAMES[template],
    weeks,
  };
}
