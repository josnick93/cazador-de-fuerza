import type { CoachMessage, CoachWeeklyReview } from "@/types";

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
