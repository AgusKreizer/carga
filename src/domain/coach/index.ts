import type { CoachEvento, DiaEjercicio, Ejercicio, SerieLog, Sesion } from '../types'
import { detectarEstancamiento } from './estancamiento'
import { evaluarDeload, type SesionConSeries } from './deload'
import { mejorE1rm } from './e1rm'
import type { SesionPrevia } from './progresion'

export type EventoNuevo = Omit<CoachEvento, 'id' | 'activo'>

export interface ContextoPostSesion {
  sesion: Sesion
  seriesSesion: SerieLog[]
  /** por ejercicio realizado en la sesión: sesiones previas (sin la actual) */
  previasPorEjercicio: Map<string, SesionPrevia[]>
  lineas: DiaEjercicio[]
  ejercicios: Map<string, Ejercicio>
  /** últimas sesiones terminadas con sus series (incluida la actual) */
  historial: SesionConSeries[]
  /** sesiones planificadas por semana (días no opcionales) */
  diasPorSemana: number
  hoyISO: string
}

/**
 * Genera los avisos del coach al cerrar una sesión. Todo es sugerencia: nada se aplica solo.
 * Orden de prioridad: dolor → deload → adherencia/recuperación → estancamiento → PRs.
 */
export function avisosPostSesion(ctx: ContextoPostSesion): EventoNuevo[] {
  const out: EventoNuevo[] = []
  const fecha = ctx.hoyISO

  // Dolor en esta sesión: flujo por ejercicio, no deload global.
  if ((ctx.sesion.dolor ?? 0) >= 2) {
    out.push({
      tipo: 'dolor',
      ejercicioId: null,
      diaEjercicioId: null,
      mensaje: 'Reportaste dolor articular. ¿Qué ejercicio lo generó?',
      razon: 'Con dolor conviene bajar carga, acortar el rango o sustituir ese ejercicio antes que descargar todo. Si es agudo, consultá a un médico o kinesiólogo.',
      fecha,
      estado: 'pendiente',
      payload: { sesionId: ctx.sesion.id },
    })
  }

  // Deload anticipado
  const deload = evaluarDeload(ctx.historial, ctx.hoyISO)
  if (deload.recomendar && !ctx.sesion.esDeload) {
    out.push({
      tipo: 'deload-anticipado',
      ejercicioId: null,
      diaEjercicioId: null,
      mensaje: 'Señales de fatiga acumulada: te propongo adelantar la descarga.',
      razon: deload.razones.join(' '),
      fecha,
      estado: 'pendiente',
      payload: null,
    })
  }

  // Adherencia últimas 2 semanas
  const hace14 = new Date(ctx.hoyISO)
  hace14.setDate(hace14.getDate() - 14)
  const hechas = ctx.historial.filter((h) => h.sesion.estado === 'terminada' && h.sesion.fechaInicio >= hace14.toISOString()).length
  const planificadas = ctx.diasPorSemana * 2
  const adherenciaBaja = planificadas > 0 && hechas < planificadas * 0.75 && ctx.historial.length >= 4

  // Estancamiento por ejercicio (solo si la adherencia no explica la falta de progreso)
  const porEjercicio = agrupar(ctx.seriesSesion)
  for (const [ejId] of porEjercicio) {
    const ej = ctx.ejercicios.get(ejId)
    if (!ej) continue
    const linea = ctx.lineas.find((l) => l.ejercicioId === ejId)
    const rirObjetivo = linea?.rir ?? ej.rir
    const previas = ctx.previasPorEjercicio.get(ejId) ?? []
    const actual: SesionPrevia = { fechaInicio: ctx.sesion.fechaInicio, series: porEjercicio.get(ejId)! }
    const r = detectarEstancamiento([actual, ...previas], rirObjetivo)
    if (!r.estancado) continue
    if (adherenciaBaja) {
      out.push({
        tipo: 'revisar-recuperacion',
        ejercicioId: ejId,
        diaEjercicioId: linea?.id ?? null,
        mensaje: `${ej.nombre} no progresa, pero entrenaste ${hechas} de ${planificadas} sesiones en 2 semanas.`,
        razon: 'Antes de sumar volumen, lo que falta es constancia. Con la frecuencia planificada el estímulo alcanza.',
        fecha,
        estado: 'informativo',
        payload: null,
      })
      continue
    }
    out.push({
      tipo: 'sumar-serie',
      ejercicioId: ejId,
      diaEjercicioId: linea?.id ?? null,
      mensaje: `${ej.nombre}: ${r.sesiones} sesiones sin progreso. ¿Sumamos una serie?`,
      razon: `${r.razon} Si con una serie más sigue clavado al cerrar el bloque, lo cambiamos por otro del mismo patrón.`,
      fecha,
      estado: 'pendiente',
      payload: { linea: linea?.id ?? null },
    })
  }

  // PRs (informativo)
  for (const [ejId, series] of porEjercicio) {
    const ej = ctx.ejercicios.get(ejId)
    if (!ej) continue
    const previas = ctx.previasPorEjercicio.get(ejId) ?? []
    if (!previas.length) continue
    const e1Hoy = mejorE1rm(series)
    const e1Previo = Math.max(...previas.map((p) => mejorE1rm(p.series)))
    const cargaHoy = Math.max(...series.map((s) => s.carga))
    const cargaPrevia = Math.max(...previas.flatMap((p) => p.series.map((s) => s.carga)))
    if (cargaHoy > cargaPrevia) {
      out.push(pr(ej, `Carga máxima nueva en ${ej.nombre}: ${cargaHoy} kg.`, fecha))
    } else if (e1Hoy > e1Previo * 1.01) {
      out.push(pr(ej, `Mejor estimado de 1RM en ${ej.nombre}: ${Math.round(e1Hoy)} kg.`, fecha))
    }
  }

  return out
}

function pr(ej: Ejercicio, mensaje: string, fecha: string): EventoNuevo {
  return {
    tipo: 'pr',
    ejercicioId: ej.id,
    diaEjercicioId: null,
    mensaje,
    razon: 'Progreso medido contra todas tus sesiones anteriores de este ejercicio.',
    fecha,
    estado: 'informativo',
    payload: null,
  }
}

function agrupar(series: SerieLog[]): Map<string, SerieLog[]> {
  const m = new Map<string, SerieLog[]>()
  for (const s of series) {
    if (s.calentamiento || !s.activo) continue
    const arr = m.get(s.ejercicioId) ?? []
    arr.push(s)
    m.set(s.ejercicioId, arr)
  }
  return m
}
