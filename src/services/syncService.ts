/**
 * Sincronización de los datos locales con la nube (POST /api/sync, mismo protocolo que MacroQuest).
 * - Cada guardado local apunta su registro como pendiente con su fecha (`markDirty`), haya sesión o no.
 * - Al sincronizar se suben los pendientes y se bajan los cambios de otros dispositivos: gana el más reciente.
 * - Al vincular una cuenta por primera vez en este dispositivo, la nube manda: primero se baja todo y solo
 *   se sube lo que la nube no tenga (así un móvil nuevo no pisa tu perfil y tu XP con el del onboarding).
 * - Los datos del dispositivo son de una sola cuenta: si entra otra, no se mezclan (estado `conflict`).
 */
import { MAX_CHANGES, type Change, type SyncResponse, type SyncStore } from "@/lib/syncApi";
import { STORAGE_KEYS, readJson, removeKey, writeJson } from "@/services/storage";
import type { WorkoutLog } from "@/types";

/** Fecha de lo que nunca se guardó con marca: pierde contra cualquier otra versión. */
export const EPOCH = "1970-01-01T00:00:00.000Z";
const META_KEY = "ironquest_sync_v1";
const MAX_ROUNDS = 20;

interface SyncMeta {
  /** Cuenta dueña de los datos de este dispositivo; null si nunca se ha vinculado. */
  account: string | null;
  epoch: string | null;
  cursor: number;
  /** Fecha de la versión local de cada registro (`store/key`). */
  stamps: Record<string, string>;
  /** Registros con cambios locales sin subir. */
  dirty: string[];
  lastSyncAt: string | null;
}

export type SyncState = "idle" | "syncing" | "error" | "conflict" | "signed-out";

export interface SyncResult {
  state: SyncState;
  /** Han llegado datos de otro dispositivo: hay que recargar lo que se muestra. */
  changed: boolean;
  lastSyncAt: string | null;
}

const emptyMeta = (): SyncMeta => ({
  account: null,
  epoch: null,
  cursor: 0,
  stamps: {},
  dirty: [],
  lastSyncAt: null,
});

const loadMeta = (): SyncMeta => ({ ...emptyMeta(), ...readJson<Partial<SyncMeta>>(META_KEY, {}) });
const saveMeta = (meta: SyncMeta) => writeJson(META_KEY, meta);
const recordId = (store: SyncStore, key: string) => `${store}/${key}`;

function splitId(id: string): { store: SyncStore; key: string } {
  const i = id.indexOf("/");
  return { store: id.slice(0, i) as SyncStore, key: id.slice(i + 1) };
}

const listeners = new Set<() => void>();

/** Avisa cuando hay un cambio local pendiente de subir. */
export function onLocalChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Apunta un registro guardado en local. `stamp` = EPOCH para lo generado solo (pierde contra la nube). */
export function markDirty(store: SyncStore, key: string, stamp = new Date().toISOString()): void {
  const meta = loadMeta();
  const id = recordId(store, key);
  const previous = meta.stamps[id];
  // Dos guardados en el mismo milisegundo: el segundo tiene que ganar igualmente.
  meta.stamps[id] =
    previous && stamp !== EPOCH && stamp <= previous
      ? new Date(Date.parse(previous) + 1).toISOString()
      : stamp;
  if (!meta.dirty.includes(id)) meta.dirty.push(id);
  saveMeta(meta);
  listeners.forEach((l) => l());
}

export function getLastSyncAt(): string | null {
  return loadMeta().lastSyncAt;
}

// ── Lectura y escritura local por registro ───────────────────────────────────

function readLocal(store: SyncStore, key: string): string | null {
  if (store === "workouts") {
    const log = readJson<WorkoutLog[]>(STORAGE_KEYS.workouts, []).find((l) => l.id === key);
    return log ? JSON.stringify(log) : null;
  }
  const value = readJson<unknown>(STORAGE_KEYS[store], null);
  return value === null ? null : JSON.stringify(value);
}

function writeLocal(change: Change): void {
  const value: unknown = change.data === null ? null : JSON.parse(change.data);
  if (change.store === "workouts") {
    const logs = readJson<WorkoutLog[]>(STORAGE_KEYS.workouts, []).filter(
      (l) => l.id !== change.key,
    );
    writeJson(
      STORAGE_KEYS.workouts,
      value
        ? [...logs, value as WorkoutLog].sort((a, b) => a.completedAt.localeCompare(b.completedAt))
        : logs,
    );
    return;
  }
  if (value === null) removeKey(STORAGE_KEYS[change.store]);
  else writeJson(STORAGE_KEYS[change.store], value);
}

/** Todos los registros que hay en local (para subirlos al vincular o tras un reinicio del servidor). */
function localIds(): string[] {
  const ids: string[] = [];
  if (readLocal("profile", "me")) ids.push(recordId("profile", "me"));
  if (readLocal("mesocycle", "me")) ids.push(recordId("mesocycle", "me"));
  for (const log of readJson<WorkoutLog[]>(STORAGE_KEYS.workouts, [])) {
    ids.push(recordId("workouts", log.id));
  }
  return ids;
}

function markAllDirty(meta: SyncMeta): void {
  for (const id of localIds()) {
    meta.stamps[id] ??= EPOCH;
    if (!meta.dirty.includes(id)) meta.dirty.push(id);
  }
}

// ── Sincronización ───────────────────────────────────────────────────────────

type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

let running: Promise<SyncResult> | null = null;

/** Sincroniza con la cuenta `userId`. Si ya hay una sincronización en marcha, devuelve esa. */
export function syncNow(
  userId: string,
  fetcher: Fetcher = (u, i) => fetch(u, i),
): Promise<SyncResult> {
  running ??= runSync(userId, fetcher).finally(() => {
    running = null;
  });
  return running;
}

async function runSync(userId: string, fetcher: Fetcher): Promise<SyncResult> {
  let meta = loadMeta();
  if (meta.account && meta.account !== userId) {
    return { state: "conflict", changed: false, lastSyncAt: meta.lastSyncAt };
  }
  const firstLink = meta.account === null;
  if (firstLink) {
    meta = { ...meta, account: userId, epoch: null, cursor: 0 };
    markAllDirty(meta);
  }

  let changed = false;
  let resets = 0;
  // Al vincular, primero solo se baja: la nube manda sobre lo que haya en el dispositivo.
  let pullOnly = firstLink;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const sending = pullOnly ? [] : meta.dirty.slice(0, MAX_CHANGES);
    const sentStamps = new Map(sending.map((id) => [id, meta.stamps[id] ?? EPOCH]));
    const changes: Change[] = sending.map((id) => {
      const { store, key } = splitId(id);
      const data = readLocal(store, key);
      return { store, key, updatedAt: sentStamps.get(id)!, deleted: data === null, data };
    });

    let res: Response;
    try {
      res = await fetcher("/api/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ epoch: meta.epoch, cursor: meta.cursor, changes }),
      });
    } catch {
      saveMeta(meta);
      return { state: "error", changed, lastSyncAt: meta.lastSyncAt };
    }

    if (res.status === 409 && resets === 0) {
      // La copia del servidor es otra (cuenta borrada y creada de nuevo): empezar de cero y volver a subir todo.
      resets++;
      meta.epoch = null;
      meta.cursor = 0;
      markAllDirty(meta);
      continue;
    }
    if (res.status === 401) {
      saveMeta(meta);
      return { state: "signed-out", changed, lastSyncAt: meta.lastSyncAt };
    }
    if (!res.ok) {
      saveMeta(meta);
      return { state: "error", changed, lastSyncAt: meta.lastSyncAt };
    }

    const body = (await res.json()) as SyncResponse;
    for (const change of body.changes) {
      const id = recordId(change.store, change.key);
      const local = meta.stamps[id] ?? EPOCH;
      if (pullOnly || change.updatedAt > local) {
        writeLocal(change);
        meta.stamps[id] = change.updatedAt;
        meta.dirty = meta.dirty.filter((d) => d !== id);
        changed = true;
      }
    }
    // Lo subido deja de estar pendiente, salvo que haya vuelto a cambiar mientras tanto.
    meta.dirty = meta.dirty.filter(
      (id) => !sentStamps.has(id) || meta.stamps[id] !== sentStamps.get(id),
    );
    meta.epoch = body.epoch;
    meta.cursor = body.cursor;
    saveMeta(meta);

    if (body.more) continue;
    if (pullOnly) {
      pullOnly = false;
      continue;
    }
    if (meta.dirty.length === 0) break;
  }

  meta.lastSyncAt = new Date().toISOString();
  saveMeta(meta);
  return { state: "idle", changed, lastSyncAt: meta.lastSyncAt };
}

/** Resuelve un conflicto de cuentas: borra los datos del dispositivo y baja los de `userId`. */
export function adoptAccount(userId: string): void {
  Object.values(STORAGE_KEYS).forEach(removeKey);
  saveMeta({ ...emptyMeta(), account: userId });
}

/** Olvida el estado de sincronización (al reiniciar los datos locales). */
export function resetSyncMeta(): void {
  removeKey(META_KEY);
}
