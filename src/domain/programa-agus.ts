import type { Bloque, Dia, DiaEjercicio, Programa } from './types'

/**
 * Plan de Agus, bloque 1 (6 semanas, deload en la 6).
 * Torso A / Pierna A / Torso B / Pierna B + Día 5 opcional.
 * Diseñado el 2026-10-12. Los ids son deterministas para poder referenciar superseries.
 */

interface Linea {
  ej: string
  series: number
  lo: number
  hi: number
  rir: number
  desc: number
  ss?: boolean // superserie con la línea siguiente
  nota?: string
}

const DIAS: { nombre: string; opcional?: boolean; lineas: Linea[] }[] = [
  {
    nombre: 'Torso A',
    lineas: [
      { ej: 'press-banca-barra', series: 4, lo: 5, hi: 8, rir: 1, desc: 180, nota: 'Ejercicio ancla. Pausa breve en el pecho.' },
      { ej: 'jalon-pecho-prono', series: 3, lo: 8, hi: 12, rir: 1, desc: 120 },
      { ej: 'press-inclinado-mancuernas', series: 3, lo: 8, hi: 12, rir: 1, desc: 120 },
      { ej: 'remo-maquina-apoyado', series: 3, lo: 8, hi: 12, rir: 1, desc: 120 },
      { ej: 'laterales-polea', series: 3, lo: 12, hi: 15, rir: 0, desc: 60, ss: true },
      { ej: 'extension-triceps-sobre-cabeza', series: 2, lo: 10, hi: 12, rir: 0, desc: 60 },
      { ej: 'curl-inclinado-mancuernas', series: 2, lo: 10, hi: 12, rir: 0, desc: 60 },
    ],
  },
  {
    nombre: 'Pierna A',
    lineas: [
      { ej: 'prensa-45', series: 4, lo: 6, hi: 10, rir: 1, desc: 180, nota: 'Profunda, pies al medio.' },
      { ej: 'curl-femoral-sentado', series: 3, lo: 8, hi: 12, rir: 0, desc: 90 },
      { ej: 'sentadilla-smith', series: 3, lo: 8, hi: 12, rir: 1, desc: 150 },
      { ej: 'extension-cuadriceps', series: 2, lo: 10, hi: 15, rir: 0, desc: 90, nota: 'Última serie: fallo + 5 parciales abajo.' },
      { ej: 'gemelos-prensa', series: 4, lo: 8, hi: 12, rir: 0, desc: 90 },
      { ej: 'crunch-polea', series: 2, lo: 10, hi: 15, rir: 0, desc: 60 },
    ],
  },
  {
    nombre: 'Torso B',
    lineas: [
      { ej: 'press-militar-mancuernas', series: 3, lo: 6, hi: 10, rir: 1, desc: 150 },
      { ej: 'remo-polea-baja-neutro', series: 3, lo: 8, hi: 12, rir: 1, desc: 120 },
      { ej: 'jalon-neutro-estrecho', series: 3, lo: 8, hi: 12, rir: 1, desc: 120 },
      { ej: 'peck-deck', series: 2, lo: 10, hi: 15, rir: 0, desc: 90 },
      { ej: 'laterales-mancuerna', series: 3, lo: 10, hi: 15, rir: 0, desc: 60, ss: true },
      { ej: 'pajaros-maquina', series: 2, lo: 12, hi: 15, rir: 0, desc: 60 },
      { ej: 'curl-barra-w', series: 3, lo: 8, hi: 12, rir: 0, desc: 60, ss: true },
      { ej: 'triceps-polea', series: 3, lo: 8, hi: 12, rir: 0, desc: 60 },
    ],
  },
  {
    nombre: 'Pierna B',
    lineas: [
      { ej: 'rumano-mancuernas', series: 3, lo: 8, hi: 12, rir: 2, desc: 150, nota: 'Si molesta la lumbar, cambiá a hip thrust en Smith.' },
      { ej: 'prensa-45-pies-altos', series: 3, lo: 8, hi: 12, rir: 1, desc: 150 },
      { ej: 'curl-femoral-tumbado', series: 3, lo: 8, hi: 12, rir: 0, desc: 90 },
      { ej: 'extension-cuadriceps', series: 3, lo: 10, hi: 15, rir: 0, desc: 90, nota: 'Última serie: fallo + parciales.' },
      { ej: 'gemelos-sentado', series: 3, lo: 10, hi: 15, rir: 0, desc: 75 },
      { ej: 'elevacion-piernas', series: 2, lo: 10, hi: 15, rir: 0, desc: 60 },
    ],
  },
  {
    nombre: 'Día 5 · Brazos y hombros',
    opcional: true,
    lineas: [
      { ej: 'laterales-polea', series: 3, lo: 12, hi: 15, rir: 0, desc: 60 },
      { ej: 'remo-mancuerna', series: 3, lo: 8, hi: 12, rir: 1, desc: 120, nota: 'O un jalón distinto al de la semana.' },
      { ej: 'curl-inclinado-mancuernas', series: 3, lo: 10, hi: 12, rir: 0, desc: 60, ss: true },
      { ej: 'extension-triceps-sobre-cabeza', series: 3, lo: 10, hi: 12, rir: 0, desc: 60 },
      { ej: 'pajaros-maquina', series: 2, lo: 12, hi: 15, rir: 0, desc: 60 },
    ],
  },
]

export interface PlanInicial {
  programa: Programa
  bloque: Bloque
  dias: Dia[]
  diaEjercicios: DiaEjercicio[]
}

export function programaAgus(ahora: string): PlanInicial {
  const programa: Programa = {
    id: 'prog-agus-2026',
    nombre: 'Torso / Pierna 4+1',
    descripcion: 'Cada músculo 2× por semana, sesiones de 60 min, día 5 opcional de brazos y hombros.',
    creado: ahora,
    activo: true,
  }
  const bloque: Bloque = {
    id: 'bloque-1',
    programaId: programa.id,
    nombre: 'Bloque 1 · Base',
    orden: 1,
    semanas: 6,
    semanaDeload: 6,
    fechaInicio: null,
    estado: 'activo',
    activo: true,
  }
  const dias: Dia[] = []
  const diaEjercicios: DiaEjercicio[] = []

  DIAS.forEach((d, di) => {
    const diaId = `b1-d${di + 1}`
    dias.push({ id: diaId, bloqueId: bloque.id, nombre: d.nombre, orden: di + 1, opcional: !!d.opcional, activo: true })
    d.lineas.forEach((l, li) => {
      const id = `${diaId}-e${li + 1}`
      diaEjercicios.push({
        id,
        diaId,
        ejercicioId: l.ej,
        orden: li + 1,
        series: l.series,
        repsMin: l.lo,
        repsMax: l.hi,
        rir: l.rir,
        descansoSeg: l.desc,
        superserieCon: l.ss ? `${diaId}-e${li + 2}` : null,
        nota: l.nota ?? '',
        activo: true,
      })
    })
    // la segunda mitad de la superserie apunta de vuelta a la primera
    diaEjercicios.forEach((de) => {
      if (de.superserieCon) {
        const par = diaEjercicios.find((x) => x.id === de.superserieCon)
        if (par && !par.superserieCon) par.superserieCon = de.id
      }
    })
  })

  return { programa, bloque, dias, diaEjercicios }
}
