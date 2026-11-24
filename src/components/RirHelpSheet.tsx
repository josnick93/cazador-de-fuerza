import { X } from "lucide-react";

const SCALE = [
  { rir: "0", feel: "No sale ni una más (fallo)" },
  { rir: "1", feel: "Sacarías 1 más, justa" },
  { rir: "2", feel: "Sacarías 2 más" },
  { rir: "3", feel: "Sacarías 3 más" },
  { rir: "4+", feel: "Ibas sobrado" },
];

export function RirHelpSheet({ targetRir, onClose }: { targetRir: number; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rir-help-title"
        onClick={(e) => e.stopPropagation()}
        className="system-panel max-h-[85dvh] w-full max-w-[390px] overflow-y-auto rounded-t-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border bg-card/95 px-4 py-3 backdrop-blur-md">
          <h2 id="rir-help-title" className="font-display text-lg font-bold text-foreground">
            ¿Qué es el RIR?
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-surface text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-4 pb-6 pt-3 text-sm text-secondary-foreground">
          <p>
            <strong className="text-foreground">RIR = repeticiones en reserva.</strong> Al terminar
            la serie, pregúntate:{" "}
            <em>«¿cuántas reps más habría podido hacer con buena técnica?»</em>. Ese número es tu
            RIR.
          </p>

          <ul className="space-y-1.5">
            {SCALE.map((s) => (
              <li
                key={s.rir}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
                  s.rir === String(targetRir)
                    ? "border-primary/50 bg-primary/10"
                    : "border-border bg-surface"
                }`}
              >
                <span className="w-8 shrink-0 text-center font-display text-base font-bold text-foreground">
                  {s.rir}
                </span>
                <span className="flex-1 text-foreground">{s.feel}</span>
                {s.rir === String(targetRir) && (
                  <span className="text-xs font-semibold text-primary">Objetivo</span>
                )}
              </li>
            ))}
          </ul>

          <div className="rounded-xl border border-border bg-surface p-3">
            <p className="font-semibold text-foreground">Ejemplo</p>
            <p className="mt-1">
              Te tocan 8 reps. Haces las 8 y notas que podrías haber hecho 2 más → marca{" "}
              <strong className="text-foreground">RIR 2</strong>. Si la octava casi no sale → RIR 0
              o 1.
            </p>
          </div>

          <div>
            <p className="font-semibold text-foreground">Cómo lo usa la app</p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>
                Hoy tu objetivo es <strong className="text-foreground">RIR {targetRir}</strong>:
                elige el peso para acabar cada serie con unas {targetRir} reps de margen.
              </li>
              <li>
                Si haces todas las series al máximo de reps con el RIR objetivo o más,{" "}
                <strong className="text-foreground">la próxima vez sube el peso</strong>.
              </li>
              <li>
                Si vas mucho más justo de lo previsto (2 menos que el objetivo),{" "}
                <strong className="text-foreground">baja el peso</strong>.
              </li>
              <li>Si no, mantiene el peso y te pide una rep más.</li>
            </ul>
          </div>

          <p className="text-xs text-muted-foreground">
            Marca el RIR real, no el que te gustaría: si mientes, la progresión se equivoca. Al
            principio cuesta calcularlo; en pocas semanas lo clavas.
          </p>
        </div>
      </div>
    </div>
  );
}
