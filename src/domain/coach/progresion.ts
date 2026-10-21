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
      porQue: `Primera vez con este ejercicio. Elegí un peso con el que llegues a ${linea.repsMin} reps ${sobra(linea.rir)}. La próxima vez te digo cuánto poner.`,
    }
  }

  const cargaBase = cargaTipica(ultima.series)
  const inc = ejercicio.incremento || 2.5

  if (esDeload) {
    return {
      ...base,
      rir: 4,
      series: repetir(Math.max(1, Math.ceil(linea.series / 2)), { carga: cargaBase, reps: linea.repsMin }),
      porQue: `Semana liviana para recuperarte: mismo peso (${formatInc(cargaBase)} kg), la mitad de series, y terminá cada serie sintiendo que podías hacer 4 reps más.`,
    }
  }

  if (diasDesdeUltima != null && diasDesdeUltima > DIAS_PAUSA_LARGA) {
    const carga = redondearA(cargaBase * FACTOR_PAUSA, inc)
    return {
      ...base,
      series: repetir(linea.series, { carga, reps: linea.repsMin }),
      porQue: `Hace ${diasDesdeUltima} días que no hacés este ejercicio: hoy usá ${formatInc(carga)} kg, un poco menos que la última vez (${formatInc(cargaBase)} kg). En las próximas sesiones volvés a subir.`,
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
        ? `Subí a ${formatInc(carga)} kg (+${formatInc(incReal)}, salto doble). La vez pasada hiciste ${linea.repsMax} reps en todas las series y ${motivoSalto ?? 'te venía sobrando'}. Hoy apuntá a ${linea.repsMin} reps por serie.`
        : `Subí a ${formatInc(carga)} kg (+${formatInc(inc)}). La vez pasada hiciste ${linea.repsMax} reps en todas las series sin llegar al límite. Hoy apuntá a ${linea.repsMin} reps por serie: es normal que cueste más.`,
    }
  }

  if (todasAlTope && faltaRir) {
    return {
      ...base,
      series: repetir(linea.series, { carga: cargaBase, reps: linea.repsMax }),
      porQue: `Mismo peso: ${formatInc(cargaBase)} kg. La vez pasada llegaste a ${linea.repsMax} reps, pero en alguna serie no anotaste cuántas reps te sobraban (RIR). Hoy anotalo: si te sobró al menos ${linea.rir}, la próxima vez sube el peso.`,
    }
  }

  if (algunaBajoMinimo) {
    const carga = Math.max(0, redondearA(cargaBase - inc, inc))
    return {
      ...base,
      series: repetir(linea.series, { carga, reps: linea.repsMin }),
      porQue: `Bajá a ${formatInc(carga)} kg (−${formatInc(inc)}). La vez pasada no llegaste a ${linea.repsMin} reps en alguna serie: con un poco menos de peso vas a hacer las reps que pide el rango (${linea.repsMin}–${linea.repsMax}).`,
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
        ? `Mismo peso: ${formatInc(cargaBase)} kg. Hoy intentá 1 rep más en la serie ${idxFloja + 1} (${(series[idxFloja].reps ?? 1) - 1} → ${series[idxFloja].reps}); las demás, igual que la vez pasada. Cuando hagas ${linea.repsMax} reps en todas, sube el peso.`
        : `Mismo peso: ${formatInc(cargaBase)} kg. Hacé ${linea.repsMax} reps en todas las series ${sobra(linea.rir)} y la próxima vez sube el peso.`,
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

/** RIR en palabras: "sintiendo que te queda 1 rep más". */
function sobra(rir: number): string {
  if (rir <= 0) return 'hasta no poder hacer una más'
  return `sintiendo que te ${rir === 1 ? 'queda 1 rep' : `quedan ${rir} reps`} más (RIR ${rir})`
}

function formatInc(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',')
}
