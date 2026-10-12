import { db } from './db'
import * as repo from './repo'
import type { SerieLog, Sesion } from '../domain/types'
import { fechaLocal, lunesDe, sumarDias } from '../lib/fechas'
import { nuevoId } from '../lib/ids'

/**
 * Historial de demostración: N semanas de sesiones del plan activo con cargas realistas
 * y progresión por reps. Solo para probar la app; se invoca desde la consola:
 *   const d = await import('/src/data/demo.ts'); await d.generarHistorialDemo(3)
 */
const CARGAS: Record<string, number> = {
  'press-banca-barra': 90, 'jalon-pecho-prono': 60, 'press-inclinado-mancuernas': 28, 'remo-maquina-apoyado': 60,
  'laterales-polea': 10, 'extension-triceps-sobre-cabeza': 25, 'curl-inclinado-mancuernas': 12,
  'prensa-45': 180, 'curl-femoral-sentado': 50, 'sentadilla-smith': 60, 'extension-cuadriceps': 50, 'gemelos-prensa': 120, 'crunch-polea': 30,
  'press-militar-mancuernas': 24, 'remo-polea-baja-neutro': 60, 'jalon-neutro-estrecho': 60, 'peck-deck': 50, 'laterales-mancuerna': 10,
  'pajaros-maquina': 35, 'curl-barra-w': 30, 'triceps-polea': 30,
  'rumano-mancuernas': 30, 'prensa-45-pies-altos': 160, 'curl-femoral-tumbado': 45, 'gemelos-sentado': 40, 'elevacion-piernas': 0,
}

export async function generarHistorialDemo(semanas = 3): Promise<void> {
  const plan = await repo.planActivo()
  if (!plan) throw new Error('Sin plan activo')
  const ejercicios = await repo.mapaEjercicios()
  const hoy = fechaLocal()
  const inicio = sumarDias(lunesDe(hoy), -7 * semanas)
  await repo.actualizarBloque(plan.bloque.id, { fechaInicio: inicio, estado: 'activo' })

  const dias = plan.dias.filter((d) => !d.opcional)
  const offsets = [0, 1, 3, 4] // lunes, martes, jueves, viernes
  const sesiones: Sesion[] = []
  const series: SerieLog[] = []

  for (let w = 0; w < semanas; w++) {
    dias.forEach((dia, di) => {
      const fecha = sumarDias(inicio, 7 * w + (offsets[di] ?? di))
      const fechaInicio = `${fecha}T18:0${di}:00.000Z`
      const sesion: Sesion = {
        id: nuevoId(), diaId: dia.id, diaNombre: dia.nombre, bloqueId: plan.bloque.id, semana: w + 1, esDeload: false,
        fechaInicio, fechaFin: `${fecha}T18:5${di}:00.000Z`, estado: 'terminada',
        snapshot: plan.lineas.filter((l) => l.diaId === dia.id).map((l) => ({ ...l, ejercicioNombre: ejercicios.get(l.ejercicioId)?.nombre ?? l.ejercicioId })),
        energia: 2, dolor: 0, sueno: 2, notas: '', activo: true,
      }
      sesiones.push(sesion)
      sesion.snapshot.forEach((l, li) => {
        const ej = ejercicios.get(l.ejercicioId)
        const inc = ej?.incremento ?? 2.5
        const base = CARGAS[l.ejercicioId] ?? 20
        // semana 1: reps mínimas+1; semana 2: +1; semana 3: al tope (así la semana 4 sugiere subir carga)
        const carga = base
        for (let s = 0; s < l.series; s++) {
          const reps = Math.min(l.repsMax, l.repsMin + w + (s === 0 ? 1 : 0) - (s === l.series - 1 && w < semanas - 1 ? 1 : 0))
          series.push({
            id: nuevoId(), sesionId: sesion.id, diaEjercicioId: l.id, ejercicioId: l.ejercicioId, ejercicioPlanId: l.ejercicioId,
            orden: s + 1, objetivoCarga: carga, objetivoReps: reps, rirObjetivo: l.rir, carga: Math.round(carga / (inc || 1)) * (inc || 1), reps,
            rir: l.rir, calentamiento: false, ts: `${fecha}T18:${String(10 + li * 5 + s).padStart(2, '0')}:00.000Z`, activo: true,
          })
        }
      })
    })
  }

  // pesos corporales: leve descenso con ruido
  const pesos: { id: string; fecha: string; kg: number; activo: boolean }[] = []
  for (let d = 7 * semanas; d >= 0; d--) {
    if (d % 2 === 1) continue
    pesos.push({ id: nuevoId(), fecha: sumarDias(hoy, -d), kg: Math.round((76.4 - (7 * semanas - d) * 0.01 + (Math.random() - 0.5) * 0.6) * 10) / 10, activo: true })
  }

  await db.transaction('rw', [db.sesiones, db.series, db.pesos, db.medidas], async () => {
    await db.sesiones.bulkAdd(sesiones)
    await db.series.bulkAdd(series)
    await db.pesos.bulkAdd(pesos)
    await db.medidas.bulkAdd([
      { id: nuevoId(), fecha: inicio, cintura: 84, brazo: 36, muslo: 58, pecho: 100, activo: true },
    ])
  })
}
