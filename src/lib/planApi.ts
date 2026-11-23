/** Ajuste del plan con IA (POST /api/coach con kind "plan"), compartido entre el Worker y la app. */

export type PlanChangeType = "sustituir" | "series" | "quitar" | "anadir";

/** Un cambio propuesto. La IA solo elige ejercicios del catálogo y series: los pesos los calcula el motor. */
export interface PlanChange {
  tipo: PlanChangeType;
  /** Título de la sesión del plan (p. ej. "Torso A"). */
  sesion: string;
  /** "proxima": solo la próxima vez que toque esa sesión; "siempre": todas las pendientes con ese título. */
  alcance: "proxima" | "siempre";
  /** Ejercicio actual (id del catálogo); null al añadir. */
  ejercicio: string | null;
  /** Ejercicio nuevo (id del catálogo) al sustituir o añadir; null en otro caso. */
  nuevoEjercicio: string | null;
  /** Series nuevas (1-6) al cambiar series o añadir; null en otro caso. */
  series: number | null;
  motivo: string;
}

export interface PlanProposal {
  resumen: string;
  cambios: PlanChange[];
}

/** Sesión del plan tal como se le enseña a la IA (una por título, la próxima pendiente). */
export interface PlanSessionSummary {
  titulo: string;
  ejercicios: { id: string; nombre: string; series: number; reps: string }[];
}

export interface PlanRequestBody {
  kind: "plan";
  peticion: string;
  sesiones: PlanSessionSummary[];
  /** Título de la próxima sesión pendiente (la de hoy). */
  proximaSesion: string | null;
}

export interface PlanResponse {
  proposal: PlanProposal;
  remaining: number | null;
}

export const PLAN_MAX_REQUEST_CHARS = 500;
export const PLAN_MAX_CHANGES = 6;
