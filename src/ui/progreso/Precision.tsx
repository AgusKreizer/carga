import { useMemo } from 'react'
import { useMapaEjercicios, usePlan, useSesionesTerminadas, useTodasLasSeries } from '../hooks'

interface Fila {
  id: string
  nombre: string
  n: number
  dReps: number
  dRir: number
  lectura: string
  tono: 'ok' | 'aviso' | 'alerta' | 'neutro'
}

/**
 * Precisión de objetivos: cuánto se alejan las reps y el RIR reales de lo que pidió el coach.
 * Si te sobran reps con RIR ≥ objetivo, el objetivo es conservador y conviene subir más rápido.
 */
export function Precision() {
  const series = useTodasLasSeries()
  const sesiones = useSesionesTerminadas(200)
  const ejercicios = useMapaEjercicios()
  const plan = usePlan()

  const filas = useMemo<Fila[]>(() => {
    const terminadas = new Set(sesiones.filter((s) => !s.esDeload).map((s) => s.id))
    const enPlan = new Set(plan?.lineas.map((l) => l.ejercicioId) ?? [])
    const acc = new Map<string, { reps: number[]; rir: number[] }>()
    for (const s of series) {
      if (!terminadas.has(s.sesionId) || s.objetivoReps == null) continue
      const a = acc.get(s.ejercicioId) ?? acc.set(s.ejercicioId, { reps: [], rir: [] }).get(s.ejercicioId)!
      a.reps.push(s.reps - s.objetivoReps)
      if (s.rir != null) a.rir.push(s.rir - s.rirObjetivo)
    }
    const out: Fila[] = []
    for (const [id, a] of acc) {
      if (a.reps.length < 6 || !enPlan.has(id)) continue
      const dReps = a.reps.reduce((x, y) => x + y, 0) / a.reps.length
      const dRir = a.rir.length ? a.rir.reduce((x, y) => x + y, 0) / a.rir.length : 0
      let lectura = 'Objetivos bien calibrados.'
      let tono: Fila['tono'] = 'ok'
      if (dReps >= 1.5 && dRir >= 0) { lectura = 'Te sobran reps: el objetivo es conservador, subí carga antes.'; tono = 'aviso' }
      else if (dReps <= -1.5) { lectura = 'No llegás a las reps pedidas: la carga sube demasiado rápido.'; tono = 'alerta' }
      else if (dRir <= -1) { lectura = 'Llegás, pero más cerca del fallo de lo pedido: cuidá la fatiga.'; tono = 'aviso' }
      else if (dRir >= 1.5) { lectura = 'Te quedás lejos del fallo: podés apretar más.'; tono = 'aviso' }
      out.push({ id, nombre: ejercicios.get(id)?.nombre ?? id, n: a.reps.length, dReps: Math.round(dReps * 10) / 10, dRir: Math.round(dRir * 10) / 10, lectura, tono })
    }
    const peso = { alerta: 0, aviso: 1, ok: 2, neutro: 3 }
    return out.sort((x, y) => peso[x.tono] - peso[y.tono] || x.nombre.localeCompare(y.nombre))
  }, [series, sesiones, ejercicios, plan])

  if (!filas.length) return null

  const color = { ok: 'text-ok', aviso: 'text-aviso', alerta: 'text-alerta', neutro: 'text-texto-2' }
  const signo = (n: number) => (n > 0 ? `+${n}` : String(n))

  return (
    <div className="tarjeta">
      <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-texto-3">Precisión de los objetivos</div>
      <div className="mb-2 text-[11px] text-texto-3">Diferencia promedio entre lo pedido y lo hecho, por serie. Reps + = hiciste más; RIR − = más cerca del fallo.</div>
      <ul className="divide-y divide-borde">
        {filas.map((f) => (
          <li key={f.id} className="py-2">
            <div className="flex items-center justify-between gap-3">
              <span className="truncate text-sm font-medium">{f.nombre}</span>
              <span className="shrink-0 font-mono text-xs text-texto-2">reps {signo(f.dReps)} · RIR {signo(f.dRir)}</span>
            </div>
            <div className={`text-xs ${color[f.tono]}`}>{f.lectura} <span className="text-texto-3">({f.n} series)</span></div>
          </li>
        ))}
      </ul>
    </div>
  )
}
