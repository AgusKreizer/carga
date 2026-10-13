import { useMemo } from 'react'
import type { SerieLog, Sesion } from '../../domain/types'
import { Hoja } from '../componentes/basicos'
import { resumenSeries } from '../hoy/TarjetaEjercicio'
import { fechaCorta } from '../../lib/fechas'
import { kg } from '../../lib/formato'
import { useMapaEjercicios } from '../hooks'

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

export function DetalleSesionHoja({ sesion, series, onCerrar }: { sesion: Sesion | null; series: SerieLog[]; onCerrar: () => void }) {
  const ejercicios = useMapaEjercicios()
  const porEjercicio = useMemo(() => {
    const m = new Map<string, SerieLog[]>()
    for (const s of series) if (sesion && s.sesionId === sesion.id && !s.calentamiento) (m.get(s.ejercicioId) ?? m.set(s.ejercicioId, []).get(s.ejercicioId)!).push(s)
    return m
  }, [series, sesion])
  const min = sesion?.fechaFin ? Math.round((new Date(sesion.fechaFin).getTime() - new Date(sesion.fechaInicio).getTime()) / 60000) : null
  return (
    <Hoja abierta={!!sesion} onCerrar={onCerrar} titulo={sesion ? `${sesion.diaNombre} · ${fechaCorta(sesion.fechaInicio)}` : ''}>
      {sesion && (
        <>
          <div className="mb-3 text-xs text-texto-3">Semana {sesion.semana}{sesion.esDeload ? ' · descarga' : ''}{min != null ? ` · ${min} min` : ''} · {series.filter((s) => s.sesionId === sesion.id).length} series</div>
          <ul className="space-y-2 text-sm">
            {[...porEjercicio.entries()].map(([ejId, ss]) => (
              <li key={ejId} className="flex justify-between gap-3">
                <span className="truncate">{ejercicios.get(ejId)?.nombre ?? ejId}</span>
                <span className="shrink-0 text-texto-2">{resumenSeries([...ss].sort((a, b) => a.orden - b.orden))}</span>
              </li>
            ))}
          </ul>
          {(sesion.energia || sesion.dolor != null || sesion.sueno) && (
            <div className="mt-3 text-xs text-texto-3">
              {sesion.energia ? `Energía ${['', 'baja', 'normal', 'alta'][sesion.energia]} · ` : ''}{sesion.dolor != null ? `Dolor ${['no', 'leve', 'moderado', 'fuerte'][sesion.dolor]} · ` : ''}{sesion.sueno ? `Sueño ${['', 'mal', 'normal', 'bien'][sesion.sueno]}` : ''}
            </div>
          )}
        </>
      )}
    </Hoja>
  )
}
