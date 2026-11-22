import { useState } from "react";
import { Check, Crown, Link2, RotateCcw, Shield, User } from "lucide-react";
import { useApp } from "@/components/AppContext";
import { Switch } from "@/components/ui/switch";
import type { Goal, WeightUnit } from "@/types";

const KG_PER_LB = 0.45359237;

const GOAL_OPTIONS: { id: Goal; label: string }[] = [
  { id: "fuerza", label: "Fuerza" },
  { id: "hipertrofia", label: "Hipertrofia" },
  { id: "powerlifting", label: "Powerlifting" },
  { id: "recomposicion", label: "Recomposición" },
];

const EQUIPMENT_LABEL = {
  gimnasio: "Gimnasio completo",
  mancuernas: "Mancuernas",
  casa: "Casa",
} as const;

const PREMIUM_PERKS = [
  "Coach IA sin límite de consultas",
  "Revisión semanal con datos de MacroQuest",
  "Sin anuncios",
];

function toDisplayWeight(kg: number, unit: WeightUnit): string {
  const value = unit === "lb" ? Math.round((kg / KG_PER_LB) * 10) / 10 : kg;
  return String(value);
}

export function PerfilPage() {
  const { profile, updateProfile, setView } = useApp();
  const [name, setName] = useState(profile.name);
  const [bodyweight, setBodyweight] = useState(() =>
    toDisplayWeight(profile.bodyweightKg, profile.unit),
  );
  const [premiumInfo, setPremiumInfo] = useState(false);

  const saveName = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== profile.name) updateProfile({ name: trimmed });
    else setName(profile.name);
  };

  const saveBodyweight = () => {
    const value = Number(bodyweight.replace(",", "."));
    const kg = profile.unit === "lb" ? value * KG_PER_LB : value;
    if (Number.isFinite(kg) && kg > 30 && kg < 300) {
      updateProfile({ bodyweightKg: Math.round(kg * 10) / 10 });
    } else {
      setBodyweight(toDisplayWeight(profile.bodyweightKg, profile.unit));
    }
  };

  const changeUnit = (unit: WeightUnit) => {
    if (unit === profile.unit) return;
    updateProfile({ unit });
    setBodyweight(toDisplayWeight(profile.bodyweightKg, unit));
  };

  const xpPct = Math.min(100, Math.round((profile.xp / profile.nextLevelXp) * 100));

  return (
    <div className="space-y-5 px-4 py-4">
      <section className="system-panel rounded-2xl p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-primary/40 bg-primary/10 text-primary system-glow">
            <Shield className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-2xl font-bold text-foreground">
              {profile.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-primary">{profile.hunterRank}</span> · Nivel{" "}
              {profile.level}
            </p>
          </div>
        </div>
        <div className="mt-4">
          <div className="mb-1.5 flex justify-between text-xs">
            <span className="text-muted-foreground">Experiencia</span>
            <span className="font-semibold text-foreground">
              {profile.xp}/{profile.nextLevelXp} XP
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface">
            <div className="h-full rounded-full bg-primary" style={{ width: `${xpPct}%` }} />
          </div>
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="perfil-datos">
        <h2
          id="perfil-datos"
          className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-wider text-foreground"
        >
          <User className="h-4 w-4 text-primary" />
          Datos
        </h2>
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Nombre de cazador
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={saveName}
              className="mt-1.5 min-h-[48px] w-full rounded-xl border border-input bg-surface px-3.5 text-base font-semibold text-foreground focus:border-primary focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Peso corporal ({profile.unit})
            </span>
            <input
              type="number"
              inputMode="decimal"
              value={bodyweight}
              onChange={(e) => setBodyweight(e.target.value)}
              onBlur={saveBodyweight}
              className="mt-1.5 min-h-[48px] w-full rounded-xl border border-input bg-surface px-3.5 font-display text-lg font-bold text-foreground focus:border-primary focus:outline-none"
            />
          </label>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-surface p-3">
              <p className="text-xs text-muted-foreground">Frecuencia</p>
              <p className="font-semibold text-foreground">
                {profile.daysPerWeek} días · {profile.sessionMinutes} min
              </p>
            </div>
            <div className="rounded-xl bg-surface p-3">
              <p className="text-xs text-muted-foreground">Equipamiento</p>
              <p className="font-semibold text-foreground">{EQUIPMENT_LABEL[profile.equipment]}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="perfil-objetivo">
        <h2
          id="perfil-objetivo"
          className="font-display text-base font-bold uppercase tracking-wider text-foreground"
        >
          Objetivo
        </h2>
        <div role="radiogroup" aria-labelledby="perfil-objetivo" className="grid grid-cols-2 gap-2">
          {GOAL_OPTIONS.map((g) => {
            const selected = profile.goal === g.id;
            return (
              <button
                key={g.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => updateProfile({ goal: g.id })}
                className={`flex min-h-[52px] items-center justify-between rounded-xl border px-3.5 font-display text-sm font-bold transition-colors ${
                  selected
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-card text-foreground"
                }`}
              >
                {g.label}
                {selected && <Check className="h-4 w-4" />}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="perfil-ajustes">
        <h2
          id="perfil-ajustes"
          className="font-display text-base font-bold uppercase tracking-wider text-foreground"
        >
          Ajustes
        </h2>
        <div className="divide-y divide-border rounded-2xl border border-border bg-card">
          <div className="flex min-h-[64px] items-center justify-between gap-3 px-4 py-2">
            <span id="unit-label" className="text-sm font-semibold text-foreground">
              Unidades
            </span>
            <div
              role="radiogroup"
              aria-labelledby="unit-label"
              className="grid grid-cols-2 gap-1 rounded-xl bg-surface p-1"
            >
              {(["kg", "lb"] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  role="radio"
                  aria-checked={profile.unit === u}
                  onClick={() => changeUnit(u)}
                  className={`min-h-[44px] min-w-[56px] rounded-lg font-display text-sm font-bold transition-colors ${
                    profile.unit === u
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          <label
            htmlFor="macroquest-sync"
            className="flex min-h-[72px] cursor-pointer items-center justify-between gap-3 px-4 py-3"
          >
            <span className="flex min-w-0 items-start gap-2.5">
              <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">
                  Sincronizar con MacroQuest
                </span>
                <span className="block text-xs text-muted-foreground">
                  Cruza tu nutrición con tu fuerza para detectar estancamientos.
                </span>
              </span>
            </span>
            <Switch
              id="macroquest-sync"
              checked={profile.macroQuestSync}
              onCheckedChange={(checked) => updateProfile({ macroQuestSync: checked })}
              className="h-7 w-12 [&>span]:h-6 [&>span]:w-6 [&>span]:data-[state=checked]:translate-x-5"
            />
          </label>
        </div>
      </section>

      <section
        className={`rounded-2xl border p-4 ${
          profile.isPremium ? "border-gold/50 bg-gold/10" : "system-panel border-gold/40"
        }`}
      >
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-gold" />
          <h2 className="font-display text-lg font-bold text-gold">
            {profile.isPremium ? "Premium activo" : "IronQuest Premium"}
          </h2>
        </div>
        <ul className="mt-3 space-y-1.5">
          {PREMIUM_PERKS.map((perk) => (
            <li key={perk} className="flex items-center gap-2 text-sm text-foreground">
              <Check className="h-4 w-4 shrink-0 text-gold" />
              {perk}
            </li>
          ))}
        </ul>
        {!profile.isPremium && (
          <>
            <button
              type="button"
              onClick={() => setPremiumInfo(true)}
              className="mt-4 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-gold font-display text-base font-bold text-gold-foreground active:scale-[0.98]"
            >
              <Crown className="h-5 w-5" />
              Hazte Premium
            </button>
            {premiumInfo && (
              <p role="status" className="mt-2 text-center text-xs text-muted-foreground">
                Los pagos llegarán pronto. Te avisaremos, Cazador.
              </p>
            )}
          </>
        )}
      </section>

      <button
        type="button"
        onClick={() => setView("onboarding")}
        className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface font-display text-sm font-bold text-foreground"
      >
        <RotateCcw className="h-4 w-4 text-primary" />
        Rehacer onboarding
      </button>
    </div>
  );
}
