import { useEffect, useState } from 'react'
import type { DiaEjercicioSnapshot, Ejercicio, ObjetivoEjercicio, SerieLog } from '../../domain/types'
import type { SesionPrevia } from '../../domain/coach/progresion'
import { Hoja, SelectorRir, Stepper } from '../componentes/basicos'
import { kg, rirTexto } from '../../lib/formato'
import { discosPorLado } from '../../lib/discos'
import { useAjustes } from '../hooks'
import { calentamientoSugerido } from '../../domain/coach/calentamiento'
import { haceCuanto } from '../../lib/fechas'
import { MUSCULOS, type MusculoId } from '../../domain/types'
import * as repo from '../../data/repo'

interface Props {
  linea: DiaEjercicioSnapshot
  ejercicio: Ejercicio
  objetivo: ObjetivoEjercicio | undefined
  ultima: SesionPrevia | undefined
  series: SerieLog[]
  expandida: boolean
  superserieNombre?: string
  primero?: boolean
  guardando: boolean
  onExpandir: () => void
  onRegistrar: (d: { carga: number; reps: number; rir: number | null; orden: number; objetivoCarga: number | null; objetivoReps: number | null; calentamiento?: boolean }) => void
  onDeshacer: (serieId: string) => void
  onEditar: (serieId: string, cambios: Partial<SerieLog>) => void
  onSustituir: () => void
  /** modo reordenar (solo esta sesión): callbacks para subir/bajar la tarjeta */
  orden?: { arriba: (() => void) | null; abajo: (() => void) | null }
}

export function TarjetaEjercicio({ linea, ejercicio, objetivo, ultima, series: todas, expandida, superserieNombre, primero, guardando, onExpandir, onRegistrar, onDeshacer, onEditar, onSustituir, orden }: Props) {
  const series = todas.filter((s) => !s.calentamiento)
  const calentamientos = todas.filter((s) => s.calentamiento)
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
  const [discos, setDiscos] = useState(false)

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
  const anterior = series.length ? series[series.length - 1] : null
  const repetirAnterior = () => {
    if (!anterior || guardando) return
    onRegistrar({ carga: anterior.carga, reps: anterior.reps, rir: rir ?? anterior.rir, orden: n + 1, objetivoCarga: objSerie?.carga ?? null, objetivoReps: objSerie?.reps ?? null })
    setExtra(false)
  }
  const sinRir = series.filter((s) => s.rir == null)

  return (
    <div className={`tarjeta transition-colors ${expandida ? 'ring-1 ring-acento/50' : completa ? 'opacity-70' : ''}`}>
      <div className="flex items-start gap-2">
      {orden && (
        <div className="flex flex-col gap-1">
          <button type="button" className="chip h-8 min-w-8 text-xs" disabled={!orden.arriba} onClick={() => orden.arriba?.()} aria-label="subir">↑</button>
          <button type="button" className="chip h-8 min-w-8 text-xs" disabled={!orden.abajo} onClick={() => orden.abajo?.()} aria-label="bajar">↓</button>
        </div>
      )}
      <button type="button" className="min-w-0 flex-1 text-left" onClick={onExpandir}>
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
      </div>

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

          <NotaMaquina ejercicio={ejercicio} />

          {series.length === 0 && calentamientos.length === 0 && ESCOMPUESTO.includes(ejercicio.patron) && (carga ?? 0) >= 30 && (() => {
            const sug = calentamientoSugerido(carga ?? 0, paso, !!primero)
            if (!sug.length) return null
            return (
              <div className="flex items-center justify-between rounded-xl bg-superficie-2 px-3 py-2 text-sm">
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-wider text-texto-3">Calentamiento</div>
                  <div className="text-texto-2">{sug.map((s) => `${kg(s.carga)}×${s.reps}`).join(' · ')}</div>
                </div>
                <button type="button" className="chip" disabled={guardando} onClick={() => sug.forEach((s, i) => onRegistrar({ carga: s.carga, reps: s.reps, rir: 4, orden: i + 1, objetivoCarga: null, objetivoReps: null, calentamiento: true }))}>Hecho</button>
              </div>
            )
          })()}
          {calentamientos.length > 0 && series.length === 0 && (
            <div className="text-[11px] text-texto-3">Calentamiento: {calentamientos.map((s) => `${kg(s.carga)}×${s.reps}`).join(' · ')}</div>
          )}

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

          {sinRir.length > 0 && (
            <div className="rounded-xl bg-aviso/10 px-3 py-2 text-xs text-texto">
              {sinRir.length === 1 ? 'Una serie quedó' : `${sinRir.length} series quedaron`} sin RIR. Tocala arriba para completarlo: sin RIR el coach no puede subirte la carga.
            </div>
          )}

          {(!completa || extra) && (
            <div className="space-y-3 rounded-xl border border-borde p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-wider text-texto-3">Serie {n + 1}{extra ? ' (extra)' : ''}</span>
                {carga == null && <span className="text-[11px] text-aviso">Tocá el número para escribir la carga</span>}
              </div>
              <div className="flex items-end justify-between gap-2">
                <div>
                  <div className="mb-1 flex items-center gap-2 text-[11px] text-texto-3">
                    Carga
                    {(ejercicio.equipo === 'barra' || ejercicio.equipo === 'smith') && carga != null && carga > 0 && (
                      <button type="button" className="rounded bg-superficie-2 px-1.5 py-0.5 text-[10px] text-texto-2" onClick={() => setDiscos(true)}>discos</button>
                    )}
                  </div>
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
              {anterior && (
                <button type="button" className="btn-secundario w-full" disabled={guardando} onClick={repetirAnterior}>
                  Igual que la anterior · {kg(anterior.carga)} × {anterior.reps} · RIR {rirTexto(rir ?? anterior.rir)}
                </button>
              )}
            </div>
          )}

          <div className="flex justify-between text-sm">
            <button type="button" className="py-1 text-texto-2" onClick={onSustituir}>Sustituir ejercicio</button>
            <a className="py-1 text-texto-2" href={`https://www.youtube.com/results?search_query=${encodeURIComponent(ejercicio.nombre + ' técnica')}`} target="_blank" rel="noreferrer">Ver técnica</a>
            {completa && !extra && <button type="button" className="py-1 text-texto-2" onClick={() => setExtra(true)}>+ serie extra</button>}
          </div>
          <HojaDiscos abierta={discos} onCerrar={() => setDiscos(false)} carga={carga ?? 0} smith={ejercicio.equipo === 'smith'} onElegir={(c) => { setCarga(c); setDiscos(false) }} />
        </div>
      )}
    </div>
  )
}

/** Ajustes de la máquina (asiento, respaldo, polea): se guardan en el ejercicio y aparecen siempre. */
function NotaMaquina({ ejercicio }: { ejercicio: Ejercicio }) {
  const [editando, setEditando] = useState(false)
  const [texto, setTexto] = useState(ejercicio.notaMaquina ?? '')
  useEffect(() => setTexto(ejercicio.notaMaquina ?? ''), [ejercicio.notaMaquina])
  const guardar = async () => {
    await repo.actualizarEjercicio(ejercicio.id, { notaMaquina: texto.trim() })
    setEditando(false)
  }
  if (editando) {
    return (
      <div className="flex gap-2">
        <input autoFocus value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && guardar()} placeholder="Asiento 4, respaldo 2, polea en la marca 7…" className="h-10 min-w-0 flex-1 rounded-xl bg-superficie-2 px-3 text-sm outline-none ring-1 ring-acento" />
        <button type="button" className="chip h-10 bg-acento text-black" onClick={guardar}>Guardar</button>
      </div>
    )
  }
  return ejercicio.notaMaquina ? (
    <button type="button" className="flex w-full items-start gap-2 rounded-xl bg-superficie-2 px-3 py-2 text-left text-sm" onClick={() => setEditando(true)}>
      <span className="shrink-0 text-[11px] font-medium uppercase tracking-wider text-texto-3">Máquina</span>
      <span className="text-texto">{ejercicio.notaMaquina}</span>
    </button>
  ) : (
    <button type="button" className="text-xs text-texto-3" onClick={() => setEditando(true)}>+ Anotar ajustes de la máquina (asiento, respaldo, polea)</button>
  )
}

function HojaDiscos({ abierta, onCerrar, carga, smith, onElegir }: { abierta: boolean; onCerrar: () => void; carga: number; smith: boolean; onElegir: (c: number) => void }) {
  const ajustes = useAjustes()
  const [barraHoy, setBarraHoy] = useState<number | null>(null)
  if (!ajustes) return null
  const barraDefault = smith ? ajustes.pesoBarraSmith : ajustes.pesoBarra
  const barra = barraHoy ?? barraDefault
  const r = discosPorLado(carga, barra, ajustes.discos)
  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo={`${kg(carga)} kg · discos por lado`}>
      <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-texto-3">Barra de hoy</div>
      <div className="mb-3 flex items-center gap-1.5">
        {[barraDefault, 20, 15, 10, 7.5].filter((v, i, a) => a.indexOf(v) === i).map((b) => (
          <button key={b} type="button" className={`chip ${barra === b ? 'chip-activo' : ''}`} onClick={() => setBarraHoy(b)}>{kg(b)}</button>
        ))}
        <Stepper valor={barra} paso={0.5} min={0} onCambio={setBarraHoy} />
      </div>
      <div className="mb-3 text-xs text-texto-2">Solo para esta serie. La barra habitual se cambia en Ajustes.</div>
      {r.porLado.length === 0 ? (
        <div className="text-sm text-texto-2">Solo la barra.</div>
      ) : (
        <div className="flex flex-wrap items-end gap-1.5">
          {r.porLado.map((d, i) => (
            <div key={i} className="flex flex-col items-center justify-end rounded-md bg-acento text-black" style={{ width: 34 + Math.min(d, 25) * 1.2, height: 48 + Math.min(d, 25) * 2 }}>
              <span className="pb-1 text-xs font-semibold">{kg(d)}</span>
            </div>
          ))}
        </div>
      )}
      {r.diferencia !== 0 && (
        <div className="mt-3 text-sm text-aviso">
          Con tus discos llegás a {kg(r.alcanzado)} kg ({r.diferencia > 0 ? '−' : '+'}{kg(Math.abs(r.diferencia))}).
          <button type="button" className="ml-2 underline" onClick={() => onElegir(r.alcanzado)}>Usar {kg(r.alcanzado)}</button>
        </div>
      )}
      <button type="button" className="btn-secundario mt-4 w-full" onClick={onCerrar}>Cerrar</button>
    </Hoja>
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

const ESCOMPUESTO: Ejercicio['patron'][] = ['empuje-horizontal', 'empuje-vertical', 'tiron-vertical', 'tiron-horizontal', 'rodilla-dominante', 'cadera-dominante']

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
