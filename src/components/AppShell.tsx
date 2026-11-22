import { useApp, type AppView } from "@/components/AppContext";
import { MobileLayout } from "@/components/MobileLayout";
import { EntrenoActivoPage } from "@/pages/EntrenoActivoPage";
import { HoyPage } from "@/pages/HoyPage";
import { OnboardingPage } from "@/pages/OnboardingPage";
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
      return <PendingPage title="Plan" />;
    case "coach":
      return <PendingPage title="Coach" />;
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

  return <MobileLayout>{renderView(activeView)}</MobileLayout>;
}
