import { db } from './db'
import type { PlanActivo } from './repo'
import type { Bloque, Dia, DiaEjercicio, Ejercicio, Programa } from '../domain/types'
import { ahoraISO } from '../lib/fechas'
import { nuevoId } from '../lib/ids'

/**
 * Compartir una rutina por link: el bloque (días y líneas) y los ejercicios propios que use,
 * comprimido con gzip y codificado en base64url en el hash de la URL. Sin servidor ni cuentas.
 */
export interface RutinaCompartida {
  v: 1
  nombre: string
  descripcion: string
  semanas: number
  semanaDeload: number | null
  dias: { nombre: string; opcional: boolean; lineas: Omit<DiaEjercicio, 'id' | 'diaId' | 'activo' | 'superserieCon'>[] & { ss?: number }[] }[]
  ejerciciosCustom: Omit<Ejercicio, 'custom' | 'activo' | 'actualizado'>[]
}

export function serializarRutina(plan: PlanActivo, ejercicios: Map<string, Ejercicio>): RutinaCompartida {
  const usados = new Set(plan.lineas.map((l) => l.ejercicioId))
  const custom = [...usados].map((id) => ejercicios.get(id)).filter((e): e is Ejercicio => !!e && e.custom)
  return {
    v: 1,
    nombre: plan.programa.nombre,
    descripcion: plan.programa.descripcion,
    semanas: plan.bloque.semanas,
    semanaDeload: plan.bloque.semanaDeload,
    dias: plan.dias.map((d) => {
      const ls = plan.lineas.filter((l) => l.diaId === d.id).sort((a, b) => a.orden - b.orden)
      return {
        nombre: d.nombre,
        opcional: d.opcional,
        lineas: ls.map((l) => ({
          ejercicioId: l.ejercicioId, orden: l.orden, series: l.series, repsMin: l.repsMin, repsMax: l.repsMax, rir: l.rir,
          descansoSeg: l.descansoSeg, nota: l.nota,
          ...(l.superserieCon ? { ss: ls.findIndex((x) => x.id === l.superserieCon) } : {}),
        })),
      }
    }),
    ejerciciosCustom: custom.map(({ custom: _c, activo: _a, actualizado: _u, ...resto }) => resto),
  }
}

async function comprimir(texto: string): Promise<string> {
  const bytes = new TextEncoder().encode(texto)
  const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'))
  const buf = new Uint8Array(await new Response(stream).arrayBuffer())
  let bin = ''
  for (const b of buf) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function descomprimir(b64: string): Promise<string> {
  const bin = atob(b64.replace(/-/g, '+').replace(/_/g, '/'))
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
  return new Response(stream).text()
}

export async function linkDeRutina(plan: PlanActivo, ejercicios: Map<string, Ejercicio>): Promise<string> {
  const payload = await comprimir(JSON.stringify(serializarRutina(plan, ejercicios)))
  const base = `${location.origin}${location.pathname}`
  return `${base}#rutina=${payload}`
}

export async function leerRutinaDelHash(hash: string): Promise<RutinaCompartida | null> {
  const m = hash.match(/rutina=([A-Za-z0-9_-]+)/)
  if (!m) return null
  try {
    const r = JSON.parse(await descomprimir(m[1])) as RutinaCompartida
    return r && r.v === 1 && Array.isArray(r.dias) ? r : null
  } catch {
    return null
  }
}

/** Importa como programa nuevo y lo activa (el actual queda guardado, inactivo). */
export async function importarRutina(r: RutinaCompartida): Promise<void> {
  const ahora = ahoraISO()
  await db.transaction('rw', [db.ejercicios, db.programas, db.bloques, db.dias, db.diaEjercicios], async () => {
    for (const e of r.ejerciciosCustom) {
      if (!(await db.ejercicios.get(e.id))) await db.ejercicios.add({ ...e, custom: true, activo: true, actualizado: ahora })
    }
    await db.programas.toCollection().modify({ activo: false })
    const programa: Programa = { id: nuevoId(), nombre: r.nombre, descripcion: r.descripcion, creado: ahora, activo: true }
    const bloque: Bloque = { id: nuevoId(), programaId: programa.id, nombre: 'Bloque 1', orden: 1, semanas: r.semanas, semanaDeload: r.semanaDeload, fechaInicio: null, estado: 'activo', activo: true }
    await db.programas.add(programa)
    await db.bloques.add(bloque)
    for (const [i, d] of r.dias.entries()) {
      const dia: Dia = { id: nuevoId(), bloqueId: bloque.id, nombre: d.nombre, orden: i + 1, opcional: d.opcional, activo: true }
      await db.dias.add(dia)
      const ids = d.lineas.map(() => nuevoId())
      for (const [j, l] of d.lineas.entries()) {
        const { ss, ...resto } = l as typeof l & { ss?: number }
        await db.diaEjercicios.add({ ...resto, id: ids[j], diaId: dia.id, orden: j + 1, superserieCon: ss != null && ss >= 0 ? ids[ss] : null, activo: true })
      }
    }
  })
}
