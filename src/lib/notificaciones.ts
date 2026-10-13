/** Notificaciones locales para el fin del descanso (solo si el usuario las activó). */

export function soportaNotificaciones(): boolean {
  return typeof Notification !== 'undefined' && 'serviceWorker' in navigator
}

export function permisoNotificaciones(): NotificationPermission | 'no-soportado' {
  return soportaNotificaciones() ? Notification.permission : 'no-soportado'
}

export async function pedirPermisoNotificaciones(): Promise<NotificationPermission | 'no-soportado'> {
  if (!soportaNotificaciones()) return 'no-soportado'
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

/** Muestra la notificación a través del service worker (funciona con la app en segundo plano). */
export async function notificarDescansoListo(detalle: string): Promise<void> {
  if (permisoNotificaciones() !== 'granted') return
  try {
    const reg = await navigator.serviceWorker.ready
    await reg.showNotification('Descanso listo', {
      body: detalle,
      tag: 'descanso',
      silent: false,
      // vibrate no está en el tipo estándar pero Android lo usa
      ...({ vibrate: [200, 100, 200] } as object),
    })
  } catch {
    /* sin SW (dev) o sin permiso */
  }
}
