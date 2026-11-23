import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppProvider } from "@/components/AppContext";
import { AppShell } from "@/components/AppShell";
import { STORAGE_KEYS } from "@/services/storage";
import { getWorkoutLogs } from "@/services/strengthService";
import { TEST_PROFILE, seedLogs, seedMacroQuest, seedProfile, weeklyBenchLogs } from "./fixtures";

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

/** Servidor de login simulado: /api/auth/me devuelve `user` hasta que se cierra sesión. */
function stubAuthServer(
  user: { id: string; email: string; name: string | null } | null,
  syncChanges: unknown[] = [],
) {
  let current = user;
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push(`${init?.method ?? "GET"} ${url}`);
      if (url === "/api/auth/logout") current = null;
      if (url === "/api/coach") {
        const body = JSON.parse(String(init?.body)) as {
          kind: string;
          message?: string;
          sesiones?: { titulo: string; ejercicios: { id: string }[] }[];
        };
        if (body.kind === "plan") {
          const first = body.sesiones![0]!;
          return Response.json({
            proposal: {
              resumen: "Más series en el primer ejercicio.",
              cambios: [
                {
                  tipo: "series",
                  sesion: first.titulo,
                  alcance: "siempre",
                  ejercicio: first.ejercicios[0]!.id,
                  nuevoEjercicio: null,
                  series: 5,
                  motivo: "Volumen",
                },
              ],
            },
            remaining: 2,
          });
        }
        return body.kind === "review"
          ? Response.json({
              review: {
                titular: "Semana sólida",
                causa: "Tu banca sube.",
                cambios: ["Uno", "Dos", "Tres"],
              },
              remaining: 2,
            })
          : Response.json({ reply: `Coach: ${body.message}`, remaining: 1 });
      }
      if (url === "/api/nutrition") {
        return Response.json({ connected: false, goal: null, days: [], weights: [] });
      }
      if (url === "/api/sync") {
        const changes = syncChanges.splice(0);
        return Response.json({ epoch: "e1", cursor: changes.length, changes, more: false });
      }
      return new Response(JSON.stringify({ enabled: true, user: current }), {
        headers: { "content-type": "application/json" },
      });
    }),
  );
  return calls;
}

describe("Flujo de la app", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("un usuario nuevo empieza en el onboarding y al terminarlo recibe su plan", async () => {
    renderApp();
    expect(await screen.findByText(/PASO 1\/4/)).toBeInTheDocument();
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

  it("pulsar un ejercicio en Hoy abre el entreno en ese ejercicio", () => {
    seedProfile();
    renderApp();
    const items = screen.getAllByRole("button", { name: /^0\d/ });
    fireEvent.click(items[2]!);
    expect(screen.getByText(/Ejercicio 3 de/)).toBeInTheDocument();
  });

  it("salir del entreno no pierde las series ni el descanso, y se puede continuar", () => {
    seedProfile();
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: /Empezar entreno/ }));
    fireEvent.click(screen.getAllByRole("button", { name: "Hecho" })[0]!);
    expect(screen.getByText(/Descanso|descanso/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Salir del entreno" }));

    expect(screen.getByText("1/3 series hechas")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Continuar entreno/ }));
    expect(screen.getByRole("button", { name: /Serie completada/ })).toBeInTheDocument();
    expect(screen.getByText(/Descanso|descanso/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Terminar" }));
    fireEvent.click(screen.getByRole("button", { name: "Volver a Hoy" }));
    expect(screen.queryByRole("button", { name: /Continuar entreno/ })).not.toBeInTheDocument();
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

  it("abre Coach desde la alerta de estancamiento y responde al prompt pendiente", async () => {
    const calls = stubAuthServer({ id: "g1", email: "ana@example.com", name: "Ana" });
    seedProfile();
    seedLogs(weeklyBenchLogs([95, 97.5, 99.5, 101, 102.5, 102.5, 102, 102.5]));
    renderApp();
    fireEvent.click(nav().getByRole("button", { name: "Progreso" }));
    expect(screen.getByText("Banca estancada 3 semanas")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Ver por qué/ }));

    expect(screen.getByText("REVISIÓN SEMANAL")).toBeInTheDocument();
    const log = within(screen.getByRole("log"));
    expect(await log.findByText("Coach: ¿Por qué no subo en banca?")).toBeInTheDocument();
    expect(log.getByText("¿Por qué no subo en banca?")).toBeInTheDocument();
    expect(screen.getByText("Te queda 1 consulta esta semana")).toBeInTheDocument();
    expect(calls).toContain("POST /api/coach");
  });

  it("el coach pide la revisión semanal a la IA y la guarda", async () => {
    stubAuthServer({ id: "g1", email: "ana@example.com", name: "Ana" });
    seedProfile();
    renderApp();
    fireEvent.click(nav().getByRole("button", { name: "Coach" }));
    fireEvent.click(await screen.findByRole("button", { name: /Pedir revisión al coach/ }));
    expect(await screen.findByRole("heading", { name: "Semana sólida" })).toBeInTheDocument();
    expect(screen.getByText("Tres")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Nueva revisión con IA/ })).toBeInTheDocument();
  });

  it("Plan: la IA propone cambios, el motor los valida y se aplican al plan", async () => {
    stubAuthServer({ id: "g1", email: "ana@example.com", name: "Ana" });
    seedProfile();
    renderApp();
    fireEvent.click(nav().getByRole("button", { name: "Plan" }));
    fireEvent.click(await screen.findByRole("button", { name: /Hoy tengo 40 minutos/ }));
    expect(await screen.findByText("Más series en el primer ejercicio.")).toBeInTheDocument();
    expect(screen.getByText(/a 5 series/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
    expect(screen.getByText("Plan actualizado: 1 cambio.")).toBeInTheDocument();
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEYS.mesocycle)!) as {
      weeks: { sessions: { exercises: { sets: number }[] }[] }[];
    };
    expect(saved.weeks[0]!.sessions[0]!.exercises[0]!.sets).toBe(5);
  });

  it("sin sesión el coach invita a entrar", () => {
    seedProfile();
    renderApp();
    fireEvent.click(nav().getByRole("button", { name: "Coach" }));
    expect(screen.getByRole("button", { name: /Entrar para usar el coach/ })).toBeInTheDocument();
    expect(screen.queryByLabelText("Mensaje para el coach")).not.toBeInTheDocument();
  });

  it("Progreso muestra el veredicto con los datos de MacroQuest", () => {
    seedProfile({ macroQuestSync: true });
    seedLogs(weeklyBenchLogs([95, 97, 100, 103]));
    seedMacroQuest({}, { protein: 90 });
    renderApp();
    fireEvent.click(nav().getByRole("button", { name: "Progreso" }));
    const card = within(screen.getByRole("region", { name: "Algo está frenando tu progreso" }));
    expect(card.getByText(/Qué cambiar:/)).toBeInTheDocument();
    expect(card.getByText(/Sube la proteína/)).toBeInTheDocument();
  });

  it("Progreso sin MacroQuest invita a conectarlo", () => {
    seedProfile({ macroQuestSync: true });
    renderApp();
    fireEvent.click(nav().getByRole("button", { name: "Progreso" }));
    expect(screen.getByText(/Entra con tu cuenta de MacroQuest/)).toBeInTheDocument();
  });

  it("un usuario nuevo con login disponible ve primero la entrada con Google", async () => {
    stubAuthServer(null);
    renderApp();
    const link = await screen.findByRole("link", { name: /Entrar con Google/ });
    expect(link).toHaveAttribute("href", "/api/auth/login");
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Seguir sin cuenta" }));
    expect(screen.getByText(/PASO 1\/4/)).toBeInTheDocument();
    cleanup();
    renderApp(); // se recuerda en este dispositivo
    expect(await screen.findByText(/PASO 1\/4/)).toBeInTheDocument();
  });

  it("al entrar con una cuenta que ya tiene datos se salta el onboarding", async () => {
    const cloudProfile = { ...TEST_PROFILE, name: "Ana nube" };
    stubAuthServer({ id: "g1", email: "ana@example.com", name: "Ana" }, [
      {
        store: "profile",
        key: "me",
        updatedAt: "2026-11-01T00:00:00.000Z",
        deleted: false,
        data: JSON.stringify(cloudProfile),
      },
    ]);
    renderApp();
    expect(
      await screen.findByRole("navigation", { name: "Navegación principal" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/PASO 1\/4/)).not.toBeInTheDocument();
  });

  it("al entrar con una cuenta nueva sigue al onboarding", async () => {
    stubAuthServer({ id: "g2", email: "bea@example.com", name: "Bea" });
    renderApp();
    expect(await screen.findByText(/PASO 1\/4/)).toBeInTheDocument();
  });

  it("Perfil ofrece entrar con Google si el servidor tiene login", async () => {
    stubAuthServer(null);
    seedProfile();
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Abrir perfil" }));
    const link = await screen.findByRole("link", { name: /Entrar con Google/ });
    expect(link).toHaveAttribute("href", "/api/auth/login");
  });

  it("con sesión muestra el correo y permite cerrarla", async () => {
    const calls = stubAuthServer({ id: "g1", email: "ana@example.com", name: "Ana" });
    seedProfile();
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Abrir perfil" }));
    expect(await screen.findByText("ana@example.com")).toBeInTheDocument();
    expect(await screen.findByText(/Sincronizado hoy/)).toBeInTheDocument();
    expect(calls).toContain("POST /api/sync");
    fireEvent.click(screen.getByRole("button", { name: /Cerrar sesión/ }));
    expect(await screen.findByRole("link", { name: /Entrar con Google/ })).toBeInTheDocument();
    expect(calls).toContain("POST /api/auth/logout");
  });

  it("sin servidor de login la app sigue en local", () => {
    seedProfile();
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Abrir perfil" }));
    expect(screen.getByText(/Tus datos se guardan en este dispositivo/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Entrar con Google/ })).not.toBeInTheDocument();
  });

  it("al volver del login abre Perfil con el resultado y limpia la URL", async () => {
    stubAuthServer({ id: "g1", email: "ana@example.com", name: "Ana" });
    window.history.pushState(null, "", "/?login=ok");
    seedProfile();
    renderApp();
    expect(await screen.findByText(/Sesión iniciada/)).toBeInTheDocument();
    expect(window.location.search).toBe("");
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
