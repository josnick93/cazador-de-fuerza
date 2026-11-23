/** Coach IA (POST /api/coach). Necesita sesión; la última revisión se guarda en este dispositivo. */
import type {
  CoachChatResponse,
  CoachErrorResponse,
  CoachReview,
  CoachReviewResponse,
  CoachTurn,
} from "@/lib/coachApi";
import { STORAGE_KEYS, readJson, writeJson } from "@/services/storage";

export type CoachResult<T> =
  ({ ok: true } & T) | { ok: false; error: string; remaining: number | null | undefined };

export interface CachedReview {
  review: CoachReview;
  createdAt: string;
}

type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

async function callCoach<T>(body: unknown, fetcher: Fetcher): Promise<CoachResult<T>> {
  let res: Response;
  try {
    res = await fetcher("/api/coach", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return {
      ok: false,
      error: "Sin conexión con el coach. Inténtalo de nuevo.",
      remaining: undefined,
    };
  }
  const data = (await res.json().catch(() => null)) as (T & Partial<CoachErrorResponse>) | null;
  if (!res.ok || !data) {
    return {
      ok: false,
      error: data?.error ?? "El coach no ha podido responder.",
      remaining: data?.remaining,
    };
  }
  return { ok: true, ...data };
}

export async function requestWeeklyReview(
  fetcher: Fetcher = (u, i) => fetch(u, i),
): Promise<CoachResult<CoachReviewResponse>> {
  const result = await callCoach<CoachReviewResponse>({ kind: "review" }, fetcher);
  if (result.ok) {
    writeJson(STORAGE_KEYS.coachReview, {
      review: result.review,
      createdAt: new Date().toISOString(),
    });
  }
  return result;
}

export function sendCoachMessage(
  message: string,
  history: CoachTurn[],
  fetcher: Fetcher = (u, i) => fetch(u, i),
): Promise<CoachResult<CoachChatResponse>> {
  return callCoach<CoachChatResponse>({ kind: "chat", message, history }, fetcher);
}

export function getCachedReview(): CachedReview | null {
  return readJson<CachedReview | null>(STORAGE_KEYS.coachReview, null);
}
