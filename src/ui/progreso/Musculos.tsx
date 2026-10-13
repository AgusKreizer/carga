import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAjustes, useMapaEjercicios, useSesionesTerminadas, useTodasLasSeries } from '../hooks'
import { MUSCULOS, type MusculoId } from '../../domain/types'
import { zona } from '../../domain/coach/volumen'
import { fechaCorta, fechaLocal, lunesDe, sumarDias } from '../../lib/fechas'
import { MapaCuerpo, Leyenda } from './MapaCuerpo'
import { COLOR, ESTILO_TOOLTIP } from './comun'

export function Musculos() {
  const series = useTodasLasSeries()
  const ejercicios = useMapaEjercicios()
  const ajustes = useAjustes()
  const sesiones = useSesionesTerminadas(500)
  const [sel, setSel] = useState<MusculoId | null>(null)
  const [semanaOffset, setSemanaOffset] = useState(0) // 0 = esta semana, 1 = la pasada
  const factor = ajustes?.factorIndirecto ?? 0.5
  const bandas = ajustes?.bandas ?? {}

  const semanas = useMemo(() => {
    const terminadas = new Map(sesiones.map((s) => [s.id, s]))
    const lunesHoy = lunesDe(fechaLocal())
    const claves: string[] = []
    for (let i = 7; i >= 0; i--) claves.push(sumarDias(lunesHoy, -7 * i))
    const acum = new Map<string, Partial<Record<MusculoId, number>>>(claves.map((k) => [k, {}]))
    for (const s of series) {
      const ses = terminadas.get(s.sesionId)
      if (!ses) continue
      const fila = acum.get(lunesDe(fechaLocal(new Date(ses.fechaInicio))))
      if (!fila) continue
      const ej = ejercicios.get(s.ejercicioId)
      if (!ej) continue
      for (const [m, f] of Object.entries(ej.musculos) as [MusculoId, number][]) {
        const ff = f >= 1 ? 1 : (f / 0.5) * factor
        fila[m] = Math.round(((fila[m] ?? 0) + ff) * 10) / 10
      }
    }
    return claves.map((k) => ({ semana: k, label: fechaCorta(k + 'T12:00:00'), valores: acum.get(k)! }))
  }, [series, sesiones, ejercicios, factor])

  const vista = semanas[semanas.length - 1 - semanaOffset]
  const valores = vista?.valores ?? {}
  const datosBarras = semanas.map((s) => ({ label: s.label, v: sel ? s.valores[sel] ?? 0 : 0 }))
  const b = sel ? bandas[sel] : undefined
  const orden: MusculoId[] = ['pecho', 'espalda', 'deltLat', 'deltPost', 'triceps', 'biceps', 'cuads', 'isquios', 'gluteos', 'gemelos', 'abs']

  return (
    <div className="space-y-3">
      <div className="tarjeta">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[11px] font-medium uppercase tracking-wider text-texto-3">Series por músculo · {semanaOffset === 0 ? 'esta semana' : semanaOffset === 1 ? 'semana pasada' : `semana del ${vista?.label}`}</div>
          <div className="flex gap-1">
            <button type="button" className="chip h-7 min-w-7 text-xs" disabled={semanaOffset >= 7} onClick={() => setSemanaOffset(semanaOffset + 1)}>‹</button>
            <button type="button" className="chip h-7 min-w-7 text-xs" disabled={semanaOffset === 0} onClick={() => setSemanaOffset(semanaOffset - 1)}>›</button>
          </div>
        </div>
        <MapaCuerpo valores={valores} bandas={bandas} seleccionado={sel} onTocar={(m) => setSel(sel === m ? null : m)} />
        <div className="mt-3 min-h-10 rounded-xl bg-superficie-2 px-3 py-2 text-sm">
          {sel ? <InfoMusculo m={sel} v={valores[sel] ?? 0} banda={bandas[sel]} previa={semanas[semanas.length - 2 - semanaOffset]?.valores[sel] ?? 0} /> : <span className="text-texto-2">Tocá un músculo para ver el detalle.</span>}
        </div>
        <div className="mt-3"><Leyenda /></div>
      </div>

      {sel && (
        <div className="tarjeta">
          <div className="mb-2 flex items-baseline justify-between">
            <div className="text-[11px] font-medium uppercase tracking-wider text-texto-3">{MUSCULOS[sel]} · últimas 8 semanas</div>
            {b && <div className="text-[11px] text-texto-3">banda {b.min}–{b.max}</div>}
          </div>
          <div className="h-40">
            <ResponsiveContainer>
              <BarChart data={datosBarras} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid stroke="#26262c" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#63636b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#63636b', fontSize: 11 }} axisLine={false} tickLine={false} />
                {b && <ReferenceArea y1={b.min} y2={b.max} fill={COLOR.ok} fillOpacity={0.08} />}
                <Tooltip {...ESTILO_TOOLTIP} formatter={(v) => [`${v} series`, MUSCULOS[sel]]} cursor={{ fill: '#26262c' }} />
                <Bar dataKey="v" fill={COLOR.acento} radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="tarjeta">
        <ul className="space-y-1 text-sm">
          {orden.map((m) => {
            const v = valores[m] ?? 0
            const z = zona(v, bandas[m])
            return (
              <li key={m}>
                <button type="button" className="flex w-full justify-between py-0.5" onClick={() => setSel(sel === m ? null : m)}>
                  <span className={sel === m ? 'text-texto' : 'text-texto-2'}>{MUSCULOS[m]}</span>
                  <span className={v === 0 ? 'text-texto-3' : z === 'bajo' ? 'text-aviso' : z === 'alto' ? 'text-alerta' : z === 'productivo' ? 'text-ok' : 'text-texto-2'}>{v}{bandas[m] && <span className="text-texto-3"> / {bandas[m]!.min}–{bandas[m]!.max}</span>}</span>
                </button>
              </li>
            )
          })}
        </ul>
        <div className="mt-2 text-[11px] text-texto-3">Serie directa = 1 · indirecta = {factor}. La semana en curso se completa a medida que entrenás.</div>
      </div>
    </div>
  )
}

function InfoMusculo({ m, v, banda, previa }: { m: MusculoId; v: number; banda?: { min: number; max: number }; previa: number }) {
  const z = zona(v, banda)
  let txt = ''
  if (!banda) txt = 'Sin banda de referencia.'
  else if (v === 0) txt = `Sin series todavía. Mínimo ${banda.min}.`
  else if (z === 'bajo') txt = `Faltan ${Math.round((banda.min - v) * 10) / 10} para el mínimo (${banda.min}).`
  else if (z === 'alto') txt = `${Math.round((v - banda.max) * 10) / 10} por encima del máximo (${banda.max}): mirá la recuperación.`
  else txt = `En zona productiva (${banda.min}–${banda.max}).`
  return (
    <span>
      <span className="font-semibold">{MUSCULOS[m]}: {v}</span> <span className="text-texto-2">{txt}{previa ? ` Semana anterior: ${previa}.` : ''}</span>
    </span>
  )
}
