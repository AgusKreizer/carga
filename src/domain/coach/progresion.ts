import type { DiaEjercicio, Ejercicio, ObjetivoEjercicio, ObjetivoSerie, SerieLog } from '../types'
import { redondearA } from '../../lib/formato'

export interface SesionPrevia {
  fechaInicio: string
  /** series de trabajo (sin calentamiento, activas) de este ejercicio, en orden */
  series: SerieLog[]
}

export interface ContextoProgresion {
  linea: DiaEjercicio
  ejercicio: Ejercicio
  /** sesiones previas con este ejercicio, la más reciente primero */
  previas: SesionPrevia[]
  esDeload: boolean
  /** días desde la última sesión con este ejercicio (null si nunca) */
  diasDesdeUltima: number | null
  /** autocalibración: multiplicador del incremento al subir (1 normal, 2 si el objetivo venía conservador) */
  salto?: 1 | 2
  motivoSalto?: string | null
}

const DIAS_PAUSA_LARGA = 10
const FACTOR_PAUSA = 0.92

/**
 * Doble progresión con objetivo de RIR.
 * Subís carga cuando TODAS las series llegan al tope del rango sin pasarte de esfuerzo
 * (RIR real ≥ RIR objetivo). Si falta el RIR en alguna serie, no se sube solo: se pide el dato.
 */
export function objetivoParaHoy(ctx: ContextoProgresion): ObjetivoEjercicio {
  const { linea, ejercicio, previas, esDeload, diasDesdeUltima, salto = 1, motivoSalto } = ctx
  const base = { diaEjercicioId: linea.id, ejercicioId: ejercicio.id, rir: linea.rir, subeCarga: false }
  const ultima = previas[0]

  if (!ultima || ultima.series.length === 0) {
    return {
      ...base,
      series: repetir(linea.series, { carga: null, reps: linea.repsMin }),
      porQue: `Primera vez: elegí una carga que te deje en RIR ${linea.rir} al llegar a ${linea.repsMin} reps.`,
    }
  }

  const cargaBase = cargaTipica(ultima.series)
  const inc = ejercicio.incremento || 2.5

  if (esDeload) {
    return {
      ...base,
      rir: 4,
      series: repetir(Math.max(1, Math.ceil(linea.series / 2)), { carga: cargaBase, reps: linea.repsMin }),
      porQue: 'Semana de descarga: mitad de series, misma carga, lejos del fallo (RIR 4).',
    }
  }

  if (diasDesdeUltima != null && diasDesdeUltima > DIAS_PAUSA_LARGA) {
    const carga = redondearA(cargaBase * FACTOR_PAUSA, inc)
    return {
      ...base,
      series: repetir(linea.series, { carga, reps: linea.repsMin }),
      porQue: `Pasaron ${diasDesdeUltima} días sin este ejercicio: arrancá un 8% más liviano y volvé a subir.`,
    }
  }

  const trabajo = ultima.series.filter((s) => s.carga === cargaBase)
  const todasAlTope = trabajo.length >= linea.series && trabajo.every((s) => s.reps >= linea.repsMax)
  const faltaRir = trabajo.some((s) => s.rir == null)
  const sinPasarse = trabajo.every((s) => s.rir != null && s.rir >= linea.rir)
  const algunaBajoMinimo = trabajo.some((s) => s.reps < linea.repsMin && s.rir != null && s.rir <= linea.rir)

  if (todasAlTope && !faltaRir && sinPasarse) {
    const incReal = inc * salto
    const carga = redondearA(cargaBase + incReal, inc)
    return {
      ...base,
      subeCarga: true,
      series: repetir(linea.series, { carga, reps: linea.repsMin }),
      porQue: salto > 1
        ? `Llegaste a ${linea.repsMax} en todas y ${motivoSalto ?? 'el objetivo venía conservador'}: salto doble, +${formatInc(incReal)} kg y volvés a ${linea.repsMin}.`
        : `Llegaste a ${linea.repsMax} en las ${linea.series} series con RIR ${linea.rir} o más: +${formatInc(inc)} kg y volvés a ${linea.repsMin}.`,
    }
  }

  if (todasAlTope && faltaRir) {
    return {
      ...base,
      series: repetir(linea.series, { carga: cargaBase, reps: linea.repsMax }),
      porQue: `Llegaste al tope del rango pero falta el RIR de alguna serie. Cargalo hoy: si fue RIR ${linea.rir} o más, la próxima subimos.`,
    }
  }

  if (algunaBajoMinimo) {
    const carga = Math.max(0, redondearA(cargaBase - inc, inc))
    return {
      ...base,
      series: repetir(linea.series, { carga, reps: linea.repsMin }),
      porQue: `No llegaste al mínimo del rango (${linea.repsMin}) con el esfuerzo previsto: bajá ${formatInc(inc)} kg y recuperá reps.`,
    }
  }

  // Misma carga, +1 rep en la serie más floja que no esté al tope.
  const series: ObjetivoSerie[] = []
  for (let i = 0; i < linea.series; i++) {
    const prev = trabajo[i] ?? trabajo[trabajo.length - 1]
    series.push({ carga: cargaBase, reps: Math.min(linea.repsMax, prev ? prev.reps : linea.repsMin) })
  }
  let idxFloja = -1
  let minReps = Infinity
  series.forEach((s, i) => {
    if (s.reps != null && s.reps < linea.repsMax && s.reps < minReps) {
      minReps = s.reps
      idxFloja = i
    }
  })
  if (idxFloja >= 0) series[idxFloja].reps = (series[idxFloja].reps ?? linea.repsMin) + 1

  return {
    ...base,
    series,
    porQue:
      idxFloja >= 0
        ? `Misma carga. Buscá ${series[idxFloja].reps} en la serie ${idxFloja + 1}; cuando todas lleguen a ${linea.repsMax}, subimos.`
        : `Misma carga: repetí ${linea.repsMax} en todas con RIR ${linea.rir} y la próxima subimos.`,
  }
}

/** Carga más frecuente entre las series de trabajo; en empate, la mayor. */
export function cargaTipica(series: SerieLog[]): number {
  const conteo = new Map<number, number>()
  for (const s of series) conteo.set(s.carga, (conteo.get(s.carga) ?? 0) + 1)
  let mejor = 0
  let mejorN = -1
  for (const [c, n] of conteo) {
    if (n > mejorN || (n === mejorN && c > mejor)) {
      mejor = c
      mejorN = n
    }
  }
  return mejor
}

function repetir(n: number, s: ObjetivoSerie): ObjetivoSerie[] {
  return Array.from({ length: n }, () => ({ ...s }))
}

function formatInc(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',')
}
