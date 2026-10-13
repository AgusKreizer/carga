import { useEffect, useMemo, useState } from 'react'
import * as repo from '../../data/repo'
import { useAjustes, useEventosPendientes, useMapaEjercicios, usePlan, usePesos, useSesionActiva, useSesionesTerminadas, useTodasLasSeries } from '../hooks'
import { calcularFatiga } from '../../domain/coach/fatiga'
import { consejoDeHoy } from '../../domain/coach/diaInteligente'
import { Sesion } from './Sesion'
import { ResumenSemanal } from './ResumenSemanal'
import { InstalarBanner } from './InstalarBanner'
import { Hoja, Stepper, Vacio } from '../componentes/basicos'
import { ahoraISO, fechaConDia, fechaLocal, haceCuanto } from '../../lib/fechas'
import { kg } from '../../lib/formato'
import type { CoachEvento, Dia } from '../../domain/types'

export function Hoy() {
  const sesion = useSesionActiva()
  if (sesion === undefined) return null
  if (sesion) return <Sesion sesion={sesion} />
  return <Inicio />
}

function Inicio() {
  const plan = usePlan()
  const ejercicios = useMapaEjercicios()
  const ajustes = useAjustes()
  const eventos = useEventosPendientes()
  const terminadas = useSesionesTerminadas(5)
  const pesos = usePesos()
  const todasSeries = useTodasLasSeries()
  const sesionesRecientes = useSesionesTerminadas(40)
  const [proximo, setProximo] = useState<Dia | null>(null)
  const [elegirDia, setElegirDia] = useState(false)
  const [pesoAbierto, setPesoAbierto] = useState(false)
  const [arrancando, setArrancando] = useState(false)

  useEffect(() => {
    if (plan) repo.proximoDia(plan).then(setProximo)
  }, [plan, terminadas.length])

  const consejo = useMemo(() => {
    if (!plan || !proximo || ejercicios.size === 0) return null
    const fatiga = calcularFatiga(todasSeries, new Map(sesionesRecientes.map((s) => [s.id, s])), ejercicios, ahoraISO(), ajustes?.factorIndirecto ?? 0.5)
    return consejoDeHoy(proximo, plan.dias, plan.lineas, ejercicios, fatiga, ajustes?.factorIndirecto ?? 0.5)
  }, [plan, proximo, ejercicios, todasSeries, sesionesRecientes, ajustes?.factorIndirecto])

  if (plan === undefined) return null
  if (plan === null) return <Vacio titulo="No hay un plan activo" detalle="Creá uno en la pestaña Plan." />

  const arrancar = async (dia: Dia) => {
    if (arrancando) return
    setArrancando(true)
    try {
      await repo.iniciarSesion(plan, dia, ejercicios)
    } finally {
      setArrancando(false)
      setElegirDia(false)
    }
  }

  const hoy = fechaLocal()
  const pesoHoy = pesos.find((p) => p.fecha === hoy)
  const ultimoPeso = pesos[pesos.length - 1]
  const semanaActual = plan.bloque.fechaInicio ? semanaDe(plan.bloque.fechaInicio, hoy) : null
  const esDeload = semanaActual != null && semanaActual === plan.bloque.semanaDeload
  const lineasDia = proximo ? plan.lineas.filter((l) => l.diaId === proximo.id) : []
  const seriesTotales = lineasDia.reduce((a, l) => a + l.series, 0)

  return (
    <div className="space-y-3 pt-1">
      <div className="text-sm text-texto-2">
        Hola {ajustes?.nombre ?? ''} · {fechaConDia(new Date().toISOString())}
      </div>

      {proximo && (
        <div className="tarjeta aparecer">
          <div className="text-[11px] font-medium uppercase tracking-wider text-texto-3">
            {plan.bloque.nombre}
            {semanaActual != null ? ` · semana ${Math.min(semanaActual, plan.bloque.semanas)} de ${plan.bloque.semanas}` : ' · arranca hoy'}
            {esDeload && <span className="ml-2 rounded bg-aviso/20 px-1.5 py-0.5 text-aviso">descarga</span>}
          </div>
          <div className="mt-1 text-2xl font-bold">{proximo.nombre}</div>
          <div className="mt-1 text-sm text-texto-2">
            {lineasDia.length} ejercicios · {seriesTotales} series · ~{estimarMinutos(lineasDia.map((l) => ({ series: l.series, descanso: l.descansoSeg })))} min
          </div>
          <ul className="mt-3 space-y-1 text-sm">
            {lineasDia.map((l) => (
              <li key={l.id} className="flex justify-between">
                <span>{ejercicios.get(l.ejercicioId)?.nombre ?? l.ejercicioId}</span>
                <span className="text-texto-2">{l.series} × {l.repsMin}–{l.repsMax}</span>
              </li>
            ))}
          </ul>
          {consejo && (
            <div className={`mt-3 rounded-xl px-3 py-2 text-sm ${consejo.tono === 'aviso' ? 'bg-aviso/10 text-texto' : 'bg-superficie-2 text-texto-2'}`}>
              <div className="mb-0.5 text-[11px] font-medium uppercase tracking-wider text-texto-3">Coach</div>
              {consejo.lectura}
              {consejo.alternativa && <div className="mt-1 text-texto-2">{consejo.alternativa.motivo}</div>}
            </div>
          )}
          <button type="button" className="btn-grande mt-4" disabled={arrancando} onClick={() => arrancar(proximo)}>
            Empezar {proximo.nombre}
          </button>
          {consejo?.alternativa && (
            <button type="button" className="btn-secundario mt-2 w-full" disabled={arrancando} onClick={() => arrancar(consejo.alternativa!.dia)}>
              Mejor hoy: {consejo.alternativa.dia.nombre}
            </button>
          )}
          <button type="button" className="mt-2 w-full py-2 text-center text-sm text-texto-2" onClick={() => setElegirDia(true)}>
            Hacer otro día
          </button>
        </div>
      )}

      {eventos.length > 0 && <Avisos eventos={eventos} />}

      <ResumenSemanal />
      <InstalarBanner />

      <div className="tarjeta flex items-center justify-between">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-texto-3">Peso corporal</div>
          <div className="text-lg font-semibold">
            {pesoHoy ? `${kg(pesoHoy.kg)} kg hoy` : ultimoPeso ? `${kg(ultimoPeso.kg)} kg · ${haceCuanto(ultimoPeso.fecha + 'T12:00:00')}` : 'Sin registro'}
          </div>
        </div>
        <button type="button" className="btn-secundario" onClick={() => setPesoAbierto(true)}>
          {pesoHoy ? 'Editar' : 'Anotar'}
        </button>
      </div>

      {terminadas.length > 0 && (
        <div className="tarjeta">
          <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-texto-3">Últimas sesiones</div>
          <ul className="space-y-2 text-sm">
            {terminadas.map((s) => (
              <li key={s.id} className="flex justify-between">
                <span>{s.diaNombre}</span>
                <span className="text-texto-2">{haceCuanto(s.fechaInicio)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Hoja abierta={elegirDia} onCerrar={() => setElegirDia(false)} titulo="¿Qué día hacés hoy?">
        <div className="space-y-2">
          {plan.dias.map((d) => (
            <button key={d.id} type="button" className="btn-secundario w-full justify-between" disabled={arrancando} onClick={() => arrancar(d)}>
              <span>{d.nombre}</span>
              {d.opcional && <span className="text-xs text-texto-2">opcional</span>}
            </button>
          ))}
        </div>
      </Hoja>

      <PesoHoja abierta={pesoAbierto} onCerrar={() => setPesoAbierto(false)} inicial={pesoHoy?.kg ?? ultimoPeso?.kg ?? 76} fecha={hoy} />
    </div>
  )
}

export function PesoHoja({ abierta, onCerrar, inicial, fecha }: { abierta: boolean; onCerrar: () => void; inicial: number; fecha: string }) {
  const [valor, setValor] = useState(inicial)
  useEffect(() => setValor(inicial), [inicial, abierta])
  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo="Peso de hoy">
      <div className="flex justify-center py-2">
        <Stepper valor={valor} paso={0.1} min={30} onCambio={setValor} sufijo="kg" grande />
      </div>
      <p className="mb-4 text-center text-xs text-texto-2">En ayunas, después del baño, misma balanza. Lo que importa es el promedio semanal.</p>
      <button type="button" className="btn-grande" onClick={async () => { await repo.guardarPeso(fecha, valor); onCerrar() }}>
        Guardar
      </button>
    </Hoja>
  )
}

function Avisos({ eventos }: { eventos: CoachEvento[] }) {
  const [abierto, setAbierto] = useState<CoachEvento | null>(null)
  return (
    <div className="tarjeta">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[11px] font-medium uppercase tracking-wider text-texto-3">Coach</div>
        {eventos.some((e) => e.estado === 'informativo') && (
          <button type="button" className="text-xs text-texto-2" onClick={() => repo.archivarInformativos()}>Limpiar leídos</button>
        )}
      </div>
      <ul className="space-y-2">
        {eventos.map((e) => (
          <li key={e.id}>
            <button type="button" className="w-full text-left" onClick={() => setAbierto(e)}>
              <div className="flex items-start gap-2">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${e.estado === 'pendiente' ? 'bg-acento' : 'bg-texto-3'}`} />
                <span className="text-sm">{e.mensaje}</span>
              </div>
            </button>
          </li>
        ))}
      </ul>
      <Hoja abierta={!!abierto} onCerrar={() => setAbierto(null)} titulo={abierto?.mensaje}>
        {abierto && (
          <>
            <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-texto-3">Por qué</div>
            <p className="mb-5 text-sm text-texto-2">{abierto.razon}</p>
            {abierto.estado === 'pendiente' ? (
              <div className="flex gap-2">
                <button type="button" className="btn-secundario flex-1" onClick={async () => { await repo.resolverEvento(abierto.id, 'ignorado'); setAbierto(null) }}>Ignorar</button>
                <button type="button" className="btn-grande flex-1" onClick={async () => { await aceptar(abierto); setAbierto(null) }}>Aceptar</button>
              </div>
            ) : (
              <button type="button" className="btn-secundario w-full" onClick={() => setAbierto(null)}>Cerrar</button>
            )}
          </>
        )}
      </Hoja>
    </div>
  )
}

async function aceptar(e: CoachEvento) {
  if (e.tipo === 'sumar-serie' && e.diaEjercicioId) {
    const plan = await repo.planActivo()
    const l = plan?.lineas.find((x) => x.id === e.diaEjercicioId)
    if (l) await repo.actualizarLinea(l.id, { series: l.series + 1 })
  }
  if (e.tipo === 'deload-anticipado') {
    const plan = await repo.planActivo()
    if (plan?.bloque.fechaInicio) {
      const semana = semanaDe(plan.bloque.fechaInicio, fechaLocal())
      await repo.actualizarBloque(plan.bloque.id, { semanaDeload: semana, semanas: Math.max(plan.bloque.semanas, semana) })
    }
  }
  await repo.resolverEvento(e.id, 'aceptado')
}

function semanaDe(fechaInicio: string, hoy: string): number {
  const ms = new Date(hoy).getTime() - new Date(fechaInicio).getTime()
  return Math.floor(ms / (7 * 86_400_000)) + 1
}

export function estimarMinutos(lineas: { series: number; descanso: number }[]): number {
  // ~40 s por serie de ejecución + descanso; 6 min de calentamiento
  const seg = lineas.reduce((a, l) => a + l.series * (40 + l.descanso), 0)
  return Math.round(6 + seg / 60)
}
