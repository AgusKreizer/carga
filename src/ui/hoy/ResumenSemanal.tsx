import { useMemo, useState } from 'react'
import { resumenSemanal } from '../../domain/coach/resumenSemanal'
import { MUSCULOS } from '../../domain/types'
import { useAjustes, useMapaEjercicios, usePlan, useSesionesTerminadas, useTodasLasSeries } from '../hooks'
import { fechaCorta, fechaLocal } from '../../lib/fechas'
import { kg } from '../../lib/formato'

const CLAVE = 'carga.resumen.cerrado'

export function ResumenSemanal() {
  const sesiones = useSesionesTerminadas(200)
  const series = useTodasLasSeries()
  const ejercicios = useMapaEjercicios()
  const plan = usePlan()
  const ajustes = useAjustes()
  const hoy = fechaLocal()
  const [cerrado, setCerrado] = useState<string | null>(() => { try { return localStorage.getItem(CLAVE) } catch { return null } })

  const r = useMemo(() => {
    if (!plan || !ajustes) return null
    return resumenSemanal({ hoy, sesiones, series, ejercicios, dias: plan.dias, bandas: ajustes.bandas, factorIndirecto: ajustes.factorIndirecto })
  }, [hoy, sesiones, series, ejercicios, plan, ajustes])

  if (!r || sesiones.length === 0) return null
  if (!r.enCurso && cerrado === r.lunes) return null

  const cerrar = () => { setCerrado(r.lunes); try { localStorage.setItem(CLAVE, r.lunes) } catch { /* sin storage */ } }

  return (
    <div className="tarjeta aparecer">
      <div className="mb-1 flex items-baseline justify-between">
        <div className="text-[11px] font-medium uppercase tracking-wider text-texto-3">{r.enCurso ? 'Esta semana' : `Semana del ${fechaCorta(r.lunes + 'T12:00:00')}`}</div>
        {!r.enCurso && <button type="button" className="text-xs text-texto-3" onClick={cerrar}>Cerrar</button>}
      </div>
      <div className="flex items-baseline gap-4">
        <div><span className="text-2xl font-bold">{r.hechas}</span><span className="text-texto-3">/{r.planificadas}</span><div className="text-[11px] text-texto-3">sesiones</div></div>
        <div><span className="text-2xl font-bold">{r.prs.length}</span><div className="text-[11px] text-texto-3">PRs</div></div>
        {r.minutos != null && <div><span className="text-2xl font-bold">{r.minutos}′</span><div className="text-[11px] text-texto-3">promedio</div></div>}
      </div>
      {r.prs.length > 0 && <div className="mt-2 text-xs text-texto-2">{r.prs.slice(0, 3).map((p) => `${p.ejercicio} ${kg(p.carga)} kg`).join(' · ')}{r.prs.length > 3 ? ` · +${r.prs.length - 3}` : ''}</div>}
      {r.bajoMinimo.length > 0 && <div className="mt-1 text-xs text-aviso">Bajo mínimo: {r.bajoMinimo.slice(0, 3).map((b) => `${MUSCULOS[b.m]} ${b.series}/${b.min}`).join(' · ')}</div>}
      <div className="mt-2 text-sm">{r.frase}</div>
    </div>
  )
}
