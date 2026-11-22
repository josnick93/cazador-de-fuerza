import { useState } from "react";
import { BookOpen, ChevronRight, Search, X } from "lucide-react";
import { ExerciseGuideSheet } from "@/components/ExerciseGuideSheet";
import { ExerciseThumb } from "@/components/ExerciseThumb";
import { EQUIPMENT_LABEL } from "@/lib/labels";
import { searchExerciseLibrary, type LibraryFilters } from "@/services/strengthService";
import type { Equipment, MuscleGroup } from "@/types";

const MUSCLES: { id: MuscleGroup | "todos"; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "Pecho", label: "Pecho" },
  { id: "Espalda", label: "Espalda" },
  { id: "Piernas", label: "Piernas" },
  { id: "Hombros", label: "Hombros" },
  { id: "Brazos", label: "Brazos" },
];

const EQUIPMENT: { id: Equipment | "todo"; label: string }[] = [
  { id: "todo", label: "Todo" },
  { id: "gimnasio", label: "Gimnasio" },
  { id: "mancuernas", label: "Mancuernas" },
  { id: "casa", label: "Casa" },
];

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`min-h-[44px] shrink-0 rounded-xl border px-3.5 text-sm font-semibold transition-colors ${
        selected
          ? "border-primary bg-primary/15 text-primary"
          : "border-border bg-card text-muted-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export function BibliotecaPage() {
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState<NonNullable<LibraryFilters["muscle"]>>("todos");
  const [equipment, setEquipment] = useState<NonNullable<LibraryFilters["equipment"]>>("todo");
  const [openId, setOpenId] = useState<string | null>(null);

  const results = searchExerciseLibrary({ query, muscle, equipment });

  return (
    <div className="space-y-4 px-4 py-4">
      <section className="system-panel rounded-2xl p-4">
        <span className="inline-flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/15 px-2.5 py-1 font-display text-xs font-bold tracking-wider text-primary">
          <BookOpen className="h-3.5 w-3.5" />
          BIBLIOTECA
        </span>
        <h1 className="mt-2 font-display text-2xl font-bold text-foreground">Ejercicios</h1>
        <p className="text-sm text-muted-foreground">
          Técnica, consejos y alternativas por si la máquina está ocupada.
        </p>
        <label className="relative mt-3 block">
          <span className="sr-only">Buscar ejercicio</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar: remo, polea, sentadilla…"
            className="min-h-[48px] w-full rounded-xl border border-input bg-surface pl-10 pr-12 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Borrar búsqueda"
              className="absolute right-0 top-0 grid h-12 w-12 place-items-center text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </label>
      </section>

      <div className="space-y-2">
        <div
          role="group"
          aria-label="Filtrar por músculo"
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
        >
          {MUSCLES.map((m) => (
            <Chip key={m.id} selected={muscle === m.id} onClick={() => setMuscle(m.id)}>
              {m.label}
            </Chip>
          ))}
        </div>
        <div
          role="group"
          aria-label="Filtrar por equipamiento"
          className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1"
        >
          {EQUIPMENT.map((e) => (
            <Chip key={e.id} selected={equipment === e.id} onClick={() => setEquipment(e.id)}>
              {e.label}
            </Chip>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground" aria-live="polite">
        {results.length} {results.length === 1 ? "ejercicio" : "ejercicios"}
      </p>

      {results.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No hay ejercicios con esos filtros.
        </div>
      ) : (
        <ul className="space-y-2">
          {results.map((ex) => (
            <li key={ex.id}>
              <button
                type="button"
                onClick={() => setOpenId(ex.id)}
                className="flex min-h-[64px] w-full items-center gap-3 rounded-2xl border border-border bg-card p-2.5 text-left active:scale-[0.99]"
              >
                <ExerciseThumb exerciseId={ex.id} className="h-12 w-16" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {ex.name}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {ex.muscle} · {EQUIPMENT_LABEL[ex.equipment]}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {openId && <ExerciseGuideSheet exerciseId={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}
