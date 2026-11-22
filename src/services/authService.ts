/** Cuenta de Google (compartida con MacroQuest). Sin servidor (`bun run dev`) la app funciona sin cuentas. */

export interface AccountUser {
  id: string;
  email: string;
  name: string | null;
}

export interface AccountState {
  /** false si el servidor no tiene login configurado o no hay servidor. */
  enabled: boolean;
  user: AccountUser | null;
}

export const LOGIN_URL = "/api/auth/login";

const OFFLINE: AccountState = { enabled: false, user: null };

export async function getAccount(): Promise<AccountState> {
  try {
    const res = await fetch("/api/auth/me", { headers: { accept: "application/json" } });
    if (!res.ok || !res.headers.get("content-type")?.includes("application/json")) return OFFLINE;
    const body = (await res.json()) as Partial<AccountState>;
    return { enabled: body.enabled === true, user: body.user ?? null };
  } catch {
    return OFFLINE;
  }
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
}

export type LoginResult = "ok" | "cancelado" | "error";

/** Lee y quita de la URL el resultado del login (`?login=ok|cancelado|error`). */
export function consumeLoginResult(): LoginResult | null {
  if (typeof window === "undefined") return null;
  const url = new URL(window.location.href);
  const value = url.searchParams.get("login");
  if (!value) return null;
  url.searchParams.delete("login");
  url.searchParams.delete("motivo");
  window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  return value === "ok" || value === "cancelado" ? value : "error";
}
