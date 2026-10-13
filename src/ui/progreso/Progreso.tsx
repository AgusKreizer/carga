import { useState } from 'react'
import { Tablero } from './Tablero'
import { Calendario } from './Calendario'
import { Ejercicios } from './Ejercicios'
import { Musculos } from './Musculos'
import { Cuerpo } from './Cuerpo'
import { Historial } from './Historial'

type Sub = 'tablero' | 'calendario' | 'ejercicios' | 'musculos' | 'cuerpo' | 'historial'

const SUBS: [Sub, string][] = [
  ['tablero', 'Tablero'], ['calendario', 'Calendario'], ['ejercicios', 'Ejercicios'],
  ['musculos', 'Músculos'], ['cuerpo', 'Cuerpo'], ['historial', 'Historial'],
]

export function Progreso() {
  const [sub, setSub] = useState<Sub>(() => {
    const q = new URLSearchParams(location.search).get('sub') as Sub | null
    return q && SUBS.some(([k]) => k === q) ? q : 'tablero'
  })
  const [ejercicio, setEjercicio] = useState<string | null>(null)
  return (
    <div className="space-y-3 pt-1">
      <div className="sin-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
        {SUBS.map(([k, t]) => (
          <button key={k} type="button" className={`chip shrink-0 ${sub === k ? 'chip-activo' : ''}`} onClick={() => setSub(k)}>{t}</button>
        ))}
      </div>
      {sub === 'tablero' && <Tablero onVerEjercicio={(id) => { setEjercicio(id); setSub('ejercicios') }} />}
      {sub === 'calendario' && <Calendario />}
      {sub === 'ejercicios' && <Ejercicios seleccionado={ejercicio} onSeleccionar={setEjercicio} />}
      {sub === 'musculos' && <Musculos />}
      {sub === 'cuerpo' && <Cuerpo />}
      {sub === 'historial' && <Historial />}
    </div>
  )
}
