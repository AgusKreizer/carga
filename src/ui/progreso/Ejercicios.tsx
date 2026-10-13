import { useMemo } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useMapaEjercicios, useSesionesTerminadas, useTodasLasSeries } from '../hooks'
import type { SerieLog } from '../../domain/types'
import { mejorE1rm } from '../../domain/coach/e1rm'
import { fechaCorta } from '../../lib/fechas'
import { kg } from '../../lib/formato'
import { Vacio } from '../componentes/basicos'
import { resumenSeries } from '../hoy/TarjetaEjercicio'
import { COLOR, Dato, ESTILO_TOOLTIP } from './comun'

interface Punto {
  fecha: string
  label: string
  carga: number
  e1rm: number
  reps: number
  resumen: string
  esDeload: boolean
  nuevoBloque: boolean
  pr: boolean
}

export function Ejercicios({ seleccionado, onSeleccionar }: { seleccionado: string | null; onSeleccionar: (id: string) => void }) {
  const series = useTodasLasSeries()
  const ejercicios = useMapaEjercicios()
  const sesiones = useSesionesTerminadas(500)
  const terminadas = useMemo(() => new Map(sesiones.map((s) => [s.id, s])), [sesiones])

  const porEjercicio = useMemo(() => {
    const m = new Map<string, SerieLog[]>()
    for (const s of series) if (terminadas.has(s.sesionId)) (m.get(s.ejercicioId) ?? m.set(s.ejercicioId, []).get(s.ejercicioId)!).push(s)
    return m
  }, [series, terminadas])

  const lista = [...porEjercicio.entries()].map(([id, ss]) => ({ id, nombre: ejercicios.get(id)?.nombre ?? id, n: new Set(ss.map((s) => s.sesionId)).size })).sort((a, b) => b.n - a.n)
  const activo = seleccionado && porEjercicio.has(seleccionado) ? seleccionado : lista[0]?.id ?? null

  const datos = useMemo<Punto[]>(() => {
    if (!activo) return []
    const ss = porEjercicio.get(activo) ?? []
    const porSesion = new Map<string, SerieLog[]>()
    for (const s of ss) (porSesion.get(s.sesionId) ?? porSesion.set(s.sesionId, []).get(s.sesionId)!).push(s)
    const puntos = [...porSesion.entries()]
      .map(([sid, arr]) => {
        const ses = terminadas.get(sid)!
        return {
          fecha: ses.fechaInicio,
          label: fechaCorta(ses.fechaInicio),
          carga: Math.max(...arr.map((a) => a.carga)),
          e1rm: Math.round(mejorE1rm(arr)),
          reps: arr.reduce((a, b) => a + b.reps, 0),
          resumen: resumenSeries(arr.sort((x, y) => x.orden - y.orden)),
          esDeload: ses.esDeload,
          bloqueId: ses.bloqueId,
        }
      })
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
    let maxCarga = -Infinity
    return puntos.map((p, i) => {
      const pr = !p.esDeload && p.carga > maxCarga && i > 0
      if (p.carga > maxCarga) maxCarga = p.carga
      return { ...p, pr, nuevoBloque: i > 0 && p.bloqueId !== puntos[i - 1].bloqueId }
    })
  }, [activo, porEjercicio, terminadas])

  if (!lista.length) return <Vacio titulo="Todavía no hay sesiones" detalle="Cuando termines la primera, acá vas a ver carga, reps y 1RM estimado por ejercicio." />

  const ultimo = datos[datos.length - 1]
  const primero = datos[0]
  const prs = datos.filter((d) => d.pr).length

  return (
    <div className="space-y-3">
      <select value={activo ?? ''} onChange={(e) => onSeleccionar(e.target.value)} className="h-12 w-full rounded-xl bg-superficie-2 px-3 text-base outline-none">
        {lista.map((l) => <option key={l.id} value={l.id}>{l.nombre} ({l.n})</option>)}
      </select>
      {ultimo && (
        <div className="grid grid-cols-3 gap-2">
          <Dato titulo="Carga máx." valor={`${kg(ultimo.carga)} kg`} delta={primero && datos.length > 1 ? ultimo.carga - primero.carga : null} unidad="kg" />
          <Dato titulo="1RM est." valor={`${ultimo.e1rm} kg`} delta={primero && datos.length > 1 ? ultimo.e1rm - primero.e1rm : null} unidad="kg" />
          <Dato titulo="PRs" valor={String(prs)} sub={`${datos.length} sesiones`} />
        </div>
      )}
      <div className="tarjeta">
        <div className="mb-2 flex items-baseline justify-between">
          <div className="text-[11px] font-medium uppercase tracking-wider text-texto-3">Carga máxima y 1RM estimado</div>
          <div className="text-[11px] text-texto-3">● PR · ○ descarga · ┆ nuevo bloque</div>
        </div>
        <div className="h-52">
          <ResponsiveContainer>
            <LineChart data={datos} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid stroke="#26262c" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#63636b', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={20} />
              <YAxis tick={{ fill: '#63636b', fontSize: 11 }} axisLine={false} tickLine={false} domain={['dataMin - 5', 'dataMax + 5']} />
              <Tooltip
                {...ESTILO_TOOLTIP}
                formatter={(v, n) => [`${v} kg`, n === 'carga' ? 'Carga' : '1RM est.']}
                labelFormatter={(l, p) => { const d = (p?.[0]?.payload as Punto | undefined); return d ? `${l}${d.esDeload ? ' · descarga' : ''}${d.pr ? ' · PR' : ''} — ${d.resumen}` : String(l) }}
              />
              {datos.filter((d) => d.nuevoBloque).map((d) => <ReferenceLine key={d.fecha} x={d.label} stroke="#63636b" strokeDasharray="3 3" />)}
              <Line type="monotone" dataKey="e1rm" stroke="#63636b" strokeWidth={2} dot={false} strokeDasharray="4 4" isAnimationActive={false} />
              <Line
                type="monotone"
                dataKey="carga"
                stroke={COLOR.acento}
                strokeWidth={2.5}
                isAnimationActive={false}
                dot={(p: { cx?: number; cy?: number; payload?: Punto; index?: number }) => {
                  const d = p.payload
                  if (p.cx == null || p.cy == null || !d) return <g key={p.index} />
                  if (d.esDeload) return <circle key={p.index} cx={p.cx} cy={p.cy} r={4} fill="#0b0b0d" stroke="#63636b" strokeWidth={1.5} />
                  if (d.pr) return <circle key={p.index} cx={p.cx} cy={p.cy} r={5.5} fill={COLOR.acento} stroke="#f4f4f5" strokeWidth={1.5} />
                  return <circle key={p.index} cx={p.cx} cy={p.cy} r={3} fill={COLOR.acento} />
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="tarjeta">
        <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-texto-3">Sesiones</div>
        <ul className="space-y-1.5 text-sm">
          {[...datos].reverse().map((d) => (
            <li key={d.fecha} className="flex justify-between gap-3">
              <span className="shrink-0 text-texto-2">{d.label}{d.esDeload ? <span className="ml-1 text-[10px] text-texto-3">desc.</span> : ''}{d.pr ? <span className="ml-1 text-[10px] text-acento">PR</span> : ''}</span>
              <span className="truncate text-right">{d.resumen}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
