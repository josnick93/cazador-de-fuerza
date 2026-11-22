/**
 * Lectura de los datos de MacroQuest de la cuenta (GET /api/nutrition): kcal y proteína por día del diario,
 * pesajes y objetivo del perfil. Solo lee la tabla `records` de MacroQuest; nunca escribe en ella.
 */
import type { MacroGoal, NutritionDay, NutritionSnapshot, WeightPoint } from "@/lib/nutritionApi";
import { NUTRITION_DAYS } from "@/lib/nutritionApi";
import { currentUser, enabled, type AuthEnv } from "./auth";
import { json } from "./http";
import type { Database } from "./store";

const EMPTY: NutritionSnapshot = {
  connected: false,
  goal: null,
  rateKgWeek: null,
  proteinPerKg: null,
  weightKg: null,
  days: [],
  weights: [],
};

const GOALS: MacroGoal[] = ["perder", "mantener", "ganar"];
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Datos de MacroQuest de `userId` desde `since` (YYYY-MM-DD). Sin tabla `records` (MacroQuest sin usar): vacío. */
export async function readNutrition(
  db: Database,
  userId: string,
  since: string,
): Promise<NutritionSnapshot> {
  try {
    const days = await db
      .prepare(
        `SELECT json_extract(data, '$.date') AS date,
                ROUND(SUM(json_extract(data, '$.grams') * json_extract(data, '$.per100g.kcal') / 100.0)) AS kcal,
                ROUND(SUM(json_extract(data, '$.grams') * json_extract(data, '$.per100g.protein') / 100.0), 1) AS protein
         FROM records
         WHERE user_id = ?1 AND store = 'diary' AND deleted = 0 AND json_extract(data, '$.date') >= ?2
         GROUP BY 1 ORDER BY 1`,
      )
      .bind(userId, since)
      .all<NutritionDay>();
    const weights = await db
      .prepare(
        `SELECT json_extract(data, '$.date') AS date, json_extract(data, '$.kg') AS kg
         FROM records
         WHERE user_id = ?1 AND store = 'weights' AND deleted = 0 AND json_extract(data, '$.date') >= ?2
         ORDER BY 1`,
      )
      .bind(userId, since)
      .all<WeightPoint>();
    const profileRow = await db
      .prepare(
        `SELECT data FROM records WHERE user_id = ?1 AND store = 'kv' AND key = 'profile' AND deleted = 0`,
      )
      .bind(userId)
      .first<{ data: string }>();

    let profile: Record<string, unknown> = {};
    try {
      profile = profileRow ? (JSON.parse(profileRow.data) as Record<string, unknown>) : {};
    } catch {
      profile = {};
    }
    const goal = GOALS.find((g) => g === profile["goal"]) ?? null;
    const validDays = days.results.filter(
      (d) => typeof d.date === "string" && num(d.kcal) !== null,
    );
    const validWeights = weights.results.filter(
      (w) => typeof w.date === "string" && (num(w.kg) ?? 0) > 0,
    );
    return {
      connected: profileRow !== null || validDays.length > 0 || validWeights.length > 0,
      goal,
      rateKgWeek: num(profile["rateKgWeek"]),
      proteinPerKg: num(profile["proteinPerKg"]),
      weightKg: num(profile["weightKg"]),
      days: validDays.map((d) => ({ date: d.date, kcal: d.kcal, protein: num(d.protein) ?? 0 })),
      weights: validWeights,
    };
  } catch (e) {
    if (String(e).includes("no such table")) return EMPTY;
    throw e;
  }
}

export async function handleNutrition(
  request: Request,
  env: AuthEnv,
  now: () => number = () => Date.now(),
): Promise<Response> {
  if (!enabled(env)) return json({ error: "El inicio de sesión no está configurado" }, 503);
  if (request.method !== "GET") return json({ error: "Método no permitido" }, 405);
  const nowMs = now();
  const session = await currentUser(request, env, nowMs);
  if (!session) return json({ error: "Sesión no válida" }, 401);
  const since = new Date(nowMs - NUTRITION_DAYS * 86_400_000).toISOString().slice(0, 10);
  return json(await readNutrition(env.DB, session.user.id, since));
}
