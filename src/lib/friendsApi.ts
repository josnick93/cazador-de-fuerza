/**
 * Protocolo de amigos (/api/friends), compartido entre el Worker y la app.
 * Solo se comparte lo de entrenar: nombre, rango, nivel, entrenos, PRs y marcas de los básicos.
 * Nunca el correo, el peso corporal ni la nutrición de MacroQuest.
 */

export interface FriendLift {
  id: string;
  label: string;
  /** Mejor e1RM (kg) de las últimas semanas. */
  e1rm: number;
}

export interface FriendSummary {
  id: string;
  name: string;
  rank: string;
  level: number;
  /** Semana actual (lunes a domingo). */
  weekWorkouts: number;
  weekXp: number;
  weekPrs: number;
  /** Semanas seguidas con al menos un entreno (contando la actual o la anterior). */
  streakWeeks: number;
  lifts: FriendLift[];
  /** Suma de los mejores e1RM de banca, sentadilla y peso muerto; null si falta alguno. */
  total: number | null;
  lastWorkoutAt: string | null;
}

export interface FeedItem {
  userId: string;
  name: string;
  title: string;
  completedAt: string;
  xp: number;
  /** Ejercicios con PR en ese entreno. */
  prs: string[];
}

export interface FriendsResponse {
  /** Código de invitación propio (enlace: /?amigo=CODIGO). */
  code: string;
  me: FriendSummary;
  friends: FriendSummary[];
  feed: FeedItem[];
}

export type FriendsAction =
  | { action: "add"; code: string }
  | { action: "remove"; friendId: string }
  | { action: "regenerate" };

export interface FriendsAddResponse {
  friend: FriendSummary;
}

export const FRIEND_CODE_LENGTH = 6;
/** Sin 0/O, 1/I/L para que se pueda dictar. */
export const FRIEND_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const MAX_FRIENDS = 50;

export function normalizeFriendCode(raw: string): string | null {
  const code = raw.trim().toUpperCase().replace(/[\s-]/g, "");
  if (code.length !== FRIEND_CODE_LENGTH) return null;
  for (const ch of code) if (!FRIEND_CODE_ALPHABET.includes(ch)) return null;
  return code;
}
