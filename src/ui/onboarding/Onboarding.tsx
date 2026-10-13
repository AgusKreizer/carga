import { useState } from 'react'
import * as repo from '../../data/repo'
import { db } from '../../data/db'
import { generarRutina, type PerfilGenerador } from '../../domain/generador'
import { MUSCULOS, type Equipo, type Molestia, type MusculoId } from '../../domain/types'
import { Hoja, Stepper } from '../componentes/basicos'
import { ahoraISO } from '../../lib/fechas'

const EQUIPOS: [Equipo, string][] = [['barra', 'Barra libre'], ['smith', 'Smith'], ['mancuerna', 'Mancuernas'], ['maquina', 'Máquinas'], ['polea', 'Poleas']]
const MOLESTIAS: [Molestia, string][] = [['hombro', 'Hombro'], ['muneca', 'Muñeca'], ['codo', 'Codo'], ['lumbar', 'Lumbar'], ['rodilla', 'Rodilla']]
const PRIORIDADES: MusculoId[] = ['pecho', 'espalda', 'deltLat', 'biceps', 'triceps', 'cuads', 'isquios', 'gluteos', 'gemelos', 'abs']

/** Primer uso o "nueva rutina": 4 preguntas y una rutina generada por reglas. */
export function Onboarding({ abierto, onCerrar, permitirSaltar }: { abierto: boolean; onCerrar: () => void; permitirSaltar: boolean }) {
  const [paso, setPaso] = useState(0)
  const [nombre, setNombre] = useState('')
  const [nivel, setNivel] = useState<PerfilGenerador['nivel']>('intermedio')
  const [dias, setDias] = useState<PerfilGenerador['diasPorSemana']>(4)
  const [minutos, setMinutos] = useState(60)
  const [equipo, setEquipo] = useState<Equipo[]>(['mancuerna', 'maquina', 'polea'])
  const [molestias, setMolestias] = useState<Molestia[]>([])
  const [prioridades, setPrioridades] = useState<MusculoId[]>([])
  const [avisos, setAvisos] = useState<string[]>([])
  const [listo, setListo] = useState(false)

  const alternar = <T,>(arr: T[], v: T, set: (x: T[]) => void, max = 99) => {
    if (arr.includes(v)) set(arr.filter((x) => x !== v))
    else if (arr.length < max) set([...arr, v])
  }

  const generar = async () => {
    const catalogo = await db.ejercicios.filter((e) => e.activo).toArray()
    const r = generarRutina({ nivel, diasPorSemana: dias, minutos, equipo, molestias, prioridades }, catalogo, ahoraISO())
    await repo.activarPrograma(r.programa, r.bloque, r.dias, r.lineas)
    await repo.guardarAjustes({ onboardingHecho: true, nivel, minutosSesion: minutos, prioridades, ...(nombre.trim() ? { nombre: nombre.trim() } : {}) })
    setAvisos(r.avisos)
    setListo(true)
  }

  const saltar = async () => {
    await repo.guardarAjustes({ onboardingHecho: true })
    onCerrar()
  }

  const titulo = ['Quién sos', 'Cuánto podés', 'Qué tenés', 'Qué cuidar'][paso] ?? 'Rutina lista'

  return (
    <Hoja abierta={abierto} onCerrar={permitirSaltar ? onCerrar : () => {}} titulo={titulo}>
      {listo ? (
        <div className="space-y-3">
          <p className="text-sm">Rutina creada y activa. Podés mover, cambiar o quitar cualquier ejercicio en la pestaña Plan.</p>
          {avisos.length > 0 && <ul className="space-y-1 text-xs text-aviso">{avisos.map((a, i) => <li key={i}>{a}</li>)}</ul>}
          <p className="text-xs text-texto-3">La primera semana sirve para encontrar las cargas. Desde la segunda, el coach te dice qué poner.</p>
          <button type="button" className="btn-grande" onClick={onCerrar}>Empezar</button>
        </div>
      ) : paso === 0 ? (
        <div className="space-y-4">
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre" className="h-12 w-full rounded-xl bg-superficie-2 px-3 text-base outline-none" />
          <div>
            <div className="mb-1 text-[11px] text-texto-3">Experiencia real</div>
            <div className="flex gap-1.5">
              <button type="button" className={`chip flex-1 ${nivel === 'principiante' ? 'chip-activo' : ''}`} onClick={() => setNivel('principiante')}>Menos de 1 año</button>
              <button type="button" className={`chip flex-1 ${nivel === 'intermedio' ? 'chip-activo' : ''}`} onClick={() => setNivel('intermedio')}>1 año o más</button>
            </div>
          </div>
          <button type="button" className="btn-grande" onClick={() => setPaso(1)}>Seguir</button>
          {permitirSaltar && <button type="button" className="w-full py-2 text-sm text-texto-3" onClick={saltar}>Ya tengo plan: usar el que está cargado</button>}
        </div>
      ) : paso === 1 ? (
        <div className="space-y-4">
          <div>
            <div className="mb-1 text-[11px] text-texto-3">Días por semana que garantizás</div>
            <div className="flex gap-1.5">{([3, 4, 5, 6] as const).map((d) => <button key={d} type="button" className={`chip flex-1 ${dias === d ? 'chip-activo' : ''}`} onClick={() => setDias(d)}>{d}</button>)}</div>
            <div className="mt-1 text-[11px] text-texto-3">{dias === 3 ? 'Full body ×3' : dias === 4 ? 'Torso / Pierna ×2' : dias === 5 ? 'Torso / Pierna + brazos opcional' : 'Empuje / Tirón / Piernas ×2'}</div>
          </div>
          <div className="flex items-center justify-between"><span className="text-sm">Minutos por sesión</span><Stepper valor={minutos} paso={5} min={30} onCambio={setMinutos} /></div>
          <button type="button" className="btn-grande" onClick={() => setPaso(2)}>Seguir</button>
        </div>
      ) : paso === 2 ? (
        <div className="space-y-4">
          <div>
            <div className="mb-1 text-[11px] text-texto-3">Equipo disponible</div>
            <div className="flex flex-wrap gap-1.5">{EQUIPOS.map(([k, t]) => <button key={k} type="button" className={`chip ${equipo.includes(k) ? 'chip-activo' : ''}`} onClick={() => alternar(equipo, k, setEquipo)}>{t}</button>)}</div>
          </div>
          <button type="button" className="btn-grande" disabled={equipo.length === 0} onClick={() => setPaso(3)}>Seguir</button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <div className="mb-1 text-[11px] text-texto-3">Molestias (se evitan los ejercicios que las cargan)</div>
            <div className="flex flex-wrap gap-1.5">{MOLESTIAS.map(([k, t]) => <button key={k} type="button" className={`chip ${molestias.includes(k) ? 'chip-activo' : ''}`} onClick={() => alternar(molestias, k, setMolestias)}>{t}</button>)}</div>
          </div>
          <div>
            <div className="mb-1 text-[11px] text-texto-3">Prioridades (hasta 2: reciben una serie más)</div>
            <div className="flex flex-wrap gap-1.5">{PRIORIDADES.map((m) => <button key={m} type="button" className={`chip ${prioridades.includes(m) ? 'chip-activo' : ''}`} onClick={() => alternar(prioridades, m, setPrioridades, 2)}>{MUSCULOS[m]}</button>)}</div>
          </div>
          <button type="button" className="btn-grande" onClick={generar}>Crear mi rutina</button>
        </div>
      )}
    </Hoja>
  )
}
