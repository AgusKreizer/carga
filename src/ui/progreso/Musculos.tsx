import { lazy, Suspense, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAjustes, useMapaEjercicios, useSesionesTerminadas, useTodasLasSeries } from '../hooks'
import { MUSCULOS, type MusculoId } from '../../domain/types'
import { zona } from '../../domain/coach/volumen'
import { calcularFatiga, nivelFatiga } from '../../domain/coach/fatiga'
import { ahoraISO, fechaCorta, fechaLocal, haceCuanto, lunesDe, sumarDias } from '../../lib/fechas'
import { LEYENDA_FATIGA, LEYENDA_VOLUMEN, Leyenda, MapaCuerpo, SIN_DATO } from './MapaCuerpo'
import { COLOR, ESTILO_TOOLTIP } from './comun'

const Cuerpo3D = lazy(() => import('./Cuerpo3DMalla'))
const CLAVE_3D = 'carga.vista3d'

type Modo = 'volumen' | 'fatiga'
const ORDEN: MusculoId[] = ['pecho', 'espalda', 'deltLat', 'deltPost', 'triceps', 'biceps', 'cuads', 'isquios', 'gluteos', 'gemelos', 'abs']

export function Musculos() {
  const series = useTodasLasSeries()
  const ejercicios = useMapaEjercicios()
  const ajustes = useAjustes()
  const sesiones = useSesionesTerminadas(500)
  const [modo, setModo] = useState<Modo>('volumen')
  const [sel, setSel] = useState<MusculoId | null>(null)
  const [semanaOffset, setSemanaOffset] = useState(0)
  const [vista3d, setVista3d] = useState<boolean>(() => { try { return localStorage.getItem(CLAVE_3D) === '1' } catch { return false } })
  const [giro, setGiro] = useState(0)
  const cambiarVista = (v: boolean) => { setVista3d(v); try { localStorage.setItem(CLAVE_3D, v ? '1' : '0') } catch { /* sin storage */ } }
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

  const fatiga = useMemo(
    () => calcularFatiga(series, new Map(sesiones.map((s) => [s.id, s])), ejercicios, ahoraISO(), factor),
    [series, sesiones, ejercicios, factor],
  )

  const vista = semanas[semanas.length - 1 - semanaOffset]
  const valores = vista?.valores ?? {}
  const datosBarras = semanas.map((s) => ({ label: s.label, v: sel ? s.valores[sel] ?? 0 : 0 }))
  const b = sel ? bandas[sel] : undefined

  const colorVolumen = (m0: MusculoId) => {
    const m = m0 === 'deltAnt' ? 'deltLat' : m0 // el deltoide anterior no tiene banda propia: sigue al lateral
    const v = valores[m] ?? 0
    if (v === 0) return SIN_DATO
    const z = zona(v, bandas[m])
    return z === 'bajo' ? COLOR.aviso : z === 'alto' ? COLOR.alerta : z === 'productivo' ? COLOR.ok : COLOR.pierna
  }
  const colorFatiga = (m: MusculoId) => {
    const f = fatiga[m]
    if (!f) return SIN_DATO
    const n = nivelFatiga(f.fatiga)
    return n === 'fresco' ? COLOR.ok : n === 'cargado' ? COLOR.aviso : COLOR.alerta
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        <button type="button" className={`chip flex-1 ${modo === 'volumen' ? 'chip-activo' : ''}`} onClick={() => setModo('volumen')}>Volumen semanal</button>
        <button type="button" className={`chip flex-1 ${modo === 'fatiga' ? 'chip-activo' : ''}`} onClick={() => setModo('fatiga')}>Fatiga hoy</button>
      </div>

      <div className="tarjeta">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[11px] font-medium uppercase tracking-wider text-texto-3">
            {modo === 'volumen'
              ? `Series por músculo · ${semanaOffset === 0 ? 'esta semana' : semanaOffset === 1 ? 'semana pasada' : `semana del ${vista?.label}`}`
              : 'Fatiga estimada · ahora'}
          </div>
          <div className="flex gap-1">
            <button type="button" className={`chip h-7 text-xs ${!vista3d ? 'chip-activo' : ''}`} onClick={() => cambiarVista(false)}>2D</button>
            <button type="button" className={`chip h-7 text-xs ${vista3d ? 'chip-activo' : ''}`} onClick={() => cambiarVista(true)}>3D</button>
          </div>
          {modo === 'volumen' && (
            <div className="flex gap-1">
              <button type="button" className="chip h-7 min-w-7 text-xs" disabled={semanaOffset >= 7} onClick={() => setSemanaOffset(semanaOffset + 1)}>‹</button>
              <button type="button" className="chip h-7 min-w-7 text-xs" disabled={semanaOffset === 0} onClick={() => setSemanaOffset(semanaOffset - 1)}>›</button>
            </div>
          )}
        </div>
        {vista3d ? (
          <div className="relative">
            <Suspense fallback={<div className="flex h-80 items-center justify-center text-sm text-texto-3">Cargando 3D…</div>}>
              <Cuerpo3D colorDe={modo === 'volumen' ? colorVolumen : colorFatiga} seleccionado={sel} onTocar={(m) => setSel(sel === m ? null : m)} giro={giro} />
            </Suspense>
            <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-1.5">
              <button type="button" className={`chip h-7 text-xs ${Math.abs(((giro % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) < 0.1 ? 'chip-activo' : ''}`} onClick={() => setGiro(0)}>Frente</button>
              <button type="button" className={`chip h-7 text-xs ${Math.abs((((giro % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI) < 0.1 ? 'chip-activo' : ''}`} onClick={() => setGiro(Math.PI)}>Espalda</button>
            </div>
          </div>
        ) : (
          <MapaCuerpo colorDe={modo === 'volumen' ? colorVolumen : colorFatiga} seleccionado={sel} onTocar={(m) => setSel(sel === m ? null : m)} />
        )}
        <div className="mt-3 min-h-10 rounded-xl bg-superficie-2 px-3 py-2 text-sm">
          {!sel ? (
            <span className="text-texto-2">Tocá un músculo para ver el detalle.</span>
          ) : modo === 'volumen' ? (
            <InfoVolumen m={sel} v={valores[sel] ?? 0} banda={bandas[sel]} previa={semanas[semanas.length - 2 - semanaOffset]?.valores[sel] ?? 0} />
          ) : (
            <InfoFatiga m={sel} f={fatiga[sel]} />
          )}
        </div>
        <div className="mt-3"><Leyenda items={modo === 'volumen' ? LEYENDA_VOLUMEN : LEYENDA_FATIGA} /></div>
        {modo === 'fatiga' && (
          <p className="mt-3 text-[11px] text-texto-3">
            Estimación por volumen y esfuerzo registrados (series × cercanía al fallo × tipo de ejercicio, con vida media de 36–48 h; sueño malo y dolor la alargan). No mide nada en tu cuerpo: úsala para decidir qué día hacer, no para saltearte uno.
          </p>
        )}
      </div>

      {modo === 'volumen' && sel && (
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
          {ORDEN.map((m) => {
            if (modo === 'fatiga') {
              const f = fatiga[m]
              const n = f ? nivelFatiga(f.fatiga) : null
              return (
                <li key={m}>
                  <button type="button" className="flex w-full items-center justify-between py-0.5" onClick={() => setSel(sel === m ? null : m)}>
                    <span className={sel === m ? 'text-texto' : 'text-texto-2'}>{MUSCULOS[m]}</span>
                    <span className="flex items-center gap-2">
                      <span className="h-1.5 w-20 overflow-hidden rounded-full bg-superficie-2"><span className="block h-full" style={{ width: `${f?.fatiga ?? 0}%`, background: colorFatiga(m) }} /></span>
                      <span className={`w-10 text-right ${!f ? 'text-texto-3' : n === 'fresco' ? 'text-ok' : n === 'cargado' ? 'text-aviso' : 'text-alerta'}`}>{f ? `${f.fatiga} %` : '—'}</span>
                    </span>
                  </button>
                </li>
              )
            }
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
        {modo === 'volumen' && <div className="mt-2 text-[11px] text-texto-3">Serie directa = 1 · indirecta = {factor}. La semana en curso se completa a medida que entrenás.</div>}
      </div>
    </div>
  )
}

function InfoVolumen({ m, v, banda, previa }: { m: MusculoId; v: number; banda?: { min: number; max: number }; previa: number }) {
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

function InfoFatiga({ m, f }: { m: MusculoId; f?: { fatiga: number; ultimaFecha: string | null; seriesUltima: number } }) {
  if (!f) return <span><span className="font-semibold">{MUSCULOS[m]}</span> <span className="text-texto-2">sin series en los últimos 10 días.</span></span>
  const n = nivelFatiga(f.fatiga)
  const lectura = n === 'fresco' ? 'Listo para entrenarlo fuerte.' : n === 'cargado' ? 'Se puede entrenar; esperá un poco menos de rendimiento.' : 'Entrenado hace poco: si hoy lo toca, es normal rendir menos. Si duele, bajá una serie.'
  return (
    <span>
      <span className="font-semibold">{MUSCULOS[m]}: {f.fatiga} % de fatiga.</span>{' '}
      <span className="text-texto-2">{lectura}{f.ultimaFecha ? ` Última vez ${haceCuanto(f.ultimaFecha)} (${f.seriesUltima} series).` : ''}</span>
    </span>
  )
}
