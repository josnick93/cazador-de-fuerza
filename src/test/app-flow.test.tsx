import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppProvider } from "@/components/AppContext";
import { AppShell } from "@/components/AppShell";

const STORAGE_KEY = "ironquest_profile_v1";

function renderApp() {
  return render(
    <AppProvider>
      <AppShell />
    </AppProvider>,
  );
}

function nav() {
  return within(screen.getByRole("navigation", { name: "Navegación principal" }));
}

describe("Flujo de la app", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("muestra Hoy por defecto con la navegación inferior", () => {
    renderApp();
    expect(screen.getByRole("button", { name: /Empezar entreno/ })).toBeInTheDocument();
    expect(nav().getByRole("button", { name: "Plan" })).toBeInTheDocument();
  });

  it("muestra Onboarding sin navegación si el perfil no lo ha completado", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ onboardingCompleted: false }));
    renderApp();
    expect(screen.getByText(/PASO 1\/4/)).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Saltar" }));
    expect(screen.getByRole("button", { name: /Empezar entreno/ })).toBeInTheDocument();
  });

  it("recorre Hoy → Entreno activo → Resumen → Progreso", () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: /Empezar entreno/ }));
    expect(screen.getByText(/Ejercicio 1 de/)).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Hecho" })[0]!);
    fireEvent.click(screen.getByRole("button", { name: "Terminar" }));
    expect(screen.getByText(/MISIÓN COMPLETADA/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Ver progreso/ }));
    expect(screen.getByRole("heading", { name: "Progreso de Fuerza" })).toBeInTheDocument();
    expect(nav().getByRole("button", { name: "Progreso" })).toBeInTheDocument();
  });

  it("navega a Plan con la semana actual destacada", () => {
    renderApp();
    fireEvent.click(nav().getByRole("button", { name: "Plan" }));
    expect(screen.getByRole("heading", { name: /Semana 3 de 5/ })).toBeInTheDocument();
    expect(screen.getByText("ACTUAL")).toBeInTheDocument();
  });

  it("abre Coach desde la alerta de estancamiento y responde al prompt pendiente", () => {
    vi.useFakeTimers();
    renderApp();
    fireEvent.click(nav().getByRole("button", { name: "Progreso" }));
    fireEvent.click(screen.getByRole("button", { name: /Ver por qué/ }));

    expect(screen.getByText("REVISIÓN SEMANAL")).toBeInTheDocument();
    const log = within(screen.getByRole("log"));
    expect(log.getByText("¿Por qué no subo en banca?")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(log.getByText(/Tu Press Banca lleva 3 semanas/)).toBeInTheDocument();
  });

  it("Perfil cambia unidades y permite rehacer el onboarding", () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Abrir perfil" }));
    fireEvent.click(screen.getByRole("radio", { name: "lb" }));
    expect(screen.getByText("Peso corporal (lb)")).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY)!).unit).toBe("lb");

    fireEvent.click(screen.getByRole("button", { name: /Rehacer onboarding/ }));
    expect(screen.getByText(/PASO 1\/4/)).toBeInTheDocument();
  });
});
