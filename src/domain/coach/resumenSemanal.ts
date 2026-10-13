import type { Banda, Dia, Ejercicio, MusculoId, SerieLog, Sesion } from '../types'
import { MUSCULOS } from '../types'
import { lunesDe, sumarDias } from '../../lib/fechas'
import { mejorE1rm } from './e1rm'
import { zona } from './volumen'

export interface ResumenSemana {
  lunes: string
  /** true si es la semana en curso (todavía incompleta) */
  enCurso: boolean
  hechas: number
  planificadas: number
  prs: { ejercicio: string; carga: number }[]
  bajoMinimo: { m: MusculoId; series: number; min: number }[]
  minutos: number | null
  frase: string
}

export interface ContextoResumen {
  hoy: string
  sesiones: Sesion[]
  series: SerieLog[]
  ejercicios: Map<string, Ejercicio>
  dias: Dia[]
  bandas: Partial<Record<MusculoId, Banda>>
  factorIndirecto: number
}

/** Resumen de la semana en curso o de la pasada (lunes y martes muestran la pasada). */
export function resumenSemanal(ctx: ContextoResumen): ResumenSemana {
  const lunesHoy = lunesDe(ctx.hoy)
  const diaSemana = (new Date(ctx.hoy + 'T12:00:00').getDay() + 6) % 7 // lunes = 0
  const enCurso = diaSemana > 1
  const lunes = enCurso ? lunesHoy : sumarDias(lunesHoy, -7)
  const fin = sumarDias(lunes, 7)
  const terminadas = ctx.sesiones.filter((s) => s.estado === 'terminada' && s.activo)
  const enSemana = terminadas.filter((s) => { const f = s.fechaInicio.slice(0, 10); return f >= lunes && f < fin })
  const ids = new Set(enSemana.map((s) => s.id))
  const planificadas = ctx.dias.filter((d) => !d.opcional && d.activo).length

  // PRs: carga máxima de la semana mayor que todo lo anterior
  const prs: ResumenSemana['prs'] = []
  const porEj = new Map<string, { semana: number; antes: number }>()
  for (const s of ctx.series) {
    if (!s.activo || s.calentamiento) continue
    const ses = terminadas.find((x) => x.id === s.sesionId)
    if (!ses) continue
    const e = porEj.get(s.ejercicioId) ?? porEj.set(s.ejercicioId, { semana: 0, antes: 0 }).get(s.ejercicioId)!
    if (ids.has(s.sesionId)) e.semana = Math.max(e.semana, s.carga)
    else if (ses.fechaInicio.slice(0, 10) < lunes) e.antes = Math.max(e.antes, s.carga)
  }
  for (const [ejId, e] of porEj) if (e.antes > 0 && e.semana > e.antes) prs.push({ ejercicio: ctx.ejercicios.get(ejId)?.nombre ?? ejId, carga: e.semana })

  // volumen por músculo
  const vol: Partial<Record<MusculoId, number>> = {}
  for (const s of ctx.series) {
    if (!ids.has(s.sesionId) || !s.activo || s.calentamiento) continue
    const ej = ctx.ejercicios.get(s.ejercicioId)
    if (!ej) continue
    for (const [m, f] of Object.entries(ej.musculos) as [MusculoId, number][]) {
      const ff = f >= 1 ? 1 : (f / 0.5) * ctx.factorIndirecto
      vol[m] = Math.round(((vol[m] ?? 0) + ff) * 10) / 10
    }
  }
  const bajoMinimo: ResumenSemana['bajoMinimo'] = []
  if (!enCurso) {
    for (const [m, b] of Object.entries(ctx.bandas) as [MusculoId, Banda][]) {
      const v = vol[m] ?? 0
      if (zona(v, b) === 'bajo') bajoMinimo.push({ m, series: v, min: b.min })
    }
    bajoMinimo.sort((a, b) => a.series / a.min - b.series / b.min)
  }

  const dur = enSemana.filter((s) => s.fechaFin).map((s) => (new Date(s.fechaFin!).getTime() - new Date(s.fechaInicio).getTime()) / 60000)
  const minutos = dur.length ? Math.round(dur.reduce((a, b) => a + b, 0) / dur.length) : null

  let frase: string
  if (enCurso) {
    frase = enSemana.length >= planificadas ? 'Semana cumplida. Lo que hagas de más, que sea descanso.' : `${planificadas - enSemana.length} ${planificadas - enSemana.length === 1 ? 'sesión' : 'sesiones'} por delante para cerrar la semana.`
  } else if (enSemana.length === 0) {
    frase = 'Semana sin sesiones. No pasa nada: hoy toca el día que quedó pendiente.'
  } else if (enSemana.length < planificadas) {
    frase = `${enSemana.length} de ${planificadas}: la rotación sigue desde donde quedó, no recuperes sesiones apilando.`
  } else if (prs.length) {
    frase = `Semana completa con ${prs.length} ${prs.length === 1 ? 'PR' : 'PRs'}. Sostené las cargas: la próxima semana se gana con las mismas reps y un RIR más.`
  } else if (bajoMinimo.length) {
    frase = `Semana completa, pero ${MUSCULOS[bajoMinimo[0].m].toLowerCase()} quedó bajo el mínimo (${bajoMinimo[0].series} de ${bajoMinimo[0].min}). Si el día opcional entra, va ahí.`
  } else {
    frase = 'Semana completa y volumen en zona. Sin cambios: repetí.'
  }
  return { lunes, enCurso, hechas: enSemana.length, planificadas, prs, bajoMinimo, minutos, frase }
}

export { mejorE1rm }
