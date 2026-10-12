import { db } from './db'
import * as repo from './repo'
import { avisosPostSesion } from '../domain/coach'
import type { SesionConSeries } from '../domain/coach/deload'
import type { SesionPrevia } from '../domain/coach/progresion'
import { ahoraISO } from '../lib/fechas'

/** Corre el coach después de cerrar una sesión y persiste los avisos. */
export async function correrCoachPostSesion(sesionId: string): Promise<void> {
  const sesion = await db.sesiones.get(sesionId)
  if (!sesion) return
  const plan = await repo.planActivo()
  const ejercicios = await repo.mapaEjercicios()
  const seriesSesion = await repo.seriesDeSesion(sesionId)

  const previasPorEjercicio = new Map<string, SesionPrevia[]>()
  for (const ejId of new Set(seriesSesion.map((s) => s.ejercicioId))) {
    previasPorEjercicio.set(ejId, await repo.previasDeEjercicio(ejId, 8, sesionId))
  }

  const terminadas = await repo.sesionesTerminadas(12)
  const historial: SesionConSeries[] = []
  for (const s of terminadas) historial.push({ sesion: s, series: await repo.seriesDeSesion(s.id) })

  const eventos = avisosPostSesion({
    sesion,
    seriesSesion,
    previasPorEjercicio,
    lineas: plan?.lineas ?? [],
    ejercicios,
    historial,
    diasPorSemana: plan?.dias.filter((d) => !d.opcional).length ?? 0,
    hoyISO: ahoraISO(),
  })
  await repo.crearEventos(eventos)
}
