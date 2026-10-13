# Propuesta v1.1: mercado, calendario, mapa muscular y gráficos

Fecha: 2026-10-12. Criterio: cada cosa entra solo si cambia una decisión del usuario (qué cargar, qué entrenar, cuándo descargar, si está comiendo bien). Lo que es lindo pero no decide nada, no entra o entra último.

## 1. Mercado (qué hay y qué vale la pena copiar)

| App | Precio | Lo mejor que tiene | Lo que no hace | Qué tomar para Carga |
|---|---|---|---|---|
| Hevy | USD 3/mes, 24/año, 75 vida | Registro rapidísimo, gráfico de distribución muscular por semana/mes, routines compartibles, social. Trainer (reglas) desde feb 2026 | Sin lógica de coach real; stats gratis solo 3 meses; feed social imposible de apagar | Velocidad de registro como vara, gráfico de distribución muscular, compartir rutina por link |
| Strong | similar | El logger más rápido, calculadora de discos | Sin programación | Calculadora de discos |
| RP Hypertrophy | ~USD 35/mes | Autoregulación real por feedback (pump, dolor, rendimiento), 45+ planes, videos | Caro, inglés, caja negra, rígido para quien quiere mover cosas | El feedback post-sesión (ya lo tenemos) y el cierre de mesociclo con informe |
| Alpha Progression | ~USD 8/mes | Recomendación de peso×reps por serie, prioridades por músculo, deloads | Frío, inglés/alemán, poca explicación | Nada nuevo: ya lo hacemos con "por qué" |
| Fitbod | ~USD 13/mes | **Mapa de recuperación muscular** (0–100 % por músculo, estimado desde series y cargas, decae en ~7 días), elige ejercicios según músculo fresco | La recuperación es una estimación de volumen, no mide nada; primeras semanas genérico | El mapa de fatiga, hecho con reglas explícitas y honestas |
| Boostcamp | USD 5/mes | Biblioteca de programas de coaches reales | Programas fijos, abruma | Nada por ahora |

Lectura: nadie junta registro rápido + coach explicable + mapa de fatiga + español. Hevy es el competidor a vigilar (barato y ya recomienda cargas). RP es el referente de lógica. Fitbod es el referente del mapa muscular.

Fuentes: [Boostcamp](https://www.boostcamp.app/best/hypertrophy), [Alpha Progression](https://alphaprogression.com/en/blog/best-muscle-building-apps), [Fitbod sobre recuperación](https://fitbod.me/blog/tracking-volume-intensity-and-recovery-with-fitbod/), [Sensai: Hevy vs Fitbod](https://www.sensai.fit/blog/hevy-vs-fitbod-2026), [Hevy training chart](https://www.hevyapp.com/features/training-chart/), [precios 2026](https://www.sensai.fit/blog/fitness-app-pricing-free-tier-comparison), [App Store RP](https://apps.apple.com/vn/app/id1555614554).

## 2. Calendario de asistencia (alta prioridad, barato)

Qué: en Progreso, una grilla mensual. Cada día entrenado es un punto con el color del tipo de día (Torso/Pierna/extra); descarga en gris; sesiones descartadas no cuentan. Arriba: sesiones del mes vs planificadas (ej. 14/16), racha actual y mejor racha. Tocar un día abre la sesión.

Por qué sirve: la adherencia es la variable que más explica el progreso y hoy el usuario no la ve. Además alimenta la regla del coach "antes de sumar series, revisá constancia", que ya existe pero no tiene visualización.

Detalle UX: 12 meses hacia atrás con swipe; nada de "heat" por intensidad en el calendario (se confunde con el mapa muscular); el mes actual muestra los días futuros planificados en punteado según la rotación.

## 3. Mapa muscular: qué recomiendo y por qué no 3D fotorrealista

Lo que pediste: un cuerpo 3D realista y volumétrico con músculos coloreados por intensidad y fatiga.

Mi recomendación: **cuerpo anatómico estilizado en 2D (SVG), frente y espalda, con los 13 grupos del modelo de datos coloreados.** Después, si sigue dando ganas, un 3D low-poly rotable. Nunca fotorrealista.

Razones, de más a menos importante:
1. **La información es por grupo muscular, no por fibra.** Un render realista promete una precisión que los datos no tienen: la app sabe "pecho 7 series esta semana", no "porción clavicular del pectoral". Un dibujo estilizado comunica exactamente lo que sabemos; uno realista miente.
2. **Peso y velocidad.** Un modelo realista son 10–40 MB de malla y texturas más three.js: la app pasa de 400 KB a decenas de MB, carga lento en el gimnasio y rompe el "funciona sin señal" con cache razonable. El SVG pesa 30 KB.
3. **Legibilidad en pantalla chica.** Para leer 13 colores hay que ver frente y espalda a la vez, con contraste alto. En 2D caben lado a lado; en 3D hay que rotar y nunca se ve todo.
4. **Tiempo:** SVG propio, 2–3 días. 3D con modelo libre segmentado por músculo y materiales, 2–3 semanas y aun así se ve "de juego".

Qué muestra el mapa (dos modos con un switch, nunca los dos a la vez):

**Modo Volumen (semana en curso)**: color por zona respecto de la banda del músculo: gris = sin series, amarillo = bajo mínimo, verde = productivo, rojo = por encima del máximo. Tocar un músculo muestra "Espalda: 9 / 10–20 · faltan 1 para el mínimo · viene de 12 la semana pasada". Es el panel de volumen del Plan, pero sobre lo que realmente hiciste.

**Modo Fatiga (hoy)**: cada músculo tiene un nivel 0–100 % de "frescura". Reglas explícitas (todas editables después):
- Cada serie de trabajo suma fatiga = factor del músculo (1 directa, 0,5 indirecta) × cercanía al fallo (RIR 0 = 1,3; RIR 1 = 1,15; RIR 2 = 1; RIR 3+ = 0,85) × tamaño del ejercicio (compuesto 1,2; aislamiento 1).
- La fatiga decae con vida media de 36 h para músculos chicos (deltoides, bíceps, tríceps, gemelos, abdomen) y 48 h para grandes (pecho, espalda, cuádriceps, isquios, glúteos). Con 10 series a RIR 1: ~82 % el mismo día, ~58 % a las 48 h, ~35 % a los 4 días, ~14 % a la semana.
- Sueño "mal" y dolor reportados al cerrar la sesión frenan el decaimiento un 25 % durante 24 h.
- Color: verde fresco, amarillo cargado, rojo cargado y entrenado hace menos de 24 h.
- Se usa para una sola decisión: el aviso "Pierna B hoy con isquios al 40 %: es normal si vienen de Pierna A; si te duele, bajá una serie" y para el futuro "día libre inteligente" (elegir qué día del plan hacer cuando se desordena la semana).

Honestidad obligatoria en la pantalla: un pie que diga "Estimación por volumen y esfuerzo registrados. No mide nada en tu cuerpo." Fitbod no lo aclara; nosotros sí, y es parte de la marca.

Lo que no haría: "intensidad" como tercer modo. Intensidad ya está adentro de fatiga (vía RIR) y de volumen (vía series); un tercer mapa confunde.

## 4. Gráficos que sí deciden algo

Orden por valor. Los primeros cuatro entran en v1.1.

1. **Tablero de progresión** (no es un gráfico, es lo más útil): lista de ejercicios con flechas de las últimas 4 sesiones (↑ carga, ↗ reps, → igual, ↓ bajó) y una etiqueta: "progresando", "estancado 3", "recién cambiado". Es la pregunta "¿qué está funcionando?" respondida en una pantalla. Ninguna app lo tiene así.
2. **1RM estimado por ejercicio con contexto**: lo que ya hay, más sombreado de semanas de descarga, línea vertical al cambiar de bloque y marca de PR. Sin contexto, una caída en semana de deload parece un problema.
3. **Fuerza vs peso corporal (indicador de recomposición)**: una línea con el promedio de e1RM de los 4 básicos (índice 100 al inicio) y otra con el peso medio semanal. Si fuerza sube y peso no, la recomposición está funcionando; si ambos bajan, falta comida. Es la única manera de ver si la nutrición acompaña sin contar calorías.
4. **Precisión de RIR**: por ejercicio, reps objetivo vs reps hechas y RIR objetivo vs real. Si siempre hacés 2 reps más de lo pedido con RIR 0, el objetivo está mal calibrado y el coach debería subir más rápido. Nadie lo mide; es un diferencial real.
5. **Series por músculo por semana** apiladas por ejercicio (ya está simple; se enriquece).
6. **Duración de sesión vs estimada** y series por minuto: sirve para el límite de 60 min.
7. **Informe de cierre de bloque**: una pantalla al cerrar el bloque: ejercicios que progresaron, estancados, PRs, adherencia, peso y cintura al inicio y al fin, y las 2–3 recomendaciones para el siguiente. Reemplaza la "conversación de fin de mes con el coach".

Gráficos que descartaría aunque los pidan: tonelaje total (sube con cualquier cosa, no dice nada de hipertrofia), calorías "quemadas", radar de "balance muscular" (bonito, inaccionable), récords de "mejor serie" por reps altas (ruido).

## 5. Otras mejoras del mercado que valen la pena

- **Calculadora de discos** al tocar la carga (barra 20 kg, discos del gimnasio configurables): ahorra pensar entre series. Strong lo tiene; es trivial.
- **Series de calentamiento sugeridas** para el primer básico de la sesión (40 %, 60 %, 80 % de la carga del día): se registran como calentamiento y no cuentan.
- **Notificación al terminar el descanso** aunque la pantalla esté apagada (Notification API + service worker). Hoy solo vibra si la app está abierta.
- **Importar peso desde Google Fit / Apple Health**: después, cuando haya app nativa o Capacitor.
- **Compartir rutina por link** (JSON codificado en la URL): para los amigos que la prueben. Sin cuentas.
- **Videos de técnica**: un link a YouTube por ejercicio en el catálogo, sin alojar nada.

## 6. Orden propuesto

| Bloque | Qué | Esfuerzo |
|---|---|---|
| v1.1 | Calendario · Tablero de progresión · Mapa SVG modo Volumen · 1RM con contexto · Calculadora de discos | 1 semana |
| v1.2 | Mapa modo Fatiga con reglas · Fuerza vs peso · Precisión de RIR · Notificación de descanso | 1 semana |
| v1.3 | Informe de cierre de bloque · Calentamiento sugerido · Compartir rutina | 1 semana |
| Después | 3D low-poly rotable solo si el 2D queda corto · Health/Fit · videos | a definir |
