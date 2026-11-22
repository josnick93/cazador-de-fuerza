import type {
  CoachMessage,
  CoachWeeklyReview,
  MesocycleWeek,
  UserProfile,
  WorkoutPlan,
} from "@/types";

export const MOCK_USER_PROFILE: UserProfile = {
  name: "Cazador Jin",
  hunterRank: "Rango B",
  level: 18,
  xp: 2450,
  nextLevelXp: 3000,
  goal: "fuerza",
  daysPerWeek: 4,
  sessionMinutes: 60,
  equipment: "gimnasio",
  bodyweightKg: 78,
  unit: "kg",
  macroQuestSync: true,
  isPremium: false,
  onboardingCompleted: true,
  initial1RM: {
    banca: 100,
    sentadilla: 135,
    pesoMuerto: 165,
  },
};

export const MOCK_TODAY_WORKOUT: WorkoutPlan = {
  id: "wk-upper-a",
  title: "Torso Fuerza A",
  questCode: "MISIÓN DIARIA #42",
  estimatedMinutes: 58,
  muscles: ["Pecho", "Espalda", "Hombros", "Brazos"],
  exercises: [
    {
      exerciseId: "ex-banca-barra",
      sets: 3,
      repRange: "6-8",
      targetRir: 2,
      targetKg: 80,
      lastSessionText: "Última vez: 77,5 kg × 8 @ RIR 1",
    },
    {
      exerciseId: "ex-remo-barra",
      sets: 3,
      repRange: "6-8",
      targetRir: 2,
      targetKg: 75,
      lastSessionText: "Última vez: 72,5 kg × 8 @ RIR 2",
    },
    {
      exerciseId: "ex-press-militar",
      sets: 3,
      repRange: "6-8",
      targetRir: 2,
      targetKg: 52.5,
      lastSessionText: "Última vez: 50 kg × 8 @ RIR 2",
    },
    {
      exerciseId: "ex-dominadas",
      sets: 3,
      repRange: "6-8",
      targetRir: 1,
      targetKg: 85,
      lastSessionText: "Última vez: 82,5 kg × 7 @ RIR 1",
    },
    {
      exerciseId: "ex-fondos-triceps",
      sets: 2,
      repRange: "8-10",
      targetRir: 1,
      targetKg: 82.5,
      lastSessionText: "Última vez: 80 kg × 9 @ RIR 2",
    },
  ],
};

export const MOCK_MESOCYCLE: MesocycleWeek[] = [
  {
    weekNumber: 1,
    phase: "Acumulación",
    intensityLabel: "RIR 3 · Volumen base",
    isCurrent: false,
    days: [
      { dayLabel: "Lun", sessionTitle: "Torso Fuerza A", focus: "Banca + Remo", completed: true },
      { dayLabel: "Mar", sessionTitle: "Pierna Fuerza A", focus: "Sentadilla", completed: true },
      {
        dayLabel: "Jue",
        sessionTitle: "Torso Fuerza B",
        focus: "Militar + Dominadas",
        completed: true,
      },
      { dayLabel: "Vie", sessionTitle: "Pierna Fuerza B", focus: "Peso Muerto", completed: true },
    ],
  },
  {
    weekNumber: 2,
    phase: "Acumulación",
    intensityLabel: "RIR 2-3 · +1 serie",
    isCurrent: false,
    days: [
      { dayLabel: "Lun", sessionTitle: "Torso Fuerza A", focus: "Banca + Remo", completed: true },
      { dayLabel: "Mar", sessionTitle: "Pierna Fuerza A", focus: "Sentadilla", completed: true },
      {
        dayLabel: "Jue",
        sessionTitle: "Torso Fuerza B",
        focus: "Militar + Dominadas",
        completed: true,
      },
      { dayLabel: "Vie", sessionTitle: "Pierna Fuerza B", focus: "Peso Muerto", completed: true },
    ],
  },
  {
    weekNumber: 3,
    phase: "Intensificación",
    intensityLabel: "RIR 2 · Cargas altas",
    isCurrent: true,
    days: [
      {
        dayLabel: "Lun",
        sessionTitle: "Torso Fuerza A",
        focus: "Banca 3×6-8 @ RIR 2",
        completed: false,
        isToday: true,
      },
      {
        dayLabel: "Mar",
        sessionTitle: "Pierna Fuerza A",
        focus: "Sentadilla 4×5 @ RIR 2",
        completed: false,
      },
      {
        dayLabel: "Jue",
        sessionTitle: "Torso Fuerza B",
        focus: "Militar 3×6 @ RIR 1",
        completed: false,
      },
      {
        dayLabel: "Vie",
        sessionTitle: "Pierna Fuerza B",
        focus: "Peso Muerto 3×5 @ RIR 2",
        completed: false,
      },
    ],
  },
  {
    weekNumber: 4,
    phase: "Intensificación",
    intensityLabel: "RIR 1 · Pico de fuerza",
    isCurrent: false,
    days: [
      {
        dayLabel: "Lun",
        sessionTitle: "Torso Fuerza A",
        focus: "Banca Top Set RIR 1",
        completed: false,
      },
      {
        dayLabel: "Mar",
        sessionTitle: "Pierna Fuerza A",
        focus: "Sentadilla Top Set",
        completed: false,
      },
      {
        dayLabel: "Jue",
        sessionTitle: "Torso Fuerza B",
        focus: "Militar + Dominadas",
        completed: false,
      },
      {
        dayLabel: "Vie",
        sessionTitle: "Pierna Fuerza B",
        focus: "Peso Muerto Top Set",
        completed: false,
      },
    ],
  },
  {
    weekNumber: 5,
    phase: "Descarga",
    intensityLabel: "RIR 4 · -40% volumen",
    isCurrent: false,
    days: [
      {
        dayLabel: "Lun",
        sessionTitle: "Torso Técnico",
        focus: "Banca 2×5 @ 70%",
        completed: false,
      },
      {
        dayLabel: "Jue",
        sessionTitle: "Pierna Técnica",
        focus: "Sentadilla 2×5 @ 70%",
        completed: false,
      },
    ],
  },
];

export const MOCK_WEEKLY_REVIEW: CoachWeeklyReview = {
  weekLabel: "Semana 8 · Diagnóstico del Sistema",
  headline: "Banca estancada 3 semanas por déficit de proteína",
  cause:
    "Tu e1RM en Press Banca lleva 3 semanas clavado en 102,5 kg mientras tu proteína media en MacroQuest bajó de 165 g a 125 g/día (-24%) y tus calorías cayeron 350 kcal.",
  changes: [
    "Sube la proteína diaria a 160 g mínimo (2,0 g/kg) esta semana en MacroQuest.",
    "En Press Banca, haz 1 serie pesada de 5 reps @ RIR 2 y 2 series de respaldo al -7%.",
    "Añade 30 s extra de descanso entre series de empuje (mínimo 2:30 min).",
  ],
};

export const MOCK_INITIAL_COACH_MESSAGES: CoachMessage[] = [
  {
    id: "msg-1",
    role: "coach",
    text: "Bienvenido, Cazador. He cruzado tus últimas 8 semanas de fuerza con MacroQuest: Sentadilla y Peso Muerto suben bien, pero tu Press Banca lleva 3 semanas sin mejorar. ¿Quieres revisar el plan de desbloqueo?",
    timestamp: "Hoy · 09:15",
  },
];
