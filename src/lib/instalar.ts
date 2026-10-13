/** Instalación de la PWA: captura el prompt de Chrome/Android; en iOS solo se puede explicar. */

interface EventoInstalar extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let diferido: EventoInstalar | null = null
const oyentes = new Set<() => void>()

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    diferido = e as EventoInstalar
    oyentes.forEach((f) => f())
  })
  window.addEventListener('appinstalled', () => {
    diferido = null
    oyentes.forEach((f) => f())
  })
}

export function estaInstalada(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

export function esIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

export function puedeInstalar(): boolean {
  return !!diferido
}

export function suscribirInstalar(f: () => void): () => void {
  oyentes.add(f)
  return () => oyentes.delete(f)
}

export async function instalar(): Promise<boolean> {
  if (!diferido) return false
  await diferido.prompt()
  const r = await diferido.userChoice
  diferido = null
  return r.outcome === 'accepted'
}
