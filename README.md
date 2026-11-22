# Cazador de Fuerza

Crea una app móvil (mobile-first, 390px, dark mode) de entrenamiento de FUERZA llamada como sea , quiero que sea en plan tematica solo leveling debifo a que es hacer misiones para volverme mejor y mas fuerte .
Toda la UI en español.

REFERENCIAS VISUALES:
- Capturas de MacroQuest: usa SU estilo visual (colores, tipografía, bordes, botones). Esta app es de la misma familia.
- Capturas de Gravl: solo como referencia FUNCIONAL de flujo. NO copies su diseño, colores ni layout.

OBJETIVO DE LA APP: que el usuario vea si progresa en fuerza y, si no, por qué.

NAVEGACIÓN: bottom tab bar con 4 tabs: Hoy, Progreso, Plan, Coach. Perfil desde avatar arriba a la derecha.

PANTALLAS:

1. Onboarding (4 pasos, barra de progreso):
   - Objetivo: Fuerza / Hipertrofia / Powerlifting / Recomposición
   - Días por semana (2-6) y duración de sesión
   - Equipamiento: gimnasio completo / mancuernas / casa
   - Peso corporal y 1RM aproximado de banca, sentadilla y peso muerto (opcional, "no lo sé")

2. Hoy:
   - Tarjeta del entreno del día: nombre, duración estimada, músculos
   - Lista de ejercicios con objetivo por serie: "3 x 6-8 @ RIR 2 · 80 kg"
   - Botón grande "Empezar entreno"

3. Entreno activo (pantalla clave, usable con una mano):
   - Ejercicio actual arriba, con la última vez que lo hiciste ("Última vez: 77,5 kg x 8 @RIR 1")
   - Filas de series: kg (stepper ±2,5), reps (stepper ±1), selector RIR 0-1-2-3-4+ en chips
   - Botón grande "Hecho" por serie → lanza temporizador de descanso (barra flotante abajo, +30s / saltar)
   - Si bate su récord de e1RM: badge "🏆 Nuevo PR"
   - Botón cambiar ejercicio (mismo músculo)
   - Al terminar: resumen (volumen total, PRs, duración)

4. Progreso:
   - Selector de ejercicio principal (Banca, Sentadilla, Peso muerto, Press militar, Dominadas)
   - Gráfica de línea del e1RM por semana (e1RM = kg × (1 + (reps + RIR) / 30))
   - Superpuesta en la misma gráfica (eje secundario, línea fina): proteína media diaria y kcal media
   - Tarjeta de alerta si hay estancamiento (e1RM sin mejorar en 3 semanas): "Banca estancada 3 semanas" + botón "Ver por qué"
   - Lista de PRs recientes

5. Plan:
   - Mesociclo de 4-6 semanas en timeline: Acumulación → Intensificación → Descarga
   - Semana actual destacada; cada día muestra su sesión

6. Coach:
   - Tarjeta "Revisión semanal" arriba (causa + 3 cambios concretos)
   - Chat debajo con sugerencias rápidas: "¿Por qué no subo en banca?", "Ajusta mi semana", "Hoy tengo poco tiempo"

7. Perfil:
   - Datos, objetivo, unidades kg/lb
   - Conexión con MacroQuest (toggle "Sincronizar nutrición")
   - Premium (quitar anuncios + coach IA ilimitado)

DATOS: de momento usa datos mock realistas de 8 semanas de historial, con la banca estancada las últimas 3 semanas y proteína baja esas semanas, para que se vea la alerta.

UX: botones mínimo 48px, números grandes, nada de anuncios durante el entreno activo.


IMPORTANTE: esto es solo el diseño inicial. NO conectes Supabase ni ningún backend.

- Todos los datos mock en /src/mocks/ (un archivo por entidad: workouts.ts, sets.ts, exercises.ts, nutrition.ts)

- Tipos TypeScript en /src/types/

- Accede a los datos solo a través de funciones en /src/services/ (ej: getTodayWorkout(), getE1rmHistory(liftId)) que de momento devuelven los mocks

- Componentes reutilizables en /src/components/, pantallas en /src/pages/


si podemos crear un repo de github seria genial

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f806bf97-a922-4138-af98-33076794878a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
