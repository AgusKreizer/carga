import type { SerieLog, Sesion } from '../types'
import { mejorE1rm } from './e1rm'

export interface SesionConSeries {
  sesion: Sesion
  series: SerieLog[]
}

export interface AvisoDeload {
  recomendar: boolean
  razones: string[]
}

const CAIDA_RENDIMIENTO = 0.03

/**
 * Deload anticipado si se cumple alguna:
 *  A) en las 2 últimas sesiones, ≥2 ejercicios rindieron >3% menos (e1RM) que la vez anterior;
 *  B) dolor articular ≥2 en 2 de las últimas 3 sesiones;
 *  C) sueño "mal" en ≥3 sesiones de los últimos 7 días.
 * Es un aviso: el usuario decide.
 */
export function evaluarDeload(sesiones: SesionConSeries[], hoyISO: string): AvisoDeload {
  const terminadas = sesiones
    .filter((s) => s.sesion.estado === 'terminada' && s.sesion.activo && !s.sesion.esDeload)
    .sort((a, b) => b.sesion.fechaInicio.localeCompare(a.sesion.fechaInicio))
  const razones: string[] = []

  // A) caída de rendimiento
  const ultimas2 = terminadas.slice(0, 2)
  if (ultimas2.length === 2) {
    let sesionesConCaida = 0
    for (const s of ultimas2) {
      const caidas = ejerciciosConCaida(s, terminadas.filter((x) => x.sesion.fechaInicio < s.sesion.fechaInicio))
      if (caidas >= 2) sesionesConCaida++
    }
    if (sesionesConCaida === 2) razones.push('Dos sesiones seguidas con caída de rendimiento en varios ejercicios.')
  }

  // B) dolor
  const ultimas3 = terminadas.slice(0, 3)
  const conDolor = ultimas3.filter((s) => (s.sesion.dolor ?? 0) >= 2).length
  if (ultimas3.length === 3 && conDolor >= 2) razones.push('Dolor articular reportado en 2 de las últimas 3 sesiones.')

  // C) sueño
  const hace7 = new Date(hoyISO)
  hace7.setDate(hace7.getDate() - 7)
  const malSueno = terminadas.filter((s) => s.sesion.fechaInicio >= hace7.toISOString() && s.sesion.sueno === 1).length
  if (malSueno >= 3) razones.push('Sueño malo en 3 o más sesiones de la última semana.')

  return { recomendar: razones.length > 0, razones }
}

function ejerciciosConCaida(actual: SesionConSeries, anteriores: SesionConSeries[]): number {
  const porEjercicio = agrupar(actual.series)
  let caidas = 0
  for (const [ejId, series] of porEjercicio) {
    const previa = anteriores.find((s) => s.series.some((x) => x.ejercicioId === ejId && !x.calentamiento))
    if (!previa) continue
    const e1Actual = mejorE1rm(series)
    const e1Previa = mejorE1rm(previa.series.filter((x) => x.ejercicioId === ejId))
    if (e1Previa > 0 && e1Actual < e1Previa * (1 - CAIDA_RENDIMIENTO)) caidas++
  }
  return caidas
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
