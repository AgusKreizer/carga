/** Navegación entre pestañas desde cualquier vista (App escucha el evento). */
export type Tab = 'hoy' | 'plan' | 'progreso' | 'ajustes'

const EVENTO = 'carga:ir-a'

export function irA(tab: Tab): void {
  window.dispatchEvent(new CustomEvent<Tab>(EVENTO, { detail: tab }))
}

export function alIrA(f: (tab: Tab) => void): () => void {
  const h = (e: Event) => f((e as CustomEvent<Tab>).detail)
  window.addEventListener(EVENTO, h)
  return () => window.removeEventListener(EVENTO, h)
}
