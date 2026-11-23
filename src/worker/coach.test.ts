// @vitest-environment node
import Anthropic from "@anthropic-ai/sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getPlatformProxy } from "wrangler";

import { sha256 } from "./auth";
import { handleCoach, weekKey, type CoachClient, type CoachDeps, type CoachEnv } from "./coach";
import { applyChanges, createSession, ensureSchema, upsertUser, type Database } from "./store";

const ORIGIN = "https://fuerza.test";
const NOW = Date.parse("2026-11-23T10:00:00.000Z");
let db: Database;
let dispose: () => Promise<void>;

beforeAll(async () => {
  const proxy = await getPlatformProxy<{ DB: Database }>({ persist: false });
  db = proxy.env.DB;
  dispose = proxy.dispose;
  await ensureSchema(db);
});
afterAll(() => dispose());

type Params = Anthropic.MessageCreateParamsNonStreaming;

/** Cliente falso: apunta las peticiones y responde lo que le digan (o lanza). */
function fakeClient(reply: (params: Params) => Partial<Anthropic.Message> | Error) {
  const calls: Params[] = [];
  const client = {
    messages: {
      create: async (params: Params) => {
        calls.push(params);
        const out = reply(params);
        if (out instanceof Error) throw out;
        return { stop_reason: "end_turn", content: [], ...out };
      },
    },
  } as unknown as CoachClient;
  return { client, calls };
}

const text = (t: string) =>
  ({ content: [{ type: "text", text: t, citations: null }] }) as Partial<Anthropic.Message>;
const REVIEW = {
  titular: "Banca al alza",
  causa: "Subes 2 kg en 2 semanas.",
  cambios: ["A", "B", "C", "D"],
};

const env = (patch: Partial<CoachEnv> = {}): CoachEnv => ({
  DB: db,
  GOOGLE_CLIENT_ID: "c",
  GOOGLE_CLIENT_SECRET: "s",
  ANTHROPIC_API_KEY: "clave-de-prueba",
  ...patch,
});
const deps = (client: CoachClient): CoachDeps => ({ now: () => NOW, createClient: () => client });

let n = 0;
async function user(email = `u${++n}@example.com`): Promise<string> {
  const id = `coach-${++n}`;
  await upsertUser(db, { id, email, name: null }, "2026-11-01T00:00:00.000Z");
  await createSession(
    db,
    id,
    await sha256(`tok-${id}`),
    "2026-11-01T00:00:00.000Z",
    "2099-01-01T00:00:00.000Z",
  );
  await applyChanges(db, id, [
    {
      store: "workouts",
      key: "w1",
      updatedAt: "2026-11-20T00:00:00.000Z",
      deleted: false,
      data: JSON.stringify({
        id: "w1",
        completedAt: "2026-11-20T18:00:00.000Z",
        title: "Torso A",
        exercises: [
          {
            exerciseId: "ex-banca-barra",
            plannedExerciseId: "ex-banca-barra",
            sets: [{ kg: 85, reps: 5, rir: 2, e1rm: 101.5, isPr: true }],
          },
        ],
      }),
    },
  ]);
  return `__Host-fq_session=tok-${id}`;
}

const post = (cookie: string, body: unknown, origin = ORIGIN) =>
  new Request(`${ORIGIN}/api/coach`, {
    method: "POST",
    headers: { cookie, origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });

describe("coach IA", () => {
  it("sin clave de Anthropic no está configurado", async () => {
    const { client } = fakeClient(() => text("{}"));
    const res = await handleCoach(
      post("", { kind: "review" }),
      { ...env(), ANTHROPIC_API_KEY: "" },
      deps(client),
    );
    expect(res.status).toBe(503);
  });

  it("exige sesión, mismo origen y una petición válida", async () => {
    const { client, calls } = fakeClient(() => text("{}"));
    expect((await handleCoach(post("", { kind: "review" }), env(), deps(client))).status).toBe(401);
    const cookie = await user();
    expect(
      (
        await handleCoach(
          post(cookie, { kind: "review" }, "https://malo.example"),
          env(),
          deps(client),
        )
      ).status,
    ).toBe(403);
    expect((await handleCoach(post(cookie, { kind: "otra" }), env(), deps(client))).status).toBe(
      400,
    );
    expect(
      (
        await handleCoach(
          post(cookie, { kind: "chat", message: "x".repeat(1001) }),
          env(),
          deps(client),
        )
      ).status,
    ).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it("la revisión pide JSON estructurado a Haiku con el contexto del atleta y cuenta la consulta", async () => {
    const { client, calls } = fakeClient(() => text(JSON.stringify(REVIEW)));
    const cookie = await user();
    const res = await handleCoach(post(cookie, { kind: "review" }), env(), deps(client));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      review: { ...REVIEW, cambios: ["A", "B", "C"] },
      remaining: 2,
    });

    const params = calls[0]!;
    expect(params.model).toBe("claude-haiku-5-5");
    expect(params.output_config?.format?.type).toBe("json_schema");
    const system = params.system as Anthropic.TextBlockParam[];
    expect(system[0]!.cache_control).toEqual({ type: "ephemeral" });
    expect(system[1]!.text).toContain("101.5 kg");
    expect(system[1]!.text).toContain('"macroquest":"sin conectar"');
  });

  it("el chat manda el historial empezando por el usuario y devuelve el texto", async () => {
    const { client, calls } = fakeClient(() => text("Sube la proteína."));
    const cookie = await user();
    const res = await handleCoach(
      post(cookie, {
        kind: "chat",
        message: "¿Por qué no subo?",
        history: [
          { role: "coach", text: "Hola, cazador" },
          { role: "user", text: "Hoy entreno" },
          { role: "coach", text: "Bien" },
        ],
      }),
      env(),
      deps(client),
    );
    expect(await res.json()).toEqual({ reply: "Sube la proteína.", remaining: 2 });
    expect(calls[0]!.messages.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
    expect(calls[0]!.output_config?.effort).toBe("low");
  });

  it("el ajuste de plan limita la IA al catálogo y a las sesiones, y descarta lo inválido", async () => {
    const proposal = {
      resumen: "Hoy, versión corta.",
      cambios: [
        {
          tipo: "quitar",
          sesion: "Torso A",
          alcance: "proxima",
          ejercicio: "ex-curl-barra",
          nuevoEjercicio: "",
          series: 0,
          motivo: "Tiempo",
        },
        {
          tipo: "sustituir",
          sesion: "Torso A",
          alcance: "siempre",
          ejercicio: "ex-banca-barra",
          nuevoEjercicio: "ex-inventado",
          series: 0,
          motivo: "x",
        },
        {
          tipo: "series",
          sesion: "Otra",
          alcance: "proxima",
          ejercicio: "ex-banca-barra",
          nuevoEjercicio: "",
          series: 2,
          motivo: "x",
        },
      ],
    };
    const { client, calls } = fakeClient(() => text(JSON.stringify(proposal)));
    const cookie = await user();
    const res = await handleCoach(
      post(cookie, {
        kind: "plan",
        peticion: "Hoy tengo 40 minutos",
        proximaSesion: "Torso A",
        sesiones: [
          {
            titulo: "Torso A",
            ejercicios: [
              { id: "ex-banca-barra", series: 3, reps: "5-7" },
              { id: "ex-curl-barra", series: 2, reps: "8-10" },
              { id: "ex-falso", series: 3, reps: "8" },
            ],
          },
        ],
      }),
      env(),
      deps(client),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      proposal: {
        cambios: {
          ejercicio: string | null;
          nuevoEjercicio: string | null;
          series: number | null;
        }[];
      };
      remaining: number;
    };
    expect(body.remaining).toBe(2);
    expect(body.proposal.cambios).toHaveLength(2); // la sesión «Otra» no existe
    expect(body.proposal.cambios[0]).toMatchObject({
      ejercicio: "ex-curl-barra",
      nuevoEjercicio: null,
      series: null,
    });
    expect(body.proposal.cambios[1]).toMatchObject({ nuevoEjercicio: null }); // id inventado → null

    const schema = calls[0]!.output_config!.format!.schema as {
      properties: {
        cambios: {
          items: { properties: { sesion: { enum: string[] }; nuevoEjercicio: { enum: string[] } } };
        };
      };
    };
    expect(schema.properties.cambios.items.properties.sesion.enum).toEqual(["Torso A"]);
    expect(schema.properties.cambios.items.properties.nuevoEjercicio.enum).toContain(
      "ex-press-maquina",
    );
    const prompt = String(calls[0]!.messages[0]!.content);
    expect(prompt).toContain("Hoy tengo 40 minutos");
    expect(prompt).not.toContain("ex-falso");
  });

  it("rechaza peticiones de plan mal formadas", async () => {
    const { client, calls } = fakeClient(() => text("{}"));
    const cookie = await user();
    expect(
      (
        await handleCoach(
          post(cookie, { kind: "plan", peticion: "", sesiones: [] }),
          env(),
          deps(client),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await handleCoach(
          post(cookie, {
            kind: "plan",
            peticion: "x".repeat(501),
            sesiones: [{ titulo: "A", ejercicios: [] }],
          }),
          env(),
          deps(client),
        )
      ).status,
    ).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it("limita a 3 consultas por semana salvo a los correos sin límite", async () => {
    const { client } = fakeClient(() => text("Ok"));
    const cookie = await user();
    for (let i = 0; i < 3; i++) {
      expect(
        (await handleCoach(post(cookie, { kind: "chat", message: "hola" }), env(), deps(client)))
          .status,
      ).toBe(200);
    }
    const blocked = await handleCoach(
      post(cookie, { kind: "chat", message: "hola" }),
      env(),
      deps(client),
    );
    expect(blocked.status).toBe(429);
    expect(await blocked.json()).toMatchObject({ remaining: 0 });

    const vip = await user("Jefe@Example.com");
    for (let i = 0; i < 4; i++) {
      const res = await handleCoach(
        post(vip, { kind: "chat", message: "hola" }),
        env({ COACH_UNLIMITED_EMAILS: "otro@x.com, jefe@example.com" }),
        deps(client),
      );
      expect(await res.json()).toMatchObject({ remaining: null });
    }
    expect(weekKey(NOW)).toBe("2026-11-23");
  });

  it("los fallos no gastan consultas y se traducen a mensajes claros", async () => {
    const cookie = await user();
    const refusal = fakeClient(() => ({ stop_reason: "refusal", content: [] }));
    expect(
      (
        await handleCoach(
          post(cookie, { kind: "chat", message: "hola" }),
          env(),
          deps(refusal.client),
        )
      ).status,
    ).toBe(422);
    const busy = fakeClient(
      () => new Anthropic.RateLimitError(429, undefined, "rate limited", new Headers()),
    );
    expect(
      (await handleCoach(post(cookie, { kind: "chat", message: "hola" }), env(), deps(busy.client)))
        .status,
    ).toBe(503);
    const ok = fakeClient(() => text("Ok"));
    expect(
      await (
        await handleCoach(post(cookie, { kind: "chat", message: "hola" }), env(), deps(ok.client))
      ).json(),
    ).toMatchObject({ remaining: 2 });
  });
});
