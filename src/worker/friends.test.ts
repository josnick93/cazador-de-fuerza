// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPlatformProxy } from "wrangler";
import { sha256, type AuthEnv } from "./auth";
import { handleFriends } from "./friends";
import { applyChanges, createSession, ensureSchema, upsertUser, type Database } from "./store";
import type { FriendsAddResponse, FriendsResponse } from "@/lib/friendsApi";

const ORIGIN = "https://app.test";
const NOW = Date.parse("2026-11-25T12:00:00.000Z");
const iso = (ms: number) => new Date(ms).toISOString();

let db: Database;
let dispose: () => Promise<void>;
beforeAll(async () => {
  const proxy = await getPlatformProxy<{ DB: Database }>({ persist: false });
  db = proxy.env.DB;
  dispose = proxy.dispose;
  await ensureSchema(db);
});
afterAll(() => dispose());

const env = (): AuthEnv => ({ DB: db, GOOGLE_CLIENT_ID: "c", GOOGLE_CLIENT_SECRET: "s" });

let n = 0;
async function user(name: string): Promise<{ id: string; cookie: string }> {
  const id = `f${++n}`;
  const token = `token-${id}`;
  await upsertUser(db, { id, email: `${id}@example.com`, name }, iso(NOW - 86_400_000));
  await createSession(db, id, await sha256(token), iso(NOW), iso(NOW + 86_400_000));
  return { id, cookie: `__Host-fq_session=${token}` };
}

function call(cookie: string, body?: unknown, origin = ORIGIN) {
  return handleFriends(
    new Request(`${ORIGIN}/api/friends`, {
      method: body === undefined ? "GET" : "POST",
      headers: { cookie, origin, "content-type": "application/json" },
      body: body === undefined ? null : JSON.stringify(body),
    }),
    env(),
    () => NOW,
  );
}

const get = async (cookie: string) => (await (await call(cookie)).json()) as FriendsResponse;

describe("/api/friends", () => {
  it("sin sesión no deja entrar", async () => {
    expect((await call("__Host-fq_session=nada")).status).toBe(401);
  });

  it("código propio estable; añadir por código crea la amistad en los dos sentidos", async () => {
    const ana = await user("Ana López");
    const bea = await user("Bea Ruiz");
    await applyChanges(db, bea.id, [
      {
        store: "workouts",
        key: "w1",
        updatedAt: iso(NOW - 3_600_000),
        deleted: false,
        data: JSON.stringify({
          id: "w1",
          title: "Pierna A",
          completedAt: iso(NOW - 3_600_000),
          xpEarned: 120,
          exercises: [
            {
              exerciseId: "ex-sentadilla",
              plannedExerciseId: "ex-sentadilla",
              sets: [{ kg: 100, reps: 5, rir: 2, e1rm: 120, isPr: true }],
            },
          ],
        }),
      },
    ]);

    const first = await get(ana.cookie);
    expect(first.code).toMatch(/^[A-Z2-9]{6}$/);
    expect((await get(ana.cookie)).code).toBe(first.code);
    expect(first.friends).toEqual([]);
    expect(first.me.name).toBe("Ana");

    const bCode = (await get(bea.cookie)).code;
    const added = await call(ana.cookie, { action: "add", code: bCode.toLowerCase() });
    expect(added.status).toBe(200);
    const { friend } = (await added.json()) as FriendsAddResponse;
    expect(friend).toMatchObject({ name: "Bea", weekWorkouts: 1, weekXp: 120, weekPrs: 1 });
    expect(JSON.stringify(friend)).not.toContain("example.com");

    const anaView = await get(ana.cookie);
    expect(anaView.friends.map((f) => f.id)).toEqual([bea.id]);
    expect(anaView.feed[0]).toMatchObject({ userId: bea.id, title: "Pierna A" });
    expect((await get(bea.cookie)).friends.map((f) => f.id)).toEqual([ana.id]);

    // Quitar borra los dos sentidos.
    await call(bea.cookie, { action: "remove", friendId: ana.id });
    expect((await get(ana.cookie)).friends).toEqual([]);
  });

  it("errores: código propio, inexistente o mal formado; origen ajeno", async () => {
    const carl = await user("Carl");
    const code = (await get(carl.cookie)).code;
    expect((await call(carl.cookie, { action: "add", code })).status).toBe(400);
    expect((await call(carl.cookie, { action: "add", code: "ZZZZZZ" })).status).toBe(404);
    expect((await call(carl.cookie, { action: "add", code: "x" })).status).toBe(400);
    expect((await call(carl.cookie, { action: "regenerate" }, "https://otro.test")).status).toBe(
      403,
    );
  });

  it("regenerar invalida el código anterior", async () => {
    const dani = await user("Dani");
    const eva = await user("Eva");
    const old = (await get(dani.cookie)).code;
    const res = (await (await call(dani.cookie, { action: "regenerate" })).json()) as {
      code: string;
    };
    expect(res.code).not.toBe(old);
    expect((await call(eva.cookie, { action: "add", code: old })).status).toBe(404);
    expect((await call(eva.cookie, { action: "add", code: res.code })).status).toBe(200);
  });

  it("borrar la cuenta (en MacroQuest) borra su código y sus amistades", async () => {
    const fede = await user("Fede");
    const gala = await user("Gala");
    await call(fede.cookie, { action: "add", code: (await get(gala.cookie)).code });
    await db.prepare(`DELETE FROM users WHERE id = ?1`).bind(gala.id).run();
    expect((await get(fede.cookie)).friends).toEqual([]);
    const left = await db
      .prepare(`SELECT COUNT(*) AS n FROM fuerza_friend_codes WHERE user_id = ?1`)
      .bind(gala.id)
      .first<{ n: number }>();
    expect(left?.n).toBe(0);
  });
});
