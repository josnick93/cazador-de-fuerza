import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Dumbbell, Home, Shield, Sparkles } from "lucide-react";
import { useApp } from "@/components/AppContext";
import { regenerateMesocycle } from "@/services/strengthService";
import type { Equipment, Goal } from "@/types";

const GOALS: { id: Goal; title: string; desc: string }[] = [
  { id: "fuerza", title: "Fuerza", desc: "Subir tus marcas en los básicos semana a semana." },
  {
    id: "hipertrofia",
    title: "Hipertrofia",
    desc: "Ganar masa muscular con sobrecarga progresiva.",
  },
  {
    id: "powerlifting",
    title: "Powerlifting",
    desc: "Especialización en banca, sentadilla y peso muerto.",
  },
  {
    id: "recomposicion",
    title: "Recomposición",
    desc: "Ganar fuerza mientras reduces grasa corporal.",
  },
];

const EQUIPMENT_OPTIONS: { id: Equipment; title: string; desc: string; icon: typeof Dumbbell }[] = [
  {
    id: "gimnasio",
    title: "Gimnasio completo",
    desc: "Barras, racks, poleas y máquinas.",
    icon: Dumbbell,
  },
  { id: "mancuernas", title: "Mancuernas", desc: "Banco regulable y mancuernas.", icon: Sparkles },
  { id: "casa", title: "Casa", desc: "Barra de dominadas, lastre y peso corporal.", icon: Home },
];

export function OnboardingPage() {
  const { profile, updateProfile, setView } = useApp();
  const [step, setStep] = useState(1);
  const [goal, setGoal] = useState<Goal>(profile.goal);
  const [daysPerWeek, setDaysPerWeek] = useState(profile.daysPerWeek);
  const [sessionMinutes, setSessionMinutes] = useState(profile.sessionMinutes);
  const [equipment, setEquipment] = useState<Equipment>(profile.equipment);
  const [bodyweight, setBodyweight] = useState(String(profile.bodyweightKg));
  const [banca, setBanca] = useState(
    profile.initial1RM.banca ? String(profile.initial1RM.banca) : "",
  );
  const [sentadilla, setSentadilla] = useState(
    profile.initial1RM.sentadilla ? String(profile.initial1RM.sentadilla) : "",
  );
  const [pesoMuerto, setPesoMuerto] = useState(
    profile.initial1RM.pesoMuerto ? String(profile.initial1RM.pesoMuerto) : "",
  );
  const [dontKnow1RM, setDontKnow1RM] = useState(false);

  const finishOnboarding = () => {
    const parsedBw = Number(bodyweight);
    const next = updateProfile({
      goal,
      daysPerWeek,
      sessionMinutes,
      equipment,
      bodyweightKg: Number.isFinite(parsedBw) && parsedBw > 30 ? parsedBw : profile.bodyweightKg,
      onboardingCompleted: true,
      initial1RM: dontKnow1RM
        ? { banca: null, sentadilla: null, pesoMuerto: null }
        : {
            banca: Number(banca) > 0 ? Number(banca) : null,
            sentadilla: Number(sentadilla) > 0 ? Number(sentadilla) : null,
            pesoMuerto: Number(pesoMuerto) > 0 ? Number(pesoMuerto) : null,
          },
    });
    regenerateMesocycle(next);
    setView("hoy");
  };

  return (
    <div className="flex min-h-dvh flex-col px-4 py-6">
      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <Shield className="h-5 w-5" />
            <span className="font-display text-sm font-bold tracking-wider">
              SISTEMA · PASO {step}/4
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              updateProfile({ onboardingCompleted: true });
              setView("hoy");
            }}
            className="min-h-[48px] px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Saltar
          </button>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-surface">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex-1 space-y-4">
        {step === 1 && (
          <>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">
                ¿Cuál es tu misión principal?
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Ajustaremos tu volumen, RIR y progresión de cargas.
              </p>
            </div>
            <div className="space-y-3">
              {GOALS.map((item) => {
                const selected = goal === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setGoal(item.id)}
                    className={`flex min-h-[68px] w-full items-center justify-between rounded-2xl border p-4 text-left transition-all ${
                      selected
                        ? "border-primary bg-primary/10 system-glow"
                        : "border-border bg-card hover:border-primary/40"
                    }`}
                  >
                    <div>
                      <p className="font-display text-base font-bold text-foreground">
                        {item.title}
                      </p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    {selected && <Check className="h-5 w-5 shrink-0 text-primary" />}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">
                Frecuencia y duración
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Elige cuántos días entrenarás por semana y cuánto tiempo tienes.
              </p>
            </div>
            <div className="system-panel space-y-5 rounded-2xl p-4">
              <div>
                <p className="mb-3 text-sm font-semibold text-foreground">Días por semana</p>
                <div className="grid grid-cols-5 gap-2">
                  {[2, 3, 4, 5, 6].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDaysPerWeek(d)}
                      className={`min-h-[52px] rounded-xl border font-display text-lg font-bold transition-all ${
                        daysPerWeek === d
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-surface text-foreground"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-3 text-sm font-semibold text-foreground">Duración de sesión</p>
                <div className="grid grid-cols-3 gap-2">
                  {[45, 60, 75].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setSessionMinutes(mins)}
                      className={`min-h-[52px] rounded-xl border font-display text-base font-bold transition-all ${
                        sessionMinutes === mins
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-surface text-foreground"
                      }`}
                    >
                      {mins} min
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">
                ¿Con qué equipamiento entrenas?
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Solo propondremos ejercicios compatibles con tu equipo.
              </p>
            </div>
            <div className="space-y-3">
              {EQUIPMENT_OPTIONS.map(({ id, title, desc, icon: Icon }) => {
                const selected = equipment === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setEquipment(id)}
                    className={`flex min-h-[72px] w-full items-center gap-3 rounded-2xl border p-4 text-left transition-all ${
                      selected
                        ? "border-primary bg-primary/10 system-glow"
                        : "border-border bg-card hover:border-primary/40"
                    }`}
                  >
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-surface text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-base font-bold text-foreground">{title}</p>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                    {selected && <Check className="h-5 w-5 shrink-0 text-primary" />}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">
                Tus marcas iniciales
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Opcional: indica tu peso corporal y 1RM aproximado en {profile.unit}.
              </p>
            </div>
            <div className="system-panel space-y-4 rounded-2xl p-4">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Peso corporal ({profile.unit})
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={bodyweight}
                  onChange={(e) => setBodyweight(e.target.value)}
                  className="mt-1.5 min-h-[48px] w-full rounded-xl border border-input bg-surface px-3.5 font-display text-lg font-bold text-foreground focus:border-primary focus:outline-none"
                />
              </label>

              <button
                type="button"
                onClick={() => setDontKnow1RM((prev) => !prev)}
                className={`flex min-h-[48px] w-full items-center justify-between rounded-xl border px-3.5 text-sm font-semibold transition-colors ${
                  dontKnow1RM
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-surface text-muted-foreground"
                }`}
              >
                <span>No lo sé (calcular en las primeras sesiones)</span>
                {dontKnow1RM && <Check className="h-4 w-4" />}
              </button>

              {!dontKnow1RM && (
                <div className="grid grid-cols-3 gap-2.5">
                  <label className="block">
                    <span className="text-xs text-muted-foreground">Banca</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="100"
                      value={banca}
                      onChange={(e) => setBanca(e.target.value)}
                      className="mt-1 min-h-[48px] w-full rounded-xl border border-input bg-surface px-3 font-display text-base font-bold text-foreground focus:border-primary focus:outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs text-muted-foreground">Sentadilla</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="135"
                      value={sentadilla}
                      onChange={(e) => setSentadilla(e.target.value)}
                      className="mt-1 min-h-[48px] w-full rounded-xl border border-input bg-surface px-3 font-display text-base font-bold text-foreground focus:border-primary focus:outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs text-muted-foreground">Peso muerto</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="165"
                      value={pesoMuerto}
                      onChange={(e) => setPesoMuerto(e.target.value)}
                      className="mt-1 min-h-[48px] w-full rounded-xl border border-input bg-surface px-3 font-display text-base font-bold text-foreground focus:border-primary focus:outline-none"
                    />
                  </label>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="mt-6 flex items-center gap-3">
        {step > 1 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="flex min-h-[52px] items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Atrás
          </button>
        )}
        <button
          type="button"
          onClick={() => (step < 4 ? setStep((s) => s + 1) : finishOnboarding())}
          className="flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 font-display text-base font-bold text-primary-foreground system-glow active:scale-[0.99]"
        >
          {step < 4 ? (
            <>
              Continuar
              <ArrowRight className="h-4 w-4" />
            </>
          ) : (
            <>
              Activar Sistema
              <Check className="h-5 w-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
