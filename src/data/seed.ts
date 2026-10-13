import { db } from './db'
import { catalogoInicial } from '../domain/catalogo'
import { programaAgus } from '../domain/programa-agus'
import { BANDAS_INTERMEDIO } from '../domain/coach/volumen'
import type { Ajustes } from '../domain/types'
import { ahoraISO } from '../lib/fechas'

export const AJUSTES_DEFAULT: Ajustes = {
  id: 'global',
  nombre: 'Agus',
  nivel: 'intermedio',
  factorIndirecto: 0.5,
  bandas: BANDAS_INTERMEDIO,
  prioridades: ['espalda', 'deltLat'],
  objetivoPeso: 'estable',
  minutosSesion: 60,
  onboardingHecho: false,
  supabaseUrl: 'https://znqqhqirivfzabbjexxj.supabase.co',
  supabaseAnonKey: 'sb_publishable_0G5Tjw4eWR48MVFSOs_Rzw_2Utj6271',
  ultimoBackup: null,
  pesoBarra: 20,
  pesoBarraSmith: 10,
  discos: [25, 20, 15, 10, 5, 2.5, 1.25],
}

/** Carga catálogo, plan de Agus y ajustes si la base está vacía. Idempotente. */
export async function sembrar(): Promise<void> {
  const ahora = ahoraISO()
  await db.transaction('rw', [db.ejercicios, db.programas, db.bloques, db.dias, db.diaEjercicios, db.ajustes], async () => {
    if ((await db.ejercicios.count()) === 0) {
      await db.ejercicios.bulkAdd(catalogoInicial(ahora))
    } else {
      // ejercicios nuevos del catálogo que falten (no pisa los existentes ni los custom)
      const existentes = new Set((await db.ejercicios.toCollection().primaryKeys()) as string[])
      const faltan = catalogoInicial(ahora).filter((e) => !existentes.has(e.id))
      if (faltan.length) await db.ejercicios.bulkAdd(faltan)
    }
    if ((await db.programas.count()) === 0) {
      const plan = programaAgus(ahora)
      await db.programas.add(plan.programa)
      await db.bloques.add(plan.bloque)
      await db.dias.bulkAdd(plan.dias)
      await db.diaEjercicios.bulkAdd(plan.diaEjercicios)
    }
    const ajustes = await db.ajustes.get('global')
    if (!ajustes) {
      await db.ajustes.add(AJUSTES_DEFAULT)
    } else {
      // instalaciones previas: completan claves nuevas y la nube del proyecto de Agus si no estaba
      const completos: Ajustes = { ...AJUSTES_DEFAULT, ...ajustes }
      if (!completos.supabaseUrl || !completos.supabaseAnonKey) {
        completos.supabaseUrl = AJUSTES_DEFAULT.supabaseUrl
        completos.supabaseAnonKey = AJUSTES_DEFAULT.supabaseAnonKey
      }
      await db.ajustes.put(completos)
    }
  })
}
