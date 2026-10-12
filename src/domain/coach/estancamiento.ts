import type { SerieLog } from '../types'
import { cargaTipica } from './progresion'

export interface SesionEjercicio {
  fechaInicio: string
  series: SerieLog[]
}

export interface Estancamiento {
  estancado: boolean
  /** cantidad de sesiones consecutivas sin progreso */
  sesiones: number
  /** true si en esas sesiones hubo series sin RIR o con RIR muy alto (no se puede concluir) */
  datosDudosos: boolean
  razon: string
}

const MIN_SESIONES = 3

/**
 * Estancado = en las últimas N sesiones (N ≥ 3) ni subió la carga ni subieron las reps totales,
 * y el esfuerzo fue el previsto (RIR ≤ objetivo + 1). Si falta RIR o el esfuerzo fue bajo, no se concluye.
 */
export function detectarEstancamiento(sesiones: SesionEjercicio[], rirObjetivo: number): Estancamiento {
  const utiles = sesiones.filter((s) => s.series.length > 0)
  if (utiles.length < MIN_SESIONES) {
    return { estancado: false, sesiones: 0, datosDudosos: false, razon: 'Pocas sesiones para evaluar.' }
  }

  let consecutivas = 0
  let dudosos = false
  for (let i = 0; i < utiles.length - 1; i++) {
    const actual = resumen(utiles[i].series)
    const previa = resumen(utiles[i + 1].series)
    const progreso = actual.carga > previa.carga || (actual.carga === previa.carga && actual.reps > previa.reps)
    if (progreso) break
    if (actual.sinRir || actual.rirMedio > rirObjetivo + 1) dudosos = true
    consecutivas++
  }

  if (consecutivas >= MIN_SESIONES - 1 && !dudosos) {
    return {
      estancado: true,
      sesiones: consecutivas + 1,
      datosDudosos: false,
      razon: `${consecutivas + 1} sesiones seguidas sin subir carga ni reps con el esfuerzo previsto.`,
    }
  }
  if (consecutivas >= MIN_SESIONES - 1 && dudosos) {
    return {
      estancado: false,
      sesiones: consecutivas + 1,
      datosDudosos: true,
      razon: 'Sin progreso, pero falta RIR o el esfuerzo fue bajo: no se puede concluir que sea estancamiento.',
    }
  }
  return { estancado: false, sesiones: consecutivas, datosDudosos: false, razon: 'Viene progresando.' }
}

function resumen(series: SerieLog[]) {
  const carga = cargaTipica(series)
  const trabajo = series.filter((s) => s.carga === carga)
  const reps = trabajo.reduce((a, s) => a + s.reps, 0)
  const conRir = trabajo.filter((s) => s.rir != null)
  const rirMedio = conRir.length ? conRir.reduce((a, s) => a + (s.rir ?? 0), 0) / conRir.length : 0
  return { carga, reps, sinRir: conRir.length < trabajo.length, rirMedio }
}
