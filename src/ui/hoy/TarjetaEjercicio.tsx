import { useEffect, useState } from 'react'
import type { DiaEjercicioSnapshot, Ejercicio, ObjetivoEjercicio, SerieLog } from '../../domain/types'
import type { SesionPrevia } from '../../domain/coach/progresion'
import { SelectorRir, Stepper } from '../componentes/basicos'
import { kg, rirTexto } from '../../lib/formato'
import { haceCuanto } from '../../lib/fechas'
import { MUSCULOS, type MusculoId } from '../../domain/types'

interface Props {
  linea: DiaEjercicioSnapshot
  ejercicio: Ejercicio
  objetivo: ObjetivoEjercicio | undefined
  ultima: SesionPrevia | undefined
  series: SerieLog[]
  expandida: boolean
  superserieNombre?: string
  guardando: boolean
  onExpandir: () => void
  onRegistrar: (d: { carga: number; reps: number; rir: number | null; orden: number; objetivoCarga: number | null; objetivoReps: number | null }) => void
  onDeshacer: (serieId: string) => void
  onEditar: (serieId: string, cambios: Partial<SerieLog>) => void
  onSustituir: () => void
}

export function TarjetaEjercicio({ linea, ejercicio, objetivo, ultima, series, expandida, superserieNombre, guardando, onExpandir, onRegistrar, onDeshacer, onEditar, onSustituir }: Props) {
  const planificadas = objetivo?.series.length ?? linea.series
  const hechas = series.length
  const completa = hechas >= planificadas
  const n = hechas // índice de la próxima serie
  const objSerie = objetivo?.series[Math.min(n, planificadas - 1)]
  const ultimaCargaSesion = series.length ? series[series.length - 1].carga : null

  const [carga, setCarga] = useState<number | null>(null)
  const [reps, setReps] = useState<number>(linea.repsMin)
  const [rir, setRir] = useState<number | null>(null)
  const [editando, setEditando] = useState<string | null>(null)
  const [extra, setExtra] = useState(false)

  // Al cambiar la serie en curso, prellenar carga y reps desde el objetivo; el RIR nunca.
  useEffect(() => {
    setCarga(ultimaCargaSesion ?? objSerie?.carga ?? null)
    setReps(objSerie?.reps ?? linea.repsMin)
    setRir(null)
  }, [hechas, objSerie?.carga, objSerie?.reps, ultimaCargaSesion, linea.repsMin])

  const paso = ejercicio.incremento || 2.5
  const rirObjetivo = objetivo?.rir ?? linea.rir
  const musculos = (Object.entries(ejercicio.musculos) as [MusculoId, number][]).filter(([, f]) => f >= 1).map(([m]) => MUSCULOS[m])

  const confirmar = () => {
    if (carga == null || guardando) return
    onRegistrar({ carga, reps, rir, orden: n + 1, objetivoCarga: objSerie?.carga ?? null, objetivoReps: objSerie?.reps ?? null })
    setExtra(false)
  }

  return (
    <div className={`tarjeta transition-colors ${expandida ? 'ring-1 ring-acento/50' : completa ? 'opacity-70' : ''}`}>
      <button type="button" className="w-full text-left" onClick={onExpandir}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-base font-semibold">{ejercicio.nombre}</div>
            <div className="truncate text-xs text-texto-2">
              {musculos.join(' · ')}{superserieNombre ? ` · superserie con ${superserieNombre}` : ''}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className={`text-lg font-semibold ${completa ? 'text-ok' : ''}`}>{hechas}<span className="text-texto-3">/{planificadas}</span></div>
            <div className="text-[11px] text-texto-3">{linea.repsMin}–{linea.repsMax} · RIR {rirObjetivo}</div>
          </div>
        </div>
      </button>

      {expandida && (
        <div className="aparecer mt-3 space-y-3">
          {objetivo && (
            <div className="rounded-xl bg-superficie-2 p-3 text-sm">
              <div className="flex items-baseline justify-between">
                <span className="text-[11px] font-medium uppercase tracking-wider text-texto-3">Hoy</span>
                {objetivo.subeCarga && <span className="rounded bg-ok/15 px-1.5 py-0.5 text-[11px] font-medium text-ok">sube carga</span>}
              </div>
              <div className="mt-0.5 text-texto">{objetivo.porQue}</div>
              {ultima && (
                <div className="mt-2 text-xs text-texto-2">
                  Última vez ({haceCuanto(ultima.fechaInicio)}): {resumenSeries(ultima.series)}
                </div>
              )}
            </div>
          )}

          {(linea.nota || ejercicio.nota) && <div className="text-xs text-texto-2">{linea.nota || ejercicio.nota}</div>}

          {series.length > 0 && (
            <ul className="space-y-1.5">
              {series.map((s, i) => (
                <li key={s.id} className="rounded-xl bg-superficie-2 px-3 py-2 text-sm">
                  {editando === s.id ? (
                    <EditarSerie serie={s} paso={paso} rirObjetivo={rirObjetivo} onGuardar={(c) => { onEditar(s.id, c); setEditando(null) }} onCancelar={() => setEditando(null)} />
                  ) : (
                    <div className="flex items-center justify-between">
                      <button type="button" className="flex-1 text-left" onClick={() => setEditando(s.id)}>
                        <span className="mr-2 text-texto-3">{i + 1}</span>
                        <span className="font-semibold">{kg(s.carga)} kg × {s.reps}</span>
                        <span className={`ml-2 ${s.rir == null ? 'text-aviso' : 'text-texto-2'}`}>RIR {rirTexto(s.rir)}</span>
                        {s.rir == null && <span className="ml-1 text-[11px] text-aviso">(falta)</span>}
                      </button>
                      <button type="button" className="chip h-8 text-xs" onClick={() => onDeshacer(s.id)} aria-label="deshacer">↶</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          {(!completa || extra) && (
            <div className="space-y-3 rounded-xl border border-borde p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-wider text-texto-3">Serie {n + 1}{extra ? ' (extra)' : ''}</span>
                {carga == null && <span className="text-[11px] text-aviso">Tocá el número para escribir la carga</span>}
              </div>
              <div className="flex items-end justify-between gap-2">
                <div>
                  <div className="mb-1 text-[11px] text-texto-3">Carga</div>
                  <Stepper valor={carga} paso={paso} onCambio={setCarga} sufijo="kg" grande vacio="—" />
                </div>
                <div>
                  <div className="mb-1 text-[11px] text-texto-3">Reps</div>
                  <Stepper valor={reps} paso={1} min={1} onCambio={setReps} grande />
                </div>
              </div>
              <div>
                <div className="mb-1 text-[11px] text-texto-3">RIR real <span className="text-texto-3">(objetivo {rirObjetivo})</span></div>
                <SelectorRir valor={rir} objetivo={rirObjetivo} onCambio={setRir} />
              </div>
              <button type="button" className="btn-grande" disabled={carga == null || guardando} onClick={confirmar}>
                ✓ Hecha
              </button>
            </div>
          )}

          <div className="flex justify-between text-sm">
            <button type="button" className="py-1 text-texto-2" onClick={onSustituir}>Sustituir ejercicio</button>
            {completa && !extra && <button type="button" className="py-1 text-texto-2" onClick={() => setExtra(true)}>+ serie extra</button>}
          </div>
        </div>
      )}
    </div>
  )
}

function EditarSerie({ serie, paso, rirObjetivo, onGuardar, onCancelar }: { serie: SerieLog; paso: number; rirObjetivo: number; onGuardar: (c: Partial<SerieLog>) => void; onCancelar: () => void }) {
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

export function resumenSeries(series: SerieLog[]): string {
  if (!series.length) return '—'
  const cargas = new Set(series.map((s) => s.carga))
  if (cargas.size === 1) {
    const rirs = series.map((s) => s.rir).filter((r) => r != null) as number[]
    const rirTxt = rirs.length ? ` @RIR ${Math.min(...rirs)}–${Math.max(...rirs)}`.replace(/(\d+)–\1/, '$1') : ''
    return `${kg(series[0].carga)} kg × ${series.map((s) => s.reps).join(', ')}${rirTxt}`
  }
  return series.map((s) => `${kg(s.carga)}×${s.reps}`).join(', ')
}
