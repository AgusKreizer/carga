import type { Bloque, Dia, DiaEjercicio, Ejercicio, Medida, PesoCorporal, SerieLog, Sesion } from '../types'
import { cargaTipica } from './progresion'
import { detectarEstancamiento } from './estancamiento'
import { mejorE1rm } from './e1rm'

export interface EjercicioInforme {
  id: string
  nombre: string
  sesiones: number
  cargaInicio: number
  cargaFin: number
  e1rmInicio: number
  e1rmFin: number
  estado: 'progreso' | 'estancado' | 'bajo' | 'pocos-datos'
}

export interface Recomendacion {
  titulo: string
  detalle: string
  tipo: 'volumen' | 'ejercicio' | 'adherencia' | 'nutricion' | 'ok'
}

export interface InformeBloque {
  sesionesHechas: number
  sesionesPlanificadas: number
  adherencia: number
  prs: number
  minutosPromedio: number | null
  ejercicios: EjercicioInforme[]
  pesoInicio: number | null
  pesoFin: number | null
  cinturaInicio: number | null
  cinturaFin: number | null
  recomendaciones: Recomendacion[]
}

export interface ContextoInforme {
  bloque: Bloque
  dias: Dia[]
  lineas: DiaEjercicio[]
  sesiones: Sesion[]
  series: SerieLog[]
  ejercicios: Map<string, Ejercicio>
  pesos: PesoCorporal[]
  medidas: Medida[]
  prioridades: string[]
}

/** Informe de cierre de bloque: qué pasó y qué cambiar en el siguiente. Reglas explícitas. */
export function informeDeBloque(ctx: ContextoInforme): InformeBloque {
  const sesiones = ctx.sesiones.filter((s) => s.bloqueId === ctx.bloque.id && s.estado === 'terminada' && s.activo).sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio))
  const ids = new Set(sesiones.map((s) => s.id))
  const porSesion = new Map(sesiones.map((s) => [s.id, s]))
  const series = ctx.series.filter((s) => ids.has(s.sesionId) && s.activo && !s.calentamiento)

  const semanasTranscurridas = ctx.bloque.fechaInicio
    ? Math.min(ctx.bloque.semanas, Math.max(1, Math.ceil((Date.now() - new Date(ctx.bloque.fechaInicio).getTime()) / (7 * 86_400_000))))
    : ctx.bloque.semanas
  const porSemana = ctx.dias.filter((d) => !d.opcional).length
  const sesionesPlanificadas = semanasTranscurridas * porSemana
  const adherencia = sesionesPlanificadas ? Math.min(1, sesiones.length / sesionesPlanificadas) : 0

  const duraciones = sesiones.filter((s) => s.fechaFin).map((s) => (new Date(s.fechaFin!).getTime() - new Date(s.fechaInicio).getTime()) / 60000)
  const minutosPromedio = duraciones.length ? Math.round(duraciones.reduce((a, b) => a + b, 0) / duraciones.length) : null

  // por ejercicio
  const porEj = new Map<string, Map<string, SerieLog[]>>()
  for (const s of series) {
    const m = porEj.get(s.ejercicioId) ?? porEj.set(s.ejercicioId, new Map()).get(s.ejercicioId)!
    ;(m.get(s.sesionId) ?? m.set(s.sesionId, []).get(s.sesionId)!).push(s)
  }
  let prs = 0
  const ejercicios: EjercicioInforme[] = []
  for (const [ejId, porSes] of porEj) {
    const ej = ctx.ejercicios.get(ejId)
    if (!ej) continue
    const lista = [...porSes.entries()]
      .map(([sid, ss]) => ({ fechaInicio: porSesion.get(sid)!.fechaInicio, esDeload: porSesion.get(sid)!.esDeload, series: ss }))
      .filter((x) => !x.esDeload)
      .sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio))
    if (!lista.length) continue
    const primero = lista[0]
    const ultimo = lista[lista.length - 1]
    let max = -Infinity
    for (const l of lista) {
      const c = Math.max(...l.series.map((s) => s.carga))
      if (c > max && max !== -Infinity) prs++
      if (c > max) max = c
    }
    const linea = ctx.lineas.find((l) => l.ejercicioId === ejId)
    const est = detectarEstancamiento([...lista].reverse(), linea?.rir ?? ej.rir)
    const cargaInicio = cargaTipica(primero.series)
    const cargaFin = cargaTipica(ultimo.series)
    const e1rmInicio = Math.round(mejorE1rm(primero.series))
    const e1rmFin = Math.round(mejorE1rm(ultimo.series))
    let estado: EjercicioInforme['estado'] = 'pocos-datos'
    if (lista.length >= 3) {
      if (est.estancado) estado = 'estancado'
      else if (e1rmFin < e1rmInicio * 0.97) estado = 'bajo'
      else if (cargaFin > cargaInicio || e1rmFin > e1rmInicio * 1.02) estado = 'progreso'
      else estado = 'estancado'
    }
    ejercicios.push({ id: ejId, nombre: ej.nombre, sesiones: lista.length, cargaInicio, cargaFin, e1rmInicio, e1rmFin, estado })
  }
  const orden = { estancado: 0, bajo: 1, progreso: 2, 'pocos-datos': 3 }
  ejercicios.sort((a, b) => orden[a.estado] - orden[b.estado] || a.nombre.localeCompare(b.nombre))

  // cuerpo
  const desde = ctx.bloque.fechaInicio ?? sesiones[0]?.fechaInicio.slice(0, 10) ?? ''
  const pesosBloque = ctx.pesos.filter((p) => p.fecha >= desde)
  const media = (arr: PesoCorporal[]) => (arr.length ? Math.round((arr.reduce((a, p) => a + p.kg, 0) / arr.length) * 10) / 10 : null)
  const pesoInicio = media(pesosBloque.slice(0, 5))
  const pesoFin = pesosBloque.length >= 6 ? media(pesosBloque.slice(-5)) : null
  const medidasBloque = ctx.medidas.filter((m) => m.cintura != null)
  const cinturaInicio = medidasBloque.find((m) => m.fecha <= desde)?.cintura ?? medidasBloque[0]?.cintura ?? null
  const cinturaFin = medidasBloque.length >= 2 ? medidasBloque[medidasBloque.length - 1].cintura : null

  // recomendaciones
  const rec: Recomendacion[] = []
  const estancados = ejercicios.filter((e) => e.estado === 'estancado')
  const progresaron = ejercicios.filter((e) => e.estado === 'progreso')
  if (adherencia < 0.75 && sesionesPlanificadas >= 4) {
    rec.push({ tipo: 'adherencia', titulo: `Constancia: ${sesiones.length} de ${sesionesPlanificadas} sesiones`, detalle: 'Antes de tocar el plan, el próximo bloque se gana con asistencia. Mantené el mismo volumen; no sumes series.' })
  }
  if (estancados.length) {
    rec.push({ tipo: 'ejercicio', titulo: `${estancados.length} ${estancados.length === 1 ? 'ejercicio estancado' : 'ejercicios estancados'}: ${estancados.slice(0, 3).map((e) => e.nombre).join(', ')}${estancados.length > 3 ? '…' : ''}`, detalle: 'Si ya tienen la serie extra, cambialos por otro del mismo patrón. Si no, primero +1 serie y recién después el cambio.' })
  }
  if (adherencia >= 0.9 && progresaron.length >= ejercicios.length * 0.7 && ejercicios.length >= 4) {
    rec.push({ tipo: 'volumen', titulo: 'Bloque sólido: +1 serie en los músculos prioritarios', detalle: `Recuperaste bien y casi todo progresó. En el próximo bloque sumá una serie semanal a ${ctx.prioridades.length ? ctx.prioridades.join(' y ') : 'dos músculos'}, no a todo.` })
  }
  if (pesoInicio != null && pesoFin != null) {
    const dP = pesoFin - pesoInicio
    const fuerzaSubio = progresaron.length > estancados.length
    if (dP <= -0.8 && !fuerzaSubio) rec.push({ tipo: 'nutricion', titulo: `Peso −${Math.abs(dP).toFixed(1)} kg y fuerza plana`, detalle: 'Faltan calorías. Subí 150–200 kcal/día (hidratos alrededor del entrenamiento) y mantené la proteína.' })
    else if (dP >= 1 && cinturaInicio != null && cinturaFin != null && cinturaFin - cinturaInicio >= 1.5) rec.push({ tipo: 'nutricion', titulo: `Peso +${dP.toFixed(1)} kg y cintura +${(cinturaFin - cinturaInicio).toFixed(1)} cm`, detalle: 'El superávit es grande para tu objetivo. Bajá 150 kcal/día o mantené y mirá otro bloque.' })
    else if (Math.abs(dP) <= 0.5 && fuerzaSubio) rec.push({ tipo: 'ok', titulo: 'Recomposición en marcha', detalle: `Peso estable (${dP >= 0 ? '+' : ''}${dP.toFixed(1)} kg) y fuerza arriba. No cambies la comida.` })
  }
  if (!rec.length) rec.push({ tipo: 'ok', titulo: 'Seguí igual', detalle: 'Nada pide cambios. Repetí el bloque con los mismos ejercicios y progresión.' })

  return { sesionesHechas: sesiones.length, sesionesPlanificadas, adherencia, prs, minutosPromedio, ejercicios, pesoInicio, pesoFin, cinturaInicio, cinturaFin, recomendaciones: rec }
}
