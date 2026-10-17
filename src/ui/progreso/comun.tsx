import { useMemo, useState } from 'react'
import type { SerieLog, Sesion } from '../../domain/types'
import { Escala, Hoja, Stepper } from '../componentes/basicos'
import { EditorSerie } from '../componentes/EditorSerie'
import { fechaCorta } from '../../lib/fechas'
import { kg, rirTexto } from '../../lib/formato'
import { useMapaEjercicios } from '../hooks'
import * as repo from '../../data/repo'

export const ESTILO_TOOLTIP = {
  contentStyle: { background: '#1c1c21', border: '1px solid #26262c', borderRadius: 12, fontSize: 12 },
  labelStyle: { color: '#a1a1aa' },
}

export const COLOR = { acento: '#ffb020', pierna: '#60a5fa', extra: '#c084fc', gris: '#63636b', ok: '#4ade80', aviso: '#fbbf24', alerta: '#f87171' }

/** Color por tipo de día, robusto a bloques viejos: se decide por el nombre. */
export function colorDia(nombre: string, esDeload = false): string {
  if (esDeload) return COLOR.gris
  const n = nombre.toLowerCase()
  if (n.startsWith('pierna')) return COLOR.pierna
  if (n.startsWith('torso')) return COLOR.acento
  return COLOR.extra
}

export function Dato({ titulo, valor, delta, unidad, sub }: { titulo: string; valor: string; delta?: number | null; unidad?: string; sub?: string }) {
  return (
    <div className="tarjeta p-3">
      <div className="text-[11px] font-medium uppercase tracking-wider text-texto-3">{titulo}</div>
      <div className="text-lg font-semibold">{valor}</div>
      {delta != null && delta !== 0 && <div className={`text-xs ${delta > 0 ? 'text-ok' : 'text-alerta'}`}>{delta > 0 ? '+' : ''}{kg(Math.round(delta * 10) / 10)} {unidad}</div>}
      {sub && <div className="text-xs text-texto-3">{sub}</div>}
    </div>
  )
}

/** Detalle de una sesión pasada, con edición de series (corregir, deshacer, agregar). */
/** Respuestas del cierre (energía, dolor, sueño), editables después: si se cerró sin contestar, se completan acá. */
function SensacionesSesion({ sesion }: { sesion: Sesion }) {
  const set = (c: Partial<Sesion>) => repo.actualizarSesion(sesion.id, c)
  return (
    <div className="mt-5 space-y-3 border-t border-borde pt-4">
      <div className="text-[11px] font-medium uppercase tracking-wider text-texto-3">Cómo estuvo la sesión</div>
      <div>
        <div className="mb-1 text-xs text-texto-2">Rendimiento (1 muy flojo · 5 enchufado)</div>
        <Escala valor={sesion.energia} onCambio={(v) => set({ energia: v })} opciones={[1, 2, 3, 4, 5].map((v) => ({ v, t: String(v) }))} />
      </div>
      <div>
        <div className="mb-1 text-xs text-texto-2">Dolor articular</div>
        <Escala valor={sesion.dolor} onCambio={(v) => set({ dolor: v })} opciones={[{ v: 0, t: 'No' }, { v: 1, t: 'Leve' }, { v: 2, t: 'Moderado' }, { v: 3, t: 'Fuerte' }]} />
      </div>
      <div className="flex items-center justify-between">
        <div className="text-xs text-texto-2">Horas de sueño la noche anterior</div>
        <Stepper valor={sesion.horasSueno ?? null} paso={0.5} min={0} base={7} sufijo="h" vacio="—" onCambio={(h) => set({ horasSueno: h, sueno: h < 6 ? 1 : h < 7.5 ? 2 : 3 })} />
      </div>
    </div>
  )
}

export function DetalleSesionHoja({ sesion, series, onCerrar }: { sesion: Sesion | null; series: SerieLog[]; onCerrar: () => void }) {
  const ejercicios = useMapaEjercicios()
  const [editando, setEditando] = useState<string | null>(null)
  const porEjercicio = useMemo(() => {
    const m = new Map<string, SerieLog[]>()
    for (const s of series) if (sesion && s.sesionId === sesion.id && !s.calentamiento) (m.get(s.ejercicioId) ?? m.set(s.ejercicioId, []).get(s.ejercicioId)!).push(s)
    for (const arr of m.values()) arr.sort((a, b) => a.orden - b.orden || a.ts.localeCompare(b.ts))
    return m
  }, [series, sesion])
  const min = sesion?.fechaFin ? Math.round((new Date(sesion.fechaFin).getTime() - new Date(sesion.fechaInicio).getTime()) / 60000) : null

  const agregar = async (ultima: SerieLog) => {
    await repo.registrarSerie({
      sesionId: ultima.sesionId, diaEjercicioId: ultima.diaEjercicioId, ejercicioId: ultima.ejercicioId, ejercicioPlanId: ultima.ejercicioPlanId,
      orden: ultima.orden + 1, objetivoCarga: null, objetivoReps: null, rirObjetivo: ultima.rirObjetivo, carga: ultima.carga, reps: ultima.reps, rir: ultima.rir, calentamiento: false,
    })
  }

  return (
    <Hoja abierta={!!sesion} onCerrar={onCerrar} titulo={sesion ? `${sesion.diaNombre} · ${fechaCorta(sesion.fechaInicio)}` : ''}>
      {sesion && (
        <>
          <div className="mb-3 text-xs text-texto-3">Semana {sesion.semana}{sesion.esDeload ? ' · descarga' : ''}{min != null ? ` · ${min} min` : ''} · tocá una serie para corregirla</div>
          <div className="space-y-3">
            {[...porEjercicio.entries()].map(([ejId, ss]) => {
              const ej = ejercicios.get(ejId)
              return (
                <div key={ejId}>
                  <div className="mb-1 flex items-baseline justify-between">
                    <span className="text-sm font-medium">{ej?.nombre ?? ejId}</span>
                    <button type="button" className="text-xs text-texto-3" onClick={() => agregar(ss[ss.length - 1])}>+ serie</button>
                  </div>
                  <ul className="space-y-1">
                    {ss.map((s, i) => (
                      <li key={s.id} className="rounded-lg bg-superficie-2 px-3 py-1.5 text-sm">
                        {editando === s.id ? (
                          <EditorSerie serie={s} paso={ej?.incremento || 2.5} rirObjetivo={s.rirObjetivo} onGuardar={async (c) => { await repo.actualizarSerie(s.id, c); setEditando(null) }} onCancelar={() => setEditando(null)} />
                        ) : (
                          <div className="flex items-center justify-between">
                            <button type="button" className="flex-1 text-left" onClick={() => setEditando(s.id)}>
                              <span className="mr-2 text-texto-3">{i + 1}</span>
                              <span className="font-semibold">{kg(s.carga)} kg × {s.reps}</span>
                              <span className="ml-2 text-texto-2">RIR {rirTexto(s.rir)}</span>
                            </button>
                            <button type="button" className="chip h-7 min-w-7 text-xs" aria-label="quitar" onClick={() => { if (confirm('¿Quitar esta serie? Queda desactivada, no se borra.')) repo.desactivarSerie(s.id) }}>↶</button>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
          <SensacionesSesion sesion={sesion} />
        </>
      )}
    </Hoja>
  )
}
