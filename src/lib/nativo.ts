/**
 * Puente con la app nativa (Capacitor). Todo es opcional: en la web cada función hace lo que puede
 * (vibración, Web Share, nada) y en Android/iOS usa el plugin real.
 */
import { Capacitor } from '@capacitor/core'

export const esNativa = () => Capacitor.isNativePlatform()
export const plataforma = () => Capacitor.getPlatform() as 'web' | 'android' | 'ios'

export async function vibrar(patron: number[] = [200, 100, 200]): Promise<void> {
  if (esNativa()) {
    const { Haptics, NotificationType } = await import('@capacitor/haptics')
    await Haptics.notification({ type: NotificationType.Success })
    return
  }
  try { navigator.vibrate?.(patron) } catch { /* sin vibración */ }
}

export async function compartir(datos: { title: string; text: string; url: string }): Promise<boolean> {
  if (esNativa()) {
    const { Share } = await import('@capacitor/share')
    await Share.share({ title: datos.title, text: datos.text, url: datos.url, dialogTitle: datos.title })
    return true
  }
  if (navigator.share) { await navigator.share(datos); return true }
  return false
}

/** Notificación "descanso listo" programada para la hora de fin (sobrevive a la app en segundo plano). */
export async function programarFinDescanso(fin: number, detalle: string): Promise<void> {
  if (!esNativa()) return
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  const p = await LocalNotifications.checkPermissions()
  if (p.display !== 'granted') { const r = await LocalNotifications.requestPermissions(); if (r.display !== 'granted') return }
  await LocalNotifications.cancel({ notifications: [{ id: 1 }] })
  await LocalNotifications.schedule({ notifications: [{ id: 1, title: 'Descanso listo', body: detalle, schedule: { at: new Date(fin) }, smallIcon: 'ic_stat_icon', sound: undefined }] })
}

export async function cancelarFinDescanso(): Promise<void> {
  if (!esNativa()) return
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  await LocalNotifications.cancel({ notifications: [{ id: 1 }] })
}

/** Recordatorios semanales reales (solo nativo): un aviso por día elegido a la hora dada. */
export async function programarRecordatorios(dias: number[], hora: string): Promise<boolean> {
  if (!esNativa()) return false
  const { LocalNotifications } = await import('@capacitor/local-notifications')
  const p = await LocalNotifications.requestPermissions()
  if (p.display !== 'granted') return false
  const pendientes = await LocalNotifications.getPending()
  const viejas = pendientes.notifications.filter((n) => n.id >= 100 && n.id < 200)
  if (viejas.length) await LocalNotifications.cancel({ notifications: viejas.map((n) => ({ id: n.id })) })
  const [h, m] = hora.split(':').map(Number)
  await LocalNotifications.schedule({
    notifications: dias.map((d) => ({
      id: 100 + d,
      title: 'Hoy toca entrenar',
      body: 'Abrí Carga: ya sabe qué día va.',
      // Capacitor usa 1 = domingo … 7 = sábado; nuestro índice es 0 = lunes
      schedule: { on: { weekday: ((d + 1) % 7) + 1, hour: h, minute: m }, allowWhileIdle: true },
      smallIcon: 'ic_stat_icon',
    })),
  })
  return true
}

/**
 * Login por magic link en la app nativa: el mail abre `ar.carga.app://auth#access_token=…`.
 * Devuelve los tokens si la URL trae sesión.
 */
export function tokensDeUrl(url: string): { access_token: string; refresh_token: string } | null {
  const i = url.indexOf('#')
  if (i < 0) return null
  const p = new URLSearchParams(url.slice(i + 1))
  const a = p.get('access_token')
  const r = p.get('refresh_token')
  return a && r ? { access_token: a, refresh_token: r } : null
}

export const REDIRECT_NATIVO = 'ar.carga.app://auth'
