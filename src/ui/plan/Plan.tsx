import { useMemo, useState } from 'react'
import * as repo from '../../data/repo'
import { db } from '../../data/db'
import { useAjustes, useMapaEjercicios, usePlan } from '../hooks'
import { volumenSemanal, zona } from '../../domain/coach/volumen'
import { MUSCULOS, type Dia, type DiaEjercicio, type MusculoId } from '../../domain/types'
import { Hoja, Stepper, Vacio } from '../componentes/basicos'
import { EditorDia } from './EditorDia'
import { estimarMinutos } from '../../lib/estimar'
import { nuevoId } from '../../lib/ids'
import { lunesDe, fechaLocal } from '../../lib/fechas'
import { InformeBloque } from './InformeBloque'
import { linkDeRutina } from '../../data/compartir'
import { compartir } from '../../lib/nativo'
import { Onboarding } from '../onboarding/Onboarding'

export function Plan() {
  const plan = usePlan()
  const ejercicios = useMapaEjercicios()
  const ajustes = useAjustes()
  const [diaAbierto, setDiaAbierto] = useState<Dia | null>(null)
  const [bloqueAbierto, setBloqueAbierto] = useState(false)
  const [informeAbierto, setInformeAbierto] = useState(false)
  const [nuevaRutina, setNuevaRutina] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)

  if (plan === undefined) return null
  if (plan === null) return <Vacio titulo="Sin plan" detalle="Todavía no hay un programa activo." />

  const dia = diaAbierto ? plan.dias.find((d) => d.id === diaAbierto.id) ?? null : null
  if (dia) return <EditorDia dia={dia} lineas={plan.lineas.filter((l) => l.diaId === dia.id)} onVolver={() => setDiaAbierto(null)} />

  return (
    <div className="space-y-3 pt-1">
      <button type="button" className="tarjeta w-full text-left" onClick={() => setBloqueAbierto(true)}>
        <div className="text-[11px] font-medium uppercase tracking-wider text-texto-3">{plan.programa.nombre}</div>
        <div className="mt-0.5 flex items-baseline justify-between">
          <div className="text-xl font-bold">{plan.bloque.nombre}</div>
          <div className="text-sm text-texto-2">{plan.bloque.semanas} sem · deload {plan.bloque.semanaDeload ?? '—'}</div>
        </div>
        <div className="mt-1 text-xs text-texto-2">
          {plan.bloque.fechaInicio ? `Empezó la semana del ${plan.bloque.fechaInicio}` : 'Arranca con la primera sesión'} · tocá para editar el bloque
        </div>
      </button>

      <div className="flex gap-2">
        <button type="button" className="btn-secundario flex-1" onClick={() => setInformeAbierto(true)}>Informe del bloque</button>
        <button
          type="button"
          className="btn-secundario flex-1"
          onClick={async () => {
            const url = await linkDeRutina(plan, ejercicios)
            try {
              const ok = await compartir({ title: plan.programa.nombre, text: 'Mi rutina en Carga', url })
              if (!ok) { await navigator.clipboard.writeText(url); setAviso('Link copiado. Quien lo abra puede importar la rutina.') }
            } catch { /* cancelado */ }
            setTimeout(() => setAviso(null), 4000)
          }}
        >Compartir rutina</button>
      </div>
      {aviso && <div className="rounded-xl bg-superficie-2 px-3 py-2 text-sm">{aviso}</div>}

      <div className="space-y-2">
        {plan.dias.map((d) => {
          const ls = plan.lineas.filter((l) => l.diaId === d.id)
          return (
            <button key={d.id} type="button" className="tarjeta w-full text-left" onClick={() => setDiaAbierto(d)}>
              <div className="flex items-baseline justify-between">
                <div className="font-semibold">{d.nombre}{d.opcional && <span className="ml-2 text-xs font-normal text-texto-3">opcional</span>}</div>
                <div className="text-xs text-texto-2">{ls.length} ej · {ls.reduce((a, l) => a + l.series, 0)} series · ~{estimarMinutos(ls.map((l) => ({ series: l.series, descanso: l.descansoSeg })))} min</div>
              </div>
              <div className="mt-1 truncate text-xs text-texto-2">{ls.map((l) => ejercicios.get(l.ejercicioId)?.nombre ?? '?').join(' · ')}</div>
            </button>
          )
        })}
        <button type="button" className="btn-secundario w-full" onClick={async () => { const n = prompt('Nombre del día'); if (n) await repo.agregarDia(plan.bloque.id, n, true) }}>
          + Agregar día
        </button>
        <button type="button" className="w-full py-2 text-sm text-texto-2" onClick={() => setNuevaRutina(true)}>Generar otra rutina (el plan actual queda guardado)</button>
        <Onboarding abierto={nuevaRutina} onCerrar={() => setNuevaRutina(false)} permitirSaltar />
      </div>

      <PanelVolumen lineas={plan.lineas.filter((l) => !plan.dias.find((d) => d.id === l.diaId)?.opcional)} lineasOpcionales={plan.lineas.filter((l) => plan.dias.find((d) => d.id === l.diaId)?.opcional)} factor={ajustes?.factorIndirecto ?? 0.5} bandas={ajustes?.bandas ?? {}} prioridades={ajustes?.prioridades ?? []} />

      <Hoja abierta={informeAbierto} onCerrar={() => setInformeAbierto(false)} titulo={`Informe · ${plan.bloque.nombre}`}>
        <InformeBloque plan={plan} />
      </Hoja>

      <Hoja abierta={bloqueAbierto} onCerrar={() => setBloqueAbierto(false)} titulo="Bloque">
        <EditorBloque plan={plan} onCerrar={() => setBloqueAbierto(false)} />
      </Hoja>
    </div>
  )
}

function EditorBloque({ plan, onCerrar }: { plan: NonNullable<ReturnType<typeof usePlan>>; onCerrar: () => void }) {
  const b = plan.bloque
  const [nombre, setNombre] = useState(b.nombre)
  const [semanas, setSemanas] = useState(b.semanas)
  const [deload, setDeload] = useState<number>(b.semanaDeload ?? 0)
  const guardar = async () => {
    await repo.actualizarBloque(b.id, { nombre, semanas, semanaDeload: deload > 0 ? Math.min(deload, semanas) : null })
    onCerrar()
  }
  const nuevoBloque = async () => {
    if (!confirm('Cerrar este bloque y crear el siguiente con los mismos días y ejercicios? El historial no se toca.')) return
    const id = nuevoId()
    await db.transaction('rw', [db.bloques, db.dias, db.diaEjercicios], async () => {
      await db.bloques.update(b.id, { estado: 'cerrado' })
      await db.bloques.add({ ...b, id, nombre: `Bloque ${b.orden + 1}`, orden: b.orden + 1, fechaInicio: null, estado: 'activo' })
      const mapaDias = new Map<string, string>()
      for (const d of plan.dias) {
        const nid = nuevoId()
        mapaDias.set(d.id, nid)
        await db.dias.add({ ...d, id: nid, bloqueId: id })
      }
      const mapaLineas = new Map<string, string>()
      for (const l of plan.lineas) mapaLineas.set(l.id, nuevoId())
      for (const l of plan.lineas) {
        await db.diaEjercicios.add({ ...l, id: mapaLineas.get(l.id)!, diaId: mapaDias.get(l.diaId)!, superserieCon: l.superserieCon ? mapaLineas.get(l.superserieCon) ?? null : null })
      }
    })
    onCerrar()
  }
  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-texto-3">Nombre</div>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} className="h-12 w-full rounded-xl bg-superficie-2 px-3 text-base outline-none" />
      </div>
      <div className="flex items-center justify-between">
        <div className="text-sm">Semanas</div>
        <Stepper valor={semanas} paso={1} min={1} onCambio={setSemanas} />
      </div>
      <div className="flex items-center justify-between">
        <div className="text-sm">Semana de descarga <span className="text-texto-3">(0 = sin)</span></div>
        <Stepper valor={deload} paso={1} min={0} onCambio={setDeload} />
      </div>
      <div className="flex items-center justify-between">
        <div className="text-sm">Inicio</div>
        <button type="button" className="chip" onClick={async () => { await repo.actualizarBloque(b.id, { fechaInicio: lunesDe(fechaLocal()) }); onCerrar() }}>
          {b.fechaInicio ? `Reiniciar a esta semana` : 'Marcar esta semana'}
        </button>
      </div>
      <button type="button" className="btn-grande" onClick={guardar}>Guardar</button>
      <button type="button" className="btn-secundario w-full" onClick={nuevoBloque}>Cerrar bloque y crear el siguiente</button>
    </div>
  )
}

export function PanelVolumen({ lineas, lineasOpcionales, factor, bandas, prioridades }: { lineas: DiaEjercicio[]; lineasOpcionales?: DiaEjercicio[]; factor: number; bandas: Partial<Record<MusculoId, { min: number; max: number }>>; prioridades: MusculoId[] }) {
  const ejercicios = useMapaEjercicios()
  const base = useMemo(() => volumenSemanal(lineas, ejercicios, factor), [lineas, ejercicios, factor])
  const conOpcional = useMemo(() => volumenSemanal([...lineas, ...(lineasOpcionales ?? [])], ejercicios, factor), [lineas, lineasOpcionales, ejercicios, factor])
  const orden: MusculoId[] = ['pecho', 'espalda', 'deltLat', 'deltPost', 'triceps', 'biceps', 'cuads', 'isquios', 'gluteos', 'gemelos', 'abs']
  return (
    <div className="tarjeta">
      <div className="mb-2 flex items-baseline justify-between">
        <div className="text-[11px] font-medium uppercase tracking-wider text-texto-3">Series por semana</div>
        <div className="text-[11px] text-texto-3">directa 1 · indirecta {factor}</div>
      </div>
      <ul className="space-y-1.5">
        {orden.map((m) => {
          const v = base[m] ?? 0
          const vo = conOpcional[m] ?? 0
          const b = bandas[m]
          const z = zona(v, b)
          const color = z === 'bajo' ? 'text-aviso' : z === 'alto' ? 'text-alerta' : z === 'productivo' ? 'text-ok' : 'text-texto-2'
          const pct = b ? Math.min(100, (v / b.max) * 100) : 0
          return (
            <li key={m} className="text-sm">
              <div className="flex items-baseline justify-between">
                <span>{MUSCULOS[m]}{prioridades.includes(m) && <span className="ml-1 text-[10px] text-acento">★</span>}</span>
                <span className={`font-semibold ${color}`}>{v}{vo !== v && <span className="font-normal text-texto-3"> ({vo})</span>}{b && <span className="ml-1 font-normal text-texto-3">/ {b.min}–{b.max}</span>}</span>
              </div>
              <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-superficie-2">
                <div className={`h-full ${z === 'bajo' ? 'bg-aviso' : z === 'alto' ? 'bg-alerta' : 'bg-ok'}`} style={{ width: `${pct}%` }} />
              </div>
            </li>
          )
        })}
      </ul>
      {lineasOpcionales && lineasOpcionales.length > 0 && <div className="mt-2 text-[11px] text-texto-3">Entre paréntesis: con los días opcionales.</div>}
    </div>
  )
}
