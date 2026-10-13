import { describe, expect, it } from 'vitest'
import { generarRutina } from './generador'
import { catalogoInicial } from './catalogo'

const catalogo = catalogoInicial('2026-10-13T00:00:00Z')

describe('generarRutina', () => {
  it('4 días con gimnasio completo: 4 días, sin avisos, todo dentro del tiempo', () => {
    const r = generarRutina({ nivel: 'intermedio', diasPorSemana: 4, minutos: 60, equipo: ['barra', 'mancuerna', 'maquina', 'polea', 'smith'], molestias: [], prioridades: ['espalda'] }, catalogo, '2026-10-13T00:00:00Z')
    expect(r.dias).toHaveLength(4)
    expect(r.avisos).toHaveLength(0)
    expect(r.lineas.length).toBeGreaterThan(20)
  })
  it('respeta molestias: con muñeca no aparece la barra W ni elevación de piernas colgado', () => {
    const r = generarRutina({ nivel: 'principiante', diasPorSemana: 3, minutos: 45, equipo: ['maquina', 'polea', 'mancuerna'], molestias: ['muneca', 'lumbar'], prioridades: [] }, catalogo, '2026-10-13T00:00:00Z')
    const ids = r.lineas.map((l) => l.ejercicioId)
    expect(ids).not.toContain('elevacion-piernas')
    expect(ids).not.toContain('rumano-mancuernas')
    expect(ids.every((id) => { const e = catalogo.find((x) => x.id === id)!; return ['maquina', 'polea', 'mancuerna', 'peso-corporal'].includes(e.equipo) })).toBe(true)
  })
  it('poco tiempo recorta series', () => {
    const largo = generarRutina({ nivel: 'intermedio', diasPorSemana: 4, minutos: 90, equipo: ['barra', 'mancuerna', 'maquina', 'polea', 'smith'], molestias: [], prioridades: [] }, catalogo, '2026-10-13T00:00:00Z')
    const corto = generarRutina({ nivel: 'intermedio', diasPorSemana: 4, minutos: 40, equipo: ['barra', 'mancuerna', 'maquina', 'polea', 'smith'], molestias: [], prioridades: [] }, catalogo, '2026-10-13T00:00:00Z')
    const series = (r: typeof largo) => r.lineas.reduce((a, l) => a + l.series, 0)
    expect(series(corto)).toBeLessThan(series(largo))
  })
  it('prioridad suma una serie', () => {
    const sin = generarRutina({ nivel: 'intermedio', diasPorSemana: 4, minutos: 90, equipo: ['barra', 'mancuerna', 'maquina', 'polea', 'smith'], molestias: [], prioridades: [] }, catalogo, '2026-10-13T00:00:00Z')
    const con = generarRutina({ nivel: 'intermedio', diasPorSemana: 4, minutos: 90, equipo: ['barra', 'mancuerna', 'maquina', 'polea', 'smith'], molestias: [], prioridades: ['deltLat'] }, catalogo, '2026-10-13T00:00:00Z')
    const s = (r: typeof sin) => r.lineas.filter((l) => l.ejercicioId.startsWith('laterales')).reduce((a, l) => a + l.series, 0)
    expect(s(con)).toBeGreaterThan(s(sin))
  })
})
