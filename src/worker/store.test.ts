// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPlatformProxy } from "wrangler";

import type { Change } from "@/lib/syncApi";
import {
  applyChanges,
  changesSince,
  createSession,
  deleteFuerzaData,
  ensureSchema,
  sessionUser,
  upsertUser,
  type Database,
} from "./store";

const NOW = "2026-11-22T10:00:00.000Z";
const LATER = "2026-11-22T11:00:00.000Z";

let db: Database;
let dispose: () => Promise<void>;

beforeAll(async () => {
  const proxy = await getPlatformProxy<{ DB: Database }>({ persist: false });
  db = proxy.env.DB;
  dispose = proxy.dispose;
  // Tabla de datos de MacroQuest, para comprobar que esta app no la toca.
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS records (user_id TEXT NOT NULL, store TEXT NOT NULL, key TEXT NOT NULL,
       updated_at TEXT NOT NULL, deleted INTEGER NOT NULL DEFAULT 0, data TEXT, seq INTEGER NOT NULL,
       PRIMARY KEY (user_id, store, key))`,
    )
    .run();
  await ensureSchema(db);
});
afterAll(() => dispose());

const change = (key: string, updatedAt: string, data: unknown): Change => ({
  store: "workouts",
  key,
  updatedAt,
  deleted: false,
  data: JSON.stringify(data),
});

let n = 0;
async function newUser(): Promise<string> {
  const id = `u${++n}`;
  await upsertUser(db, { id, email: `${id}@example.com`, name: null }, NOW);
  return id;
}

describe("store de D1", () => {
  it("guarda cambios con seq creciente y gana el más reciente", async () => {
    const user = await newUser();
    await applyChanges(db, user, [change("w1", NOW, { v: 1 }), change("w2", NOW, { v: 2 })]);
    await applyChanges(db, user, [change("w1", LATER, { v: 3 })]);
    await applyChanges(db, user, [change("w2", "2026-11-21T00:00:00.000Z", { v: "viejo" })]);

    const all = await changesSince(db, user, 0, 100);
    expect(all.map((c) => [c.key, JSON.parse(c.data!).v])).toEqual([
      ["w2", 2],
      ["w1", 3],
    ]);
    expect(all[1]!.seq).toBeGreaterThan(all[0]!.seq);
    expect(await changesSince(db, user, all[0]!.seq, 100)).toHaveLength(1);
  });

  it("no escribe en la tabla records de MacroQuest", async () => {
    const user = await newUser();
    await applyChanges(db, user, [change("w1", NOW, {})]);
    const row = await db
      .prepare("SELECT COUNT(*) AS n FROM records WHERE user_id = ?1")
      .bind(user)
      .first<{ n: number }>();
    expect(row!.n).toBe(0);
  });

  it("borrar la cuenta desde MacroQuest borra también los datos de fuerza", async () => {
    const user = await newUser();
    await applyChanges(db, user, [change("w1", NOW, {})]);
    // Lo mismo que hace deleteUser en MacroQuest.
    await db.batch([
      db.prepare("DELETE FROM sessions WHERE user_id = ?1").bind(user),
      db.prepare("DELETE FROM records WHERE user_id = ?1").bind(user),
      db.prepare("DELETE FROM users WHERE id = ?1").bind(user),
    ]);
    expect(await changesSince(db, user, 0, 100)).toEqual([]);
  });

  it("borrar los datos de fuerza mantiene la cuenta", async () => {
    const user = await newUser();
    await applyChanges(db, user, [change("w1", NOW, {})]);
    await deleteFuerzaData(db, user);
    expect(await changesSince(db, user, 0, 100)).toEqual([]);
    const row = await db.prepare("SELECT id FROM users WHERE id = ?1").bind(user).first();
    expect(row).not.toBeNull();
  });

  it("una sesión vale hasta que caduca", async () => {
    const user = await newUser();
    await createSession(db, user, "hash-1", NOW, LATER);
    expect(await sessionUser(db, "hash-1", NOW)).toMatchObject({ id: user, createdAt: NOW });
    expect(await sessionUser(db, "hash-1", LATER)).toBeNull();
  });
});
