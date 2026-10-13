import type { SesionPrevia } from './progresion'

export interface Calibracion {
  /** series con objetivo consideradas */
  n: number
  /** reps hechas − reps pedidas, promedio */
  dReps: number
  /** RIR real − RIR objetivo, promedio (negativo = más cerca del fallo que lo pedido) */
  dRir: number
  /** multiplicador del incremento cuando toca subir carga: 1 normal, 2 si el objetivo venía conservador */
  salto: 1 | 2
  motivo: string | null
}

const MIN_SERIES = 6
const SESIONES = 6

/**
 * Autocalibración por ejercicio: si en las últimas sesiones venís haciendo claramente más reps
 * de las pedidas sin pasarte de esfuerzo (o quedándote lejos del fallo), el próximo aumento de
 * carga es doble. Si no hay datos suficientes, salto normal.
 */
export function calibracion(previas: SesionPrevia[]): Calibracion {
  const series = previas.slice(0, SESIONES).flatMap((p) => p.series).filter((s) => s.objetivoReps != null && !s.calentamiento)
  if (series.length < MIN_SERIES) return { n: series.length, dReps: 0, dRir: 0, salto: 1, motivo: null }
  const dReps = series.reduce((a, s) => a + (s.reps - (s.objetivoReps ?? s.reps)), 0) / series.length
  const conRir = series.filter((s) => s.rir != null)
  const dRir = conRir.length ? conRir.reduce((a, s) => a + ((s.rir ?? 0) - s.rirObjetivo), 0) / conRir.length : 0
  const sobranReps = dReps >= 1.5 && dRir >= 0
  const lejosDelFallo = dRir >= 1.5
  if (sobranReps || lejosDelFallo) {
    return {
      n: series.length, dReps, dRir, salto: 2,
      motivo: sobranReps ? `venís haciendo ${dReps.toFixed(1)} reps más de las pedidas` : `venís quedándote ${dRir.toFixed(1)} RIR más lejos del fallo que lo pedido`,
    }
  }
  return { n: series.length, dReps, dRir, salto: 1, motivo: null }
}
