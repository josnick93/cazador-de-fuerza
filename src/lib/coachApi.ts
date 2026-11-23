/** Protocolo del coach IA (POST /api/coach), compartido entre el Worker y la app. */

export interface CoachReview {
  titular: string;
  causa: string;
  cambios: string[];
}

export interface CoachTurn {
  role: "user" | "coach";
  text: string;
}

export type CoachRequest =
  { kind: "review" } | { kind: "chat"; message: string; history: CoachTurn[] };

export interface CoachReviewResponse {
  review: CoachReview;
  /** Consultas que quedan esta semana; null = sin límite. */
  remaining: number | null;
}

export interface CoachChatResponse {
  reply: string;
  remaining: number | null;
}

export interface CoachErrorResponse {
  error: string;
  remaining?: number | null;
}

export const COACH_MAX_MESSAGE_CHARS = 1000;
export const COACH_MAX_HISTORY = 10;
