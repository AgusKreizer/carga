import { db } from './db'
import type {
  Ajustes, Bloque, CoachEvento, Dia, DiaEjercicio, DiaEjercicioSnapshot, Ejercicio,
  Medida, PesoCorporal, Programa, SerieLog, Sesion,
} from '../domain/types'
import type { SesionPrevia } from '../domain/coach/progresion'
import { ahoraISO, diasEntre, fechaLocal, lunesDe, semanaDelBloque } from '../lib/fechas'
import { nuevoId } from '../lib/ids'
import { AJUSTES_DEFAULT } from './seed'

export interface PlanActivo {
  programa: Programa
  bloque: Bloque
  dias: Dia[]
  lineas: DiaEjercicio[]
}

// ---------- Lectura ----------

export async function planActivo(): Promise<PlanActivo | null> {
  const programa = await db.programas.filter((p) => p.activo).first()
  if (!programa) return null
  const bloque =
    (await db.bloques.where('programaId').equals(programa.id).filter((b) => b.activo && b.estado === 'activo').first()) ??
    (await db.bloques.where('programaId').equals(programa.id).filter((b) => b.activo).first())
  if (!bloque) return null
  const dias = (await db.dias.where('bloqueId').equals(bloque.id).filter((d) => d.activo).toArray()).sort((a, b) => a.orden - b.orden)
  const ids = dias.map((d) => d.id)
  const lineas = (await db.diaEjercicios.where('diaId').anyOf(ids).filter((l) => l.activo).toArray()).sort((a, b) => a.orden - b.orden)
  return { programa, bloque, dias, lineas }
}

export async function mapaEjercicios(): Promise<Map<string, Ejercicio>> {
  const todos = await db.ejercicios.toArray()
  return new Map(todos.map((e) => [e.id, e]))
}

export async function ajustes(): Promise<Ajustes> {
  return (await db.ajustes.get('global')) ?? AJUSTES_DEFAULT
}

export async function guardarAjustes(cambios: Partial<Ajustes>): Promise<void> {
  const actual = await ajustes()
  await db.ajustes.put({ ...actual, ...cambios, id: 'global' })
}

export async function sesionActiva(): Promise<Sesion | null> {
  return (await db.sesiones.where('estado').equals('activa').filter((s) => s.activo).first()) ?? null
}

export async function sesionesTerminadas(limite = 50): Promise<Sesion[]> {
  return db.sesiones
    .where('estado').equals('terminada')
    .filter((s) => s.activo)
    .reverse()
    .sortBy('fechaInicio')
    .then((arr) => arr.slice(0, limite))
}

export async function seriesDeSesion(sesionId: string): Promise<SerieLog[]> {
  return (await db.series.where('sesionId').equals(sesionId).filter((s) => s.activo).toArray()).sort(
    (a, b) => a.ts.localeCompare(b.ts),
  )
}

/** Sesiones previas (terminadas) con series de trabajo de este ejercicio, la más reciente primero. */
export async function previasDeEjercicio(ejercicioId: string, limite = 8, excluirSesionId?: string): Promise<SesionPrevia[]> {
  const series = await db.series.where('ejercicioId').equals(ejercicioId).filter((s) => s.activo && !s.calentamiento).toArray()
  const porSesion = new Map<string, SerieLog[]>()
  for (const s of series) {
    if (s.sesionId === excluirSesionId) continue
    const arr = porSesion.get(s.sesionId) ?? []
    arr.push(s)
    porSesion.set(s.sesionId, arr)
  }
  const out: SesionPrevia[] = []
  for (const [sesionId, arr] of porSesion) {
    const ses = await db.sesiones.get(sesionId)
    if (!ses || ses.estado !== 'terminada' || !ses.activo) continue
    out.push({ fechaInicio: ses.fechaInicio, series: arr.sort((a, b) => a.orden - b.orden) })
  }
  return out.sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio)).slice(0, limite)
}

export async function diasDesdeUltima(ejercicioId: string, excluirSesionId?: string): Promise<number | null> {
  const previas = await previasDeEjercicio(ejercicioId, 1, excluirSesionId)
  if (!previas.length) return null
  return diasEntre(previas[0].fechaInicio.slice(0, 10), fechaLocal())
}

/** Próximo día del plan: el siguiente (no opcional) al de la última sesión terminada. */
export async function proximoDia(plan: PlanActivo): Promise<Dia | null> {
  const obligatorios = plan.dias.filter((d) => !d.opcional)
  if (!obligatorios.length) return plan.dias[0] ?? null
  const ultima = (await sesionesTerminadas(20)).find((s) => s.bloqueId === plan.bloque.id && obligatorios.some((d) => d.id === s.diaId))
  if (!ultima) return obligatorios[0]
  const idx = obligatorios.findIndex((d) => d.id === ultima.diaId)
  return obligatorios[(idx + 1) % obligatorios.length]
}

// ---------- Sesión ----------

export async function iniciarSesion(plan: PlanActivo, dia: Dia, ejercicios: Map<string, Ejercicio>): Promise<Sesion> {
  const ahora = ahoraISO()
  const hoy = fechaLocal()
  let bloque = plan.bloque
  if (!bloque.fechaInicio) {
    bloque = { ...bloque, fechaInicio: lunesDe(hoy), estado: 'activo' }
    await db.bloques.put(bloque)
  }
  const semana = Math.max(1, semanaDelBloque(bloque.fechaInicio!, hoy))
  const esDeload = bloque.semanaDeload != null && semana === bloque.semanaDeload
  const snapshot: DiaEjercicioSnapshot[] = plan.lineas
    .filter((l) => l.diaId === dia.id)
    .map((l) => ({ ...l, ejercicioNombre: ejercicios.get(l.ejercicioId)?.nombre ?? l.ejercicioId }))
  const sesion: Sesion = {
    id: nuevoId(),
    diaId: dia.id,
    diaNombre: dia.nombre,
    bloqueId: bloque.id,
    semana,
    esDeload,
    fechaInicio: ahora,
    fechaFin: null,
    estado: 'activa',
    snapshot,
    energia: null,
    dolor: null,
    sueno: null,
    notas: '',
    activo: true,
  }
  await db.sesiones.add(sesion)
  return sesion
}

export async function registrarSerie(datos: Omit<SerieLog, 'id' | 'ts' | 'activo'>): Promise<SerieLog> {
  const serie: SerieLog = { ...datos, id: nuevoId(), ts: ahoraISO(), activo: true }
  await db.series.add(serie)
  return serie
}

export async function actualizarSerie(id: string, cambios: Partial<SerieLog>): Promise<void> {
  await db.series.update(id, cambios)
}

export async function desactivarSerie(id: string): Promise<void> {
  await db.series.update(id, { activo: false })
}

export async function terminarSesion(id: string, datos: Pick<Sesion, 'energia' | 'dolor' | 'sueno' | 'notas'>): Promise<void> {
  await db.sesiones.update(id, { ...datos, estado: 'terminada', fechaFin: ahoraISO() })
}

export async function descartarSesion(id: string): Promise<void> {
  await db.sesiones.update(id, { estado: 'descartada', fechaFin: ahoraISO() })
}

/** Cambia el ejercicio de una línea dentro de la sesión activa (sustitución). No toca el plan. */
export async function sustituirEnSesion(sesion: Sesion, diaEjercicioId: string, nuevoEjercicio: Ejercicio): Promise<void> {
  const snapshot = sesion.snapshot.map((l) =>
    l.id === diaEjercicioId ? { ...l, ejercicioId: nuevoEjercicio.id, ejercicioNombre: nuevoEjercicio.nombre } : l,
  )
  await db.sesiones.update(sesion.id, { snapshot })
}

// ---------- Cuerpo ----------

export async function guardarPeso(fecha: string, kg: number): Promise<void> {
  const existente = await db.pesos.where('fecha').equals(fecha).filter((p) => p.activo).first()
  if (existente) await db.pesos.update(existente.id, { kg })
  else await db.pesos.add({ id: nuevoId(), fecha, kg, activo: true })
}

export async function pesos(): Promise<PesoCorporal[]> {
  return (await db.pesos.filter((p) => p.activo).toArray()).sort((a, b) => a.fecha.localeCompare(b.fecha))
}

export async function guardarMedida(m: Omit<Medida, 'id' | 'activo'>): Promise<void> {
  await db.medidas.add({ ...m, id: nuevoId(), activo: true })
}

export async function medidas(): Promise<Medida[]> {
  return (await db.medidas.filter((m) => m.activo).toArray()).sort((a, b) => a.fecha.localeCompare(b.fecha))
}

// ---------- Coach ----------

export async function eventosPendientes(): Promise<CoachEvento[]> {
  return (await db.coachEventos.where('estado').anyOf('pendiente', 'informativo').filter((e) => e.activo).toArray()).sort(
    (a, b) => b.fecha.localeCompare(a.fecha),
  )
}

export async function resolverEvento(id: string, estado: 'aceptado' | 'ignorado'): Promise<void> {
  await db.coachEventos.update(id, { estado })
}

export async function archivarInformativos(): Promise<void> {
  await db.coachEventos.where('estado').equals('informativo').modify({ activo: false })
}

export async function crearEventos(eventos: Omit<CoachEvento, 'id' | 'activo'>[]): Promise<void> {
  if (!eventos.length) return
  const pendientes = await eventosPendientes()
  const nuevos = eventos.filter(
    (e) => !pendientes.some((p) => p.tipo === e.tipo && p.ejercicioId === e.ejercicioId && p.diaEjercicioId === e.diaEjercicioId),
  )
  await db.coachEventos.bulkAdd(nuevos.map((e) => ({ ...e, id: nuevoId(), activo: true })))
}

// ---------- Plan (edición) ----------

export async function actualizarLinea(id: string, cambios: Partial<DiaEjercicio>): Promise<void> {
  await db.diaEjercicios.update(id, cambios)
}

export async function agregarLinea(diaId: string, ejercicio: Ejercicio): Promise<DiaEjercicio> {
  const existentes = await db.diaEjercicios.where('diaId').equals(diaId).filter((l) => l.activo).toArray()
  const linea: DiaEjercicio = {
    id: nuevoId(),
    diaId,
    ejercicioId: ejercicio.id,
    orden: existentes.length + 1,
    series: 3,
    repsMin: ejercicio.repsMin,
    repsMax: ejercicio.repsMax,
    rir: ejercicio.rir,
    descansoSeg: ejercicio.descansoSeg,
    superserieCon: null,
    nota: '',
    activo: true,
  }
  await db.diaEjercicios.add(linea)
  return linea
}

export async function desactivarLinea(id: string): Promise<void> {
  const l = await db.diaEjercicios.get(id)
  if (!l) return
  await db.transaction('rw', db.diaEjercicios, async () => {
    if (l.superserieCon) await db.diaEjercicios.update(l.superserieCon, { superserieCon: null })
    await db.diaEjercicios.update(id, { activo: false, superserieCon: null })
  })
}

export async function reordenarLineas(ids: string[]): Promise<void> {
  await db.transaction('rw', db.diaEjercicios, async () => {
    for (let i = 0; i < ids.length; i++) await db.diaEjercicios.update(ids[i], { orden: i + 1 })
  })
}

export async function vincularSuperserie(aId: string, bId: string | null): Promise<void> {
  const a = await db.diaEjercicios.get(aId)
  if (!a) return
  await db.transaction('rw', db.diaEjercicios, async () => {
    if (a.superserieCon) await db.diaEjercicios.update(a.superserieCon, { superserieCon: null })
    if (bId) {
      const b = await db.diaEjercicios.get(bId)
      if (b?.superserieCon) await db.diaEjercicios.update(b.superserieCon, { superserieCon: null })
      await db.diaEjercicios.update(bId, { superserieCon: aId })
    }
    await db.diaEjercicios.update(aId, { superserieCon: bId })
  })
}

export async function agregarDia(bloqueId: string, nombre: string, opcional = false): Promise<Dia> {
  const existentes = await db.dias.where('bloqueId').equals(bloqueId).filter((d) => d.activo).toArray()
  const dia: Dia = { id: nuevoId(), bloqueId, nombre, orden: existentes.length + 1, opcional, activo: true }
  await db.dias.add(dia)
  return dia
}

export async function actualizarDia(id: string, cambios: Partial<Dia>): Promise<void> {
  await db.dias.update(id, cambios)
}

export async function actualizarBloque(id: string, cambios: Partial<Bloque>): Promise<void> {
  await db.bloques.update(id, cambios)
}

export async function crearEjercicioCustom(datos: Omit<Ejercicio, 'id' | 'custom' | 'activo' | 'actualizado'>): Promise<Ejercicio> {
  const e: Ejercicio = { ...datos, id: nuevoId(), custom: true, activo: true, actualizado: ahoraISO() }
  await db.ejercicios.add(e)
  return e
}

export async function actualizarEjercicio(id: string, cambios: Partial<Ejercicio>): Promise<void> {
  await db.ejercicios.update(id, { ...cambios, actualizado: ahoraISO() })
}
