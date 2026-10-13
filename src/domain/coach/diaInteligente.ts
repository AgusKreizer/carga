import type { Dia, DiaEjercicio, Ejercicio, MusculoId } from '../types'
import { MUSCULOS } from '../types'
import type { FatigaMusculo } from './fatiga'

export interface EvaluacionDia {
  dia: Dia
  /** fatiga promedio ponderada por series de los músculos que entrena (0–100) */
  carga: number
  /** músculos más fatigados que ese día entrena, de mayor a menor */
  fatigados: { m: MusculoId; fatiga: number; series: number }[]
}

export interface ConsejoDia {
  /** una línea sobre el día propuesto */
  lectura: string
  tono: 'ok' | 'aviso'
  /** día alternativo sugerido si el propuesto cae sobre músculos muy cargados */
  alternativa: { dia: Dia; motivo: string } | null
  evaluaciones: EvaluacionDia[]
}

const UMBRAL_CARGADO = 50
const UMBRAL_FRESCO = 35
const DIFERENCIA_MINIMA = 20

/** Series fraccionales por músculo de un día del plan. */
export function musculosDelDia(dia: Dia, lineas: DiaEjercicio[], ejercicios: Map<string, Ejercicio>, factorIndirecto = 0.5): Partial<Record<MusculoId, number>> {
  const out: Partial<Record<MusculoId, number>> = {}
  for (const l of lineas) {
    if (l.diaId !== dia.id || !l.activo) continue
    const ej = ejercicios.get(l.ejercicioId)
    if (!ej) continue
    for (const [m, f] of Object.entries(ej.musculos) as [MusculoId, number][]) {
      const ff = f >= 1 ? 1 : (f / 0.5) * factorIndirecto
      if (ff > 0) out[m] = (out[m] ?? 0) + l.series * ff
    }
  }
  return out
}

export function evaluarDia(dia: Dia, lineas: DiaEjercicio[], ejercicios: Map<string, Ejercicio>, fatiga: Partial<Record<MusculoId, FatigaMusculo>>, factorIndirecto = 0.5): EvaluacionDia {
  const musc = musculosDelDia(dia, lineas, ejercicios, factorIndirecto)
  let suma = 0
  let peso = 0
  const fatigados: EvaluacionDia['fatigados'] = []
  for (const [m, series] of Object.entries(musc) as [MusculoId, number][]) {
    const f = fatiga[m]?.fatiga ?? 0
    suma += f * series
    peso += series
    if (f >= UMBRAL_CARGADO && series >= 2) fatigados.push({ m, fatiga: f, series })
  }
  fatigados.sort((a, b) => b.fatiga - a.fatiga)
  return { dia, carga: peso ? Math.round(suma / peso) : 0, fatigados }
}

/**
 * Consejo para hoy: lee la fatiga de los músculos del día propuesto y, si están muy cargados
 * y hay otro día del plan claramente más fresco, lo sugiere. Nunca sugiere saltear.
 */
export function consejoDeHoy(
  propuesto: Dia,
  dias: Dia[],
  lineas: DiaEjercicio[],
  ejercicios: Map<string, Ejercicio>,
  fatiga: Partial<Record<MusculoId, FatigaMusculo>>,
  factorIndirecto = 0.5,
): ConsejoDia {
  const candidatos = dias.filter((d) => !d.opcional && d.activo)
  const evaluaciones = candidatos.map((d) => evaluarDia(d, lineas, ejercicios, fatiga, factorIndirecto))
  const ev = evaluaciones.find((e) => e.dia.id === propuesto.id) ?? evaluarDia(propuesto, lineas, ejercicios, fatiga, factorIndirecto)
  const hayDatos = Object.keys(fatiga).length > 0

  if (!hayDatos) {
    return { lectura: 'Sin sesiones recientes: todo fresco. Hoy va tal cual.', tono: 'ok', alternativa: null, evaluaciones }
  }

  const top = ev.fatigados[0]
  let lectura: string
  let tono: ConsejoDia['tono'] = 'ok'
  if (!top) {
    lectura = `Músculos de ${propuesto.nombre} frescos (${ev.carga} % de fatiga media): día para apretar.`
  } else {
    tono = 'aviso'
    const lista = ev.fatigados.slice(0, 2).map((f) => `${MUSCULOS[f.m].toLowerCase()} al ${f.fatiga} %`).join(' y ')
    lectura = `${propuesto.nombre} hoy con ${lista}. Normal si venís de la sesión anterior; si rendís menos, no es estancamiento. Si duele, bajá una serie.`
  }

  let alternativa: ConsejoDia['alternativa'] = null
  if (ev.carga >= UMBRAL_CARGADO) {
    const mejor = evaluaciones.filter((e) => e.dia.id !== propuesto.id).sort((a, b) => a.carga - b.carga)[0]
    if (mejor && mejor.carga <= UMBRAL_FRESCO && ev.carga - mejor.carga >= DIFERENCIA_MINIMA) {
      alternativa = { dia: mejor.dia, motivo: `${mejor.dia.nombre} tiene los músculos frescos (${mejor.carga} % contra ${ev.carga} %). Si hoy podés elegir, conviene ese y dejar ${propuesto.nombre} para mañana o pasado.` }
    }
  }
  return { lectura, tono, alternativa, evaluaciones }
}
