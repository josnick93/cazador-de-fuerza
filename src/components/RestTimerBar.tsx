import { Plus, SkipForward, Timer } from "lucide-react";

interface RestTimerBarProps {
  secondsLeft: number;
  onAdd30: () => void;
  onSkip: () => void;
}

export function RestTimerBar({ secondsLeft, onAdd30, onSkip }: RestTimerBarProps) {
  if (secondsLeft <= 0) return null;

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const formatted = `${mins}:${secs.toString().padStart(2, "0")}`;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-24px)] max-w-[366px] -translate-x-1/2 rounded-2xl border border-primary/50 bg-card/95 p-3 shadow-2xl backdrop-blur-md system-glow">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
            <Timer className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
              Descanso activo
            </p>
            <p className="tabular-nums-display text-2xl font-bold leading-none text-foreground">
              {formatted}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onAdd30}
            className="flex min-h-[48px] items-center gap-1 rounded-xl border border-border bg-surface px-3.5 text-sm font-semibold text-foreground active:scale-95"
          >
            <Plus className="h-4 w-4 text-primary" />
            30s
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="flex min-h-[48px] items-center gap-1 rounded-xl bg-primary px-3.5 text-sm font-bold text-primary-foreground active:scale-95"
          >
            <SkipForward className="h-4 w-4" />
            Saltar
          </button>
        </div>
      </div>
    </div>
  );
}