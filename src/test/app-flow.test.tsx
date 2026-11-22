import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppProvider } from "@/components/AppContext";
import { AppShell } from "@/components/AppShell";
import { STORAGE_KEYS } from "@/services/storage";
import { getWorkoutLogs } from "@/services/strengthService";
import { seedLogs, seedProfile, weeklyBenchLogs } from "./fixtures";

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

  it("un usuario nuevo empieza en el onboarding y al terminarlo recibe su plan", () => {
    renderApp();
    expect(screen.getByText(/PASO 1\/4/)).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Continuar/ }));
    fireEvent.click(screen.getByRole("button", { name: "3" }));
    fireEvent.click(screen.getByRole("button", { name: /Continuar/ }));
    fireEvent.click(screen.getByRole("button", { name: /Continuar/ }));
    fireEvent.click(screen.getByRole("button", { name: /Activar Sistema/ }));

    expect(screen.getByRole("heading", { name: "Full Body A" })).toBeInTheDocument();
    fireEvent.click(nav().getByRole("button", { name: "Plan" }));
    expect(screen.getByText(/Full Body · 3 días\/sem/)).toBeInTheDocument();
  });

  it("muestra Hoy con la primera sesión del mesociclo generado", () => {
    seedProfile();
    renderApp();
    expect(screen.getByRole("heading", { name: "Torso A" })).toBeInTheDocument();
    expect(screen.getByText("MISIÓN S1 · #1")).toBeInTheDocument();
    expect(screen.getByText("Press Banca con Barra")).toBeInTheDocument();
  });

  it("recorre Hoy → Entreno activo → Resumen → Progreso y guarda la sesión", () => {
    seedProfile();
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: /Empezar entreno/ }));
    expect(screen.getByText(/Ejercicio 1 de/)).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: "Hecho" })[0]!);
    fireEvent.click(screen.getByRole("button", { name: "Terminar" }));
    expect(screen.getByText("MISIÓN COMPLETADA · +105 XP")).toBeInTheDocument();
    expect(screen.getByText("Próxima sesión")).toBeInTheDocument();
    expect(getWorkoutLogs()).toHaveLength(1);
    expect(screen.queryByText(/Nv\. 1 · 105\/500 XP/)).not.toBeInTheDocument(); // header oculto en entreno

    fireEvent.click(screen.getByRole("button", { name: /Ver progreso/ }));
    expect(screen.getByRole("heading", { name: "Progreso de Fuerza" })).toBeInTheDocument();

    expect(screen.getByText(/Nv\. 1 · 105\/500 XP/)).toBeInTheDocument();
    fireEvent.click(nav().getByRole("button", { name: "Hoy" }));
    expect(screen.getByRole("heading", { name: "Pierna A" })).toBeInTheDocument();
  });

  it("sustituye un ejercicio recalculando la carga y lo registra con el original", () => {
    seedProfile();
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: /Empezar entreno/ }));
    expect(screen.getAllByText("77,5")).toHaveLength(3);

    fireEvent.click(screen.getByRole("button", { name: /Máquina ocupada/ }));
    fireEvent.click(screen.getByRole("button", { name: /^Press Inclinado con Barra/ }));
    expect(screen.getByRole("heading", { name: "Press Inclinado con Barra" })).toBeInTheDocument();
    expect(screen.getAllByText("65")).toHaveLength(3); // 77,5 × 0,85 → 65

    fireEvent.click(screen.getAllByRole("button", { name: "Hecho" })[0]!);
    fireEvent.click(screen.getByRole("button", { name: "Terminar" }));
    expect(getWorkoutLogs()[0]!.exercises[0]).toMatchObject({
      exerciseId: "ex-press-inclinado",
      plannedExerciseId: "ex-banca-barra",
    });
  });

  it("desde 'Máquina ocupada' abre la técnica de una alternativa y la usa", () => {
    seedProfile();
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: /Empezar entreno/ }));
    fireEvent.click(screen.getByRole("button", { name: /Máquina ocupada/ }));
    expect(screen.getByText("Mismo movimiento")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Ver técnica de Press de Pecho en Máquina" }),
    );
    const sheet = within(screen.getByRole("dialog", { name: "Press de Pecho en Máquina" }));
    expect(sheet.getByText("Cómo hacerlo")).toBeInTheDocument();
    expect(sheet.getByAltText(/posición inicial/)).toHaveAttribute(
      "src",
      "/exercises/ex-press-maquina/0.webp",
    );

    fireEvent.click(sheet.getByRole("button", { name: "Usar este ejercicio" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Press de Pecho en Máquina" })).toBeInTheDocument();
  });

  it("la técnica del ejercicio actual no ofrece usarlo de nuevo", () => {
    seedProfile();
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: /Empezar entreno/ }));
    fireEvent.click(screen.getByRole("button", { name: /Técnica/ }));
    const sheet = within(screen.getByRole("dialog", { name: "Press Banca con Barra" }));
    expect(sheet.queryByRole("button", { name: "Usar este ejercicio" })).not.toBeInTheDocument();
    fireEvent.click(sheet.getByRole("button", { name: /Press Banca con Mancuernas/ }));
    expect(screen.getByRole("dialog", { name: "Press Banca con Mancuernas" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Usar este ejercicio" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Volver al ejercicio anterior" }));
    expect(screen.getByRole("dialog", { name: "Press Banca con Barra" })).toBeInTheDocument();
  });

  it("Biblioteca busca sin acentos, filtra y abre la ficha", () => {
    seedProfile();
    renderApp();
    fireEvent.click(nav().getByRole("button", { name: "Biblioteca" }));
    expect(screen.getByRole("heading", { name: "Ejercicios" })).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText(/Buscar/), { target: { value: "jalon" } });
    expect(screen.getByText("2 ejercicios")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Jalón al Pecho Agarre Neutro/ }));
    const sheet = within(screen.getByRole("dialog", { name: "Jalón al Pecho Agarre Neutro" }));
    expect(sheet.getByText("Errores comunes")).toBeInTheDocument();
    fireEvent.click(sheet.getByRole("button", { name: "Cerrar ficha" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Borrar búsqueda" }));
    fireEvent.click(screen.getByRole("button", { name: "Casa" }));
    fireEvent.click(screen.getByRole("button", { name: "Hombros" }));
    expect(screen.getByText("2 ejercicios")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Flexiones Pike/ })).toBeInTheDocument();
  });

  it("no marca la sesión como hecha si se termina sin series", () => {
    seedProfile();
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: /Empezar entreno/ }));
    fireEvent.click(screen.getByRole("button", { name: "Terminar" }));
    expect(getWorkoutLogs()).toHaveLength(0);
  });

  it("navega a Plan con la semana actual destacada", () => {
    seedProfile();
    renderApp();
    fireEvent.click(nav().getByRole("button", { name: "Plan" }));
    expect(screen.getByRole("heading", { name: /Semana 1 de 5/ })).toBeInTheDocument();
    expect(screen.getByText("ACTUAL")).toBeInTheDocument();
  });

  it("Progreso sin historial muestra estados vacíos", () => {
    seedProfile();
    renderApp();
    fireEvent.click(nav().getByRole("button", { name: "Progreso" }));
    expect(screen.getByText(/Sin datos de Press Banca/)).toBeInTheDocument();
    expect(screen.getByText(/Aún no hay récords/)).toBeInTheDocument();
  });

  it("abre Coach desde la alerta de estancamiento y responde al prompt pendiente", () => {
    seedProfile();
    seedLogs(weeklyBenchLogs([95, 97.5, 99.5, 101, 102.5, 102.5, 102, 102.5]));
    vi.useFakeTimers();
    renderApp();
    fireEvent.click(nav().getByRole("button", { name: "Progreso" }));
    expect(screen.getByText("Banca estancada 3 semanas")).toBeInTheDocument();
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
    seedProfile();
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Abrir perfil" }));
    fireEvent.click(screen.getByRole("radio", { name: "lb" }));
    expect(screen.getByText("Peso corporal (lb)")).toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEYS.profile)!).unit).toBe("lb");

    fireEvent.click(screen.getByRole("button", { name: /Rehacer onboarding/ }));
    expect(screen.getByText(/PASO 1\/4/)).toBeInTheDocument();
  });
});
