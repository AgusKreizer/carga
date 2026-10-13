import { useState } from 'react'
import { useSesionesTerminadas, useTodasLasSeries } from '../hooks'
import { fechaCorta } from '../../lib/fechas'
import { Vacio } from '../componentes/basicos'
import { colorDia, DetalleSesionHoja } from './comun'

export function Historial() {
  const sesiones = useSesionesTerminadas(200)
  const series = useTodasLasSeries()
  const [abierta, setAbierta] = useState<string | null>(null)
  if (!sesiones.length) return <Vacio titulo="Sin sesiones todavía" />
  return (
    <div className="space-y-2">
      {sesiones.map((s) => {
        const n = series.filter((x) => x.sesionId === s.id).length
        const min = s.fechaFin ? Math.round((new Date(s.fechaFin).getTime() - new Date(s.fechaInicio).getTime()) / 60000) : null
        return (
          <button key={s.id} type="button" className="tarjeta flex w-full items-center gap-3 text-left" onClick={() => setAbierta(s.id)}>
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colorDia(s.diaNombre, s.esDeload) }} />
            <div className="min-w-0 flex-1">
              <div className="flex justify-between"><span className="font-medium">{s.diaNombre}</span><span className="text-sm text-texto-2">{fechaCorta(s.fechaInicio)}</span></div>
              <div className="text-xs text-texto-2">Semana {s.semana}{s.esDeload ? ' · descarga' : ''} · {n} series{min != null ? ` · ${min} min` : ''}</div>
            </div>
          </button>
        )
      })}
      <DetalleSesionHoja sesion={sesiones.find((s) => s.id === abierta) ?? null} series={series} onCerrar={() => setAbierta(null)} />
    </div>
  )
}
