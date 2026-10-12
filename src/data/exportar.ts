import { db } from './db'

export const VERSION_FORMATO = 1

export interface Respaldo {
  app: 'carga'
  version: number
  fecha: string
  tablas: Record<string, unknown[]>
}

const TABLAS = [
  'ejercicios', 'programas', 'bloques', 'dias', 'diaEjercicios',
  'sesiones', 'series', 'pesos', 'medidas', 'coachEventos', 'ajustes',
] as const

export async function exportarTodo(): Promise<Respaldo> {
  const tablas: Record<string, unknown[]> = {}
  for (const t of TABLAS) tablas[t] = await db.table(t).toArray()
  return { app: 'carga', version: VERSION_FORMATO, fecha: new Date().toISOString(), tablas }
}

export function validarRespaldo(x: unknown): x is Respaldo {
  if (!x || typeof x !== 'object') return false
  const r = x as Partial<Respaldo>
  return r.app === 'carga' && typeof r.version === 'number' && !!r.tablas && typeof r.tablas === 'object'
}

/** Reemplaza TODO el contenido local por el respaldo. Transaccional: o entra todo o nada. */
export async function restaurarTodo(r: Respaldo): Promise<void> {
  if (r.version > VERSION_FORMATO) throw new Error(`El respaldo es de una versión más nueva (${r.version}).`)
  const tablas = TABLAS.map((t) => db.table(t))
  await db.transaction('rw', tablas, async () => {
    for (const t of TABLAS) {
      await db.table(t).clear()
      const filas = r.tablas[t]
      if (Array.isArray(filas) && filas.length) await db.table(t).bulkAdd(filas)
    }
  })
}

export function descargarJSON(nombre: string, datos: unknown) {
  const blob = new Blob([JSON.stringify(datos, null, 1)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
