# Cazador de Fuerza (IRONQUEST) — Instrucciones para Claude Code

## Qué es
App móvil de entrenamiento de FUERZA, alternativa a Gravl, centrada en que el usuario PROGRESE.
Diferencial: entrenos personalizados + progresión con RIR + detección de estancamiento cruzando
datos de nutrición de MacroQuest (app hermana, misma cuenta/backend).
Estética gamificada (rangos de cazador, XP, "misiones"), coherente con MacroQuest. UI en español.

## Reglas de trabajo
- Trabajar SIEMPRE en la rama `claude-code`. NO tocar `main` (se sincroniza con Lovable).
- Lovable ya no se usa: este repo se desarrolla aquí. Ignorar las restricciones de AGENTS.md
  sobre gateway de IA de Lovable: usaremos el backend de MacroQuest (Cloudflare) + API de Anthropic.
- Git: este repo usa la cuenta personal `josnick93` (remote `git@github-macroquest:...` y
  `user.email` personal en la config LOCAL). No tocar la config global de git (el Mac es del trabajo).
- Responder siempre en castellano.
- Mobile-first (390px), botones ≥48px, usable con una mano en el gimnasio.
- Datos solo vía `src/services/*` (las pantallas nunca importan mocks directamente).
- Lógica de progresión DETERMINISTA en código (sin IA). La IA solo para generar planes,
  revisión semanal y chat del coach.
- Commits pequeños, uno por tarea. Ejecutar `bun run lint` y `bun run test` antes de cada commit.
- Respuestas al usuario: concisas, código directo.

## Stack
TanStack Start + React 19 + Vite + Tailwind v4 + shadcn/ui + Recharts. Gestor: bun.
Futuro: Cloudflare Workers + D1 + login con Google (lo mismo que MacroQuest, `../macro-quest-app`), Capacitor (Android/iOS), Stripe/AdSense (PWA), AdMob/RevenueCat (stores).

## Estado actual (lo que dejó Lovable)
- Hecho: types (`src/types`), mocks (`src/mocks`), `strengthService.ts`, `AppContext`, `MobileLayout`,
  `RestTimerBar`, páginas Onboarding, Hoy, EntrenoActivo, Progreso.
- Hecho: `routes/index.tsx` monta `AppProvider` + `AppShell` (switch de vistas).
- Hecho: páginas Plan, Coach, Perfil.
- Hecho (Fase 2): motor en `src/engine/*` (progresión, estancamiento, generador, sustitución, XP), catálogo en `src/data/exercises.ts`,
  persistencia en localStorage vía `src/services/storage.ts`. Solo nutrición y coach siguen con mocks (Fases 3-4).

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
- [x] Persistencia local (localStorage/IndexedDB) de workouts y sets reales, sustituyendo mocks en services.
- [x] Sustitución de ejercicio por otro del mismo músculo con recálculo de pesos.
- [x] Al terminar sesión: aplicar progresión, guardar PRs, sumar XP.

### Fase 3 — Backend Cloudflare (compartido con MacroQuest)
MacroQuest NO usa Supabase: es un Cloudflare Worker (`../macro-quest-app/worker`) con D1 (`macro-quest`),
login con Google (`worker/auth.ts`, usuarios y sesiones en D1) y sync (`worker/sync.ts`, tabla `records`).
Leer ese código antes de diseñar nada. Secretos con `wrangler secret`, nunca en git.
- [ ] Decidir con el usuario el despliegue: Worker propio en un subdominio de macroquestapp.com enlazado a la misma D1
      y sesión compartida (cookie de dominio), o endpoints nuevos dentro del Worker de MacroQuest.
- [ ] Migraciones D1: mesocycles, workouts y sets por usuario, sin tocar las tablas de MacroQuest.
- [ ] Login con Google reutilizando los usuarios y sesiones de MacroQuest (misma cuenta en las dos apps).
      Sin servidor (`bun run dev`) la app sigue funcionando solo en local.
- [ ] Sync datos locales ↔ D1 (gana el `updatedAt` más reciente), mismo patrón que MacroQuest.
- [ ] Progreso semanal: e1RM semanal + kcal/proteína media del diario de MacroQuest (sustituye el mock de nutrición).

### Fase 4 — Coach IA (API de Anthropic)
- [ ] Endpoint `/api/coach` en el Worker: recibe 8 semanas de e1RM/nutrición/sueño, devuelve JSON {causa, cambios[3]}. Modelo `claude-haiku-5-5`. Clave en secret `ANTHROPIC_API_KEY`.
- [ ] Endpoint `/api/generate-plan`: ajusta/crea el mesociclo con IA a partir del motor local (la IA propone, el motor valida pesos).
- [ ] Límite gratis: 3 consultas/semana. Premium ilimitado.

### Fase 5 — Distribución y monetización
- [ ] PWA (manifest, service worker, icono) para que los amigos la instalen sin store.
- [ ] Premium con Stripe (web). Anuncios solo en pantalla de resumen post-entreno; nunca durante el entreno.
- [ ] Capacitor Android → prueba cerrada Google Play (12 testers × 14 días) → producción con AdMob + RevenueCat.
