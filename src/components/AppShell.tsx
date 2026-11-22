import { useLayoutEffect } from "react";
import { Shield } from "lucide-react";
import { useApp, type AppView } from "@/components/AppContext";
import { MobileLayout } from "@/components/MobileLayout";
import { CoachPage } from "@/pages/CoachPage";
import { EntrenoActivoPage } from "@/pages/EntrenoActivoPage";
import { HoyPage } from "@/pages/HoyPage";
import { OnboardingPage } from "@/pages/OnboardingPage";
import { PerfilPage } from "@/pages/PerfilPage";
import { PlanPage } from "@/pages/PlanPage";
import { ProgresoPage } from "@/pages/ProgresoPage";

function renderView(view: AppView) {
  switch (view) {
    case "onboarding":
      return <OnboardingPage />;
    case "entreno":
      return <EntrenoActivoPage />;
    case "progreso":
      return <ProgresoPage />;
    case "plan":
      return <PlanPage />;
    case "coach":
      return <CoachPage />;
    case "perfil":
      return <PerfilPage />;
    case "hoy":
    default:
      return <HoyPage />;
  }
}

export function AppShell() {
  const { profile, view, hydrated } = useApp();
  const activeView: AppView = profile.onboardingCompleted ? view : "onboarding";

  // Layout effect: corre antes que los efectos de la página (p. ej. autoscroll del chat).
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [activeView]);

  if (!hydrated) {
    return (
      <div
        role="status"
        aria-label="Cargando"
        className="grid min-h-dvh place-items-center bg-background text-primary"
      >
        <Shield className="h-10 w-10 animate-pulse" />
      </div>
    );
  }

  return <MobileLayout>{renderView(activeView)}</MobileLayout>;
}
