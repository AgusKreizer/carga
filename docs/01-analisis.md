# Análisis de producto: app de hipertrofia

Fecha: 2026-10-12. Autor: Claude (coach + UX + producto), a revisar por Astra y Agus.

## 1. Qué problema resuelve

Agus (26, 76 kg, 2 años entrenando, intermedio) estuvo 6 meses estancado por una sola causa: **no tenía plan ni registro**. Las apps que existen registran bien pero no deciden nada: muestran números y dejan que el usuario interprete. Un coach humano hace lo contrario: mira el registro y dice "subí 2,5 kg", "sumá una serie a laterales", "esta semana descargá".

La app es **un coach de hipertrofia basado en evidencia que decide por vos**, con el registro como medio y no como fin. El usuario abre la app en el gimnasio y la app ya sabe qué toca hoy, qué carga va, cuántas reps busca y qué hacer si no las logra.

## 2. Usuario

**Hoy**: Agus. Celular en el gimnasio, 60 min máximo, prefiere máquinas, le gustan 8–12 reps, registra "más o menos", odia perder tiempo. Entiende de entrenamiento (sabe qué es RIR, MEV, frecuencia). Quiere lo óptimo sin pensar en cada sesión.

**Mañana** (producto): el intermedio natural hispanohablante, 22–40, 1–5 años de gimnasio, que ya consume contenido de Israetel/Nippard/Helms, está estancado y no quiere pagar un coach online (USD 100–300/mes). Hoy ese segmento usa Hevy o Strong (registro puro) o la app de RP (USD 35/mes, inglés, lógica opaca). No hay un producto en español que combine registro excelente + motor de decisiones explicable.

## 3. Competencia y hueco

| App | Fuerte | Débil para nuestro usuario |
|---|---|---|
| Hevy | Registro rápido, social, gratis | Cero lógica de coach. No decide nada |
| Strong | Registro limpio | Idem; sin plan |
| RP Hypertrophy | Autoregulación real, marca fuerte | USD 35/mes, inglés, caja negra, UX densa, no deja editar libremente |
| Alpha Progression | Progresión automática | Alemán/inglés, UX fría, poca explicación |
| JuggernautAI | Programación seria | Fuerza, no hipertrofia; caro |
| Boostcamp | Programas gratis | Programas fijos, no adaptativos |

**Hueco**: autoregulación tipo RP + registro tipo Hevy + explicación de cada decisión ("por qué") + español + plan editable sin romper la lógica. Nadie tiene los cuatro.

## 4. Principio de diseño rector

**Una decisión por pantalla, cero pensamiento en el gimnasio.** Todo lo que requiera pensar (editar plan, leer estadísticas, ajustar volumen) vive fuera de la sesión. Dentro de la sesión solo hay: carga sugerida, reps objetivo, RIR, botón de registrar, timer. El usuario con el celu en una mano, sudado, entre series, no lee: toca.

Derivados:
- **Registrar una serie: 1 toque** si hiciste lo sugerido. 3 toques si cambiaste algo. Nunca teclado salvo que lo pidas.
- **Prellenado inteligente**: la carga y reps de la serie vienen de la última sesión + regla de progresión. Si la semana pasada hiciste 80×10,10,9 y el objetivo es 8–12 con RIR 1, hoy la app propone 80×11.
- **Timer automático** al cerrar la serie, con el descanso del ejercicio. Vibración al terminar. Siguiente serie ya cargada.
- **Explicabilidad**: cada sugerencia tiene un "¿por qué?" de una línea. "Llegaste a 12 en las 4 series → subí 5 kg". Esto es lo que RP no da y lo que genera confianza.
- **Modo gimnasio**: tema oscuro puro (AMOLED), tipografía grande, targets de 56 px, sin hover, sin scroll horizontal, funciona sin señal (sincroniza después).
- **Nada se borra**: todo se desactiva con flag. Historial intocable.

## 5. Arquitectura de información

Cinco secciones, barra inferior:

1. **Hoy** — la sesión que toca. Si no toca nada, muestra descanso + próxima sesión + cosas pendientes (peso corporal, fotos). Durante la sesión: lista de ejercicios como tarjetas expandibles, la activa ocupa la pantalla.
2. **Plan** — el programa activo: bloques, semanas, días, ejercicios. Acá se edita todo: cambiar ejercicio, series, rango, RIR, descanso, orden, agregar/quitar días. Muestra volumen semanal por músculo (fraccional) contra objetivos y avisa si una edición rompe algo ("quedaste en 4 series de isquios, debajo del mínimo").
3. **Progreso** — por ejercicio (carga, e1RM, reps, volumen), por músculo (series semanales vs objetivo), de sesión (adherencia, duración, tonelaje) y del bloque (qué subió, qué se clavó).
4. **Cuerpo** — peso diario con media móvil semanal, cintura/brazo/muslo cada 4 semanas, fotos con comparador lado a lado, nutrición básica (proteína y calorías si quiere).
5. **Ajustes** — perfil, equipo del gimnasio, unidades, exportar datos, cuenta.

Fuera de la barra, accesible desde Hoy: **Coach** (los avisos y decisiones de la semana: "subí carga en banca", "deload recomendado", "isquios 3 sesiones sin progreso: +1 serie").

## 6. Pantallas clave

### 6.1 Hoy / Sesión
- Cabecera: nombre del día (Torso A), semana 3/6, tiempo transcurrido, series hechas/total.
- Tarjeta de ejercicio activo: nombre, músculos, nota técnica corta, última sesión (80×10,10,9 @RIR1), **objetivo de hoy** (80 kg × 11 · RIR 1), filas de series con carga/reps/RIR prellenados, botón grande "✓ Hecha". Chips para ajustar carga ±2,5 y reps ±1 sin teclado. RIR con 5 botones (0,1,2,3,4+).
- Al completar: timer a pantalla (descanso del ejercicio), con "saltar". Al terminar el timer la siguiente serie ya está enfocada.
- Superseries: las dos tarjetas alternan automáticamente.
- Sustitución rápida: "máquina ocupada" → lista de alternativas del mismo patrón desde el catálogo, sin salir de la sesión. La sustitución queda registrada como tal.
- Fin de sesión: resumen (duración, tonelaje, PRs), 3 preguntas de 1 toque (energía, dolor articular, sueño anoche) que alimentan la regla de deload. Nada obligatorio.

### 6.2 Plan
- Vista bloque: semanas como columnas, deload marcada.
- Vista día: ejercicios ordenados, drag para reordenar, swipe para alternativas.
- Editor de ejercicio: series, rango, RIR objetivo, descanso, nota, superserie con.
- Panel de volumen fijo abajo: series fraccionales por músculo esta semana vs rango objetivo, colores (bajo / productivo / alto). Se actualiza al editar.
- Plantillas: la rutina de Agus (4 días torso/pierna + día 5) viene cargada. Crear nueva desde cero o desde plantilla.
- Catálogo de ejercicios: ~40 de inicio (los del gimnasio de Agus) + agregar propios. Cada ejercicio: patrón, músculos con factor (1 / 0,5), equipo, rango por defecto, evitar-si (hombro, muñeca, lumbar, rodilla), nota técnica, "por qué".

### 6.3 Progreso
- Por ejercicio: gráfico carga × tiempo con e1RM (Epley), reps máximas por carga, tabla de sesiones. PRs marcados.
- Por músculo: barras semanales de series fraccionales vs banda objetivo; línea de tendencia de carga media.
- Semana: adherencia (sesiones planificadas vs hechas), minutos, tonelaje.
- Bloque: resumen al cerrar: ejercicios que progresaron, estancados, cambiados; recomendación para el siguiente.

### 6.4 Cuerpo
- Peso: entrada de 1 toque desde Hoy, gráfico con media móvil 7 días y banda objetivo (recomp: estable ±0,5%; volumen: +0,25–0,5%/mes).
- Perímetros: recordatorio cada 4 semanas, cintura resaltada (el indicador de recomp).
- Fotos: 3 ángulos, comparador con slider, misma guía de encuadre.

## 7. Motor de coach (reglas, todas explicables)

Vive en código puro, testeable, sin IA. La IA es opcional y posterior (para generar rutinas o conversar), nunca para decidir cargas.

- **Doble progresión por ejercicio**: todas las series al tope del rango con RIR ≤ objetivo → subir carga (incremento configurable por equipo: barra 5 kg, mancuerna 2 kg, máquina 1 placa o 5 kg) y volver al fondo del rango. Si no, el objetivo de hoy es +1 rep en la serie más floja.
- **Estancamiento**: 3 sesiones consecutivas sin subir reps ni carga con RIR cumplido → sugerir +1 serie (tope +2 por músculo por bloque) y, si al cerrar el bloque sigue, sugerir cambio de ejercicio.
- **Deload planificado**: última semana del bloque: series ÷2, RIR 4, misma carga.
- **Deload anticipado**: 2 sesiones consecutivas con caída de rendimiento en ≥2 ejercicios, o dolor articular ≥ 2 reportado 2 veces, o sueño "mal" 3 veces en la semana → proponer deload ahora.
- **Volumen semanal**: serie directa = 1, indirecta = 0,5. Bandas por músculo según nivel (intermedio 10–20, con prioridad en 14–20). Avisos al editar el plan.
- **Sesión perdida**: no se duplica; la secuencia sigue. Si pasan >10 días sin entrenar, el próximo objetivo baja 5–10% de carga.
- **PR**: carga máxima, reps máximas a una carga, e1RM. Se celebra sin confeti: una línea.

## 8. Modelo de datos (resumen)

- `exercise`: id, nombre, patrón, músculos {m: factor}, equipo, rango default, rir default, descanso, evitar_si[], nota, por_qué, custom, activo.
- `program` → `block` (semanas, deload_week) → `day` (nombre, orden) → `day_exercise` (ejercicio, series, lo, hi, rir, descanso, superserie_con, orden, notas).
- `session`: fecha, day_id, inicio, fin, estado, energía, dolor, sueño, notas.
- `set_log`: session_id, exercise_id (real, por si sustituyó), orden, carga, reps, rir, es_calentamiento, timestamp.
- `body_weight`, `measurement`, `photo` (blob en storage, metadata en tabla).
- `coach_event`: tipo (subir_carga, sumar_serie, deload, cambiar_ejercicio), ejercicio, razón, fecha, aceptado/ignorado. Esto es oro para el producto: mide si las reglas funcionan.
- Todo con `user_id`, `activo`, `updated_at`. Supabase con RLS por usuario.

## 9. Stack

- **Vite + React + TypeScript**. Tailwind para velocidad y consistencia. Componentes propios (no librería UI pesada): la app vive del detalle.
- **Local-first**: Dexie (IndexedDB) como fuente de verdad en el dispositivo. Sincronización a **Supabase** (Postgres + Auth magic link + Storage para fotos) en segundo plano, con cola de cambios. Funciona sin señal siempre.
- **PWA** con vite-plugin-pwa: instalable, offline, ícono, splash. Sin tiendas.
- **Gráficos**: Recharts (suficiente, liviano) con paleta propia.
- **Motor de coach**: módulo TS puro con tests (Vitest). Las reglas son funciones `(historial, plan) → decisiones`.
- **Deploy**: Cloudflare Pages o Vercel, gratis.
- Posterior: Capacitor si alguna vez se quiere tienda; el código no cambia.

## 10. Identidad

Nombre de trabajo: **Carga**. Corto, español, significa el peso en la barra y la carga de entrenamiento. Dominio y marca se validan después. Alternativas: Serie, Bloque, Tensión.

Estética: oscura, tipografía fuerte y legible (una sans con números tabulares), un solo color de acento (sin arcoíris), datos como protagonistas. Nada de ilustraciones de gente musculosa ni fuego. Referencias: Linear, Whoop, Things 3.

## 11. Negocio (para después del MVP)

- **Validación**: Agus + 5–10 amigos durante 2–3 meses. Métrica única: ¿siguen registrando a la semana 8? (retención es el problema de todas estas apps).
- **Modelo**: freemium. Gratis: registro + plan + progreso. Pago (USD 5–8/mes o 50/año): motor de coach con autoregulación, análisis de bloque, fotos ilimitadas, exportar. Precio bajo contra RP (35) y arriba de Hevy Pro (3).
- **Canal**: contenido en español de evidencia (lo que Agus ya consume) + el "por qué" de cada decisión como material de marketing. Comunidad de intermedios naturales de habla hispana es grande y mal servida.
- **B2B posible**: entrenadores que llevan 10–30 alumnos y hoy usan Excel/WhatsApp. Panel de coach más adelante.
- **Riesgos**: retención (mitigación: la app decide, el usuario no tiene que pensar); competencia que agregue español (RP no lo hizo en 5 años); dependencia de Supabase gratis (límite 500 MB; migrable).

## 12. Alcance del MVP (lo que se construye ahora)

Entra:
1. Sesión completa (Hoy) con prellenado, timer, RIR, sustitución, superseries, resumen.
2. Plan editable con la rutina de Agus cargada y panel de volumen.
3. Motor de coach: doble progresión, estancamiento, deload planificado y anticipado, sesión perdida.
4. Progreso: por ejercicio y por músculo, semana y bloque.
5. Cuerpo: peso con media móvil, perímetros, fotos.
6. Local-first + Supabase sync + PWA + login magic link.
7. Importador del prototipo anterior (localStorage `agus-programa-v1`) si tiene datos.

No entra todavía: IA generativa, multiusuario avanzado, social, nutrición detallada, Apple Health, pagos.

## 13. Preguntas abiertas para Astra

1. ¿Qué falta o sobra en el motor de reglas para que las decisiones sean confiables sin IA?
2. ¿Local-first con Dexie + Supabase es la elección correcta o conviene algo más simple para un MVP de un usuario (solo Supabase con cache)?
3. ¿La IA de 5 pestañas es la correcta para uso en gimnasio o conviene 3?
4. ¿Qué riesgo de UX no estoy viendo en el flujo de registro de series?
5. ¿El posicionamiento contra RP/Hevy es defendible?

## 14. Decisiones tras la revisión de Astra (2026-10-12)

- Regla de progresión corregida: subir carga cuando todas las series llegan al tope del rango con **RIR real ≥ RIR objetivo** (no se pasó de esfuerzo). Sin RIR cargado no hay aumento automático: la app pide el dato.
- Objetivo y resultado se guardan por separado en cada serie. Carga y reps se prellenan como objetivo; el RIR real nunca se prellena.
- La sesión guarda una copia (snapshot) del día del plan al iniciar. Editar el plan no altera el historial.
- Navegación: 3 pestañas (Hoy, Plan, Progreso). Cuerpo (peso, perímetros) dentro de Progreso. Ajustes desde la cabecera. Coach dentro de Hoy.
- Todo ajuste del motor (sumar serie, cambiar ejercicio, deload anticipado) es un **aviso revisable** que el usuario acepta o ignora. Nada se aplica solo. Se registra la decisión.
- Antes de sugerir "+1 serie" por estancamiento, el motor revisa adherencia, descansos reportados, sustituciones y recuperación; si alguno falla, sugiere eso primero.
- Dolor: flujo por ejercicio (reducir rango, bajar carga, sustituir), no disparador de deload global.
- Bandas de volumen y factor 0,5 son referencias editables en Ajustes, no verdades.
- Persistencia: Dexie (IndexedDB) es la fuente de verdad. Exportar/restaurar JSON con versión de formato desde Ajustes, en el MVP. Backup automático a Supabase como snapshot por usuario (una fila JSON, last-write-wins) con login magic link: cubre cambio de dispositivo sin construir sync bidireccional. Sync real queda para cuando haya segundo dispositivo o usuarios externos.
- Recuperación de sesión: autoguardado por serie, retomar sesión abierta al reabrir, protección contra doble toque, deshacer con flag.
- Calibración inicial: cargas conocidas por ejercicio, incremento mínimo por equipo, minutos disponibles.
- Fotos con comparador salen del MVP (v1.1). Peso y perímetros quedan.
- Timer: calculado por hora de fin (no por intervalos), para sobrevivir a pantalla apagada. Vibración como mejora, no promesa.
- Hevy Trainer ya recomienda cargas: el posicionamiento es "progresión explicable sobre tu propia rutina, en español", a validar.
