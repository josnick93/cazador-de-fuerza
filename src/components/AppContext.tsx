import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import {
  consumeLoginResult,
  getAccount,
  type AccountState,
  type LoginResult,
} from "@/services/authService";
import { getDefaultProfile, getUserProfile, saveUserProfile } from "@/services/strengthService";
import type { UserProfile } from "@/types";

export type MainTab = "hoy" | "progreso" | "plan" | "biblioteca" | "coach";
export type AppView = MainTab | "entreno" | "perfil" | "onboarding";

interface AppContextValue {
  profile: UserProfile;
  /** false hasta leer el almacenamiento local (en SSR y primer render del cliente). */
  hydrated: boolean;
  /** Guarda de inmediato y devuelve el perfil resultante. */
  updateProfile: (patch: Partial<UserProfile>) => UserProfile;
  view: AppView;
  setView: (view: AppView) => void;
  coachPendingPrompt: string | null;
  openCoachWithPrompt: (prompt: string) => void;
  clearCoachPendingPrompt: () => void;
  /** Cuenta de Google; `enabled: false` sin servidor de login. */
  account: AccountState;
  refreshAccount: () => Promise<void>;
  /** Resultado del login con el que ha vuelto la app (se muestra en Perfil). */
  loginResult: LoginResult | null;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  // El servidor no tiene localStorage: arrancamos con el perfil por defecto y cargamos al montar.
  const [profile, setProfile] = useState<UserProfile>(() => getDefaultProfile());
  const profileRef = useRef(profile);
  const [hydrated, setHydrated] = useState(false);
  const [view, setView] = useState<AppView>("hoy");
  const [coachPendingPrompt, setCoachPendingPrompt] = useState<string | null>(null);
  const [account, setAccount] = useState<AccountState>({ enabled: false, user: null });
  const [loginResult, setLoginResult] = useState<LoginResult | null>(null);

  const refreshAccount = async () => {
    setAccount(await getAccount());
  };

  useEffect(() => {
    const saved = getUserProfile();
    profileRef.current = saved;
    setProfile(saved);
    setHydrated(true);
    const result = consumeLoginResult();
    if (result) {
      setLoginResult(result);
      setView("perfil");
    }
    void refreshAccount();
  }, []);

  const updateProfile = (patch: Partial<UserProfile>) => {
    const next = { ...profileRef.current, ...patch };
    profileRef.current = next;
    saveUserProfile(next);
    setProfile(next);
    return next;
  };

  const openCoachWithPrompt = (prompt: string) => {
    setCoachPendingPrompt(prompt);
    setView("coach");
  };

  const clearCoachPendingPrompt = () => setCoachPendingPrompt(null);

  return (
    <AppContext.Provider
      value={{
        profile,
        hydrated,
        updateProfile,
        view,
        setView,
        coachPendingPrompt,
        openCoachWithPrompt,
        clearCoachPendingPrompt,
        account,
        refreshAccount,
        loginResult,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
