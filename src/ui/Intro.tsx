import { useEffect, useState } from 'react'
import { Logo } from './componentes/Logo'

const DURACION_MS = 1900

/**
 * Apertura: la barra está vacía, caen los discos de a uno con peso, la barra se levanta
 * y aparece el nombre. Dura menos de 2 s, se saltea tocando y respeta "reducir movimiento".
 */
export function Intro({ onFin }: { onFin: () => void }) {
  const [saliendo, setSaliendo] = useState(false)
  useEffect(() => {
    const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const t = window.setTimeout(() => setSaliendo(true), reducido ? 400 : DURACION_MS)
    return () => window.clearTimeout(t)
  }, [])
  useEffect(() => {
    if (!saliendo) return
    const t = window.setTimeout(onFin, 320)
    return () => window.clearTimeout(t)
  }, [saliendo, onFin])
  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-fondo transition-opacity duration-300 ${saliendo ? 'opacity-0' : 'opacity-100'}`}
      onClick={() => setSaliendo(true)}
      role="presentation"
    >
      <div className="intro-escena">
        <Logo animado tamano={180} />
      </div>
      <div className="intro-nombre mt-6 text-4xl font-black tracking-tight">Carga</div>
      <div className="intro-lema mt-1 text-sm text-texto-2">Cada serie cuenta.</div>
    </div>
  )
}
