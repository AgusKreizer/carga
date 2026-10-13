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

/** CSV de series (una fila por serie) para abrir en Excel o Sheets. */
export async function exportarCSV(): Promise<string> {
  const [sesiones, series, ejercicios] = await Promise.all([db.sesiones.toArray(), db.series.toArray(), db.ejercicios.toArray()])
  const ses = new Map(sesiones.map((s) => [s.id, s]))
  const ej = new Map(ejercicios.map((e) => [e.id, e.nombre]))
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const filas = [['fecha', 'dia', 'semana', 'descarga', 'ejercicio', 'orden', 'carga_kg', 'reps', 'rir', 'rir_objetivo', 'reps_objetivo', 'calentamiento'].join(';')]
  for (const s of series.filter((x) => x.activo).sort((a, b) => a.ts.localeCompare(b.ts))) {
    const se = ses.get(s.sesionId)
    if (!se || se.estado !== 'terminada') continue
    filas.push([se.fechaInicio.slice(0, 10), se.diaNombre, se.semana, se.esDeload ? 1 : 0, ej.get(s.ejercicioId) ?? s.ejercicioId, s.orden, String(s.carga).replace('.', ','), s.reps, s.rir ?? '', s.rirObjetivo, s.objetivoReps ?? '', s.calentamiento ? 1 : 0].map(esc).join(';'))
  }
  return '\ufeff' + filas.join('\r\n')
}

export function descargarTexto(nombre: string, texto: string, tipo = 'text/csv') {
  const url = URL.createObjectURL(new Blob([texto], { type: tipo }))
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
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
