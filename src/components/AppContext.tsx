import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getUserProfile } from "@/services/strengthService";
import type { UserProfile } from "@/types";

export type MainTab = "hoy" | "progreso" | "plan" | "coach";
export type AppView = MainTab | "entreno" | "perfil" | "onboarding";

interface AppContextValue {
  profile: UserProfile;
  updateProfile: (patch: Partial<UserProfile>) => void;
  view: AppView;
  setView: (view: AppView) => void;
  coachPendingPrompt: string | null;
  openCoachWithPrompt: (prompt: string) => void;
  clearCoachPendingPrompt: () => void;
}

const STORAGE_KEY = "ironquest_profile_v1";
const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(() => getUserProfile());
  const [view, setView] = useState<AppView>("hoy");
  const [coachPendingPrompt, setCoachPendingPrompt] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<UserProfile>;
        setProfile((prev) => ({ ...prev, ...saved }));
      }
    } catch {
      // Ignore malformed storage
    }
  }, []);

  const updateProfile = (patch: Partial<UserProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...patch };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
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