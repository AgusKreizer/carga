import { db } from './db'
import * as repo from './repo'
import { asegurarCuentaAutomatica, bajarBackup, subirBackup, usuarioActual } from './backup-supabase'
import type { Respaldo } from './exportar'

const HORAS_ENTRE_BACKUPS = 20

/**
 * Al abrir la app con sesión en la nube:
 *  - si este dispositivo está vacío y hay respaldo con datos, se ofrece restaurarlo (cambio de teléfono);
 *  - si no, y el último backup tiene más de 20 h, se sube uno silencioso.
 */
export async function alIniciar(): Promise<{ ofrecer: Respaldo | null }> {
  try {
    let u = await usuarioActual()
    const locales = await db.sesiones.where('estado').equals('terminada').count()
    if (!u && locales > 0 && (await asegurarCuentaAutomatica())) u = await usuarioActual()
    if (!u) return { ofrecer: null }
    if (locales === 0) {
      const r = await bajarBackup()
      const remotas = (r?.tablas.sesiones as { estado?: string }[] | undefined)?.filter((s) => s.estado === 'terminada').length ?? 0
      if (r && remotas > 0) return { ofrecer: r }
      // sin sesiones locales no se sube nada: no pisar un respaldo bueno con uno vacío
      return { ofrecer: null }
    }
    const a = await repo.ajustes()
    const hace = a.ultimoBackup ? (Date.now() - new Date(a.ultimoBackup).getTime()) / 3_600_000 : Infinity
    if (hace > HORAS_ENTRE_BACKUPS) subirBackup().catch(() => {})
  } catch {
    /* sin red */
  }
  return { ofrecer: null }
}
