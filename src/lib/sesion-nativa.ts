/**
 * Notificación persistente de sesión (Android, app nativa): muestra en la pantalla de bloqueo
 * la serie en curso, la próxima y el descanso, con acciones "Hecha" y "+30 s".
 * En la web no hace nada.
 */
import { esNativa } from './nativo'

const ID_SESION = 2
const TIPO_ACCIONES = 'SESION'

export interface EstadoNotifSesion {
  titulo: string
  cuerpo: string
  /** hora de fin del descanso, si hay */
  finDescanso: number | null
}

let registrado = false
let oyente: ((accion: 'hecha' | 'mas30') => void) | null = null

export function alAccionarNotificacion(f: ((accion: 'hecha' | 'mas30') => void) | null) {
  oyente = f
}

async function registrar() {
  if (registrado || !esNativa()) return
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  await LocalNotifications.registerActionTypes({
    types: [{ id: TIPO_ACCIONES, actions: [{ id: 'hecha', title: 'Serie hecha' }, { id: 'mas30', title: '+30 s' }] }],
  })
  await LocalNotifications.addListener('localNotificationActionPerformed', (e) => {
    if (e.notification.id !== ID_SESION) return
    if (e.actionId === 'hecha' || e.actionId === 'mas30') oyente?.(e.actionId)
  })
  registrado = true
}

export async function mostrarNotifSesion(e: EstadoNotifSesion): Promise<void> {
  if (!esNativa()) return
  await registrar()
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  const p = await LocalNotifications.checkPermissions()
  if (p.display !== 'granted') return
  await LocalNotifications.schedule({
    notifications: [{
      id: ID_SESION,
      title: e.titulo,
      body: e.cuerpo,
      ongoing: true,
      autoCancel: false,
      actionTypeId: TIPO_ACCIONES,
      smallIcon: 'ic_stat_icon',
      silent: true,
      ...(e.finDescanso ? { extra: { finDescanso: e.finDescanso } } : {}),
    }],
  })
}

export async function ocultarNotifSesion(): Promise<void> {
  if (!esNativa()) return
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  await LocalNotifications.cancel({ notifications: [{ id: ID_SESION }] })
}
