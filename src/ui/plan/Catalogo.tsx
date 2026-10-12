import { useMemo, useState } from 'react'
import * as repo from '../../data/repo'
import { useEjercicios } from '../hooks'
import { MUSCULOS, type Ejercicio, type MusculoId, type Patron } from '../../domain/types'

const PATRONES: Record<Patron, string> = {
  'empuje-horizontal': 'Empuje horizontal', 'empuje-vertical': 'Empuje vertical', 'tiron-vertical': 'Tirón vertical',
  'tiron-horizontal': 'Tirón horizontal', 'aislamiento-pecho': 'Pecho aislado', 'aislamiento-hombro': 'Hombro aislado',
  biceps: 'Bíceps', triceps: 'Tríceps', 'rodilla-dominante': 'Rodilla dominante', 'cadera-dominante': 'Cadera dominante',
  'isquios-aislado': 'Isquios aislado', 'cuads-aislado': 'Cuádriceps aislado', 'gluteos-aislado': 'Glúteo aislado',
  gemelos: 'Gemelos', abs: 'Abdomen',
}

export function Catalogo({ onElegir, patron }: { onElegir: (e: Ejercicio) => void; patron?: Patron }) {
  const todos = useEjercicios()
  const [q, setQ] = useState('')
  const [soloPatron, setSoloPatron] = useState(!!patron)
  const [crear, setCrear] = useState(false)

  const lista = useMemo(() => {
    const t = q.trim().toLowerCase()
    return todos
      .filter((e) => !soloPatron || !patron || e.patron === patron)
      .filter((e) => !t || e.nombre.toLowerCase().includes(t) || PATRONES[e.patron].toLowerCase().includes(t))
      .sort((a, b) => a.patron.localeCompare(b.patron) || a.nombre.localeCompare(b.nombre))
  }, [todos, q, soloPatron, patron])

  const grupos = useMemo(() => {
    const m = new Map<Patron, Ejercicio[]>()
    for (const e of lista) (m.get(e.patron) ?? m.set(e.patron, []).get(e.patron)!).push(e)
    return [...m.entries()]
  }, [lista])

  if (crear) return <NuevoEjercicio onCreado={(e) => { setCrear(false); onElegir(e) }} onCancelar={() => setCrear(false)} />

  return (
    <div className="space-y-3">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="h-12 w-full rounded-xl bg-superficie-2 px-3 text-base outline-none" />
      {patron && (
        <button type="button" className={`chip ${soloPatron ? 'chip-activo' : ''}`} onClick={() => setSoloPatron(!soloPatron)}>
          Solo {PATRONES[patron].toLowerCase()}
        </button>
      )}
      {grupos.map(([p, es]) => (
        <div key={p}>
          <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-texto-3">{PATRONES[p]}</div>
          <div className="space-y-1.5">
            {es.map((e) => (
              <button key={e.id} type="button" className="w-full rounded-xl bg-superficie-2 px-3 py-2.5 text-left active:bg-borde" onClick={() => onElegir(e)}>
                <div className="text-sm font-medium">{e.nombre}</div>
                <div className="text-xs text-texto-2">{e.repsMin}–{e.repsMax} reps · {e.equipo}{e.custom ? ' · propio' : ''}</div>
              </button>
            ))}
          </div>
        </div>
      ))}
      <button type="button" className="btn-secundario w-full" onClick={() => setCrear(true)}>+ Crear ejercicio propio</button>
    </div>
  )
}

function NuevoEjercicio({ onCreado, onCancelar }: { onCreado: (e: Ejercicio) => void; onCancelar: () => void }) {
  const [nombre, setNombre] = useState('')
  const [patron, setPatron] = useState<Patron>('empuje-horizontal')
  const [equipo, setEquipo] = useState<Ejercicio['equipo']>('maquina')
  const [principal, setPrincipal] = useState<MusculoId>('pecho')
  const [secundario, setSecundario] = useState<MusculoId | ''>('')
  const guardar = async () => {
    if (!nombre.trim()) return
    const musculos: Partial<Record<MusculoId, number>> = { [principal]: 1 }
    if (secundario && secundario !== principal) musculos[secundario] = 0.5
    const inc = { barra: 2.5, mancuerna: 2, maquina: 5, polea: 2.5, smith: 5, 'peso-corporal': 0 }[equipo]
    const e = await repo.crearEjercicioCustom({
      nombre: nombre.trim(), patron, equipo, musculos, repsMin: 8, repsMax: 12, rir: 1, descansoSeg: 90,
      evitarSi: [], nota: '', porQue: 'Ejercicio propio.', incremento: inc,
    })
    onCreado(e)
  }
  const sel = 'h-12 w-full rounded-xl bg-superficie-2 px-3 text-base outline-none'
  return (
    <div className="space-y-3">
      <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre" className={sel} autoFocus />
      <select value={patron} onChange={(e) => setPatron(e.target.value as Patron)} className={sel}>
        {Object.entries(PATRONES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <select value={equipo} onChange={(e) => setEquipo(e.target.value as Ejercicio['equipo'])} className={sel}>
        {['maquina', 'polea', 'mancuerna', 'barra', 'smith', 'peso-corporal'].map((k) => <option key={k} value={k}>{k}</option>)}
      </select>
      <div className="grid grid-cols-2 gap-2">
        <select value={principal} onChange={(e) => setPrincipal(e.target.value as MusculoId)} className={sel}>
          {Object.entries(MUSCULOS).map(([k, v]) => <option key={k} value={k}>{v} (1)</option>)}
        </select>
        <select value={secundario} onChange={(e) => setSecundario(e.target.value as MusculoId | '')} className={sel}>
          <option value="">Sin secundario</option>
          {Object.entries(MUSCULOS).map(([k, v]) => <option key={k} value={k}>{v} (0,5)</option>)}
        </select>
      </div>
      <div className="flex gap-2">
        <button type="button" className="btn-secundario flex-1" onClick={onCancelar}>Cancelar</button>
        <button type="button" className="btn-grande flex-1" disabled={!nombre.trim()} onClick={guardar}>Crear</button>
      </div>
    </div>
  )
}
