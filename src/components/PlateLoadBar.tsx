import type { PlateLoad } from "@/engine/plates";

/** Colores de competición (IWF) por disco. */
const PLATE_STYLE: Record<number, { color: string; h: string }> = {
  25: { color: "bg-red-500", h: "h-8" },
  20: { color: "bg-blue-500", h: "h-8" },
  15: { color: "bg-yellow-400", h: "h-7" },
  10: { color: "bg-green-500", h: "h-6" },
  5: { color: "bg-slate-100", h: "h-5" },
  2.5: { color: "bg-red-400", h: "h-4" },
  1.25: { color: "bg-slate-400", h: "h-3.5" },
};

const kg = (n: number) => n.toString().replace(".", ",");

function describe(load: PlateLoad): string {
  if (load.perSide.length === 0) return `Solo la barra (${kg(load.barKg)} kg)`;
  return `${load.perSide.map(kg).join(" + ")} por lado`;
}

/** Discos de un lado de la barra. `compact`: solo el texto (filas de calentamiento). */
export function PlateLoadBar({ load, compact = false }: { load: PlateLoad; compact?: boolean }) {
  const extra =
    load.remainderKg > 0 ? ` · faltan ${kg(load.remainderKg)} kg que no cuadran con discos` : "";
  if (compact) {
    return (
      <span className="text-xs text-muted-foreground">
        {load.perSide.length === 0 ? "Barra vacía" : `${load.perSide.map(kg).join("+")} /lado`}
      </span>
    );
  }
  return (
    <div
      className="mt-2.5 flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3 py-2"
      aria-label={`Discos: ${describe(load)}${extra}`}
    >
      <div className="flex h-8 shrink-0 items-center" aria-hidden="true">
        <div className="h-1.5 w-5 rounded-l-sm bg-slate-400" />
        <div className="h-4 w-1 bg-slate-300" />
        <div className="flex items-center gap-[2px] pl-[2px]">
          {load.perSide.map((p, i) => {
            const style = PLATE_STYLE[p] ?? { color: "bg-slate-400", h: "h-4" };
            return <div key={i} className={`w-2 rounded-[2px] ${style.color} ${style.h}`} />;
          })}
        </div>
        <div className="h-1.5 w-2 rounded-r-sm bg-slate-400" />
      </div>
      <div className="min-w-0 text-xs">
        <p className="font-semibold text-foreground">{describe(load)}</p>
        <p className="text-muted-foreground">
          {load.perSide.length > 0 && `Barra ${kg(load.barKg)} kg`}
          {extra}
        </p>
      </div>
    </div>
  );
}
