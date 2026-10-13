import { useState } from 'react'
import * as repo from '../../data/repo'
import { useMapaEjercicios } from '../hooks'
import type { Dia, DiaEjercicio } from '../../domain/types'
import { Hoja, Stepper } from '../componentes/basicos'
import { Catalogo } from './Catalogo'
import { estimarMinutos } from '../../lib/estimar'

export function EditorDia({ dia, lineas, onVolver }: { dia: Dia; lineas: DiaEjercicio[]; onVolver: () => void }) {
  const ejercicios = useMapaEjercicios()
  const [abierta, setAbierta] = useState<DiaEjercicio | null>(null)
  const [catalogo, setCatalogo] = useState(false)
  const ordenadas = [...lineas].sort((a, b) => a.orden - b.orden)

  const mover = async (l: DiaEjercicio, dir: -1 | 1) => {
    const ids = ordenadas.map((x) => x.id)
    const i = ids.indexOf(l.id)
    const j = i + dir
    if (j < 0 || j >= ids.length) return
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    await repo.reordenarLineas(ids)
  }

  return (
    <div className="space-y-3 pt-1">
      <div className="flex items-center gap-2">
        <button type="button" className="chip" onClick={onVolver}>←</button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xl font-bold">{dia.nombre}</div>
          <div className="text-xs text-texto-2">{ordenadas.reduce((a, l) => a + l.series, 0)} series · ~{estimarMinutos(ordenadas.map((l) => ({ series: l.series, descanso: l.descansoSeg })))} min</div>
        </div>
        <button type="button" className="chip" onClick={async () => { const n = prompt('Nombre del día', dia.nombre); if (n) await repo.actualizarDia(dia.id, { nombre: n }) }}>Renombrar</button>
      </div>

      <ul className="space-y-2">
        {ordenadas.map((l, i) => {
          const ej = ejercicios.get(l.ejercicioId)
          const par = l.superserieCon ? ejercicios.get(lineas.find((x) => x.id === l.superserieCon)?.ejercicioId ?? '') : undefined
          return (
            <li key={l.id} className="tarjeta flex items-center gap-2">
              <div className="flex flex-col gap-1">
                <button type="button" className="chip h-7 min-w-7 text-xs" disabled={i === 0} onClick={() => mover(l, -1)}>↑</button>
                <button type="button" className="chip h-7 min-w-7 text-xs" disabled={i === ordenadas.length - 1} onClick={() => mover(l, 1)}>↓</button>
              </div>
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setAbierta(l)}>
                <div className="truncate font-medium">{ej?.nombre ?? l.ejercicioId}</div>
                <div className="text-xs text-texto-2">
                  {l.series} × {l.repsMin}–{l.repsMax} · RIR {l.rir} · {l.descansoSeg}s{par ? ` · SS con ${par.nombre}` : ''}
                </div>
              </button>
            </li>
          )
        })}
      </ul>

      <button type="button" className="btn-secundario w-full" onClick={() => setCatalogo(true)}>+ Agregar ejercicio</button>
      <button type="button" className="w-full py-2 text-sm text-texto-3" onClick={async () => { if (confirm(`¿Quitar "${dia.nombre}" del plan? Se desactiva, el historial queda.`)) { await repo.actualizarDia(dia.id, { activo: false }); onVolver() } }}>
        Quitar este día del plan
      </button>

      <Hoja abierta={!!abierta} onCerrar={() => setAbierta(null)} titulo={abierta ? ejercicios.get(abierta.ejercicioId)?.nombre : ''}>
        {abierta && <EditorLinea linea={lineas.find((x) => x.id === abierta.id) ?? abierta} otras={ordenadas.filter((x) => x.id !== abierta.id)} onCerrar={() => setAbierta(null)} />}
      </Hoja>

      <Hoja abierta={catalogo} onCerrar={() => setCatalogo(false)} titulo="Agregar ejercicio">
        <Catalogo onElegir={async (e) => { await repo.agregarLinea(dia.id, e); setCatalogo(false) }} />
      </Hoja>
    </div>
  )
}

function EditorLinea({ linea, otras, onCerrar }: { linea: DiaEjercicio; otras: DiaEjercicio[]; onCerrar: () => void }) {
  const ejercicios = useMapaEjercicios()
  const [cambiar, setCambiar] = useState(false)
  const ej = ejercicios.get(linea.ejercicioId)
  const set = (c: Partial<DiaEjercicio>) => repo.actualizarLinea(linea.id, c)
  return (
    <div className="space-y-4">
      {ej && <p className="text-sm text-texto-2">{ej.porQue} <a className="text-acento" href={`https://www.youtube.com/results?search_query=${encodeURIComponent(ej.nombre + ' técnica')}`} target="_blank" rel="noreferrer">Ver técnica</a></p>}
      <Fila nombre="Series"><Stepper valor={linea.series} paso={1} min={1} onCambio={(v) => set({ series: v })} /></Fila>
      <Fila nombre="Reps mínimas"><Stepper valor={linea.repsMin} paso={1} min={1} onCambio={(v) => set({ repsMin: v, repsMax: Math.max(v, linea.repsMax) })} /></Fila>
      <Fila nombre="Reps máximas"><Stepper valor={linea.repsMax} paso={1} min={linea.repsMin} onCambio={(v) => set({ repsMax: v })} /></Fila>
      <Fila nombre="RIR objetivo"><Stepper valor={linea.rir} paso={1} min={0} onCambio={(v) => set({ rir: Math.min(4, v) })} /></Fila>
      <Fila nombre="Descanso"><Stepper valor={linea.descansoSeg} paso={15} min={30} onCambio={(v) => set({ descansoSeg: v })} sufijo="s" /></Fila>
      <div>
        <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-texto-3">Superserie con</div>
        <select
          value={linea.superserieCon ?? ''}
          onChange={(e) => repo.vincularSuperserie(linea.id, e.target.value || null)}
          className="h-12 w-full rounded-xl bg-superficie-2 px-3 text-base outline-none"
        >
          <option value="">Ninguno</option>
          {otras.map((o) => <option key={o.id} value={o.id}>{ejercicios.get(o.ejercicioId)?.nombre ?? o.id}</option>)}
        </select>
      </div>
      <div>
        <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-texto-3">Nota</div>
        <input defaultValue={linea.nota} onBlur={(e) => set({ nota: e.target.value })} placeholder="Técnica, pies, agarre…" className="h-12 w-full rounded-xl bg-superficie-2 px-3 text-base outline-none" />
      </div>
      <div className="flex gap-2">
        <button type="button" className="btn-secundario flex-1" onClick={() => setCambiar(true)}>Cambiar ejercicio</button>
        <button type="button" className="btn-secundario flex-1 text-alerta" onClick={async () => { if (confirm('¿Quitar del día?')) { await repo.desactivarLinea(linea.id); onCerrar() } }}>Quitar</button>
      </div>
      <Hoja abierta={cambiar} onCerrar={() => setCambiar(false)} titulo="Cambiar por">
        <Catalogo onElegir={async (e) => { await set({ ejercicioId: e.id }); setCambiar(false); onCerrar() }} patron={ej?.patron} />
      </Hoja>
    </div>
  )
}

function Fila({ nombre, children }: { nombre: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div className="text-sm">{nombre}</div>
      {children}
    </div>
  )
}
