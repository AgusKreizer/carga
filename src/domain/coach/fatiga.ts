import type { Ejercicio, MusculoId, Patron, SerieLog, Sesion } from '../types'

/**
 * Fatiga estimada por músculo (0–100). Es una estimación por volumen y esfuerzo registrados,
 * no una medición. Reglas explícitas:
 *  - cada serie de trabajo suma: factor del músculo × cercanía al fallo × tipo de ejercicio
 *  - decae exponencialmente: vida media 36 h (músculos chicos) o 48 h (grandes)
 *  - sueño "mal" o dolor ≥2 en esa sesión alargan la vida media un 25 %
 *  - escala: 100 × (1 − e^(−acumulado / 8)): 10 series de compuesto a RIR 1 ≈ 82 % el mismo día,
 *    ≈ 58 % a las 48 h, ≈ 35 % a los 4 días, ≈ 14 % a la semana.
 */

const GRANDES: MusculoId[] = ['pecho', 'espalda', 'cuads', 'isquios', 'gluteos']
const COMPUESTOS: Patron[] = ['empuje-horizontal', 'empuje-vertical', 'tiron-vertical', 'tiron-horizontal', 'rodilla-dominante', 'cadera-dominante']
const ESCALA = 8

export const VIDA_MEDIA_H = { chico: 36, grande: 48 }

export function multiplicadorRir(rir: number | null): number {
  if (rir == null) return 1
  if (rir <= 0) return 1.3
  if (rir === 1) return 1.15
  if (rir === 2) return 1
  return 0.85
}

export interface FatigaMusculo {
  fatiga: number
  /** aporte reciente: última sesión que lo tocó */
  ultimaFecha: string | null
  seriesUltima: number
}

export function calcularFatiga(
  series: SerieLog[],
  sesiones: Map<string, Sesion>,
  ejercicios: Map<string, Ejercicio>,
  ahoraISO: string,
  factorIndirecto = 0.5,
): Partial<Record<MusculoId, FatigaMusculo>> {
  const ahora = new Date(ahoraISO).getTime()
  const acum: Partial<Record<MusculoId, number>> = {}
  const ultima: Partial<Record<MusculoId, { fecha: string; series: number }>> = {}

  for (const s of series) {
    if (!s.activo || s.calentamiento) continue
    const ses = sesiones.get(s.sesionId)
    if (!ses || ses.estado !== 'terminada') continue
    const ej = ejercicios.get(s.ejercicioId)
    if (!ej) continue
    const horas = (ahora - new Date(s.ts || ses.fechaInicio).getTime()) / 3_600_000
    if (horas < 0 || horas > 24 * 10) continue
    const malRecuperado = ses.sueno === 1 || (ses.dolor ?? 0) >= 2
    const tipo = COMPUESTOS.includes(ej.patron) ? 1.2 : 1
    const esfuerzo = multiplicadorRir(s.rir)
    for (const [m, f] of Object.entries(ej.musculos) as [MusculoId, number][]) {
      const factor = f >= 1 ? 1 : (f / 0.5) * factorIndirecto
      if (factor === 0) continue
      const vidaMedia = (GRANDES.includes(m) ? VIDA_MEDIA_H.grande : VIDA_MEDIA_H.chico) * (malRecuperado ? 1.25 : 1)
      const restante = Math.pow(0.5, horas / vidaMedia)
      acum[m] = (acum[m] ?? 0) + factor * esfuerzo * tipo * restante
      const u = ultima[m]
      if (!u || ses.fechaInicio > u.fecha) ultima[m] = { fecha: ses.fechaInicio, series: 1 }
      else if (u.fecha === ses.fechaInicio) u.series++
    }
  }

  const out: Partial<Record<MusculoId, FatigaMusculo>> = {}
  for (const [m, v] of Object.entries(acum) as [MusculoId, number][]) {
    out[m] = {
      fatiga: Math.round(100 * (1 - Math.exp(-v / ESCALA))),
      ultimaFecha: ultima[m]?.fecha ?? null,
      seriesUltima: ultima[m]?.series ?? 0,
    }
  }
  return out
}

export type NivelFatiga = 'fresco' | 'cargado' | 'muy-cargado'
export function nivelFatiga(f: number): NivelFatiga {
  return f >= 66 ? 'muy-cargado' : f >= 33 ? 'cargado' : 'fresco'
}
