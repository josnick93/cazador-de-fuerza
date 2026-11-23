import { Cloud, LogIn, Shield } from "lucide-react";
import { useApp } from "@/components/AppContext";
import { LOGIN_URL } from "@/services/authService";

const LOGIN_MESSAGES = {
  ok: null,
  cancelado: "Has cancelado el inicio de sesión.",
  error: "No se pudo iniciar sesión. Inténtalo de nuevo.",
} as const;

/** Entrada antes del onboarding cuando el servidor tiene login: con cuenta se recuperan los datos de la nube. */
export function LoginPage() {
  const { skipLogin, loginResult } = useApp();
  const message = loginResult ? LOGIN_MESSAGES[loginResult] : null;

  return (
    <div className="flex min-h-dvh flex-col justify-between px-4 py-10">
      <div className="space-y-6 pt-6 text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl border border-primary/40 bg-primary/10 text-primary system-glow">
          <Shield className="h-10 w-10" />
        </div>
        <div>
          <p className="font-display text-xs font-bold uppercase tracking-[0.3em] text-primary">
            Sistema de fuerza
          </p>
          <h1 className="mt-1 font-display text-4xl font-bold text-foreground">IRONQUEST</h1>
          <p className="mx-auto mt-3 max-w-[300px] text-sm text-muted-foreground">
            Entrenos personalizados, progresión automática y tu nutrición de MacroQuest en un solo
            sitio.
          </p>
        </div>
        <div className="system-panel mx-auto flex max-w-[320px] gap-3 rounded-2xl p-4 text-left">
          <Cloud className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <p className="text-sm text-foreground">
            Entra con la <strong>misma cuenta de Google que en MacroQuest</strong>: tus entrenos se
            guardan en la nube y se cruzan con lo que comes y lo que pesas.
          </p>
        </div>
        {message && (
          <p role="status" className="text-sm text-muted-foreground">
            {message}
          </p>
        )}
      </div>

      <div className="space-y-2.5">
        <a
          href={LOGIN_URL}
          className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-xl bg-primary font-display text-lg font-bold text-primary-foreground system-glow"
        >
          <LogIn className="h-5 w-5" />
          Entrar con Google
        </a>
        <button
          type="button"
          onClick={skipLogin}
          className="flex min-h-[52px] w-full items-center justify-center rounded-xl border border-border bg-surface font-display text-base font-bold text-foreground"
        >
          Seguir sin cuenta
        </button>
        <p className="text-center text-xs text-muted-foreground">
          Sin cuenta, tus datos se quedan en este dispositivo. Puedes entrar después desde Perfil.
        </p>
      </div>
    </div>
  );
}
