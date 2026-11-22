import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
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
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  // El servidor no tiene localStorage: arrancamos con el perfil por defecto y cargamos al montar.
  const [profile, setProfile] = useState<UserProfile>(() => getDefaultProfile());
  const profileRef = useRef(profile);
  const [hydrated, setHydrated] = useState(false);
  const [view, setView] = useState<AppView>("hoy");
  const [coachPendingPrompt, setCoachPendingPrompt] = useState<string | null>(null);

  useEffect(() => {
    const saved = getUserProfile();
    profileRef.current = saved;
    setProfile(saved);
    setHydrated(true);
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
