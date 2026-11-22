// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPlatformProxy } from "wrangler";

import { sha256 } from "./auth";
import { handleNutrition, readNutrition } from "./nutrition";
import { createSession, ensureSchema, upsertUser, type Database } from "./store";

const NOW = Date.parse("2026-11-22T10:00:00.000Z");
let db: Database;
let dispose: () => Promise<void>;

beforeAll(async () => {
  const proxy = await getPlatformProxy<{ DB: Database }>({ persist: false });
  db = proxy.env.DB;
  dispose = proxy.dispose;
  await ensureSchema(db);
});
afterAll(() => dispose());

async function createRecordsTable() {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS records (user_id TEXT NOT NULL, store TEXT NOT NULL, key TEXT NOT NULL,
       updated_at TEXT NOT NULL, deleted INTEGER NOT NULL DEFAULT 0, data TEXT, seq INTEGER NOT NULL,
       PRIMARY KEY (user_id, store, key))`,
    )
    .run();
}

let seq = 0;
async function record(user: string, store: string, key: string, data: unknown, deleted = 0) {
  await db
    .prepare(
      `INSERT INTO records (user_id, store, key, updated_at, deleted, data, seq) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`,
    )
    .bind(user, store, key, "2026-11-20T00:00:00.000Z", deleted, JSON.stringify(data), ++seq)
    .run();
}

const entry = (date: string, grams: number, kcal: number, protein: number) => ({
  id: `${date}-${grams}-${kcal}`,
  date,
  grams,
  per100g: { kcal, protein, carbs: 0, fat: 0 },
});

describe("lectura de MacroQuest", () => {
  it("sin tabla de MacroQuest devuelve vacío", async () => {
    expect(await readNutrition(db, "nadie", "2026-10-01")).toMatchObject({
      connected: false,
      days: [],
    });
  });

  it("suma kcal y proteína por día, lee pesajes y el objetivo, e ignora lo borrado y lo antiguo", async () => {
    await createRecordsTable();
    await record("ana", "kv", "profile", {
      goal: "ganar",
      rateKgWeek: 0.25,
      proteinPerKg: 1.8,
      weightKg: 80,
    });
    await record("ana", "diary", "a", entry("2026-11-20", 200, 150, 10)); // 300 kcal, 20 g
    await record("ana", "diary", "b", entry("2026-11-20", 100, 500, 30)); // 500 kcal, 30 g
    await record("ana", "diary", "c", entry("2026-11-21", 100, 2400, 160)); // comida rápida: total
    await record("ana", "diary", "d", entry("2026-11-21", 100, 999, 99), 1); // borrada
    await record("ana", "diary", "e", entry("2026-09-01", 100, 999, 99)); // antigua
    await record("ana", "weights", "2026-11-20", { date: "2026-11-20", kg: 80.4 });
    await record("bea", "diary", "z", entry("2026-11-20", 100, 3000, 200)); // otra cuenta

    expect(await readNutrition(db, "ana", "2026-10-01")).toEqual({
      connected: true,
      goal: "ganar",
      rateKgWeek: 0.25,
      proteinPerKg: 1.8,
      weightKg: 80,
      days: [
        { date: "2026-11-20", kcal: 800, protein: 50 },
        { date: "2026-11-21", kcal: 2400, protein: 160 },
      ],
      weights: [{ date: "2026-11-20", kg: 80.4 }],
    });
  });

  it("el endpoint exige sesión", async () => {
    const env = { DB: db, GOOGLE_CLIENT_ID: "c", GOOGLE_CLIENT_SECRET: "s" };
    const anon = await handleNutrition(new Request("https://f.test/api/nutrition"), env, () => NOW);
    expect(anon.status).toBe(401);

    await upsertUser(
      db,
      { id: "ana", email: "ana@example.com", name: null },
      "2026-11-01T00:00:00.000Z",
    );
    await createSession(
      db,
      "ana",
      await sha256("tok"),
      "2026-11-01T00:00:00.000Z",
      "2099-01-01T00:00:00.000Z",
    );
    const res = await handleNutrition(
      new Request("https://f.test/api/nutrition", { headers: { cookie: "__Host-fq_session=tok" } }),
      env,
      () => NOW,
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ connected: true, goal: "ganar" });
  });
});
