/**
 * Amigos (/api/friends): cada usuario tiene un código de invitación; quien lo usa queda como amigo en los
 * dos sentidos. No hay buscador ni ranking global: solo ves a quien te pasó su código (o usó el tuyo).
 * - GET: código propio, resumen propio, amigos y actividad reciente.
 * - POST {action: "add", code} · {action: "remove", friendId} · {action: "regenerate"}.
 * Solo se comparte lo de entrenar (ver lib/friendsApi.ts): nada de correo, peso ni nutrición.
 */
import {
  buildFeed,
  displayName,
  rankAthletes,
  SOCIAL_WEEKS,
  summarizeAthlete,
} from "@/engine/social";
import {
  FRIEND_CODE_ALPHABET,
  FRIEND_CODE_LENGTH,
  MAX_FRIENDS,
  normalizeFriendCode,
  type FriendSummary,
  type FriendsResponse,
} from "@/lib/friendsApi";
import type { UserProfile, WorkoutLog } from "@/types";
import { currentUser, enabled, type AuthEnv } from "./auth";
import { json } from "./http";
import {
  addFriendship,
  athletesRecords,
  friendIds,
  getFriendCode,
  removeFriendship,
  setFriendCode,
  userByFriendCode,
  userNames,
  type Database,
} from "./store";

const MAX_BODY_CHARS = 1000;

export function randomFriendCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(FRIEND_CODE_LENGTH));
  return Array.from(bytes, (b) => FRIEND_CODE_ALPHABET[b % FRIEND_CODE_ALPHABET.length]).join("");
}

/** Código nuevo para el usuario; reintenta si coincide con el de otro. */
async function newCode(db: Database, userId: string, now: string): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = randomFriendCode();
    try {
      await setFriendCode(db, userId, code, now);
      return code;
    } catch {
      // Código repetido (UNIQUE): otro intento.
    }
  }
  throw new Error("No se pudo generar un código");
}

async function ensureCode(db: Database, userId: string, now: string): Promise<string> {
  return (await getFriendCode(db, userId)) ?? newCode(db, userId, now);
}

interface Athlete {
  id: string;
  name: string;
  profile: Partial<UserProfile>;
  logs: WorkoutLog[];
}

async function loadAthletes(db: Database, ids: string[], nowMs: number): Promise<Athlete[]> {
  const since = new Date(nowMs - SOCIAL_WEEKS * 7 * 86_400_000).toISOString();
  const [rows, names] = await Promise.all([athletesRecords(db, ids, since), userNames(db, ids)]);
  const byId = new Map<string, Athlete>(
    ids.map((id) => [id, { id, name: "", profile: {}, logs: [] }]),
  );
  for (const row of rows) {
    const athlete = byId.get(row.userId);
    if (!athlete) continue;
    try {
      const value = JSON.parse(row.data) as unknown;
      if (row.store === "profile") athlete.profile = value as Partial<UserProfile>;
      else athlete.logs.push(value as WorkoutLog);
    } catch {
      // Registro dañado: se ignora.
    }
  }
  for (const athlete of byId.values()) {
    athlete.name = displayName(athlete.profile.name, names.get(athlete.id) ?? null);
  }
  return ids.map((id) => byId.get(id)!);
}

const summary = (a: Athlete, nowMs: number): FriendSummary =>
  summarizeAthlete(a.id, a.name, a.profile, a.logs, nowMs);

interface ActionBody {
  action?: unknown;
  code?: unknown;
  friendId?: unknown;
}

function parseAction(text: string): ActionBody | null {
  try {
    const raw = JSON.parse(text) as unknown;
    return typeof raw === "object" && raw !== null ? (raw as ActionBody) : null;
  } catch {
    return null;
  }
}

export async function handleFriends(
  request: Request,
  env: AuthEnv,
  now: () => number = () => Date.now(),
): Promise<Response> {
  if (!enabled(env)) return json({ error: "Las cuentas no están configuradas" }, 503);
  if (request.method !== "GET" && request.method !== "POST")
    return json({ error: "Método no permitido" }, 405);
  if (request.method === "POST" && request.headers.get("origin") !== new URL(request.url).origin)
    return json({ error: "Origen no permitido" }, 403);
  const nowMs = now();
  const nowIso = new Date(nowMs).toISOString();
  const session = await currentUser(request, env, nowMs);
  if (!session) return json({ error: "Sesión no válida" }, 401);
  const db = env.DB;
  const me = session.user.id;

  if (request.method === "GET") {
    const [code, ids] = await Promise.all([ensureCode(db, me, nowIso), friendIds(db, me)]);
    const athletes = await loadAthletes(db, [me, ...ids], nowMs);
    const [self, ...friends] = athletes;
    return json({
      code,
      me: summary(self!, nowMs),
      friends: rankAthletes(friends.map((f) => summary(f, nowMs))),
      feed: buildFeed(athletes, nowMs),
    } satisfies FriendsResponse);
  }

  const text = await request.text();
  if (text.length > MAX_BODY_CHARS) return json({ error: "Petición no válida" }, 413);
  const body = parseAction(text);
  if (!body) return json({ error: "Petición no válida" }, 400);

  if (body.action === "regenerate") {
    return json({ code: await newCode(db, me, nowIso) });
  }

  if (body.action === "remove") {
    if (typeof body.friendId !== "string" || !body.friendId)
      return json({ error: "Petición no válida" }, 400);
    await removeFriendship(db, me, body.friendId);
    return json({ ok: true });
  }

  if (body.action === "add") {
    const code = typeof body.code === "string" ? normalizeFriendCode(body.code) : null;
    if (!code) return json({ error: "El código tiene 6 letras o números" }, 400);
    const friend = await userByFriendCode(db, code);
    if (!friend) return json({ error: "No hay nadie con ese código" }, 404);
    if (friend === me) return json({ error: "Ese es tu propio código" }, 400);
    const [mine, theirs] = await Promise.all([friendIds(db, me), friendIds(db, friend)]);
    if (!mine.includes(friend)) {
      if (mine.length >= MAX_FRIENDS || theirs.length >= MAX_FRIENDS)
        return json({ error: `Máximo ${MAX_FRIENDS} amigos` }, 400);
      await addFriendship(db, me, friend, nowIso);
    }
    const [athlete] = await loadAthletes(db, [friend], nowMs);
    return json({ friend: summary(athlete!, nowMs) });
  }

  return json({ error: "Petición no válida" }, 400);
}
