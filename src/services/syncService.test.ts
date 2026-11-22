import { beforeEach, describe, expect, it } from "vitest";

import type { Change, SyncRequest, SyncResponse } from "@/lib/syncApi";
import { STORAGE_KEYS, readJson, writeJson } from "@/services/storage";
import {
  getActiveMesocycle,
  getUserProfile,
  getWorkoutLogs,
  saveUserProfile,
  saveWorkoutLog,
} from "@/services/strengthService";
import { adoptAccount, markDirty, syncNow } from "@/services/syncService";
import type { WorkoutLog } from "@/types";
import { TEST_PROFILE } from "@/test/fixtures";

/** Servidor en memoria con el mismo protocolo que /api/sync (gana el updatedAt más reciente). */
function fakeServer(epoch = "2026-01-01T00:00:00.000Z") {
  const rows = new Map<string, Change & { seq: number }>();
  let seq = 0;
  const server = {
    epoch,
    requests: [] as SyncRequest[],
    down: false,
    put(change: Change) {
      rows.set(`${change.store}/${change.key}`, { ...change, seq: ++seq });
    },
    get(store: string, key: string) {
      return rows.get(`${store}/${key}`);
    },
    fetcher: async (_url: string, init?: RequestInit): Promise<Response> => {
      if (server.down) throw new TypeError("Failed to fetch");
      const body = JSON.parse(String(init!.body)) as SyncRequest;
      server.requests.push(body);
      if (body.epoch !== null && body.epoch !== server.epoch) {
        return Response.json({ reset: true, epoch: server.epoch }, { status: 409 });
      }
      for (const c of body.changes) {
        const old = rows.get(`${c.store}/${c.key}`);
        if (!old || c.updatedAt > old.updatedAt) server.put(c);
      }
      const sent = new Set(body.changes.map((c) => `${c.store}/${c.key}/${c.updatedAt}`));
      const after = [...rows.values()]
        .filter((r) => r.seq > body.cursor)
        .sort((a, b) => a.seq - b.seq);
      const out: SyncResponse = {
        epoch: server.epoch,
        cursor: after.at(-1)?.seq ?? body.cursor,
        changes: after
          .filter((r) => !sent.has(`${r.store}/${r.key}/${r.updatedAt}`))
          .map(({ seq: _seq, ...c }) => c),
        more: false,
      };
      return Response.json(out);
    },
  };
  return server;
}

const log = (id: string, completedAt = "2026-11-20T10:00:00.000Z"): WorkoutLog => ({
  id,
  sessionId: `s-${id}`,
  mesocycleId: "m1",
  title: `Entreno ${id}`,
  completedAt,
  durationSeconds: 3600,
  exercises: [],
  xpEarned: 120,
});

const remote = (store: Change["store"], key: string, updatedAt: string, data: unknown): Change => ({
  store,
  key,
  updatedAt,
  deleted: false,
  data: JSON.stringify(data),
});

describe("sincronización de la app", () => {
  beforeEach(() => window.localStorage.clear());

  it("sube los datos locales y no vuelve a subir lo que ya está", async () => {
    const server = fakeServer();
    saveUserProfile({ ...TEST_PROFILE, xp: 300 });
    saveWorkoutLog(log("w1"));

    const result = await syncNow("ana", server.fetcher);
    expect(result).toMatchObject({ state: "idle", changed: false });
    expect(JSON.parse(server.get("profile", "me")!.data!).xp).toBe(300);
    expect(server.get("workouts", "w1")).toBeDefined();

    await syncNow("ana", server.fetcher);
    expect(server.requests.at(-1)!.changes).toEqual([]);
  });

  it("al vincular la cuenta, la nube manda sobre el perfil del onboarding y se suman los entrenos", async () => {
    const server = fakeServer();
    server.put(
      remote("profile", "me", "2026-10-01T00:00:00.000Z", { ...TEST_PROFILE, xp: 900, level: 4 }),
    );
    server.put(
      remote(
        "workouts",
        "w-viejo",
        "2026-10-01T00:00:00.000Z",
        log("w-viejo", "2026-10-01T10:00:00.000Z"),
      ),
    );
    saveUserProfile({ ...TEST_PROFILE, xp: 0 }); // onboarding en el móvil nuevo (fecha de hoy)
    saveWorkoutLog(log("w-nuevo"));

    const result = await syncNow("ana", server.fetcher);
    expect(result.changed).toBe(true);
    expect(getUserProfile().xp).toBe(900);
    expect(getWorkoutLogs().map((l) => l.id)).toEqual(["w-viejo", "w-nuevo"]);
    expect(server.get("workouts", "w-nuevo")).toBeDefined();
    expect(JSON.parse(server.get("profile", "me")!.data!).xp).toBe(900);
  });

  it("después de vincular gana el cambio más reciente en cada sentido", async () => {
    const server = fakeServer();
    saveUserProfile({ ...TEST_PROFILE, xp: 100 });
    await syncNow("ana", server.fetcher);

    saveUserProfile({ ...TEST_PROFILE, xp: 200 });
    await syncNow("ana", server.fetcher);
    expect(JSON.parse(server.get("profile", "me")!.data!).xp).toBe(200);

    server.put(remote("profile", "me", "2099-01-01T00:00:00.000Z", { ...TEST_PROFILE, xp: 999 }));
    const result = await syncNow("ana", server.fetcher);
    expect(result.changed).toBe(true);
    expect(getUserProfile().xp).toBe(999);
  });

  it("un mesociclo generado solo pierde contra el de la nube", async () => {
    const server = fakeServer();
    saveUserProfile(TEST_PROFILE);
    await syncNow("ana", server.fetcher);
    server.put(remote("mesocycle", "me", "2026-11-01T00:00:00.000Z", { id: "meso-nube" }));
    window.localStorage.removeItem(STORAGE_KEYS.mesocycle);
    getActiveMesocycle(); // se regenera en local porque faltaba
    await syncNow("ana", server.fetcher);
    expect(readJson<{ id: string }>(STORAGE_KEYS.mesocycle, { id: "" }).id).toBe("meso-nube");
  });

  it("no mezcla datos de otra cuenta hasta que se elige usar los de la cuenta actual", async () => {
    const server = fakeServer();
    saveUserProfile({ ...TEST_PROFILE, name: "Ana" });
    await syncNow("ana", server.fetcher);

    const other = fakeServer();
    other.put(
      remote("profile", "me", "2026-10-01T00:00:00.000Z", { ...TEST_PROFILE, name: "Bea" }),
    );
    expect((await syncNow("bea", other.fetcher)).state).toBe("conflict");
    expect(getUserProfile().name).toBe("Ana");

    adoptAccount("bea");
    await syncNow("bea", other.fetcher);
    expect(getUserProfile().name).toBe("Bea");
  });

  it("si la copia del servidor cambió (cuenta recreada), vuelve a subir todo", async () => {
    const server = fakeServer();
    saveWorkoutLog(log("w1"));
    await syncNow("ana", server.fetcher);

    const fresh = fakeServer("2026-12-01T00:00:00.000Z");
    const result = await syncNow("ana", fresh.fetcher);
    expect(result.state).toBe("idle");
    expect(fresh.get("workouts", "w1")).toBeDefined();
  });

  it("sin red conserva los pendientes y los sube después", async () => {
    const server = fakeServer();
    await syncNow("ana", server.fetcher);
    saveWorkoutLog(log("w1"));
    server.down = true;
    expect((await syncNow("ana", server.fetcher)).state).toBe("error");
    server.down = false;
    await syncNow("ana", server.fetcher);
    expect(server.get("workouts", "w1")).toBeDefined();
  });

  it("lo que llega borrado se quita en local", async () => {
    const server = fakeServer();
    saveWorkoutLog(log("w1"));
    await syncNow("ana", server.fetcher);
    server.put({
      store: "workouts",
      key: "w1",
      updatedAt: "2099-01-01T00:00:00.000Z",
      deleted: true,
      data: null,
    });
    await syncNow("ana", server.fetcher);
    expect(getWorkoutLogs()).toEqual([]);
  });

  it("markDirty avisa a quien escucha", async () => {
    const { onLocalChange } = await import("@/services/syncService");
    let calls = 0;
    const off = onLocalChange(() => calls++);
    markDirty("workouts", "x");
    writeJson(STORAGE_KEYS.workouts, []);
    off();
    markDirty("workouts", "y");
    expect(calls).toBe(1);
  });
});
