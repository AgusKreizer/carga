# Carga: coach de hipertrofia (app personal de Agus)

PWA móvil para llevar el plan de entrenamiento, registrar series y que el motor de coach
decida la progresión con reglas explicables. Análisis y decisiones de diseño en `docs/01-analisis.md`.

## Stack
- Vite + React 19 + TypeScript. Tailwind v4 (tokens en `src/index.css`). Recharts (lazy). Vitest.
- **Local-first**: Dexie (IndexedDB, base `carga`) es la fuente de verdad. Backup opcional a Supabase
  (snapshot JSON por usuario en `user_data`, SQL en `docs/supabase.sql`). Sin sync bidireccional.
- PWA con `vite-plugin-pwa`. Sin router: 3 pestañas por estado en `App.tsx`.

## Estructura
- `src/domain/` tipos, catálogo de ejercicios, plan de Agus y **motor de coach** (`coach/`): puro, sin IO, con tests.
- `src/data/` Dexie (`db.ts`), operaciones (`repo.ts`), seed, export/restore, backup Supabase, `demo.ts` (historial ficticio para probar).
- `src/ui/` vistas: `hoy/` (sesión), `plan/` (editor), `progreso/`, `ajustes/`; componentes en `componentes/`.

## Reglas del proyecto
1. **Nada se borra**: todo registro tiene `activo` y se desactiva con flag.
2. **El RIR real nunca se prellena.** Carga y reps se prellenan como objetivo; objetivo y resultado se guardan por separado en `SerieLog`.
3. **El coach sugiere, no aplica.** Los `CoachEvento` pendientes los acepta o ignora el usuario.
4. La sesión guarda un `snapshot` del día del plan al iniciar; editar el plan no altera el historial.
5. Cambios de esquema en Dexie: nueva `version()` con migración; no romper datos existentes.
6. Interfaz y código en español. Sin emojis en la UI.

## Comandos
- `npm run dev` (puerto libre; el launch.json usa 5178), `npm run build`, `npx vitest run`, `npx tsc -b`.
- Historial de prueba desde la consola del navegador: `const d = await import('/src/data/demo.ts'); await d.generarHistorialDemo(3)`.
