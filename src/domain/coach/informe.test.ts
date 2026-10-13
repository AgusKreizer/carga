import { describe, expect, it } from 'vitest'
import { informeDeBloque } from './informe'
import { calentamientoSugerido } from './calentamiento'
import type { Bloque, Dia, DiaEjercicio, Ejercicio, SerieLog, Sesion } from '../types'

const ej: Ejercicio = {
  id: 'press', nombre: 'Press', patron: 'empuje-horizontal', musculos: { pecho: 1 }, equipo: 'barra',
  repsMin: 8, repsMax: 12, rir: 1, descansoSeg: 120, evitarSi: [], nota: '', porQue: '', incremento: 2.5, custom: false, activo: true, actualizado: '',
}
const bloque: Bloque = { id: 'b', programaId: 'p', nombre: 'B1', orden: 1, semanas: 4, semanaDeload: null, fechaInicio: '2026-09-14', estado: 'activo', activo: true }
const dias: Dia[] = [{ id: 'd1', bloqueId: 'b', nombre: 'Torso', orden: 1, opcional: false, activo: true }]
const lineas: DiaEjercicio[] = [{ id: 'l1', diaId: 'd1', ejercicioId: 'press', orden: 1, series: 3, repsMin: 8, repsMax: 12, rir: 1, descansoSeg: 120, superserieCon: null, nota: '', activo: true }]
const ses = (id: string, fecha: string): Sesion => ({ id, diaId: 'd1', diaNombre: 'Torso', bloqueId: 'b', semana: 1, esDeload: false, fechaInicio: `${fecha}T18:00:00Z`, fechaFin: `${fecha}T18:50:00Z`, estado: 'terminada', snapshot: [], energia: null, dolor: null, sueno: null, notas: '', activo: true })
const serie = (sid: string, carga: number, reps: number): SerieLog => ({ id: `${sid}-${carga}-${reps}-${Math.random()}`, sesionId: sid, diaEjercicioId: 'l1', ejercicioId: 'press', ejercicioPlanId: 'press', orden: 1, objetivoCarga: null, objetivoReps: null, rirObjetivo: 1, carga, reps, rir: 1, calentamiento: false, ts: '', activo: true })

describe('informeDeBloque', () => {
  it('detecta progreso, PRs y recomienda seguir', () => {
    const sesiones = [ses('s1', '2026-09-15'), ses('s2', '2026-09-22'), ses('s3', '2026-09-29'), ses('s4', '2026-10-06')]
    const series = [serie('s1', 80, 10), serie('s2', 80, 12), serie('s3', 82.5, 9), serie('s4', 85, 8)]
    const inf = informeDeBloque({ bloque, dias, lineas, sesiones, series, ejercicios: new Map([['press', ej]]), pesos: [], medidas: [], prioridades: [] })
    expect(inf.ejercicios[0].estado).toBe('progreso')
    expect(inf.prs).toBe(2)
    expect(inf.sesionesHechas).toBe(4)
  })
  it('estancado 3 sesiones → recomienda +1 serie o cambio', () => {
    const sesiones = [ses('s1', '2026-09-15'), ses('s2', '2026-09-22'), ses('s3', '2026-09-29')]
    const series = [serie('s1', 80, 10), serie('s2', 80, 10), serie('s3', 80, 10)]
    const inf = informeDeBloque({ bloque, dias, lineas, sesiones, series, ejercicios: new Map([['press', ej]]), pesos: [], medidas: [], prioridades: [] })
    expect(inf.ejercicios[0].estado).toBe('estancado')
    expect(inf.recomendaciones.some((r) => r.tipo === 'ejercicio')).toBe(true)
  })
})

describe('calentamientoSugerido', () => {
  it('primer ejercicio: 3 aproximaciones redondeadas', () => {
    expect(calentamientoSugerido(100, 2.5, true)).toEqual([{ carga: 40, reps: 8 }, { carga: 60, reps: 5 }, { carga: 80, reps: 3 }])
  })
  it('nada por debajo de 30 kg', () => {
    expect(calentamientoSugerido(20, 2, true)).toEqual([])
  })
})
