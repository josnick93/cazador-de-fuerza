/**
 * Datos de MacroQuest de la cuenta (GET /api/nutrition). Se guardan en local para verlos sin conexión.
 * Solo se usan si el perfil tiene activado «Sincronizar con MacroQuest».
 */
import type { NutritionSnapshot } from "@/lib/nutritionApi";
import { STORAGE_KEYS, readJson, writeJson } from "@/services/storage";

export interface CachedNutrition {
  snapshot: NutritionSnapshot;
  fetchedAt: string;
}

export function getCachedNutrition(): CachedNutrition | null {
  return readJson<CachedNutrition | null>(STORAGE_KEYS.nutrition, null);
}

/** Pide los datos al servidor y los guarda. null si no hay sesión, servidor o conexión (se conserva la caché). */
export async function fetchNutrition(
  fetcher: (url: string, init?: RequestInit) => Promise<Response> = (u, i) => fetch(u, i),
): Promise<CachedNutrition | null> {
  try {
    const res = await fetcher("/api/nutrition", { headers: { accept: "application/json" } });
    if (!res.ok || !res.headers.get("content-type")?.includes("application/json")) return null;
    const cached: CachedNutrition = {
      snapshot: (await res.json()) as NutritionSnapshot,
      fetchedAt: new Date().toISOString(),
    };
    writeJson(STORAGE_KEYS.nutrition, cached);
    return cached;
  } catch {
    return null;
  }
}
