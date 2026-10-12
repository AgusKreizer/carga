import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAjustes, useMapaEjercicios, useMedidas, usePesos, useSesionesTerminadas, useTodasLasSeries } from '../hooks'
import { MUSCULOS, type MusculoId, type SerieLog } from '../../domain/types'
import { mejorE1rm } from '../../domain/coach/e1rm'
import { zona } from '../../domain/coach/volumen'
import { fechaCorta, lunesDe, sumarDias, fechaLocal } from '../../lib/fechas'
import { kg } from '../../lib/formato'
import { Hoja, Vacio } from '../componentes/basicos'
import { PesoHoja } from '../hoy/Hoy'
import * as repo from '../../data/repo'
import { resumenSeries } from '../hoy/TarjetaEjercicio'

type Sub = 'ejercicios' | 'musculos' | 'cuerpo' | 'historial'

export function Progreso() {
  const [sub, setSub] = useState<Sub>('ejercicios')
  return (
    <div className="space-y-3 pt-1">
      <div className="sin-scrollbar flex gap-1.5 overflow-x-auto">
        {([['ejercicios', 'Ejercicios'], ['musculos', 'Músculos'], ['cuerpo', 'Cuerpo'], ['historial', 'Historial']] as [Sub, string][]).map(([k, t]) => (
          <button key={k} type="button" className={`chip shrink-0 ${sub === k ? 'chip-activo' : ''}`} onClick={() => setSub(k)}>{t}</button>
        ))}
      </div>
      {sub === 'ejercicios' && <Ejercicios />}
      {sub === 'musculos' && <Musculos />}
      {sub === 'cuerpo' && <Cuerpo />}
      {sub === 'historial' && <Historial />}
    </div>
  )
}

const ESTILO_TOOLTIP = { contentStyle: { background: '#1c1c21', border: '1px solid #26262c', borderRadius: 12, fontSize: 12 }, labelStyle: { color: '#a1a1aa' } }

function Ejercicios() {
  const series = useTodasLasSeries()
  const ejercicios = useMapaEjercicios()
  const sesiones = useSesionesTerminadas(500)
  const terminadas = useMemo(() => new Map(sesiones.map((s) => [s.id, s])), [sesiones])
  const [sel, setSel] = useState<string | null>(null)

  const porEjercicio = useMemo(() => {
    const m = new Map<string, SerieLog[]>()
    for (const s of series) if (terminadas.has(s.sesionId)) (m.get(s.ejercicioId) ?? m.set(s.ejercicioId, []).get(s.ejercicioId)!).push(s)
    return m
  }, [series, terminadas])

  const lista = [...porEjercicio.entries()].map(([id, ss]) => ({ id, nombre: ejercicios.get(id)?.nombre ?? id, n: new Set(ss.map((s) => s.sesionId)).size })).sort((a, b) => b.n - a.n)
  const activo = sel ?? lista[0]?.id ?? null

  if (!lista.length) return <Vacio titulo="Todavía no hay sesiones" detalle="Cuando termines la primera, acá vas a ver carga, reps y 1RM estimado por ejercicio." />

  const datos = (() => {
    if (!activo) return []
    const ss = porEjercicio.get(activo) ?? []
    const porSesion = new Map<string, SerieLog[]>()
    for (const s of ss) (porSesion.get(s.sesionId) ?? porSesion.set(s.sesionId, []).get(s.sesionId)!).push(s)
    return [...porSesion.entries()]
      .map(([sid, arr]) => {
        const ses = terminadas.get(sid)!
        const carga = Math.max(...arr.map((a) => a.carga))
        const reps = arr.reduce((a, b) => a + b.reps, 0)
        return { fecha: ses.fechaInicio, label: fechaCorta(ses.fechaInicio), carga, e1rm: Math.round(mejorE1rm(arr)), reps, resumen: resumenSeries(arr.sort((x, y) => x.orden - y.orden)) }
      })
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
  })()

  const ultimo = datos[datos.length - 1]
  const primero = datos[0]

  return (
    <div className="space-y-3">
      <select value={activo ?? ''} onChange={(e) => setSel(e.target.value)} className="h-12 w-full rounded-xl bg-superficie-2 px-3 text-base outline-none">
        {lista.map((l) => <option key={l.id} value={l.id}>{l.nombre} ({l.n})</option>)}
      </select>
      {ultimo && (
        <div className="grid grid-cols-3 gap-2">
          <Dato titulo="Carga máx." valor={`${kg(ultimo.carga)} kg`} delta={primero && datos.length > 1 ? ultimo.carga - primero.carga : null} unidad="kg" />
          <Dato titulo="1RM est." valor={`${ultimo.e1rm} kg`} delta={primero && datos.length > 1 ? ultimo.e1rm - primero.e1rm : null} unidad="kg" />
          <Dato titulo="Sesiones" valor={String(datos.length)} />
        </div>
      )}
      <div className="tarjeta">
        <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-texto-3">Carga máxima y 1RM estimado</div>
        <div className="h-48">
          <ResponsiveContainer>
            <LineChart data={datos} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid stroke="#26262c" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#63636b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#63636b', fontSize: 11 }} axisLine={false} tickLine={false} domain={['dataMin - 5', 'dataMax + 5']} />
              <Tooltip {...ESTILO_TOOLTIP} formatter={(v, n) => [`${v} kg`, n === 'carga' ? 'Carga' : '1RM est.']} />
              <Line type="monotone" dataKey="e1rm" stroke="#63636b" strokeWidth={2} dot={false} strokeDasharray="4 4" />
              <Line type="monotone" dataKey="carga" stroke="#ffb020" strokeWidth={2.5} dot={{ r: 3, fill: '#ffb020' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="tarjeta">
        <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-texto-3">Sesiones</div>
        <ul className="space-y-1.5 text-sm">
          {[...datos].reverse().map((d) => (
            <li key={d.fecha} className="flex justify-between gap-3">
              <span className="shrink-0 text-texto-2">{d.label}</span>
              <span className="truncate text-right">{d.resumen}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function Dato({ titulo, valor, delta, unidad }: { titulo: string; valor: string; delta?: number | null; unidad?: string }) {
  return (
    <div className="tarjeta p-3">
      <div className="text-[11px] font-medium uppercase tracking-wider text-texto-3">{titulo}</div>
      <div className="text-lg font-semibold">{valor}</div>
      {delta != null && delta !== 0 && <div className={`text-xs ${delta > 0 ? 'text-ok' : 'text-alerta'}`}>{delta > 0 ? '+' : ''}{kg(Math.round(delta * 10) / 10)} {unidad}</div>}
    </div>
  )
}

function Musculos() {
  const series = useTodasLasSeries()
  const ejercicios = useMapaEjercicios()
  const ajustes = useAjustes()
  const sesiones = useSesionesTerminadas(500)
  const [sel, setSel] = useState<MusculoId>('espalda')
  const factor = ajustes?.factorIndirecto ?? 0.5
  const bandas = ajustes?.bandas ?? {}

  const semanas = useMemo(() => {
    const terminadas = new Map(sesiones.map((s) => [s.id, s]))
    const hoy = fechaLocal()
    const lunesHoy = lunesDe(hoy)
    const claves: string[] = []
    for (let i = 7; i >= 0; i--) claves.push(sumarDias(lunesHoy, -7 * i))
    const acum = new Map<string, Partial<Record<MusculoId, number>>>(claves.map((k) => [k, {}]))
    for (const s of series) {
      const ses = terminadas.get(s.sesionId)
      if (!ses) continue
      const semana = lunesDe(ses.fechaInicio.slice(0, 10))
      const fila = acum.get(semana)
      if (!fila) continue
      const ej = ejercicios.get(s.ejercicioId)
      if (!ej) continue
      for (const [m, f] of Object.entries(ej.musculos) as [MusculoId, number][]) {
        const ff = f >= 1 ? 1 : (f / 0.5) * factor
        fila[m] = Math.round(((fila[m] ?? 0) + ff) * 10) / 10
      }
    }
    return claves.map((k) => ({ semana: k, label: fechaCorta(k + 'T12:00:00'), ...acum.get(k) }))
  }, [series, sesiones, ejercicios, factor])

  const estaSemana = semanas[semanas.length - 1] as Record<string, number | string>
  const orden: MusculoId[] = ['pecho', 'espalda', 'deltLat', 'deltPost', 'triceps', 'biceps', 'cuads', 'isquios', 'gluteos', 'gemelos', 'abs']
  const b = bandas[sel]

  return (
    <div className="space-y-3">
      <div className="sin-scrollbar flex gap-1.5 overflow-x-auto">
        {orden.map((m) => <button key={m} type="button" className={`chip shrink-0 ${sel === m ? 'chip-activo' : ''}`} onClick={() => setSel(m)}>{MUSCULOS[m]}</button>)}
      </div>
      <div className="tarjeta">
        <div className="mb-2 flex items-baseline justify-between">
          <div className="text-[11px] font-medium uppercase tracking-wider text-texto-3">{MUSCULOS[sel]} · series por semana (hechas)</div>
          {b && <div className="text-[11px] text-texto-3">banda {b.min}–{b.max}</div>}
        </div>
        <div className="h-44">
          <ResponsiveContainer>
            <BarChart data={semanas} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid stroke="#26262c" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: '#63636b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#63636b', fontSize: 11 }} axisLine={false} tickLine={false} />
              {b && <ReferenceArea y1={b.min} y2={b.max} fill="#4ade80" fillOpacity={0.08} />}
              <Tooltip {...ESTILO_TOOLTIP} formatter={(v) => [`${v} series`, MUSCULOS[sel]]} cursor={{ fill: '#26262c' }} />
              <Bar dataKey={sel} fill="#ffb020" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="tarjeta">
        <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-texto-3">Esta semana (desde el lunes)</div>
        <ul className="space-y-1 text-sm">
          {orden.map((m) => {
            const v = (estaSemana[m] as number) ?? 0
            const z = zona(v, bandas[m])
            return (
              <li key={m} className="flex justify-between">
                <span>{MUSCULOS[m]}</span>
                <span className={z === 'bajo' ? 'text-aviso' : z === 'alto' ? 'text-alerta' : z === 'productivo' ? 'text-ok' : 'text-texto-2'}>{v}{bandas[m] && <span className="text-texto-3"> / {bandas[m]!.min}–{bandas[m]!.max}</span>}</span>
              </li>
            )
          })}
        </ul>
        <div className="mt-2 text-[11px] text-texto-3">La semana en curso se completa a medida que entrenás; compará con las anteriores.</div>
      </div>
    </div>
  )
}

function Cuerpo() {
  const pesos = usePesos()
  const medidas = useMedidas()
  const [pesoAbierto, setPesoAbierto] = useState(false)
  const [medidaAbierta, setMedidaAbierta] = useState(false)
  const hoy = fechaLocal()

  const datos = useMemo(() => {
    const ult = pesos.slice(-90)
    return ult.map((p, i) => {
      const ventana = ult.slice(Math.max(0, i - 6), i + 1).filter((x) => x.fecha >= sumarDias(p.fecha, -6))
      const media = ventana.reduce((a, x) => a + x.kg, 0) / ventana.length
      return { fecha: p.fecha, label: fechaCorta(p.fecha + 'T12:00:00'), kg: p.kg, media: Math.round(media * 10) / 10 }
    })
  }, [pesos])

  const ultimo = datos[datos.length - 1]
  const hace4 = datos.find((d) => d.fecha >= sumarDias(hoy, -28))
  const ultimaMedida = medidas[medidas.length - 1]
  const prevMedida = medidas[medidas.length - 2]

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Dato titulo="Peso (media 7 d)" valor={ultimo ? `${kg(ultimo.media)} kg` : '—'} delta={ultimo && hace4 && hace4 !== ultimo ? ultimo.media - hace4.media : null} unidad="kg en 4 sem" />
        <Dato titulo="Cintura" valor={ultimaMedida?.cintura ? `${kg(ultimaMedida.cintura)} cm` : '—'} delta={ultimaMedida?.cintura && prevMedida?.cintura ? ultimaMedida.cintura - prevMedida.cintura : null} unidad="cm" />
      </div>
      <div className="tarjeta">
        <div className="mb-2 flex items-baseline justify-between">
          <div className="text-[11px] font-medium uppercase tracking-wider text-texto-3">Peso corporal</div>
          <button type="button" className="text-xs text-acento" onClick={() => setPesoAbierto(true)}>Anotar hoy</button>
        </div>
        {datos.length < 2 ? (
          <div className="py-6 text-center text-sm text-texto-2">Anotá el peso 3 o más mañanas por semana. Lo que importa es la media, no el día.</div>
        ) : (
          <div className="h-44">
            <ResponsiveContainer>
              <LineChart data={datos} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid stroke="#26262c" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#63636b', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={24} />
                <YAxis tick={{ fill: '#63636b', fontSize: 11 }} axisLine={false} tickLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip {...ESTILO_TOOLTIP} formatter={(v, n) => [`${kg(Number(v))} kg`, n === 'kg' ? 'Día' : 'Media 7 d']} />
                <Line type="monotone" dataKey="kg" stroke="#63636b" strokeWidth={1.5} dot={{ r: 2, fill: '#63636b' }} />
                <Line type="monotone" dataKey="media" stroke="#ffb020" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      <div className="tarjeta">
        <div className="mb-2 flex items-baseline justify-between">
          <div className="text-[11px] font-medium uppercase tracking-wider text-texto-3">Perímetros (cada 4 semanas)</div>
          <button type="button" className="text-xs text-acento" onClick={() => setMedidaAbierta(true)}>Agregar</button>
        </div>
        {medidas.length === 0 ? (
          <div className="text-sm text-texto-2">Cintura en el ombligo, brazo relajado, muslo medio. Misma hora, misma cinta.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-texto-3"><tr><th className="text-left font-medium">Fecha</th><th className="font-medium">Cintura</th><th className="font-medium">Brazo</th><th className="font-medium">Muslo</th><th className="font-medium">Pecho</th></tr></thead>
            <tbody>
              {[...medidas].reverse().map((m) => (
                <tr key={m.id}><td className="py-1 text-texto-2">{fechaCorta(m.fecha + 'T12:00:00')}</td><td className="text-center">{kg(m.cintura)}</td><td className="text-center">{kg(m.brazo)}</td><td className="text-center">{kg(m.muslo)}</td><td className="text-center">{kg(m.pecho)}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <PesoHoja abierta={pesoAbierto} onCerrar={() => setPesoAbierto(false)} inicial={pesos.find((p) => p.fecha === hoy)?.kg ?? pesos[pesos.length - 1]?.kg ?? 76} fecha={hoy} />
      <Hoja abierta={medidaAbierta} onCerrar={() => setMedidaAbierta(false)} titulo="Perímetros de hoy">
        <FormMedida onGuardar={async (m) => { await repo.guardarMedida({ fecha: hoy, ...m }); setMedidaAbierta(false) }} />
      </Hoja>
    </div>
  )
}

function FormMedida({ onGuardar }: { onGuardar: (m: { cintura: number | null; brazo: number | null; muslo: number | null; pecho: number | null }) => void }) {
  const [v, setV] = useState({ cintura: '', brazo: '', muslo: '', pecho: '' })
  const num = (s: string) => (s.trim() ? Number(s.replace(',', '.')) : null)
  const campo = (k: keyof typeof v, t: string) => (
    <label className="block">
      <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-texto-3">{t} (cm)</div>
      <input inputMode="decimal" value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} className="h-12 w-full rounded-xl bg-superficie-2 px-3 text-base outline-none" />
    </label>
  )
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">{campo('cintura', 'Cintura')}{campo('brazo', 'Brazo')}{campo('muslo', 'Muslo')}{campo('pecho', 'Pecho')}</div>
      <button type="button" className="btn-grande" onClick={() => onGuardar({ cintura: num(v.cintura), brazo: num(v.brazo), muslo: num(v.muslo), pecho: num(v.pecho) })}>Guardar</button>
    </div>
  )
}

function Historial() {
  const sesiones = useSesionesTerminadas(100)
  const series = useTodasLasSeries()
  const ejercicios = useMapaEjercicios()
  const [abierta, setAbierta] = useState<string | null>(null)
  const ses = sesiones.find((s) => s.id === abierta)
  const seriesSes = useMemo(() => series.filter((s) => s.sesionId === abierta).sort((a, b) => a.ts.localeCompare(b.ts)), [series, abierta])
  if (!sesiones.length) return <Vacio titulo="Sin sesiones todavía" />
  const porLinea = new Map<string, SerieLog[]>()
  for (const s of seriesSes) (porLinea.get(s.ejercicioId) ?? porLinea.set(s.ejercicioId, []).get(s.ejercicioId)!).push(s)
  return (
    <div className="space-y-2">
      {sesiones.map((s) => {
        const n = series.filter((x) => x.sesionId === s.id).length
        const min = s.fechaFin ? Math.round((new Date(s.fechaFin).getTime() - new Date(s.fechaInicio).getTime()) / 60000) : null
        return (
          <button key={s.id} type="button" className="tarjeta w-full text-left" onClick={() => setAbierta(s.id)}>
            <div className="flex justify-between"><span className="font-medium">{s.diaNombre}</span><span className="text-sm text-texto-2">{fechaCorta(s.fechaInicio)}</span></div>
            <div className="text-xs text-texto-2">Semana {s.semana}{s.esDeload ? ' · descarga' : ''} · {n} series{min != null ? ` · ${min} min` : ''}</div>
          </button>
        )
      })}
      <Hoja abierta={!!ses} onCerrar={() => setAbierta(null)} titulo={ses ? `${ses.diaNombre} · ${fechaCorta(ses.fechaInicio)}` : ''}>
        <ul className="space-y-2 text-sm">
          {[...porLinea.entries()].map(([ejId, ss]) => (
            <li key={ejId} className="flex justify-between gap-3">
              <span className="truncate">{ejercicios.get(ejId)?.nombre ?? ejId}</span>
              <span className="shrink-0 text-texto-2">{resumenSeries(ss)}</span>
            </li>
          ))}
        </ul>
        {ses && (ses.energia || ses.dolor != null || ses.sueno) && (
          <div className="mt-3 text-xs text-texto-3">
            {ses.energia ? `Energía ${['', 'baja', 'normal', 'alta'][ses.energia]} · ` : ''}{ses.dolor != null ? `Dolor ${['no', 'leve', 'moderado', 'fuerte'][ses.dolor]} · ` : ''}{ses.sueno ? `Sueño ${['', 'mal', 'normal', 'bien'][ses.sueno]}` : ''}
          </div>
        )}
      </Hoja>
    </div>
  )
}
