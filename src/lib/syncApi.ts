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
