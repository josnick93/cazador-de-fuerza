/**
 * Coach IA (POST /api/coach) con la API de Claude: revisión semanal (JSON con causa y 3 cambios) y chat corto.
 * El contexto lo monta el servidor desde D1 (entrenos sincronizados + datos de MacroQuest), no lo envía la app.
 * La progresión de cargas sigue siendo determinista en la app: la IA solo explica y propone ajustes.
 * Límite gratuito: COACH_WEEKLY_LIMIT consultas por semana (por defecto 3); los correos de
 * COACH_UNLIMITED_EMAILS (separados por comas) no tienen límite. Clave en el secret ANTHROPIC_API_KEY.
 */
import Anthropic from "@anthropic-ai/sdk";
import { startOfWeek, format } from "date-fns";

import { weeklyBestE1rm } from "@/engine/history";
import { computeVerdict, fallbackMacroGoal, nutritionWeeks, strengthTrend } from "@/engine/verdict";
import {
  COACH_MAX_HISTORY,
  COACH_MAX_MESSAGE_CHARS,
  type CoachRequest,
  type CoachReview,
  type CoachTurn,
} from "@/lib/coachApi";
import { NUTRITION_DAYS } from "@/lib/nutritionApi";
import type { Goal, UserProfile, WorkoutLog } from "@/types";
import { currentUser, enabled, type AuthEnv } from "./auth";
import { json } from "./http";
import { readNutrition } from "./nutrition";
import { addCoachUsage, coachUsage, type Database } from "./store";

export interface CoachEnv extends AuthEnv {
  ANTHROPIC_API_KEY?: string;
  COACH_WEEKLY_LIMIT?: string;
  COACH_UNLIMITED_EMAILS?: string;
}

/** Lo mínimo del cliente de Anthropic que se usa (los tests lo sustituyen). */
export type CoachClient = Pick<Anthropic, "messages">;

export interface CoachDeps {
  now: () => number;
  createClient: (apiKey: string) => CoachClient;
}

const DEFAULT_DEPS: CoachDeps = {
  now: () => Date.now(),
  createClient: (apiKey) => new Anthropic({ apiKey, maxRetries: 1 }),
};

const MODEL = "claude-haiku-5-5";
const DEFAULT_LIMIT = 3;

/** Básicos que se resumen para el coach (ids del catálogo). */
const LIFTS = [
  { id: "ex-banca-barra", label: "Press banca" },
  { id: "ex-sentadilla", label: "Sentadilla" },
  { id: "ex-peso-muerto", label: "Peso muerto" },
  { id: "ex-press-militar", label: "Press militar" },
  { id: "ex-dominadas", label: "Dominadas lastradas" },
];

const GOAL_LABEL: Record<Goal, string> = {
  fuerza: "fuerza",
  hipertrofia: "hipertrofia",
  powerlifting: "powerlifting",
  recomposicion: "recomposición",
};

/** Instrucciones fijas (van primero y con cache_control; los datos del atleta, detrás). */
const SYSTEM_PROMPT = `Eres el Coach del Sistema de IRONQUEST, una app de entrenamiento de fuerza con estética de videojuego (rangos de cazador, misiones, XP).

Tu trabajo es ayudar al atleta a progresar con lo que muestran sus datos: entrenos (e1RM = 1RM estimado en kg), sesiones por semana y, si la tiene conectada, su nutrición y su peso de MacroQuest.

Cómo responder:
- Siempre en castellano de España, directo y motivador, sin relleno ni saludos largos.
- Usa solo los datos que recibes. Si falta un dato para opinar (por ejemplo, no hay nutrición o hay pocas semanas), dilo en vez de inventar cifras.
- La app ya ajusta las cargas con reglas fijas (doble progresión con RIR). No propongas pesos concretos para cada serie: céntrate en volumen, frecuencia, descanso, técnica, sueño, calorías, proteína y constancia.
- Cuando des cifras de nutrición, básate en su peso y en su objetivo de MacroQuest si existe.
- No des consejos médicos. Si menciona dolor o lesión, recomienda parar ese ejercicio y consultar a un profesional.`;

const REVIEW_SCHEMA = {
  type: "object",
  properties: {
    titular: {
      type: "string",
      description: "Resumen de la semana en una frase corta (máx. 80 caracteres).",
    },
    causa: {
      type: "string",
      description:
        "La causa principal de cómo va el progreso, con los datos que la apoyan (2-3 frases).",
    },
    cambios: {
      type: "array",
      items: { type: "string" },
      description:
        "Exactamente 3 cambios concretos y accionables para esta semana, una frase cada uno.",
    },
  },
  required: ["titular", "causa", "cambios"],
  additionalProperties: false,
} as const;

export function weekKey(nowMs: number): string {
  return format(startOfWeek(new Date(nowMs), { weekStartsOn: 1 }), "yyyy-MM-dd");
}

function parseRequest(raw: unknown): CoachRequest | null {
  if (typeof raw !== "object" || raw === null) return null;
  const body = raw as { kind?: unknown; message?: unknown; history?: unknown };
  if (body.kind === "review") return { kind: "review" };
  if (body.kind !== "chat") return null;
  if (typeof body.message !== "string") return null;
  const message = body.message.trim();
  if (!message || message.length > COACH_MAX_MESSAGE_CHARS) return null;
  const history: CoachTurn[] = [];
  if (Array.isArray(body.history)) {
    for (const turn of body.history.slice(-COACH_MAX_HISTORY)) {
      const t = turn as { role?: unknown; text?: unknown };
      if (
        (t.role === "user" || t.role === "coach") &&
        typeof t.text === "string" &&
        t.text.trim()
      ) {
        history.push({ role: t.role, text: t.text.slice(0, 2000) });
      }
    }
  }
  return { kind: "chat", message, history };
}

/** Resumen compacto de los datos del atleta para el modelo. */
export async function buildCoachContext(
  db: Database,
  userId: string,
  nowMs: number,
): Promise<string> {
  const since = new Date(nowMs - NUTRITION_DAYS * 86_400_000).toISOString();
  const { results } = await db
    .prepare(
      `SELECT store, data FROM fuerza_records
       WHERE user_id = ?1 AND deleted = 0
         AND ((store = 'workouts' AND json_extract(data, '$.completedAt') >= ?2) OR store = 'profile')`,
    )
    .bind(userId, since)
    .all<{ store: string; data: string }>();

  let profile: Partial<UserProfile> = {};
  const logs: WorkoutLog[] = [];
  for (const row of results) {
    try {
      const value = JSON.parse(row.data) as unknown;
      if (row.store === "profile") profile = value as Partial<UserProfile>;
      else logs.push(value as WorkoutLog);
    } catch {
      // Registro dañado: se ignora.
    }
  }
  logs.sort((a, b) => a.completedAt.localeCompare(b.completedAt));

  const today = new Date(nowMs);
  const nutrition = await readNutrition(db, userId, since.slice(0, 10));
  const goal: Goal = profile.goal ?? "fuerza";
  const sessionsByWeek = new Map<string, number>();
  for (const log of logs) {
    const key = format(startOfWeek(new Date(log.completedAt), { weekStartsOn: 1 }), "dd/MM");
    sessionsByWeek.set(key, (sessionsByWeek.get(key) ?? 0) + 1);
  }

  const context = {
    hoy: format(today, "yyyy-MM-dd"),
    perfil: {
      objetivo: GOAL_LABEL[goal],
      diasPorSemana: profile.daysPerWeek ?? null,
      minutosPorSesion: profile.sessionMinutes ?? null,
      equipamiento: profile.equipment ?? null,
      pesoKg: profile.bodyweightKg ?? null,
      nivel: profile.level ?? null,
    },
    sesionesPorSemana: Object.fromEntries(sessionsByWeek),
    e1rmSemanal: Object.fromEntries(
      LIFTS.flatMap((l) => {
        const points = weeklyBestE1rm(logs, [l.id], 8).map((p) => `${p.week}: ${p.e1rmKg} kg`);
        return points.length > 0 ? [[l.label, points] as const] : [];
      }),
    ),
    macroquest: nutrition.connected
      ? {
          objetivo: nutrition.goal,
          ritmoKgSemana: nutrition.rateKgWeek,
          proteinaObjetivoGPorKg: nutrition.proteinPerKg,
          semanas: nutritionWeeks(nutrition, today, 8)
            .filter((w) => w.daysLogged > 0 || w.weightKg !== null)
            .map((w) => ({
              semana: w.label,
              diasRegistrados: w.daysLogged,
              kcalMedia: w.kcal,
              proteinaMedia: w.protein,
              pesoMedio: w.weightKg,
            })),
        }
      : "sin conectar",
    veredictoDeLaApp: nutrition.connected
      ? computeVerdict({
          goal: nutrition.goal ?? fallbackMacroGoal(goal),
          trainingGoal: goal,
          nutrition,
          strength: strengthTrend(
            logs,
            LIFTS.map((l) => l.id),
            today,
          ),
          bodyweightKg: profile.bodyweightKg ?? nutrition.weightKg ?? 75,
          today,
        }).checks.map((c) => `${c.label} (${c.status}): ${c.detail}`)
      : null,
  };
  return JSON.stringify(context);
}

function systemBlocks(context: string): Anthropic.TextBlockParam[] {
  return [
    { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
    { type: "text", text: `Datos actuales del atleta (JSON):\n${context}` },
  ];
}

function textOf(message: Anthropic.Message): string {
  return message.content
    .flatMap((block) => (block.type === "text" ? [block.text] : []))
    .join("")
    .trim();
}

class CoachRefusal extends Error {}

async function runReview(client: CoachClient, context: string): Promise<CoachReview> {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    system: systemBlocks(context),
    output_config: { effort: "medium", format: { type: "json_schema", schema: REVIEW_SCHEMA } },
    messages: [
      {
        role: "user",
        content:
          "Haz mi revisión semanal: un titular, la causa principal de cómo voy (o de por qué no progreso) y 3 cambios concretos para esta semana.",
      },
    ],
  });
  if (message.stop_reason === "refusal") throw new CoachRefusal();
  const parsed = JSON.parse(textOf(message)) as Partial<CoachReview>;
  const cambios = Array.isArray(parsed.cambios)
    ? parsed.cambios
        .filter((c): c is string => typeof c === "string" && c.trim() !== "")
        .slice(0, 3)
    : [];
  if (
    typeof parsed.titular !== "string" ||
    typeof parsed.causa !== "string" ||
    cambios.length === 0
  ) {
    throw new Error("Revisión con formato inesperado");
  }
  return { titular: parsed.titular, causa: parsed.causa, cambios };
}

async function runChat(
  client: CoachClient,
  context: string,
  request: Extract<CoachRequest, { kind: "chat" }>,
): Promise<string> {
  const history: Anthropic.MessageParam[] = request.history.map((t) => ({
    role: t.role === "coach" ? "assistant" : "user",
    content: t.text,
  }));
  // La conversación tiene que empezar por el usuario.
  while (history[0]?.role === "assistant") history.shift();
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    system: [
      ...systemBlocks(context),
      { type: "text", text: "En el chat, responde en 2-5 frases (unas 120 palabras como mucho)." },
    ],
    output_config: { effort: "low" },
    messages: [...history, { role: "user", content: request.message }],
  });
  if (message.stop_reason === "refusal") throw new CoachRefusal();
  const reply = textOf(message);
  if (!reply) throw new Error("Respuesta vacía");
  return reply;
}

export async function handleCoach(
  request: Request,
  env: CoachEnv,
  deps: CoachDeps = DEFAULT_DEPS,
): Promise<Response> {
  // Se leen antes de `enabled`, que estrecha el tipo a AuthEnv.
  const {
    ANTHROPIC_API_KEY: apiKey,
    COACH_UNLIMITED_EMAILS: unlimitedList,
    COACH_WEEKLY_LIMIT: limitRaw,
  } = env;
  if (!enabled(env) || !apiKey) return json({ error: "El coach no está configurado" }, 503);
  if (request.method !== "POST") return json({ error: "Método no permitido" }, 405);
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return json({ error: "Origen no permitido" }, 403);
  }
  const nowMs = deps.now();
  const session = await currentUser(request, env, nowMs);
  if (!session) return json({ error: "Sesión no válida" }, 401);

  let body: CoachRequest | null = null;
  try {
    body = parseRequest(await request.json());
  } catch {
    body = null;
  }
  if (!body) return json({ error: "Petición no válida" }, 400);

  const unlimited = (unlimitedList ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
    .includes(session.user.email.toLowerCase());
  const limit = Math.max(0, Number(limitRaw ?? DEFAULT_LIMIT) || DEFAULT_LIMIT);
  const week = weekKey(nowMs);
  const used = unlimited ? 0 : await coachUsage(env.DB, session.user.id, week);
  if (!unlimited && used >= limit) {
    return json(
      { error: `Has usado tus ${limit} consultas de esta semana. Vuelve el lunes.`, remaining: 0 },
      429,
    );
  }

  const context = await buildCoachContext(env.DB, session.user.id, nowMs);
  const client = deps.createClient(apiKey);
  try {
    const result =
      body.kind === "review"
        ? { review: await runReview(client, context) }
        : { reply: await runChat(client, context, body) };
    if (!unlimited) await addCoachUsage(env.DB, session.user.id, week);
    return json({ ...result, remaining: unlimited ? null : limit - used - 1 });
  } catch (e) {
    if (e instanceof CoachRefusal)
      return json({ error: "El coach no puede responder a eso." }, 422);
    if (e instanceof Anthropic.RateLimitError || e instanceof Anthropic.InternalServerError) {
      return json({ error: "El coach está saturado. Prueba en un minuto." }, 503);
    }
    if (
      e instanceof Anthropic.AuthenticationError ||
      e instanceof Anthropic.PermissionDeniedError
    ) {
      console.error("coach: clave de Anthropic no válida");
      return json({ error: "El coach no está bien configurado" }, 503);
    }
    if (e instanceof Anthropic.APIError) {
      console.error("coach: error de la API", e.status);
      return json({ error: "El coach no ha podido responder. Inténtalo de nuevo." }, 502);
    }
    if (e instanceof Anthropic.APIConnectionError) {
      return json({ error: "No se pudo contactar con el coach. Inténtalo de nuevo." }, 502);
    }
    throw e;
  }
}
