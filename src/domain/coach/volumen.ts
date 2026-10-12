import type { Banda, DiaEjercicio, Ejercicio, MusculoId } from '../types'

/** Bandas de referencia para intermedio (series fraccionales por semana). Editables en Ajustes. */
export const BANDAS_INTERMEDIO: Partial<Record<MusculoId, Banda>> = {
  pecho: { min: 10, max: 20 },
  espalda: { min: 10, max: 20 },
  deltLat: { min: 8, max: 20 },
  deltPost: { min: 6, max: 16 },
  biceps: { min: 8, max: 20 },
  triceps: { min: 8, max: 20 },
  cuads: { min: 8, max: 20 },
  isquios: { min: 6, max: 16 },
  gluteos: { min: 4, max: 16 },
  gemelos: { min: 6, max: 16 },
  abs: { min: 4, max: 12 },
}

export type Zona = 'bajo' | 'productivo' | 'alto' | 'sin-banda'

/**
 * Series fraccionales por músculo para un conjunto de líneas del plan (una semana).
 * Directa = factor 1. Indirecta = factor del catálogo (0.5) multiplicado por `factorIndirecto`/0.5
 * para que el usuario pueda cambiar cuánto vale una serie indirecta.
 */
export function volumenSemanal(
  lineas: DiaEjercicio[],
  ejercicios: Map<string, Ejercicio>,
  factorIndirecto = 0.5,
): Partial<Record<MusculoId, number>> {
  const total: Partial<Record<MusculoId, number>> = {}
  for (const l of lineas) {
    if (!l.activo) continue
    const ej = ejercicios.get(l.ejercicioId)
    if (!ej) continue
    for (const [m, factor] of Object.entries(ej.musculos) as [MusculoId, number][]) {
      const f = factor >= 1 ? 1 : (factor / 0.5) * factorIndirecto
      total[m] = Math.round(((total[m] ?? 0) + l.series * f) * 10) / 10
    }
  }
  return total
}

export function zona(series: number, banda: Banda | undefined): Zona {
  if (!banda) return 'sin-banda'
  if (series < banda.min) return 'bajo'
  if (series > banda.max) return 'alto'
  return 'productivo'
}
