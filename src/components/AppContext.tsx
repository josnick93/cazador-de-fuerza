import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  consumeLoginResult,
  getAccount,
  type AccountState,
  type LoginResult,
} from "@/services/authService";
import { getDefaultProfile, getUserProfile, saveUserProfile } from "@/services/strengthService";
import {
  adoptAccount,
  getLastSyncAt,
  onLocalChange,
  syncNow,
  type SyncState,
} from "@/services/syncService";
import type { UserProfile } from "@/types";

/** Espera tras un cambio local antes de subirlo (agrupa varios guardados seguidos). */
const SYNC_DEBOUNCE_MS = 2500;

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
  /** Estado de la copia en la nube (solo con sesión). */
  sync: { state: SyncState; lastSyncAt: string | null };
  syncData: () => Promise<void>;
  /** Conflicto de cuentas: borra lo del dispositivo y baja los datos de la cuenta actual. */
  adoptAccountData: () => void;
  /** Cambia cuando llegan datos de otro dispositivo (las pantallas se vuelven a montar). */
  dataVersion: number;
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

  const [sync, setSync] = useState<AppContextValue["sync"]>({ state: "idle", lastSyncAt: null });
  const [dataVersion, setDataVersion] = useState(0);
  const userId = account.user?.id ?? null;

  const refreshAccount = async () => {
    setAccount(await getAccount());
  };

  const reloadLocalData = () => {
    const saved = getUserProfile();
    profileRef.current = saved;
    setProfile(saved);
    setDataVersion((v) => v + 1);
  };

  const syncData = useCallback(async () => {
    if (!userId) return;
    setSync((s) => ({ ...s, state: "syncing" }));
    const result = await syncNow(userId);
    setSync({ state: result.state, lastSyncAt: result.lastSyncAt });
    if (result.changed) reloadLocalData();
    if (result.state === "signed-out") setAccount(await getAccount());
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    setSync({ state: "idle", lastSyncAt: getLastSyncAt() });
    void syncData();
    let timer: number | undefined;
    const schedule = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void syncData(), SYNC_DEBOUNCE_MS);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void syncData();
    };
    const off = onLocalChange(schedule);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", schedule);
    return () => {
      off();
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", schedule);
    };
  }, [userId, syncData]);

  const adoptAccountData = () => {
    if (!userId) return;
    adoptAccount(userId);
    reloadLocalData();
    void syncData();
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
        sync,
        syncData,
        adoptAccountData,
        dataVersion,
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
