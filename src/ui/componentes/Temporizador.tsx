import { useEffect, useState } from 'react'
import { duracion } from '../../lib/fechas'

/**
 * Timer de descanso basado en hora de fin (sobrevive a pantalla apagada).
 * Vibra al terminar si el dispositivo lo permite.
 */
export function Temporizador({ fin, onSaltar, onSumar }: { fin: number | null; onSaltar: () => void; onSumar: (seg: number) => void }) {
  const [ahora, setAhora] = useState(Date.now())
  useEffect(() => {
    if (!fin) return
    const id = window.setInterval(() => setAhora(Date.now()), 250)
    return () => window.clearInterval(id)
  }, [fin])
  useEffect(() => {
    if (!fin) return
    const restante = fin - Date.now()
    if (restante <= 0) return
    const id = window.setTimeout(() => {
      try { navigator.vibrate?.([200, 100, 200]) } catch { /* sin vibración */ }
    }, restante)
    return () => window.clearTimeout(id)
  }, [fin])

  if (!fin) return null
  const restante = Math.max(0, Math.round((fin - ahora) / 1000))
  const listo = restante === 0
  return (
    <div className={`fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+64px)] z-40 mx-auto flex w-[calc(100%-32px)] max-w-md items-center justify-between rounded-2xl px-4 py-3 shadow-lg ${listo ? 'bg-ok text-black' : 'bg-superficie-2'}`}>
      <div>
        <div className="text-[11px] uppercase tracking-wider opacity-70">{listo ? 'Descanso listo' : 'Descanso'}</div>
        <div className="text-2xl font-semibold">{duracion(restante)}</div>
      </div>
      <div className="flex gap-2">
        {!listo && <button type="button" className="chip" onClick={() => onSumar(30)}>+30</button>}
        <button type="button" className={`chip ${listo ? 'bg-black/15 text-black' : ''}`} onClick={onSaltar}>{listo ? 'Seguir' : 'Saltar'}</button>
      </div>
    </div>
  )
}
