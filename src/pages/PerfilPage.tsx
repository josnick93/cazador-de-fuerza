import { useState } from "react";
import {
  AlertTriangle,
  Check,
  Cloud,
  Crown,
  Link2,
  LogIn,
  LogOut,
  RefreshCw,
  RotateCcw,
  Shield,
  User,
} from "lucide-react";
import { useApp } from "@/components/AppContext";
import { Switch } from "@/components/ui/switch";
import { LOGIN_URL, logout } from "@/services/authService";
import { regenerateMesocycle } from "@/services/strengthService";
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

const LOGIN_MESSAGES = {
  ok: "Sesión iniciada. ¡Bienvenido, Cazador!",
  cancelado: "Has cancelado el inicio de sesión.",
  error: "No se pudo iniciar sesión. Inténtalo de nuevo.",
} as const;

function syncLabel(state: string, lastSyncAt: string | null): string {
  if (state === "syncing") return "Sincronizando…";
  if (state === "error") return "No se pudo sincronizar. Se reintentará solo.";
  if (!lastSyncAt) return "Pendiente de sincronizar";
  const d = new Date(lastSyncAt);
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  const today = new Date().toDateString() === d.toDateString();
  return `Sincronizado ${today ? "hoy" : d.toLocaleDateString("es-ES")} a las ${hh}:${mm}`;
}

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
  const {
    profile,
    updateProfile,
    setView,
    account,
    refreshAccount,
    loginResult,
    sync,
    syncData,
    adoptAccountData,
  } = useApp();
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

  const changeGoal = (goal: Goal) => {
    if (goal === profile.goal) return;
    regenerateMesocycle(updateProfile({ goal }));
  };

  const signOut = async () => {
    await logout().catch(() => undefined);
    await refreshAccount();
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

      <section className="space-y-3" aria-labelledby="perfil-cuenta">
        <h2
          id="perfil-cuenta"
          className="flex items-center gap-2 font-display text-base font-bold uppercase tracking-wider text-foreground"
        >
          <Cloud className="h-4 w-4 text-primary" />
          Cuenta
        </h2>
        {loginResult && (
          <p
            role="status"
            className={`rounded-xl border px-3.5 py-2.5 text-sm ${
              loginResult === "ok"
                ? "border-success/40 bg-success/10 text-success"
                : "border-border bg-surface text-muted-foreground"
            }`}
          >
            {LOGIN_MESSAGES[loginResult]}
          </p>
        )}
        <div className="rounded-2xl border border-border bg-card p-4">
          {account.user ? (
            <div className="space-y-3">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Conectado con Google</p>
                <p className="truncate font-semibold text-foreground">{account.user.email}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Es la misma cuenta que usas en MacroQuest.
                </p>
              </div>
              {sync.state === "conflict" ? (
                <div
                  role="alert"
                  className="space-y-2 rounded-xl border border-gold/40 bg-gold/10 p-3"
                >
                  <p className="flex gap-2 text-sm text-foreground">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                    Los datos de este dispositivo son de otra cuenta y no se mezclan.
                  </p>
                  <button
                    type="button"
                    onClick={adoptAccountData}
                    className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-gold font-display text-sm font-bold text-gold-foreground"
                  >
                    Usar los datos de esta cuenta
                  </button>
                  <p className="text-xs text-muted-foreground">
                    Se borran los datos de este dispositivo y se bajan los de {account.user.email}.
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2 rounded-xl bg-surface px-3 py-2">
                  <span role="status" className="text-xs text-muted-foreground">
                    {syncLabel(sync.state, sync.lastSyncAt)}
                  </span>
                  <button
                    type="button"
                    onClick={() => void syncData()}
                    disabled={sync.state === "syncing"}
                    aria-label="Sincronizar ahora"
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-primary disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${sync.state === "syncing" ? "animate-spin" : ""}`}
                    />
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={signOut}
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface font-display text-sm font-bold text-foreground"
              >
                <LogOut className="h-4 w-4 text-primary" />
                Cerrar sesión
              </button>
            </div>
          ) : account.enabled ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Entra con la misma cuenta de Google que en MacroQuest para guardar tus entrenos en
                la nube y cruzarlos con tu nutrición.
              </p>
              <a
                href={LOGIN_URL}
                className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-primary font-display text-base font-bold text-primary-foreground system-glow"
              >
                <LogIn className="h-5 w-5" />
                Entrar con Google
              </a>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Tus datos se guardan en este dispositivo. El inicio de sesión estará disponible en
              fuerza.macroquestapp.com.
            </p>
          )}
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
        <p className="-mt-1 text-xs text-muted-foreground">
          Cambiarlo genera un mesociclo nuevo (tu historial se conserva).
        </p>
        <div role="radiogroup" aria-labelledby="perfil-objetivo" className="grid grid-cols-2 gap-2">
          {GOAL_OPTIONS.map((g) => {
            const selected = profile.goal === g.id;
            return (
              <button
                key={g.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => changeGoal(g.id)}
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
