/** Protocolo de sincronización (POST /api/sync), compartido entre la app y el Worker. */

/** Almacenes de datos del usuario. `profile` y `mesocycle` usan la clave fija "me"; `workouts`, el id del entreno. */
export const SYNC_STORES = ["profile", "mesocycle", "workouts"] as const;
export type SyncStore = (typeof SYNC_STORES)[number];

/** Un registro que ha cambiado. Gana siempre el `updatedAt` más reciente; un borrado es un cambio más. */
export interface Change {
  store: SyncStore;
  key: string;
  /** ISO en UTC con milisegundos: se compara como texto. */
  updatedAt: string;
  deleted: boolean;
  /** El registro en JSON; null si está borrado. */
  data: string | null;
}

export interface SyncRequest {
  /** Identifica la copia del servidor que conoce este dispositivo; null la primera vez. */
  epoch: string | null;
  /** Hasta dónde ha recibido ya este dispositivo. */
  cursor: number;
  changes: Change[];
}

export interface SyncResponse {
  epoch: string;
  cursor: number;
  changes: Change[];
  /** Quedan cambios por bajar: hay que volver a pedir. */
  more: boolean;
}

/** Límites por petición (en caracteres), holgados para D1: 2 MB por valor. Los mismos que MacroQuest. */
export const MAX_CHANGES = 200;
export const MAX_BODY_CHARS = 600_000;
export const MAX_RECORD_CHARS = 200_000;
export const MAX_KEY_CHARS = 200;

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
export const isStamp = (v: unknown): v is string => typeof v === "string" && ISO.test(v);

const isStore = (v: unknown): v is SyncStore => SYNC_STORES.some((s) => s === v);

/** Valida un cambio recibido; null si no es aceptable. */
export function parseChange(v: unknown): Change | null {
  if (typeof v !== "object" || v === null) return null;
  const c = v as Record<string, unknown>;
  const { store, key, updatedAt, deleted, data } = c as Partial<Record<keyof Change, unknown>>;
  if (!isStore(store) || typeof key !== "string" || !key || key.length > MAX_KEY_CHARS) return null;
  if (!isStamp(updatedAt)) return null;
  if ((store === "profile" || store === "mesocycle") && key !== "me") return null;
  if (deleted === true) return { store, key, updatedAt, deleted: true, data: null };
  if (deleted !== false || typeof data !== "string" || !data || data.length > MAX_RECORD_CHARS) {
    return null;
  }
  return { store, key, updatedAt, deleted: false, data };
}
