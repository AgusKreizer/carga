import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as repo from '../../data/repo'
import { correrCoachPostSesion } from '../../data/coach-runner'
import { respaldarSiCorresponde } from '../../data/backup-supabase'
import { objetivoParaHoy, type SesionPrevia } from '../../domain/coach/progresion'
import { calibracion } from '../../domain/coach/calibracion'
import type { DiaEjercicioSnapshot, Ejercicio, ObjetivoEjercicio, SerieLog, Sesion as TSesion } from '../../domain/types'
import { useMapaEjercicios, useSeriesDeSesion } from '../hooks'
import { TarjetaEjercicio } from './TarjetaEjercicio'
import { Temporizador } from '../componentes/Temporizador'
import { Escala, Hoja, Stepper } from '../componentes/basicos'
import { duracion } from '../../lib/fechas'
import { kg } from '../../lib/formato'
import { alAccionarNotificacion, mostrarNotifSesion, ocultarNotifSesion } from '../../lib/sesion-nativa'
import { esNativa } from '../../lib/nativo'

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
  const [modoOrden, setModoOrden] = useState(false)

  // Cronómetro de sesión con pausa (persistida en la sesión)
  const pausada = !!sesion.pausadoDesde
  useEffect(() => {
    const t = () => {
      const inicio = new Date(sesion.fechaInicio).getTime()
      const pausados = (sesion.segundosPausados ?? 0) * 1000 + (sesion.pausadoDesde ? Date.now() - new Date(sesion.pausadoDesde).getTime() : 0)
      setTranscurrido(Math.max(0, Math.floor((Date.now() - inicio - pausados) / 1000)))
    }
    t()
    const id = window.setInterval(t, 1000)
    return () => window.clearInterval(id)
  }, [sesion.fechaInicio, sesion.pausadoDesde, sesion.segundosPausados])

  const pausar = () => repo.actualizarSesion(sesion.id, { pausadoDesde: new Date().toISOString() })
  const reanudar = () => {
    const extra = sesion.pausadoDesde ? Math.round((Date.now() - new Date(sesion.pausadoDesde).getTime()) / 1000) : 0
    return repo.actualizarSesion(sesion.id, { pausadoDesde: null, segundosPausados: (sesion.segundosPausados ?? 0) + extra })
  }
  const reiniciarTiempo = () => {
    if (!confirm('¿Reiniciar el cronómetro de la sesión? Las series no se tocan.')) return
    return repo.actualizarSesion(sesion.id, { fechaInicio: new Date().toISOString(), pausadoDesde: null, segundosPausados: 0 })
  }

  // Orden de los ejercicios solo para esta sesión
  const lineas = useMemo(() => {
    const orden = sesion.ordenSesion
    if (!orden?.length) return sesion.snapshot
    const pos = new Map(orden.map((id, i) => [id, i]))
    return [...sesion.snapshot].sort((a, b) => (pos.get(a.id) ?? 999) - (pos.get(b.id) ?? 999))
  }, [sesion.snapshot, sesion.ordenSesion])
  const mover = (id: string, dir: -1 | 1) => {
    const ids = lineas.map((l) => l.id)
    const i = ids.indexOf(id)
    const j = i + dir
    if (j < 0 || j >= ids.length) return
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    return repo.actualizarSesion(sesion.id, { ordenSesion: ids })
  }

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
        const c = calibracion(previas)
        nuevo[l.id] = {
          objetivo: objetivoParaHoy({ linea: l, ejercicio: ej, previas, esDeload: sesion.esDeload, diasDesdeUltima: dias, salto: c.salto, motivoSalto: c.motivo }),
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
  const trabajoDe = (id: string) => (seriesPorLinea[id] ?? []).filter((s) => !s.calentamiento)
  const pendientes = (l: DiaEjercicioSnapshot) => Math.max(0, seriesPlan(l) - trabajoDe(l.id).length)

  const activaAuto = lineas.find((l) => pendientes(l) > 0)?.id ?? null
  const activa = expandida ?? activaAuto
  const lineaActiva = lineas.find((l) => l.id === activa) ?? null

  const hechas = series.filter((s) => !s.calentamiento).length
  const totales = lineas.reduce((a, l) => a + seriesPlan(l), 0)

  const registrar = useCallback(
    async (l: DiaEjercicioSnapshot, datos: { carga: number; reps: number; rir: number | null; orden: number; objetivoCarga: number | null; objetivoReps: number | null; calentamiento?: boolean }) => {
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
          calentamiento: !!datos.calentamiento,
        })
        if (datos.calentamiento) return
        const par = l.superserieCon ? lineas.find((x) => x.id === l.superserieCon) : null
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
    [guardando, info, sesion, lineas, pendientes], // eslint-disable-line react-hooks/exhaustive-deps
  )

  // Notificación persistente (Android nativo): serie en curso, próxima y descanso; acciones Hecha / +30 s
  const registrarRef = useRef(registrar)
  registrarRef.current = registrar
  const estadoRef = useRef({ lineaActiva, finTimer })
  estadoRef.current = { lineaActiva, finTimer }
  useEffect(() => {
    if (!esNativa()) return
    alAccionarNotificacion((accion) => {
      const { lineaActiva: l, finTimer: f } = estadoRef.current
      if (accion === 'mas30') { setFinTimer((f ?? Date.now()) + 30_000); return }
      if (!l) return
      const o = info[l.id]?.objetivo
      const n = trabajoDe(l.id).length
      const obj = o?.series[Math.min(n, (o?.series.length ?? 1) - 1)]
      const carga = trabajoDe(l.id).at(-1)?.carga ?? obj?.carga ?? null
      if (carga == null) return
      registrarRef.current(l, { carga, reps: obj?.reps ?? l.repsMin, rir: null, orden: n + 1, objetivoCarga: obj?.carga ?? null, objetivoReps: obj?.reps ?? null })
      void f
    })
    return () => alAccionarNotificacion(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info])
  useEffect(() => {
    if (!esNativa()) return
    if (!lineaActiva) { ocultarNotifSesion(); return }
    const n = trabajoDe(lineaActiva.id).length
    const o = info[lineaActiva.id]?.objetivo
    const obj = o?.series[Math.min(n, (o?.series.length ?? 1) - 1)]
    const carga = trabajoDe(lineaActiva.id).at(-1)?.carga ?? obj?.carga
    const siguiente = lineas.find((l) => l.id !== lineaActiva.id && pendientes(l) > 0)
    const descanso = finTimer && finTimer > Date.now() ? ` · descanso hasta ${new Date(finTimer).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}` : ''
    mostrarNotifSesion({
      titulo: `${lineaActiva.ejercicioNombre} · serie ${n + 1}/${seriesPlan(lineaActiva)}`,
      cuerpo: `${carga != null ? `${kg(carga)} kg × ${obj?.reps ?? lineaActiva.repsMin} · RIR ${o?.rir ?? lineaActiva.rir}` : 'elegí la carga'}${descanso}${siguiente ? ` · después: ${siguiente.ejercicioNombre}` : ''}`,
      finDescanso: finTimer,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineaActiva?.id, series.length, finTimer, info])
  useEffect(() => () => { ocultarNotifSesion() }, [])

  const terminar = async (datos: { energia: number | null; dolor: number | null; horasSueno: number | null }) => {
    if (hechas === 0) { await repo.descartarSesion(sesion.id); return }
    const sueno = datos.horasSueno == null ? null : datos.horasSueno < 6 ? 1 : datos.horasSueno < 7.5 ? 2 : 3
    await repo.terminarSesion(sesion.id, { energia: datos.energia, dolor: datos.dolor, sueno, horasSueno: datos.horasSueno, notas: '' })
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
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-wider text-texto-3">
            Semana {sesion.semana}{sesion.esDeload ? ' · descarga' : ''}
          </div>
          <div className="truncate text-2xl font-bold">{sesion.diaNombre}</div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold">{hechas}<span className="text-texto-3">/{totales}</span></div>
          <div className="text-[11px] uppercase tracking-wider text-texto-3">series</div>
        </div>
      </div>

      <div className="h-1 overflow-hidden rounded-full bg-superficie-2">
        <div className="h-full bg-acento transition-all" style={{ width: `${totales ? Math.min(100, (hechas / totales) * 100) : 0}%` }} />
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`font-mono text-lg font-semibold ${pausada ? 'text-aviso' : ''}`}>{duracion(transcurrido)}</span>
          {pausada && <span className="text-[11px] uppercase tracking-wider text-aviso">en pausa</span>}
        </div>
        <div className="flex gap-1.5">
          <button type="button" className="chip h-8 text-xs" onClick={pausada ? reanudar : pausar}>{pausada ? 'Reanudar' : 'Pausar'}</button>
          <button type="button" className="chip h-8 text-xs" onClick={reiniciarTiempo}>Reiniciar</button>
          <button type="button" className={`chip h-8 text-xs ${modoOrden ? 'chip-activo' : ''}`} onClick={() => setModoOrden(!modoOrden)}>{modoOrden ? 'Listo' : 'Reordenar'}</button>
        </div>
      </div>
      {modoOrden && <div className="text-xs text-texto-2">Movés los ejercicios solo para hoy (máquina ocupada, etc.). El plan no cambia.</div>}

      {lineas.map((l, i) => {
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
            expandida={!modoOrden && activa === l.id}
            primero={lineas[0]?.id === l.id}
            superserieNombre={l.superserieCon ? lineas.find((x) => x.id === l.superserieCon)?.ejercicioNombre : undefined}
            onExpandir={() => { if (!modoOrden) setExpandida(activa === l.id ? '' : l.id) }}
            onRegistrar={(d) => registrar(l, d)}
            onDeshacer={(id) => repo.desactivarSerie(id)}
            onEditar={(id, cambios) => repo.actualizarSerie(id, cambios)}
            onSustituir={() => setSustituyendo(l)}
            guardando={guardando}
            orden={modoOrden ? { arriba: i > 0 ? () => mover(l.id, -1) : null, abajo: i < lineas.length - 1 ? () => mover(l.id, 1) : null } : undefined}
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

      <Temporizador fin={finTimer} detalle={lineaActiva?.ejercicioNombre} onSaltar={() => setFinTimer(null)} onSumar={(s) => setFinTimer((f) => (f ?? Date.now()) + s * 1000)} />

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

function CierreSesion({ abierta, onCerrar, onTerminar, hechas, totales }: { abierta: boolean; onCerrar: () => void; onTerminar: (d: { energia: number | null; dolor: number | null; horasSueno: number | null }) => Promise<void>; hechas: number; totales: number }) {
  const [energia, setEnergia] = useState<number | null>(null)
  const [dolor, setDolor] = useState<number | null>(null)
  const [horas, setHoras] = useState<number | null>(null)
  const [enviando, setEnviando] = useState(false)
  const textoEnergia = ['', 'Muy flojo: cargas pesadas, sin ganas.', 'Flojo: costó más de lo normal.', 'Normal: como siempre.', 'Bien: las series salieron con margen.', 'Enchufado: podría haber hecho más.'][energia ?? 0]
  return (
    <Hoja abierta={abierta} onCerrar={onCerrar} titulo="Cerrar sesión">
      <div className="mb-4 text-sm text-texto-2">{hechas} de {totales} series. Tres respuestas rápidas; ninguna es obligatoria.</div>
      <div className="space-y-4">
        <div>
          <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-texto-3">¿Cómo estuviste durante la sesión?</div>
          <Escala valor={energia} onCambio={setEnergia} opciones={[{ v: 1, t: '1' }, { v: 2, t: '2' }, { v: 3, t: '3' }, { v: 4, t: '4' }, { v: 5, t: '5' }]} />
          <div className="mt-1 min-h-4 text-xs text-texto-2">{energia ? textoEnergia : '1 muy flojo · 3 normal · 5 enchufado. Habla del rendimiento en el gimnasio, no de cómo llegaste.'}</div>
        </div>
        <div>
          <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-texto-3">Dolor articular durante la sesión</div>
          <Escala valor={dolor} onCambio={setDolor} opciones={[{ v: 0, t: 'No' }, { v: 1, t: 'Leve' }, { v: 2, t: 'Moderado' }, { v: 3, t: 'Fuerte' }]} />
        </div>
        <div>
          <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-texto-3">Horas de sueño anoche</div>
          <div className="flex items-center justify-between">
            <Stepper valor={horas} paso={0.5} min={0} base={7} onCambio={setHoras} sufijo="h" grande vacio="—" />
            <button type="button" className="chip" onClick={() => setHoras(null)}>No sé</button>
          </div>
          <div className="mt-1 text-xs text-texto-2">Tocá el número para escribirlo. Menos de 6 h cuenta como "mal" para el coach.</div>
        </div>
      </div>
      <button
        type="button"
        className="btn-grande mt-6"
        disabled={enviando}
        onClick={async () => { setEnviando(true); try { await onTerminar({ energia, dolor, horasSueno: horas }) } finally { setEnviando(false); onCerrar() } }}
      >
        Guardar y terminar
      </button>
    </Hoja>
  )
}
