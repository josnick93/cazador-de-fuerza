/**
 * Base de datos D1 compartida con MacroQuest (`macro-quest`).
 * - `users` y `sessions` son de MacroQuest: se crean igual que allí por si esta app arranca primero, y nunca se
 *   cambia su forma desde aquí. Misma cuenta de Google = mismo `users.id` en las dos apps.
 * - Los datos de esta app van en `fuerza_records`. Nunca se escribe en `records` (es de MacroQuest).
 * - Si MacroQuest borra la cuenta, el trigger `fuerza_records_delete_user` borra también sus datos de aquí.
 */
import type { Change } from "@/lib/syncApi";

interface Statement {
  bind(...values: unknown[]): Statement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}

/** Lo mínimo de la API de D1 que se usa aquí. */
export interface Database {
  prepare(sql: string): Statement;
  batch(statements: Statement[]): Promise<unknown>;
}

export interface User {
  /** Identificador estable de la cuenta de Google (`sub`). */
  id: string;
  email: string;
  name: string | null;
}

/** Usuario de una sesión. `createdAt` identifica su copia en el servidor: cambia si borra la cuenta y vuelve. */
export interface Account extends User {
  createdAt: string;
}

/** Copia literal del esquema de MacroQuest (worker/store.ts): si cambia allí, cambiarlo aquí. */
const SHARED_SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    name TEXT,
    created_at TEXT NOT NULL,
    last_login_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS sessions_user ON sessions (user_id)`,
];

const FUERZA_SCHEMA = [
  // Un registro por (almacén, clave), con borrados incluidos. `seq` crece con cada cambio del usuario.
  `CREATE TABLE IF NOT EXISTS fuerza_records (
    user_id TEXT NOT NULL,
    store TEXT NOT NULL,
    key TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted INTEGER NOT NULL DEFAULT 0,
    data TEXT,
    seq INTEGER NOT NULL,
    PRIMARY KEY (user_id, store, key)
  )`,
  `CREATE INDEX IF NOT EXISTS fuerza_records_seq ON fuerza_records (user_id, seq)`,
  `CREATE TRIGGER IF NOT EXISTS fuerza_records_delete_user AFTER DELETE ON users
   BEGIN
     DELETE FROM fuerza_records WHERE user_id = OLD.id;
   END`,
  // Consultas al coach IA por usuario y semana (lunes, YYYY-MM-DD) para el límite gratuito.
  `CREATE TABLE IF NOT EXISTS fuerza_coach_usage (
    user_id TEXT NOT NULL,
    week TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, week)
  )`,
  `CREATE TRIGGER IF NOT EXISTS fuerza_coach_usage_delete_user AFTER DELETE ON users
   BEGIN
     DELETE FROM fuerza_coach_usage WHERE user_id = OLD.id;
   END`,
  // Amigos: código de invitación por usuario y amistades guardadas en los dos sentidos.
  `CREATE TABLE IF NOT EXISTS fuerza_friend_codes (
    user_id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS fuerza_friends (
    user_id TEXT NOT NULL,
    friend_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (user_id, friend_id)
  )`,
  `CREATE TRIGGER IF NOT EXISTS fuerza_friends_delete_user AFTER DELETE ON users
   BEGIN
     DELETE FROM fuerza_friend_codes WHERE user_id = OLD.id;
     DELETE FROM fuerza_friends WHERE user_id = OLD.id OR friend_id = OLD.id;
   END`,
];

export async function coachUsage(db: Database, userId: string, week: string): Promise<number> {
  const row = await db
    .prepare(`SELECT count FROM fuerza_coach_usage WHERE user_id = ?1 AND week = ?2`)
    .bind(userId, week)
    .first<{ count: number }>();
  return row?.count ?? 0;
}

export async function addCoachUsage(db: Database, userId: string, week: string): Promise<void> {
  await db
    .prepare(
      `INSERT INTO fuerza_coach_usage (user_id, week, count) VALUES (?1, ?2, 1)
       ON CONFLICT (user_id, week) DO UPDATE SET count = count + 1`,
    )
    .bind(userId, week)
    .run();
}

const ready = new WeakMap<Database, Promise<unknown>>();

/** Crea las tablas si faltan (una vez por instancia del Worker). */
export function ensureSchema(db: Database): Promise<unknown> {
  let p = ready.get(db);
  if (!p) {
    p = db.batch([...SHARED_SCHEMA, ...FUERZA_SCHEMA].map((sql) => db.prepare(sql)));
    ready.set(db, p);
    p.catch(() => ready.delete(db));
  }
  return p;
}

export async function upsertUser(db: Database, user: User, now: string): Promise<void> {
  await db
    .prepare(
      `INSERT INTO users (id, email, name, created_at, last_login_at) VALUES (?1, ?2, ?3, ?4, ?4)
       ON CONFLICT (id) DO UPDATE SET email = excluded.email, name = excluded.name, last_login_at = excluded.last_login_at`,
    )
    .bind(user.id, user.email, user.name, now)
    .run();
}

export async function createSession(
  db: Database,
  userId: string,
  tokenHash: string,
  now: string,
  expiresAt: string,
): Promise<void> {
  await db.batch([
    db.prepare(`DELETE FROM sessions WHERE expires_at < ?1`).bind(now),
    db
      .prepare(
        `INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?1, ?2, ?3, ?4)`,
      )
      .bind(tokenHash, userId, now, expiresAt),
  ]);
}

export function sessionUser(db: Database, tokenHash: string, now: string): Promise<Account | null> {
  return db
    .prepare(
      `SELECT u.id, u.email, u.name, u.created_at AS createdAt FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ?1 AND s.expires_at > ?2`,
    )
    .bind(tokenHash, now)
    .first<Account>();
}

export async function deleteSession(db: Database, tokenHash: string): Promise<void> {
  await db.prepare(`DELETE FROM sessions WHERE token_hash = ?1`).bind(tokenHash).run();
}

/** Borra solo los datos de esta app; la cuenta (compartida con MacroQuest) se mantiene. */
export async function deleteFuerzaData(db: Database, userId: string): Promise<void> {
  await db.prepare(`DELETE FROM fuerza_records WHERE user_id = ?1`).bind(userId).run();
}

/**
 * Guarda los cambios de un dispositivo. Solo entra el que es más reciente que lo guardado (gana el último cambio).
 * Va todo en una sentencia: el plan gratuito de D1 limita las consultas por petición.
 */
export async function applyChanges(db: Database, userId: string, changes: Change[]): Promise<void> {
  if (changes.length === 0) return;
  await db
    .prepare(
      `INSERT INTO fuerza_records (user_id, store, key, updated_at, deleted, data, seq)
       SELECT ?1, json_extract(j.value, '$.store'), json_extract(j.value, '$.key'), json_extract(j.value, '$.updatedAt'),
              json_extract(j.value, '$.deleted'), json_extract(j.value, '$.data'),
              (SELECT COALESCE(MAX(seq), 0) FROM fuerza_records WHERE user_id = ?1) + 1 + j.key
       FROM json_each(?2) AS j WHERE true
       ON CONFLICT (user_id, store, key) DO UPDATE
         SET updated_at = excluded.updated_at, deleted = excluded.deleted, data = excluded.data, seq = excluded.seq
         WHERE excluded.updated_at > fuerza_records.updated_at`,
    )
    .bind(userId, JSON.stringify(changes.map((c) => ({ ...c, deleted: c.deleted ? 1 : 0 }))))
    .run();
}

export interface StoredChange extends Change {
  seq: number;
}

/** Cambios del usuario posteriores a `cursor`, en orden. */
export async function changesSince(
  db: Database,
  userId: string,
  cursor: number,
  limit: number,
): Promise<StoredChange[]> {
  const { results } = await db
    .prepare(
      `SELECT store, key, updated_at AS updatedAt, deleted, data, seq FROM fuerza_records
       WHERE user_id = ?1 AND seq > ?2 ORDER BY seq LIMIT ?3`,
    )
    .bind(userId, cursor, limit)
    .all<Omit<StoredChange, "deleted"> & { deleted: number }>();
  return results.map((r) => ({ ...r, deleted: r.deleted === 1 }));
}

export async function getFriendCode(db: Database, userId: string): Promise<string | null> {
  const row = await db
    .prepare(`SELECT code FROM fuerza_friend_codes WHERE user_id = ?1`)
    .bind(userId)
    .first<{ code: string }>();
  return row?.code ?? null;
}

/** Guarda (o sustituye) el código del usuario. Falla si otro usuario ya tiene ese código. */
export async function setFriendCode(
  db: Database,
  userId: string,
  code: string,
  now: string,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO fuerza_friend_codes (user_id, code, created_at) VALUES (?1, ?2, ?3)
       ON CONFLICT (user_id) DO UPDATE SET code = excluded.code, created_at = excluded.created_at`,
    )
    .bind(userId, code, now)
    .run();
}

export async function userByFriendCode(db: Database, code: string): Promise<string | null> {
  const row = await db
    .prepare(`SELECT user_id AS userId FROM fuerza_friend_codes WHERE code = ?1`)
    .bind(code)
    .first<{ userId: string }>();
  return row?.userId ?? null;
}

export async function friendIds(db: Database, userId: string): Promise<string[]> {
  const { results } = await db
    .prepare(`SELECT friend_id AS id FROM fuerza_friends WHERE user_id = ?1 ORDER BY created_at`)
    .bind(userId)
    .all<{ id: string }>();
  return results.map((r) => r.id);
}

export async function addFriendship(
  db: Database,
  a: string,
  b: string,
  now: string,
): Promise<void> {
  await db
    .prepare(
      `INSERT OR IGNORE INTO fuerza_friends (user_id, friend_id, created_at) VALUES (?1, ?2, ?3), (?2, ?1, ?3)`,
    )
    .bind(a, b, now)
    .run();
}

export async function removeFriendship(db: Database, a: string, b: string): Promise<void> {
  await db
    .prepare(
      `DELETE FROM fuerza_friends WHERE (user_id = ?1 AND friend_id = ?2) OR (user_id = ?2 AND friend_id = ?1)`,
    )
    .bind(a, b)
    .run();
}

export interface AthleteRow {
  userId: string;
  store: "profile" | "workouts";
  data: string;
}

/** Perfil y entrenos desde `since` de varios usuarios, en una sola consulta. */
export async function athletesRecords(
  db: Database,
  userIds: string[],
  since: string,
): Promise<AthleteRow[]> {
  if (userIds.length === 0) return [];
  const { results } = await db
    .prepare(
      `SELECT user_id AS userId, store, data FROM fuerza_records
       WHERE user_id IN (SELECT value FROM json_each(?1)) AND deleted = 0 AND data IS NOT NULL
         AND ((store = 'profile' AND key = 'me')
           OR (store = 'workouts' AND json_extract(data, '$.completedAt') >= ?2))`,
    )
    .bind(JSON.stringify(userIds), since)
    .all<AthleteRow>();
  return results;
}

export async function userNames(
  db: Database,
  userIds: string[],
): Promise<Map<string, string | null>> {
  if (userIds.length === 0) return new Map();
  const { results } = await db
    .prepare(`SELECT id, name FROM users WHERE id IN (SELECT value FROM json_each(?1))`)
    .bind(JSON.stringify(userIds))
    .all<{ id: string; name: string | null }>();
  return new Map(results.map((r) => [r.id, r.name]));
}
