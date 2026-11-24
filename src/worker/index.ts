/**
 * API del Worker (/api/*). `src/server.ts` la llama antes que TanStack Start; el resto de rutas son la app.
 * - /api/auth/*: login con Google (ver auth.ts).
 * - /api/sync: sincronización de los datos del usuario (ver sync.ts).
 * - /api/nutrition: lectura de los datos de MacroQuest de la cuenta (ver nutrition.ts).
 * - /api/coach: coach IA con la API de Claude (ver coach.ts).
 * - /api/friends: amigos por código de invitación y su progreso (ver friends.ts).
 */
import { handleAuth } from "./auth";
import { handleCoach, type CoachEnv } from "./coach";
import { handleFriends } from "./friends";
import { json } from "./http";
import { handleNutrition } from "./nutrition";
import { handleSync } from "./sync";

export type ApiEnv = CoachEnv;

/** Bindings del Worker: nitro los deja en `request.runtime.cloudflare.env` (no llegan como parámetro). */
export function workerEnv(request: Request): ApiEnv {
  const runtime = (request as Request & { runtime?: { cloudflare?: { env?: ApiEnv } } }).runtime;
  return runtime?.cloudflare?.env ?? {};
}

export async function handleApi(request: Request, env: ApiEnv): Promise<Response> {
  const { pathname } = new URL(request.url);
  if (pathname.startsWith("/api/auth/")) {
    try {
      return await handleAuth(request, env);
    } catch (e) {
      console.error("auth", e);
      return json({ error: "Error en el inicio de sesión" }, 500);
    }
  }
  if (pathname === "/api/sync") {
    try {
      return await handleSync(request, env);
    } catch (e) {
      console.error("sync", e);
      return json({ error: "Error al sincronizar" }, 500);
    }
  }
  if (pathname === "/api/coach") {
    try {
      return await handleCoach(request, env);
    } catch (e) {
      console.error("coach", e);
      return json({ error: "Error del coach" }, 500);
    }
  }
  if (pathname === "/api/friends") {
    try {
      return await handleFriends(request, env);
    } catch (e) {
      console.error("friends", e);
      return json({ error: "Error al cargar los amigos" }, 500);
    }
  }
  if (pathname === "/api/nutrition") {
    try {
      return await handleNutrition(request, env);
    } catch (e) {
      console.error("nutrition", e);
      return json({ error: "Error al leer MacroQuest" }, 500);
    }
  }
  return json({ error: "No existe" }, 404);
}
