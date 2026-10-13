import { useMemo } from 'react'
import { useMapaEjercicios, usePlan, useSesionesTerminadas, useTodasLasSeries } from '../hooks'
import type { SerieLog } from '../../domain/types'
import { cargaTipica } from '../../domain/coach/progresion'
import { detectarEstancamiento } from '../../domain/coach/estancamiento'
import { haceCuanto } from '../../lib/fechas'
import { kg } from '../../lib/formato'
import { Vacio } from '../componentes/basicos'

type Flecha = '↑' | '↗' | '→' | '↓'
type Estado = 'progresando' | 'estancado' | 'nuevo' | 'bajando' | 'estable'

interface Fila {
  id: string
  nombre: string
  enPlan: boolean
  flechas: Flecha[]
  estado: Estado
  detalle: string
  ultima: string
  cargaActual: number
  sesiones: number
}

/**
 * Tablero de progresión: por ejercicio, las últimas 4 transiciones entre sesiones.
 * ↑ subió carga · ↗ misma carga, más reps · → igual · ↓ bajó carga o reps.
 */
export function Tablero({ onVerEjercicio }: { onVerEjercicio: (id: string) => void }) {
  const series = useTodasLasSeries()
  const sesiones = useSesionesTerminadas(500)
  const ejercicios = useMapaEjercicios()
  const plan = usePlan()

  const filas = useMemo<Fila[]>(() => {
    const terminadas = new Map(sesiones.map((s) => [s.id, s]))
    const enPlan = new Set(plan?.lineas.map((l) => l.ejercicioId) ?? [])
    const porEj = new Map<string, Map<string, SerieLog[]>>()
    for (const s of series) {
      if (!terminadas.has(s.sesionId)) continue
      const m = porEj.get(s.ejercicioId) ?? porEj.set(s.ejercicioId, new Map()).get(s.ejercicioId)!
      ;(m.get(s.sesionId) ?? m.set(s.sesionId, []).get(s.sesionId)!).push(s)
    }
    const out: Fila[] = []
    for (const [ejId, porSes] of porEj) {
      const ej = ejercicios.get(ejId)
      if (!ej) continue
      const ses = [...porSes.entries()]
        .map(([sid, ss]) => ({ fechaInicio: terminadas.get(sid)!.fechaInicio, series: ss, esDeload: terminadas.get(sid)!.esDeload }))
        .filter((x) => !x.esDeload)
        .sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio))
      if (!ses.length) continue
      const res = ses.map((s) => ({ carga: cargaTipica(s.series), reps: s.series.filter((x) => x.carga === cargaTipica(s.series)).reduce((a, x) => a + x.reps, 0) }))
      const flechas: Flecha[] = []
      for (let i = 0; i < Math.min(4, res.length - 1); i++) {
        const a = res[i]
        const b = res[i + 1]
        flechas.unshift(a.carga > b.carga ? '↑' : a.carga < b.carga ? '↓' : a.reps > b.reps ? '↗' : a.reps < b.reps ? '↓' : '→')
      }
      const linea = plan?.lineas.find((l) => l.ejercicioId === ejId)
      const est = detectarEstancamiento(ses, linea?.rir ?? ej.rir)
      let estado: Estado = 'estable'
      let detalle = 'Sin cambios en la última sesión.'
      if (ses.length < 3) {
        estado = 'nuevo'
        detalle = `${ses.length} ${ses.length === 1 ? 'sesión' : 'sesiones'}: todavía no hay tendencia.`
      } else if (est.estancado) {
        estado = 'estancado'
        detalle = est.razon
      } else if (est.datosDudosos) {
        estado = 'estable'
        detalle = 'Sin progreso, pero falta RIR o el esfuerzo fue bajo.'
      } else if (flechas[flechas.length - 1] === '↑' || flechas[flechas.length - 1] === '↗') {
        estado = 'progresando'
        detalle = flechas[flechas.length - 1] === '↑' ? 'Subió la carga en la última sesión.' : 'Sumó reps con la misma carga.'
      } else if (flechas[flechas.length - 1] === '↓') {
        estado = 'bajando'
        detalle = 'Rindió menos que la vez anterior. Una vez no es tendencia; dos seguidas, sí.'
      }
      out.push({ id: ejId, nombre: ej.nombre, enPlan: enPlan.has(ejId), flechas, estado, detalle, ultima: haceCuanto(ses[0].fechaInicio), cargaActual: res[0].carga, sesiones: ses.length })
    }
    const peso: Record<Estado, number> = { estancado: 0, bajando: 1, nuevo: 3, estable: 2, progresando: 4 }
    return out.sort((a, b) => Number(b.enPlan) - Number(a.enPlan) || peso[a.estado] - peso[b.estado] || a.nombre.localeCompare(b.nombre))
  }, [series, sesiones, ejercicios, plan])

  if (!filas.length) return <Vacio titulo="Todavía no hay sesiones" detalle="Después de 3 sesiones de un ejercicio, acá ves si progresa o se clavó." />

  const resumen = { progresando: 0, estancado: 0, bajando: 0 }
  for (const f of filas) if (f.enPlan && f.estado in resumen) resumen[f.estado as keyof typeof resumen]++

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <Mini titulo="Progresando" n={resumen.progresando} color="text-ok" />
        <Mini titulo="Estancados" n={resumen.estancado} color="text-aviso" />
        <Mini titulo="Bajando" n={resumen.bajando} color="text-alerta" />
      </div>
      <div className="tarjeta">
        <div className="mb-2 flex items-baseline justify-between">
          <div className="text-[11px] font-medium uppercase tracking-wider text-texto-3">Por ejercicio · últimas 4 sesiones</div>
          <div className="text-[11px] text-texto-3">↑ carga · ↗ reps · → igual · ↓ bajó</div>
        </div>
        <ul className="divide-y divide-borde">
          {filas.map((f) => (
            <li key={f.id}>
              <button type="button" className="flex w-full items-center gap-3 py-2.5 text-left" onClick={() => onVerEjercicio(f.id)}>
                <div className="min-w-0 flex-1">
                  <div className={`truncate text-sm font-medium ${f.enPlan ? '' : 'text-texto-2'}`}>{f.nombre}</div>
                  <div className="truncate text-[11px] text-texto-3">{kg(f.cargaActual)} kg · {f.ultima}{f.enPlan ? '' : ' · fuera del plan'}</div>
                </div>
                <div className="flex gap-0.5 font-mono text-base">
                  {f.flechas.length ? f.flechas.map((x, i) => <span key={i} className={x === '↑' || x === '↗' ? 'text-ok' : x === '↓' ? 'text-alerta' : 'text-texto-3'}>{x}</span>) : <span className="text-texto-3">·</span>}
                </div>
                <Etiqueta estado={f.estado} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function Mini({ titulo, n, color }: { titulo: string; n: number; color: string }) {
  return (
    <div className="tarjeta p-3">
      <div className="text-[11px] font-medium uppercase tracking-wider text-texto-3">{titulo}</div>
      <div className={`text-lg font-semibold ${n ? color : 'text-texto-3'}`}>{n}</div>
    </div>
  )
}

function Etiqueta({ estado }: { estado: Estado }) {
  const map: Record<Estado, [string, string]> = {
    progresando: ['Progresa', 'bg-ok/15 text-ok'],
    estancado: ['Estancado', 'bg-aviso/15 text-aviso'],
    bajando: ['Bajó', 'bg-alerta/15 text-alerta'],
    nuevo: ['Nuevo', 'bg-superficie-2 text-texto-2'],
    estable: ['Igual', 'bg-superficie-2 text-texto-2'],
  }
  const [t, c] = map[estado]
  return <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${c}`}>{t}</span>
}
