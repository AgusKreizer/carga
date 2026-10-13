import { redondearA } from '../../lib/formato'

export interface SerieCalentamiento { carga: number; reps: number }

/**
 * Calentamiento sugerido para un compuesto. Primer ejercicio de la sesión: 3 aproximaciones
 * (40 %, 60 %, 80 %); compuestos siguientes: 1 (70 %). Nada por debajo de 30 kg de carga de trabajo.
 */
export function calentamientoSugerido(cargaTrabajo: number, incremento: number, primero: boolean): SerieCalentamiento[] {
  if (cargaTrabajo < 30) return []
  const paso = incremento > 0 ? incremento : 2.5
  const r = (f: number) => Math.max(paso, redondearA(cargaTrabajo * f, paso))
  if (primero) return [{ carga: r(0.4), reps: 8 }, { carga: r(0.6), reps: 5 }, { carga: r(0.8), reps: 3 }]
  return [{ carga: r(0.7), reps: 4 }]
}
