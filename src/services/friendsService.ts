/**
 * Amigos (necesita cuenta). Las invitaciones llegan como enlace `/?amigo=CODIGO`: se guarda el código en el
 * dispositivo (sobrevive al login con Google) y se usa en cuanto hay sesión.
 */
import {
  normalizeFriendCode,
  type FriendSummary,
  type FriendsAddResponse,
  type FriendsResponse,
} from "@/lib/friendsApi";
import { readJson, removeKey, writeJson } from "@/services/storage";

const PENDING_KEY = "ironquest_pending_friend_v1";

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

async function request<T>(init?: { body: unknown }): Promise<Result<T>> {
  try {
    const res = await fetch("/api/friends", {
      method: init ? "POST" : "GET",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: init ? JSON.stringify(init.body) : null,
    });
    const body = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
    if (!res.ok || !body)
      return {
        ok: false,
        error:
          body?.error ??
          (res.status === 401 ? "Entra con Google para ver a tus amigos" : "Sin conexión"),
      };
    return { ok: true, data: body };
  } catch {
    return { ok: false, error: "Sin conexión" };
  }
}

export const fetchFriends = () => request<FriendsResponse>();

export async function addFriend(code: string): Promise<Result<FriendSummary>> {
  const normalized = normalizeFriendCode(code);
  if (!normalized) return { ok: false, error: "El código tiene 6 letras o números" };
  const res = await request<FriendsAddResponse>({ body: { action: "add", code: normalized } });
  return res.ok ? { ok: true, data: res.data.friend } : res;
}

export const removeFriend = (friendId: string) =>
  request<{ ok: true }>({ body: { action: "remove", friendId } });

export async function regenerateCode(): Promise<Result<string>> {
  const res = await request<{ code: string }>({ body: { action: "regenerate" } });
  return res.ok ? { ok: true, data: res.data.code } : res;
}

export function inviteLink(code: string): string {
  return `${window.location.origin}/?amigo=${code}`;
}

/** Comparte el enlace con el menú del móvil; si no hay, lo copia. */
export async function shareInvite(code: string): Promise<"shared" | "copied" | "error"> {
  const url = inviteLink(code);
  const text = `Únete a mi gremio en IRONQUEST y a ver quién progresa más 💪 Código: ${code}`;
  try {
    if (navigator.share) {
      await navigator.share({ title: "IRONQUEST", text, url });
      return "shared";
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return "shared";
  }
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    return "copied";
  } catch {
    return "error";
  }
}

/** Lee `?amigo=` de la URL, lo guarda como invitación pendiente y lo quita de la barra. */
export function consumeInviteFromUrl(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  const raw = url.searchParams.get("amigo");
  if (raw === null) return;
  const code = normalizeFriendCode(raw);
  if (code) writeJson(PENDING_KEY, code);
  url.searchParams.delete("amigo");
  window.history.replaceState(null, "", url.pathname + url.search + url.hash);
}

export function getPendingInvite(): string | null {
  return readJson<string | null>(PENDING_KEY, null);
}

export function clearPendingInvite(): void {
  removeKey(PENDING_KEY);
}
