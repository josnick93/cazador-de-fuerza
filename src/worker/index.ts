/**
 * API del Worker (/api/*). `src/server.ts` la llama antes que TanStack Start; el resto de rutas son la app.
 * - /api/auth/*: login con Google (ver auth.ts).
 * - /api/sync: sincronización de los datos del usuario (ver sync.ts).
 */
import { handleAuth, type AuthEnv } from "./auth";
import { json } from "./http";
import { handleSync } from "./sync";

export type ApiEnv = AuthEnv;

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
  return json({ error: "No existe" }, 404);
}
