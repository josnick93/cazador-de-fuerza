import { createFileRoute } from "@tanstack/react-router";
import { AppProvider } from "@/components/AppContext";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
