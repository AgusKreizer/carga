import { useCallback, useEffect, useMemo, useState } from 'react'
import * as repo from '../../data/repo'
import { correrCoachPostSesion } from '../../data/coach-runner'
import { respaldarSiCorresponde } from '../../data/backup-supabase'
import { objetivoParaHoy, type SesionPrevia } from '../../domain/coach/progresion'
import type { DiaEjercicioSnapshot, Ejercicio, ObjetivoEjercicio, SerieLog, Sesion as TSesion } from '../../domain/types'
import { useMapaEjercicios, useSeriesDeSesion } from '../hooks'
import { TarjetaEjercicio } from './TarjetaEjercicio'
import { Temporizador } from '../componentes/Temporizador'
import { Escala, Hoja } from '../componentes/basicos'
import { duracion } from '../../lib/fechas'

interface InfoLinea {
  objetivo: ObjetivoEjercicio
  ultima: SesionPrevia | undefined
}

export function Sesion({ sesion }: { sesion: TSesion }) {
  const ejercicios = useMapaEjercicios()
  const series = useSeriesDeSesion(sesion.id)
  const [info, setInfo] = useState<Record<string, InfoLinea>>({})
  const [expandida, setExpandida] = useState<string | null>(null)
  const [finTimer, setFinTimer] = useState<number | null>(null)
  const [cerrando, setCerrando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [sustituyendo, setSustituyendo] = useState<DiaEjercicioSnapshot | null>(null)
  const [transcurrido, setTranscurrido] = useState(0)

  useEffect(() => {
    const t = () => setTranscurrido(Math.floor((Date.now() - new Date(sesion.fechaInicio).getTime()) / 1000))
    t()
    const id = window.setInterval(t, 1000)
    return () => window.clearInterval(id)
  }, [sesion.fechaInicio])

  // Objetivos: se calculan una vez por línea (y se recalculan si cambia el ejercicio por sustitución).
  const firma = sesion.snapshot.map((l) => `${l.id}:${l.ejercicioId}`).join('|')
  useEffect(() => {
    if (ejercicios.size === 0) return
    let vivo = true
    ;(async () => {
      const nuevo: Record<string, InfoLinea> = {}
      for (const l of sesion.snapshot) {
        const ej = ejercicios.get(l.ejercicioId)
        if (!ej) continue
        const previas = await repo.previasDeEjercicio(l.ejercicioId, 8, sesion.id)
        const dias = await repo.diasDesdeUltima(l.ejercicioId, sesion.id)
        nuevo[l.id] = {
          objetivo: objetivoParaHoy({ linea: l, ejercicio: ej, previas, esDeload: sesion.esDeload, diasDesdeUltima: dias }),
          ultima: previas[0],
        }
      }
      if (vivo) setInfo(nuevo)
    })()
    return () => { vivo = false }
  }, [firma, ejercicios.size, sesion.id, sesion.esDeload]) // eslint-disable-line react-hooks/exhaustive-deps

  const seriesPorLinea = useMemo(() => {
    const m: Record<string, SerieLog[]> = {}
    for (const s of series) (m[s.diaEjercicioId] ??= []).push(s)
    return m
  }, [series])

  const seriesPlan = (l: DiaEjercicioSnapshot) => info[l.id]?.objetivo.series.length ?? l.series
  const pendientes = (l: DiaEjercicioSnapshot) => Math.max(0, seriesPlan(l) - (seriesPorLinea[l.id]?.length ?? 0))

  // La tarjeta activa es la primera con series pendientes, salvo que el usuario haya elegido otra.
  const activaAuto = sesion.snapshot.find((l) => pendientes(l) > 0)?.id ?? null
  const activa = expandida ?? activaAuto

  const hechas = series.length
  const totales = sesion.snapshot.reduce((a, l) => a + seriesPlan(l), 0)

  const registrar = useCallback(
    async (l: DiaEjercicioSnapshot, datos: { carga: number; reps: number; rir: number | null; orden: number; objetivoCarga: number | null; objetivoReps: number | null }) => {
      if (guardando) return
      setGuardando(true)
      try {
        const o = info[l.id]?.objetivo
        await repo.registrarSerie({
          sesionId: sesion.id,
          diaEjercicioId: l.id,
          ejercicioId: l.ejercicioId,
          ejercicioPlanId: sesion.snapshot.find((x) => x.id === l.id)?.ejercicioId ?? l.ejercicioId,
          orden: datos.orden,
          objetivoCarga: datos.objetivoCarga,
          objetivoReps: datos.objetivoReps,
          rirObjetivo: o?.rir ?? l.rir,
          carga: datos.carga,
          reps: datos.reps,
          rir: datos.rir,
          calentamiento: false,
        })
        // Superserie: si el par tiene series pendientes, se pasa a él sin descanso largo.
        const par = l.superserieCon ? sesion.snapshot.find((x) => x.id === l.superserieCon) : null
        const parPendiente = par && pendientes(par) > 0
        if (parPendiente) {
          setExpandida(par!.id)
          setFinTimer(Date.now() + 20_000)
        } else {
          setExpandida(null)
          setFinTimer(Date.now() + l.descansoSeg * 1000)
        }
      } finally {
        setGuardando(false)
      }
    },
    [guardando, info, sesion, pendientes], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const terminar = async (datos: { energia: number | null; dolor: number | null; sueno: number | null }) => {
    await repo.terminarSesion(sesion.id, { ...datos, notas: '' })
    await correrCoachPostSesion(sesion.id)
    respaldarSiCorresponde().catch(() => {})
  }

  const alternativas = (l: DiaEjercicioSnapshot): Ejercicio[] => {
    const ej = ejercicios.get(l.ejercicioId)
    if (!ej) return []
    return [...ejercicios.values()].filter((x) => x.activo && x.id !== ej.id && x.patron === ej.patron)
  }

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-texto-3">
            Semana {sesion.semana}{sesion.esDeload ? ' · descarga' : ''} · {duracion(transcurrido)}
          </div>
          <div className="text-2xl font-bold">{sesion.diaNombre}</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold">{hechas}<span className="text-texto-3">/{totales}</span></div>
          <div className="text-[11px] uppercase tracking-wider text-texto-3">series</div>
        </div>
      </div>

      <div className="h-1 overflow-hidden rounded-full bg-superficie-2">
        <div className="h-full bg-acento transition-all" style={{ width: `${totales ? Math.min(100, (hechas / totales) * 100) : 0}%` }} />
      </div>

      {sesion.snapshot.map((l) => {
        const ej = ejercicios.get(l.ejercicioId)
        if (!ej) return null
        return (
          <TarjetaEjercicio
            key={l.id}
            linea={l}
            ejercicio={ej}
            objetivo={info[l.id]?.objetivo}
            ultima={info[l.id]?.ultima}
            series={seriesPorLinea[l.id] ?? []}
            expandida={activa === l.id}
            superserieNombre={l.superserieCon ? sesion.snapshot.find((x) => x.id === l.superserieCon)?.ejercicioNombre : undefined}
            onExpandir={() => setExpandida(activa === l.id ? '' : l.id)}
            onRegistrar={(d) => registrar(l, d)}
            onDeshacer={(id) => repo.desactivarSerie(id)}
            onEditar={(id, cambios) => repo.actualizarSerie(id, cambios)}
            onSustituir={() => setSustituyendo(l)}
            guardando={guardando}
          />
        )
      })}

      <div className="space-y-2 pt-2">
        <button type="button" className="btn-grande" onClick={() => setCerrando(true)}>
          Terminar sesión
        </button>
        <button
          type="button"
          className="w-full py-2 text-center text-sm text-texto-3"
          onClick={async () => { if (confirm('¿Descartar la sesión? Las series quedan guardadas pero la sesión no cuenta.')) await repo.descartarSesion(sesion.id) }}
        >
          Descartar sesión
        </button>
      </div>

      <Temporizador fin={finTimer} detalle={activa ? sesion.snapshot.find((x) => x.id === activa)?.ejercicioNombre : undefined} onSaltar={() => setFinTimer(null)} onSumar={(s) => setFinTimer((f) => (f ?? Date.now()) + s * 1000)} />

      <Hoja abierta={!!sustituyendo} onCerrar={() => setSustituyendo(null)} titulo={`Sustituir ${sustituyendo?.ejercicioNombre ?? ''}`}>
        <p className="mb-3 text-sm text-texto-2">Mismo patrón. La sustitución queda registrada como tal; el plan no cambia.</p>
        <div className="space-y-2">
          {sustituyendo && alternativas(sustituyendo).map((a) => (
            <button key={a.id} type="button" className="btn-secundario w-full justify-start text-left" onClick={async () => { await repo.sustituirEnSesion(sesion, sustituyendo.id, a); setSustituyendo(null) }}>
              {a.nombre}
            </button>
          ))}
          {sustituyendo && alternativas(sustituyendo).length === 0 && <div className="text-sm text-texto-2">No hay alternativas del mismo patrón en el catálogo.</div>}
        </div>
      </Hoja>

      <CierreSesion abierta={cerrando} onCerrar={() => setCerrando(false)} onTerminar={terminar} hechas={hechas} totales={totales} />
    </div>
  )
}

function CierreSesion({ abierta, onCerrar, onTerminar, hechas, totales }: { abierta: boolean; onCerrar: () => void; onTerminar: (d: { energia: number | null; dolor: number | null; sueno: number | null }) => Promise<void>; hechas: number; totales: number }) {
  const [energia, setEnergia] = useState<number | null>(null)
  const [dolor, setDolor] = useState<number | null>(null)
  const [sueno, setSueno] = useState<number | null>(null)
  const [enviando, setEnviando] = useState(false)
  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo="Cerrar sesión">
      <div className="mb-4 text-sm text-texto-2">{hechas} de {totales} series. Tres toques y listo; ninguno es obligatorio.</div>
      <div className="space-y-4">
        <div>
          <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-texto-3">Energía</div>
          <Escala valor={energia} onCambio={setEnergia} opciones={[{ v: 1, t: 'Baja' }, { v: 2, t: 'Normal' }, { v: 3, t: 'Alta' }]} />
        </div>
        <div>
          <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-texto-3">Dolor articular</div>
          <Escala valor={dolor} onCambio={setDolor} opciones={[{ v: 0, t: 'No' }, { v: 1, t: 'Leve' }, { v: 2, t: 'Moderado' }, { v: 3, t: 'Fuerte' }]} />
        </div>
        <div>
          <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-texto-3">Sueño anoche</div>
          <Escala valor={sueno} onCambio={setSueno} opciones={[{ v: 1, t: 'Mal' }, { v: 2, t: 'Normal' }, { v: 3, t: 'Bien' }]} />
        </div>
      </div>
      <button
        type="button"
        className="btn-grande mt-6"
        disabled={enviando}
        onClick={async () => { setEnviando(true); try { await onTerminar({ energia, dolor, sueno }) } finally { setEnviando(false); onCerrar() } }}
      >
        Guardar y terminar
      </button>
    </Hoja>
  )
}
