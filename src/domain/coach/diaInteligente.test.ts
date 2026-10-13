import { describe, expect, it } from 'vitest'
import { consejoDeHoy } from './diaInteligente'
import type { Dia, DiaEjercicio, Ejercicio } from '../types'

const ej = (id: string, musculos: Ejercicio['musculos']): Ejercicio => ({
  id, nombre: id, patron: 'empuje-horizontal', musculos, equipo: 'maquina', repsMin: 8, repsMax: 12, rir: 1, descansoSeg: 90,
  evitarSi: [], nota: '', porQue: '', incremento: 5, custom: false, activo: true, actualizado: '',
})
const ejercicios = new Map([['press', ej('press', { pecho: 1, triceps: 0.5 })], ['prensa', ej('prensa', { cuads: 1, gluteos: 0.5 })]])
const dias: Dia[] = [
  { id: 'torso', bloqueId: 'b', nombre: 'Torso A', orden: 1, opcional: false, activo: true },
  { id: 'pierna', bloqueId: 'b', nombre: 'Pierna A', orden: 2, opcional: false, activo: true },
]
const lineas: DiaEjercicio[] = [
  { id: 'l1', diaId: 'torso', ejercicioId: 'press', orden: 1, series: 4, repsMin: 8, repsMax: 12, rir: 1, descansoSeg: 90, superserieCon: null, nota: '', activo: true },
  { id: 'l2', diaId: 'pierna', ejercicioId: 'prensa', orden: 1, series: 4, repsMin: 8, repsMax: 12, rir: 1, descansoSeg: 90, superserieCon: null, nota: '', activo: true },
]
const f = (fatiga: number) => ({ fatiga, ultimaFecha: null, seriesUltima: 0 })

describe('consejoDeHoy', () => {
  it('sin datos: todo fresco', () => {
    const c = consejoDeHoy(dias[0], dias, lineas, ejercicios, {})
    expect(c.tono).toBe('ok')
    expect(c.alternativa).toBeNull()
  })
  it('día propuesto cargado y alternativa fresca → sugiere la alternativa', () => {
    const c = consejoDeHoy(dias[0], dias, lineas, ejercicios, { pecho: f(80), triceps: f(70), cuads: f(10), gluteos: f(5) })
    expect(c.tono).toBe('aviso')
    expect(c.alternativa?.dia.id).toBe('pierna')
  })
  it('todo cargado → avisa pero no sugiere cambiar', () => {
    const c = consejoDeHoy(dias[0], dias, lineas, ejercicios, { pecho: f(80), triceps: f(70), cuads: f(75), gluteos: f(60) })
    expect(c.tono).toBe('aviso')
    expect(c.alternativa).toBeNull()
  })
  it('propuesto fresco → ok sin alternativa', () => {
    const c = consejoDeHoy(dias[0], dias, lineas, ejercicios, { pecho: f(20), cuads: f(90) })
    expect(c.tono).toBe('ok')
    expect(c.alternativa).toBeNull()
  })
})
