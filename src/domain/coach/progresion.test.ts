import { describe, expect, it } from 'vitest'
import { objetivoParaHoy } from './progresion'
import { detectarEstancamiento } from './estancamiento'
import type { DiaEjercicio, Ejercicio, SerieLog } from '../types'

const ejercicio: Ejercicio = {
  id: 'press', nombre: 'Press', patron: 'empuje-horizontal', musculos: { pecho: 1 }, equipo: 'barra',
  repsMin: 8, repsMax: 12, rir: 1, descansoSeg: 120, evitarSi: [], nota: '', porQue: '', incremento: 2.5,
  custom: false, activo: true, actualizado: '',
}
const linea: DiaEjercicio = {
  id: 'l1', diaId: 'd1', ejercicioId: 'press', orden: 1, series: 3, repsMin: 8, repsMax: 12, rir: 1,
  descansoSeg: 120, superserieCon: null, nota: '', activo: true,
}
const serie = (carga: number, reps: number, rir: number | null, orden = 1): SerieLog => ({
  id: `s${orden}-${carga}-${reps}`, sesionId: 'x', diaEjercicioId: 'l1', ejercicioId: 'press', ejercicioPlanId: 'press',
  orden, objetivoCarga: null, objetivoReps: null, rirObjetivo: 1, carga, reps, rir, calentamiento: false, ts: '', activo: true,
})
const sesion = (fecha: string, ...series: SerieLog[]) => ({ fechaInicio: fecha, series })

describe('objetivoParaHoy', () => {
  it('sin historial: carga libre y reps mínimas', () => {
    const o = objetivoParaHoy({ linea, ejercicio, previas: [], esDeload: false, diasDesdeUltima: null })
    expect(o.series).toHaveLength(3)
    expect(o.series[0]).toEqual({ carga: null, reps: 8 })
  })

  it('sube carga cuando todas las series llegan al tope con RIR ≥ objetivo', () => {
    const previas = [sesion('2026-10-01', serie(80, 12, 1, 1), serie(80, 12, 2, 2), serie(80, 12, 1, 3))]
    const o = objetivoParaHoy({ linea, ejercicio, previas, esDeload: false, diasDesdeUltima: 3 })
    expect(o.subeCarga).toBe(true)
    expect(o.series[0]).toEqual({ carga: 82.5, reps: 8 })
  })

  it('NO sube si llegó al tope pasándose de esfuerzo (RIR real menor que el objetivo)', () => {
    const previas = [sesion('2026-10-01', serie(80, 12, 0, 1), serie(80, 12, 0, 2), serie(80, 12, 0, 3))]
    const o = objetivoParaHoy({ linea, ejercicio, previas, esDeload: false, diasDesdeUltima: 3 })
    expect(o.subeCarga).toBe(false)
    expect(o.series[0].carga).toBe(80)
  })

  it('NO sube si falta el RIR; pide el dato', () => {
    const previas = [sesion('2026-10-01', serie(80, 12, null, 1), serie(80, 12, 1, 2), serie(80, 12, 1, 3))]
    const o = objetivoParaHoy({ linea, ejercicio, previas, esDeload: false, diasDesdeUltima: 3 })
    expect(o.subeCarga).toBe(false)
    expect(o.porQue).toMatch(/RIR/)
  })

  it('misma carga y +1 rep en la serie más floja', () => {
    const previas = [sesion('2026-10-01', serie(80, 11, 1, 1), serie(80, 10, 1, 2), serie(80, 9, 1, 3))]
    const o = objetivoParaHoy({ linea, ejercicio, previas, esDeload: false, diasDesdeUltima: 3 })
    expect(o.series.map((s) => s.reps)).toEqual([11, 10, 10])
    expect(o.series.every((s) => s.carga === 80)).toBe(true)
  })

  it('baja carga si no llegó al mínimo con el esfuerzo previsto', () => {
    const previas = [sesion('2026-10-01', serie(90, 8, 1, 1), serie(90, 6, 0, 2), serie(90, 5, 0, 3))]
    const o = objetivoParaHoy({ linea, ejercicio, previas, esDeload: false, diasDesdeUltima: 3 })
    expect(o.series[0].carga).toBe(87.5)
  })

  it('deload: mitad de series, misma carga, RIR 4', () => {
    const previas = [sesion('2026-10-01', serie(80, 10, 1, 1), serie(80, 10, 1, 2), serie(80, 10, 1, 3))]
    const o = objetivoParaHoy({ linea, ejercicio, previas, esDeload: true, diasDesdeUltima: 3 })
    expect(o.series).toHaveLength(2)
    expect(o.rir).toBe(4)
    expect(o.series[0].carga).toBe(80)
  })

  it('pausa larga: 8% menos redondeado al incremento', () => {
    const previas = [sesion('2026-09-01', serie(80, 10, 1, 1), serie(80, 10, 1, 2), serie(80, 10, 1, 3))]
    const o = objetivoParaHoy({ linea, ejercicio, previas, esDeload: false, diasDesdeUltima: 15 })
    expect(o.series[0].carga).toBe(72.5)
  })
})

describe('detectarEstancamiento', () => {
  it('3 sesiones iguales con esfuerzo correcto = estancado', () => {
    const s = [
      sesion('2026-10-10', serie(80, 10, 1), serie(80, 10, 1)),
      sesion('2026-10-07', serie(80, 10, 1), serie(80, 10, 1)),
      sesion('2026-10-04', serie(80, 10, 1), serie(80, 10, 1)),
    ]
    expect(detectarEstancamiento(s, 1).estancado).toBe(true)
  })
  it('si subieron reps no está estancado', () => {
    const s = [
      sesion('2026-10-10', serie(80, 11, 1), serie(80, 10, 1)),
      sesion('2026-10-07', serie(80, 10, 1), serie(80, 10, 1)),
      sesion('2026-10-04', serie(80, 10, 1), serie(80, 10, 1)),
    ]
    expect(detectarEstancamiento(s, 1).estancado).toBe(false)
  })
  it('sin RIR no concluye', () => {
    const s = [
      sesion('2026-10-10', serie(80, 10, null), serie(80, 10, 1)),
      sesion('2026-10-07', serie(80, 10, 1), serie(80, 10, 1)),
      sesion('2026-10-04', serie(80, 10, 1), serie(80, 10, 1)),
    ]
    const r = detectarEstancamiento(s, 1)
    expect(r.estancado).toBe(false)
    expect(r.datosDudosos).toBe(true)
  })
})
