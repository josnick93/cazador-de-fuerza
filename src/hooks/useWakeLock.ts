import { useEffect } from "react";

/**
 * Mantiene la pantalla encendida mientras `active` (Screen Wake Lock API).
 * El navegador lo suelta al cambiar de app; se vuelve a pedir al regresar. Sin soporte no hace nada.
 */
export function useWakeLock(active: boolean): void {
  useEffect(() => {
    if (!active || typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;

    const request = async () => {
      if (document.visibilityState !== "visible" || (lock && !lock.released)) return;
      try {
        const next = await navigator.wakeLock.request("screen");
        if (cancelled) void next.release();
        else lock = next;
      } catch {
        // Batería baja, permiso denegado o pestaña oculta: se reintenta al volver.
      }
    };

    void request();
    document.addEventListener("visibilitychange", request);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", request);
      void lock?.release().catch(() => {});
    };
  }, [active]);
}
