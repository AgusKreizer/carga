import { describe, expect, it } from 'vitest'
import { calcularFatiga } from './fatiga'
import type { Ejercicio, SerieLog, Sesion } from '../types'

const press: Ejercicio = {
  id: 'press', nombre: 'Press', patron: 'empuje-horizontal', musculos: { pecho: 1, triceps: 0.5 }, equipo: 'barra',
  repsMin: 8, repsMax: 12, rir: 1, descansoSeg: 120, evitarSi: [], nota: '', porQue: '', incremento: 2.5, custom: false, activo: true, actualizado: '',
}
const sesion = (id: string, fecha: string, extra: Partial<Sesion> = {}): Sesion => ({
  id, diaId: 'd', diaNombre: 'Torso A', bloqueId: 'b', semana: 1, esDeload: false, fechaInicio: fecha, fechaFin: fecha,
  estado: 'terminada', snapshot: [], energia: 2, dolor: 0, sueno: 2, notas: '', activo: true, ...extra,
})
const serie = (sesionId: string, ts: string, rir: number | null, n: number): SerieLog => ({
  id: `${sesionId}-${n}`, sesionId, diaEjercicioId: 'l', ejercicioId: 'press', ejercicioPlanId: 'press', orden: n,
  objetivoCarga: null, objetivoReps: null, rirObjetivo: 1, carga: 80, reps: 10, rir, calentamiento: false, ts, activo: true,
})
const ej = new Map([['press', press]])

describe('calcularFatiga', () => {
  it('10 series de compuesto a RIR 1 recién hechas ≈ 82 % en pecho y la mitad en tríceps (indirecto)', () => {
    const ses = new Map([['s1', sesion('s1', '2026-10-12T18:00:00Z')]])
    const series = Array.from({ length: 10 }, (_, i) => serie('s1', '2026-10-12T18:00:00Z', 1, i + 1))
    const f = calcularFatiga(series, ses, ej, '2026-10-12T19:00:00Z')
    expect(f.pecho!.fatiga).toBeGreaterThanOrEqual(78)
    expect(f.pecho!.fatiga).toBeLessThanOrEqual(84)
    expect(f.triceps!.fatiga).toBeLessThan(f.pecho!.fatiga)
  })
  it('a las 48 h el pecho (vida media 48 h) queda cerca del 58 %', () => {
    const ses = new Map([['s1', sesion('s1', '2026-10-12T18:00:00Z')]])
    const series = Array.from({ length: 10 }, (_, i) => serie('s1', '2026-10-12T18:00:00Z', 1, i + 1))
    const f = calcularFatiga(series, ses, ej, '2026-10-14T18:00:00Z')
    expect(f.pecho!.fatiga).toBeGreaterThanOrEqual(54)
    expect(f.pecho!.fatiga).toBeLessThanOrEqual(62)
  })
  it('el fallo fatiga más que RIR 3', () => {
    const ses = new Map([['s1', sesion('s1', '2026-10-12T18:00:00Z')]])
    const alFallo = calcularFatiga([serie('s1', '2026-10-12T18:00:00Z', 0, 1)], ses, ej, '2026-10-12T18:30:00Z')
    const lejos = calcularFatiga([serie('s1', '2026-10-12T18:00:00Z', 3, 1)], ses, ej, '2026-10-12T18:30:00Z')
    expect(alFallo.pecho!.fatiga).toBeGreaterThan(lejos.pecho!.fatiga)
  })
  it('sueño malo frena la recuperación', () => {
    const bien = new Map([['s1', sesion('s1', '2026-10-12T18:00:00Z')]])
    const mal = new Map([['s1', sesion('s1', '2026-10-12T18:00:00Z', { sueno: 1 })]])
    const series = Array.from({ length: 6 }, (_, i) => serie('s1', '2026-10-12T18:00:00Z', 1, i + 1))
    expect(calcularFatiga(series, mal, ej, '2026-10-14T18:00:00Z').pecho!.fatiga).toBeGreaterThan(calcularFatiga(series, bien, ej, '2026-10-14T18:00:00Z').pecho!.fatiga)
  })
  it('más de 10 días atrás no cuenta', () => {
    const ses = new Map([['s1', sesion('s1', '2026-09-20T18:00:00Z')]])
    const f = calcularFatiga([serie('s1', '2026-09-20T18:00:00Z', 1, 1)], ses, ej, '2026-10-12T18:00:00Z')
    expect(f.pecho).toBeUndefined()
  })
})
