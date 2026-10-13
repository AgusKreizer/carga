import Dexie, { type EntityTable } from 'dexie'
import type {
  Ajustes, Bloque, CoachEvento, Dia, DiaEjercicio, Ejercicio, Medida,
  PesoCorporal, Programa, SerieLog, Sesion, Foto,
} from '../domain/types'

export class CargaDB extends Dexie {
  ejercicios!: EntityTable<Ejercicio, 'id'>
  programas!: EntityTable<Programa, 'id'>
  bloques!: EntityTable<Bloque, 'id'>
  dias!: EntityTable<Dia, 'id'>
  diaEjercicios!: EntityTable<DiaEjercicio, 'id'>
  sesiones!: EntityTable<Sesion, 'id'>
  series!: EntityTable<SerieLog, 'id'>
  pesos!: EntityTable<PesoCorporal, 'id'>
  medidas!: EntityTable<Medida, 'id'>
  coachEventos!: EntityTable<CoachEvento, 'id'>
  ajustes!: EntityTable<Ajustes, 'id'>
  fotos!: EntityTable<Foto, 'id'>

  constructor() {
    super('carga')
    this.version(1).stores({
      ejercicios: 'id, patron, activo',
      programas: 'id, activo',
      bloques: 'id, programaId, estado',
      dias: 'id, bloqueId, orden',
      diaEjercicios: 'id, diaId, ejercicioId',
      sesiones: 'id, diaId, bloqueId, estado, fechaInicio',
      series: 'id, sesionId, ejercicioId, diaEjercicioId, ts, [ejercicioId+ts]',
      pesos: 'id, fecha',
      medidas: 'id, fecha',
      coachEventos: 'id, estado, fecha, ejercicioId',
      ajustes: 'id',
    })
    // v2: fotos de progreso (blobs locales; no entran en el respaldo JSON por tamaño)
    this.version(2).stores({
      fotos: 'id, fecha, angulo',
    })
  }
}

export const db = new CargaDB()
