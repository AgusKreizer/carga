import { useMemo } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useMapaEjercicios, usePesos, useSesionesTerminadas, useTodasLasSeries } from '../hooks'
import type { Patron, SerieLog } from '../../domain/types'
import { mejorE1rm } from '../../domain/coach/e1rm'
import { fechaCorta, fechaLocal, lunesDe } from '../../lib/fechas'
import { kg } from '../../lib/formato'
import { COLOR, ESTILO_TOOLTIP } from './comun'

const COMPUESTOS: Patron[] = ['empuje-horizontal', 'empuje-vertical', 'tiron-vertical', 'tiron-horizontal', 'rodilla-dominante', 'cadera-dominante']

/**
 * Índice de fuerza (promedio de e1RM de los 4 básicos más frecuentes, base 100 en la primera semana)
 * contra el peso corporal medio semanal. Es el indicador de recomposición:
 * fuerza sube y peso no → va bien; ambos bajan → falta comida; peso sube y fuerza no → sobra.
 */
export function FuerzaVsPeso() {
  const series = useTodasLasSeries()
  const sesiones = useSesionesTerminadas(500)
  const ejercicios = useMapaEjercicios()
  const pesos = usePesos()

  const { datos, lectura, basicos } = useMemo(() => {
    const terminadas = new Map(sesiones.filter((s) => !s.esDeload).map((s) => [s.id, s]))
    // 4 compuestos con más sesiones
    const porEj = new Map<string, Map<string, SerieLog[]>>()
    for (const s of series) {
      if (!terminadas.has(s.sesionId)) continue
      const ej = ejercicios.get(s.ejercicioId)
      if (!ej || !COMPUESTOS.includes(ej.patron)) continue
      const m = porEj.get(s.ejercicioId) ?? porEj.set(s.ejercicioId, new Map()).get(s.ejercicioId)!
      ;(m.get(s.sesionId) ?? m.set(s.sesionId, []).get(s.sesionId)!).push(s)
    }
    const basicos = [...porEj.entries()].sort((a, b) => b[1].size - a[1].size).slice(0, 4)
    if (basicos.length < 2) return { datos: [], lectura: null, basicos: [] as string[] }

    // e1RM por semana por ejercicio (mejor de la semana); si una semana no lo tocó, arrastra la anterior
    const semanas = new Set<string>()
    const porSemana = new Map<string, Map<string, number>>()
    for (const [ejId, porSes] of basicos) {
      for (const [sid, ss] of porSes) {
        const sem = lunesDe(fechaLocal(new Date(terminadas.get(sid)!.fechaInicio)))
        semanas.add(sem)
        const fila = porSemana.get(sem) ?? porSemana.set(sem, new Map()).get(sem)!
        fila.set(ejId, Math.max(fila.get(ejId) ?? 0, mejorE1rm(ss)))
      }
    }
    for (const p of pesos) semanas.add(lunesDe(p.fecha))
    const claves = [...semanas].sort().slice(-16)
    const ultimo = new Map<string, number>()
    const base = new Map<string, number>()
    const datos = claves.map((sem) => {
      const fila = porSemana.get(sem)
      if (fila) for (const [ejId, v] of fila) { ultimo.set(ejId, v); if (!base.has(ejId)) base.set(ejId, v) }
      let indice: number | null = null
      if (ultimo.size === basicos.length) {
        let acc = 0
        for (const [ejId, v] of ultimo) acc += (v / base.get(ejId)!) * 100
        indice = Math.round((acc / ultimo.size) * 10) / 10
      }
      const ps = pesos.filter((p) => lunesDe(p.fecha) === sem)
      const peso = ps.length ? Math.round((ps.reduce((a, p) => a + p.kg, 0) / ps.length) * 10) / 10 : null
      return { sem, label: fechaCorta(sem + 'T12:00:00'), indice, peso }
    })
    const conIndice = datos.filter((d) => d.indice != null)
    const conPeso = datos.filter((d) => d.peso != null)
    let lectura: string | null = null
    if (conIndice.length >= 3 && conPeso.length >= 3) {
      const dF = conIndice[conIndice.length - 1].indice! - conIndice[Math.max(0, conIndice.length - 5)].indice!
      const dP = conPeso[conPeso.length - 1].peso! - conPeso[Math.max(0, conPeso.length - 5)].peso!
      if (dF >= 2 && Math.abs(dP) <= 0.5) lectura = `Fuerza +${dF.toFixed(1)} % con el peso estable (${dP >= 0 ? '+' : ''}${dP.toFixed(1)} kg): la recomposición está funcionando.`
      else if (dF >= 2 && dP > 0.5) lectura = `Fuerza +${dF.toFixed(1)} % y peso +${dP.toFixed(1)} kg: ganás, pero mirá la cintura para saber cuánto es músculo.`
      else if (dF < 2 && dP < -0.5) lectura = `Fuerza plana y peso −${Math.abs(dP).toFixed(1)} kg: probablemente falta comida o descanso.`
      else if (dF < 0 && dP > 0.5) lectura = `Peso +${dP.toFixed(1)} kg sin ganar fuerza: el superávit no está rindiendo; revisá entrenamiento antes que comida.`
      else lectura = `Fuerza ${dF >= 0 ? '+' : ''}${dF.toFixed(1)} % y peso ${dP >= 0 ? '+' : ''}${dP.toFixed(1)} kg en las últimas semanas.`
    }
    return { datos, lectura, basicos: basicos.map(([id]) => ejercicios.get(id)?.nombre ?? id) }
  }, [series, sesiones, ejercicios, pesos])

  if (!datos.length) return null

  return (
    <div className="tarjeta">
      <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-texto-3">Fuerza vs peso corporal</div>
      <div className="mb-2 text-[11px] text-texto-3">Índice = promedio de 1RM estimado en {basicos.join(', ')} (100 = primera semana).</div>
      <div className="h-44">
        <ResponsiveContainer>
          <LineChart data={datos} margin={{ top: 8, right: 0, bottom: 0, left: -20 }}>
            <CartesianGrid stroke="#26262c" vertical={false} />
            <XAxis dataKey="label" tick={{ fill: '#63636b', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={24} />
            <YAxis yAxisId="f" tick={{ fill: '#63636b', fontSize: 11 }} axisLine={false} tickLine={false} domain={['dataMin - 2', 'dataMax + 2']} />
            <YAxis yAxisId="p" orientation="right" tick={{ fill: '#63636b', fontSize: 11 }} axisLine={false} tickLine={false} domain={['dataMin - 1', 'dataMax + 1']} width={40} />
            <Tooltip {...ESTILO_TOOLTIP} formatter={(v, n) => (n === 'indice' ? [`${v}`, 'Fuerza (índice)'] : [`${kg(Number(v))} kg`, 'Peso'])} />
            <Line yAxisId="f" type="monotone" dataKey="indice" stroke={COLOR.acento} strokeWidth={2.5} dot={{ r: 2.5, fill: COLOR.acento }} connectNulls isAnimationActive={false} />
            <Line yAxisId="p" type="monotone" dataKey="peso" stroke="#a1a1aa" strokeWidth={2} dot={false} connectNulls isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex gap-3 text-[11px] text-texto-3">
        <span className="flex items-center gap-1"><i className="h-0.5 w-4" style={{ background: COLOR.acento }} />Fuerza</span>
        <span className="flex items-center gap-1"><i className="h-0.5 w-4 bg-texto-2" />Peso</span>
      </div>
      {lectura && <div className="mt-2 rounded-xl bg-superficie-2 px-3 py-2 text-sm">{lectura}</div>}
    </div>
  )
}
