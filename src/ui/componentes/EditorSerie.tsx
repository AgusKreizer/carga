import { useState } from 'react'
import type { SerieLog } from '../../domain/types'
import { SelectorRir, Stepper } from './basicos'

/** Edición en línea de una serie ya registrada (carga, reps, RIR). */
export function EditorSerie({ serie, paso, rirObjetivo, onGuardar, onCancelar }: { serie: SerieLog; paso: number; rirObjetivo: number; onGuardar: (c: Partial<SerieLog>) => void; onCancelar: () => void }) {
  const [carga, setCarga] = useState<number | null>(serie.carga)
  const [reps, setReps] = useState(serie.reps)
  const [rir, setRir] = useState<number | null>(serie.rir)
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Stepper valor={carga} paso={paso} onCambio={setCarga} sufijo="kg" />
        <Stepper valor={reps} paso={1} min={1} onCambio={setReps} />
      </div>
      <SelectorRir valor={rir} objetivo={rirObjetivo} onCambio={setRir} />
      <div className="flex gap-2">
        <button type="button" className="btn-secundario flex-1" onClick={onCancelar}>Cancelar</button>
        <button type="button" className="btn-secundario flex-1 bg-acento text-black" onClick={() => onGuardar({ carga: carga ?? serie.carga, reps, rir })}>Guardar</button>
      </div>
    </div>
  )
}
