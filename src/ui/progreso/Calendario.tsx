import { useMemo, useState } from 'react'
import { usePlan, useSesionesTerminadas, useTodasLasSeries } from '../hooks'
import type { Sesion } from '../../domain/types'
import { fechaLocal, lunesDe, sumarDias } from '../../lib/fechas'
import { colorDia, Dato, DetalleSesionHoja } from './comun'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

export function Calendario() {
  const sesiones = useSesionesTerminadas(1000)
  const series = useTodasLasSeries()
  const plan = usePlan()
  const hoy = fechaLocal()
  const [cursor, setCursor] = useState(hoy.slice(0, 7)) // YYYY-MM
  const [abierta, setAbierta] = useState<Sesion | null>(null)

  const porFecha = useMemo(() => {
    const m = new Map<string, Sesion[]>()
    for (const s of sesiones) {
      const f = aLocal(s.fechaInicio)
      ;(m.get(f) ?? m.set(f, []).get(f)!).push(s)
    }
    return m
  }, [sesiones])

  const [anio, mes] = cursor.split('-').map(Number)
  const diasEnMes = new Date(anio, mes, 0).getDate()
  const offset = (new Date(anio, mes - 1, 1).getDay() + 6) % 7
  const celdas: (string | null)[] = [...Array(offset).fill(null), ...Array.from({ length: diasEnMes }, (_, i) => `${cursor}-${String(i + 1).padStart(2, '0')}`)]

  const porSemana = plan?.dias.filter((d) => !d.opcional).length ?? 4
  const esMesActual = cursor === hoy.slice(0, 7)
  const ultimoDia = esMesActual ? hoy : `${cursor}-${diasEnMes}`
  const diasTranscurridos = Number(ultimoDia.slice(8, 10))
  const planificadas = Math.round((diasTranscurridos / 7) * porSemana)
  const hechas = [...porFecha.entries()].filter(([f]) => f.startsWith(cursor)).reduce((a, [, ss]) => a + ss.length, 0)

  // racha: semanas consecutivas (hacia atrás desde la semana pasada) con al menos `porSemana` sesiones
  const racha = useMemo(() => {
    let n = 0
    let lunes = lunesDe(sumarDias(lunesDe(hoy), -7))
    for (let i = 0; i < 104; i++) {
      let c = 0
      for (let d = 0; d < 7; d++) c += porFecha.get(sumarDias(lunes, d))?.length ?? 0
      if (c >= porSemana) n++
      else break
      lunes = sumarDias(lunes, -7)
    }
    // la semana en curso suma si ya cumplió
    let actual = 0
    for (let d = 0; d < 7; d++) actual += porFecha.get(sumarDias(lunesDe(hoy), d))?.length ?? 0
    return actual >= porSemana ? n + 1 : n
  }, [porFecha, hoy, porSemana])

  const mover = (d: number) => {
    const n = new Date(anio, mes - 1 + d, 1)
    setCursor(`${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`)
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <Dato titulo="Este mes" valor={`${hechas}/${planificadas}`} sub="sesiones" />
        <Dato titulo="Racha" valor={String(racha)} sub={racha === 1 ? 'semana completa' : 'semanas completas'} />
        <Dato titulo="Por semana" valor={String(porSemana)} sub="planificadas" />
      </div>
      <div className="tarjeta">
        <div className="mb-3 flex items-center justify-between">
          <button type="button" className="chip" onClick={() => mover(-1)} aria-label="mes anterior">‹</button>
          <div className="font-semibold">{MESES[mes - 1]} {anio}</div>
          <button type="button" className="chip" onClick={() => mover(1)} disabled={esMesActual} aria-label="mes siguiente">›</button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-texto-3">{DIAS.map((d, i) => <div key={i}>{d}</div>)}</div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {celdas.map((f, i) => {
            if (!f) return <div key={i} />
            const ss = porFecha.get(f) ?? []
            const futuro = f > hoy
            const esHoy = f === hoy
            return (
              <button
                key={f}
                type="button"
                disabled={!ss.length}
                onClick={() => setAbierta(ss[0])}
                className={`flex h-11 flex-col items-center justify-center rounded-lg text-sm ${esHoy ? 'ring-1 ring-acento/60' : ''} ${futuro ? 'text-texto-3' : ''} ${ss.length ? 'bg-superficie-2' : ''}`}
              >
                <span>{Number(f.slice(8, 10))}</span>
                <span className="mt-0.5 flex h-2 gap-0.5">
                  {ss.map((s) => <span key={s.id} className="h-2 w-2 rounded-full" style={{ background: colorDia(s.diaNombre, s.esDeload) }} />)}
                </span>
              </button>
            )
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-texto-3">
          <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full" style={{ background: colorDia('Torso') }} />Torso</span>
          <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full" style={{ background: colorDia('Pierna') }} />Pierna</span>
          <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full" style={{ background: colorDia('Otro') }} />Otro</span>
          <span className="flex items-center gap-1"><i className="h-2 w-2 rounded-full" style={{ background: colorDia('', true) }} />Descarga</span>
        </div>
      </div>
      <p className="px-1 text-[11px] text-texto-3">La constancia explica más del progreso que cualquier detalle del plan. {porSemana} por semana es el piso; si una semana falla, la rotación sigue desde donde quedó.</p>
      <DetalleSesionHoja sesion={abierta} series={series} onCerrar={() => setAbierta(null)} />
    </div>
  )
}

function aLocal(iso: string): string {
  return fechaLocal(new Date(iso))
}
