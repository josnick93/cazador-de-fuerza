import type { ReactNode } from "react";
import { BarChart3, Bot, CalendarRange, Dumbbell, Shield } from "lucide-react";
import { useApp, type MainTab } from "./AppContext";

const TABS: { id: MainTab; label: string; icon: typeof Dumbbell }[] = [
  { id: "hoy", label: "Hoy", icon: Dumbbell },
  { id: "progreso", label: "Progreso", icon: BarChart3 },
  { id: "plan", label: "Plan", icon: CalendarRange },
  { id: "coach", label: "Coach", icon: Bot },
];

export function MobileLayout({ children }: { children: ReactNode }) {
  const { profile, view, setView } = useApp();
  const hideChrome = view === "entreno" || view === "onboarding";

  return (
    <div className="min-h-dvh w-full bg-background text-foreground">
      <div className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col border-x border-border/50 bg-background">
        {!hideChrome && (
          <header className="sticky top-0 z-30 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border/80 bg-background/95 px-4 py-3 backdrop-blur-md">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-primary/40 bg-primary/10 text-primary system-glow">
                <Shield className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-display text-lg font-bold tracking-wide text-foreground">
                    IRONQUEST
                  </span>
                  <span className="shrink-0 rounded-md border border-primary/40 bg-primary/15 px-1.5 py-0.5 font-display text-[11px] font-semibold text-primary">
                    {profile.hunterRank}
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  Nv. {profile.level} · {profile.xp}/{profile.nextLevelXp} XP
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setView(view === "perfil" ? "hoy" : "perfil")}
              aria-label="Abrir perfil"
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-full border font-display text-sm font-bold transition-colors ${
                view === "perfil"
                  ? "border-primary bg-primary text-primary-foreground system-glow"
                  : "border-border bg-surface text-foreground hover:border-primary/60"
              }`}
            >
              {profile.name
                .split(" ")
                .map((w) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </button>
          </header>
        )}

        <main className={`flex-1 ${hideChrome ? "" : "pb-24"}`}>{children}</main>

        {!hideChrome && (
          <nav
            aria-label="Navegación principal"
            className="fixed bottom-0 left-1/2 z-40 w-full max-w-[390px] -translate-x-1/2 border-t border-border/80 bg-card/95 px-2 py-2 backdrop-blur-md"
          >
            <div className="grid grid-cols-4 gap-1">
              {TABS.map(({ id, label, icon: Icon }) => {
                const active = view === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setView(id)}
                    className={`flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-xs font-medium transition-all ${
                      active
                        ? "bg-primary/15 text-primary ring-1 ring-primary/40"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}
