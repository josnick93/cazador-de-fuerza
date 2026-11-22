import { useLayoutEffect } from "react";
import { useApp, type AppView } from "@/components/AppContext";
import { MobileLayout } from "@/components/MobileLayout";
import { CoachPage } from "@/pages/CoachPage";
import { EntrenoActivoPage } from "@/pages/EntrenoActivoPage";
import { HoyPage } from "@/pages/HoyPage";
import { OnboardingPage } from "@/pages/OnboardingPage";
import { PlanPage } from "@/pages/PlanPage";
import { ProgresoPage } from "@/pages/ProgresoPage";

function PendingPage({ title }: { title: string }) {
  return (
    <div className="px-4 py-8 text-center">
      <h1 className="font-display text-2xl font-bold text-foreground">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">Próximamente.</p>
    </div>
  );
}

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
      return <PendingPage title="Perfil" />;
    case "hoy":
    default:
      return <HoyPage />;
  }
}

export function AppShell() {
  const { profile, view } = useApp();
  const activeView: AppView = profile.onboardingCompleted ? view : "onboarding";

  // Layout effect: corre antes que los efectos de la página (p. ej. autoscroll del chat).
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [activeView]);

  return <MobileLayout>{renderView(activeView)}</MobileLayout>;
}
