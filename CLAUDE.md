# Cazador de Fuerza (IRONQUEST) — Instrucciones para Claude Code

## Qué es
App móvil de entrenamiento de FUERZA, alternativa a Gravl, centrada en que el usuario PROGRESE.
Diferencial: entrenos personalizados + progresión con RIR + detección de estancamiento cruzando
datos de nutrición de MacroQuest (app hermana, misma cuenta/backend).
Estética gamificada (rangos de cazador, XP, "misiones"), coherente con MacroQuest. UI en español.

## Reglas de trabajo
- Trabajar SIEMPRE en la rama `claude-code`. NO tocar `main` (se sincroniza con Lovable).
- Lovable ya no se usa: este repo se desarrolla aquí. Ignorar las restricciones de AGENTS.md
  sobre gateway de IA de Lovable: usaremos Supabase propio + API de Anthropic.
- Mobile-first (390px), botones ≥48px, usable con una mano en el gimnasio.
- Datos solo vía `src/services/*` (las pantallas nunca importan mocks directamente).
- Lógica de progresión DETERMINISTA en código (sin IA). La IA solo para generar planes,
  revisión semanal y chat del coach.
- Commits pequeños, uno por tarea. Ejecutar `bun run lint` y `bun run test` antes de cada commit.
- Respuestas al usuario: concisas, código directo.

## Stack
TanStack Start + React 19 + Vite + Tailwind v4 + shadcn/ui + Recharts. Gestor: bun.
Futuro: Supabase (auth + Postgres + Edge Functions), Capacitor (Android/iOS), Stripe/AdSense (PWA), AdMob/RevenueCat (stores).

## Estado actual (lo que dejó Lovable)
- Hecho: types (`src/types`), mocks (`src/mocks`), `strengthService.ts`, `AppContext`, `MobileLayout`,
  `RestTimerBar`, páginas Onboarding, Hoy, EntrenoActivo, Progreso.
- Hecho: `routes/index.tsx` monta `AppProvider` + `AppShell` (switch de vistas).
- Hecho: páginas Plan, Coach, Perfil.

## Roadmap (hacer en orden, marcar [x] al terminar)

### Fase 1 — App navegable (diseño completo con mocks)
- [x] Sustituir placeholder de `routes/index.tsx` por `AppProvider` + `MobileLayout` + switch de vistas (`view` del contexto). Mostrar Onboarding si `!profile.onboardingCompleted`.
- [x] `PlanPage`: timeline del mesociclo (Acumulación → Intensificación → Descarga), semana actual destacada, días con sesión y estado.
- [x] `CoachPage`: tarjeta "Revisión semanal" + chat con sugerencias rápidas ("¿Por qué no subo en banca?", "Ajusta mi semana", "Hoy tengo poco tiempo"). Respeta `coachPendingPrompt`.
- [x] `PerfilPage`: datos, objetivo, unidades kg/lb, toggle "Sincronizar con MacroQuest", tarjeta Premium, botón rehacer onboarding.
- [x] Revisar flujo completo Hoy → Entreno activo → Resumen → Progreso. Test de routing actualizado.

### Fase 2 — Entrenos personalizados (motor local)
- [x] `src/engine/progression.ts`: doble progresión con RIR
      (reps ≥ máx y RIR ≥ objetivo → +2,5 kg y reps mínimas; RIR ≤ objetivo-2 → -2,5 kg; si no +1 rep). Tests.
- [x] `src/engine/plateau.ts`: estancamiento si el mejor e1RM de las 3 últimas semanas no supera +1% el máximo previo. Tests.
- [x] `src/engine/generator.ts`: genera mesociclo (4-6 semanas) según objetivo, días/semana, duración, equipamiento y 1RM.
      Plantillas: Full body (2-3 días), Torso/Pierna (4), PPL (5-6), Powerlifting (básicos + %1RM). Descarga automática última semana.
- [ ] Persistencia local (localStorage/IndexedDB) de workouts y sets reales, sustituyendo mocks en services.
- [ ] Sustitución de ejercicio por otro del mismo músculo con recálculo de pesos.
- [ ] Al terminar sesión: aplicar progresión, guardar PRs, sumar XP.

### Fase 3 — Backend Supabase (compartido con MacroQuest)
- [ ] Preguntar al usuario por el proyecto Supabase de MacroQuest (URL + anon key en `.env`, nunca en git).
- [ ] Migraciones en `supabase/migrations`: profiles, exercises, workouts, sets (e1rm generado), RLS por usuario. Reusar tabla de comidas de MacroQuest.
- [ ] Vista `weekly_progress` (e1RM semanal + kcal/proteína media + sueño).
- [ ] Auth (email + Google) y sync de datos locales a Supabase.

### Fase 4 — Coach IA (API de Anthropic)
- [ ] Edge Function `coach`: recibe 8 semanas de e1RM/nutrición/sueño, devuelve JSON {causa, cambios[3]}. Modelo `claude-haiku-5-5`. Clave en secret `ANTHROPIC_API_KEY`.
- [ ] Edge Function `generate-plan`: ajusta/crea el mesociclo con IA a partir del motor local (la IA propone, el motor valida pesos).
- [ ] Límite gratis: 3 consultas/semana. Premium ilimitado.

### Fase 5 — Distribución y monetización
- [ ] PWA (manifest, service worker, icono) para que los amigos la instalen sin store.
- [ ] Premium con Stripe (web). Anuncios solo en pantalla de resumen post-entreno; nunca durante el entreno.
- [ ] Capacitor Android → prueba cerrada Google Play (12 testers × 14 días) → producción con AdMob + RevenueCat.
