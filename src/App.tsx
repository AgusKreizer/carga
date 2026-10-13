import { lazy, Suspense, useEffect, useState } from 'react'
import { Hoy } from './ui/hoy/Hoy'
import { Plan } from './ui/plan/Plan'
const Progreso = lazy(() => import('./ui/progreso/Progreso').then((m) => ({ default: m.Progreso })))
import { Ajustes } from './ui/ajustes/Ajustes'
import { useSesionActiva } from './ui/hooks'
import { LimiteError } from './ui/componentes/LimiteError'
import { Hoja } from './ui/componentes/basicos'
import { importarRutina, leerRutinaDelHash, type RutinaCompartida } from './data/compartir'

type Tab = 'hoy' | 'plan' | 'progreso' | 'ajustes'

const TABS: { id: Tab; nombre: string; icono: string }[] = [
  { id: 'hoy', nombre: 'Hoy', icono: 'M4 12h16M12 4v16' },
  { id: 'plan', nombre: 'Plan', icono: 'M4 6h16M4 12h16M4 18h10' },
  { id: 'progreso', nombre: 'Progreso', icono: 'M4 18L10 11l4 4 6-8' },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('hoy')
  const sesion = useSesionActiva()
  const enSesion = !!sesion && tab === 'hoy'
  const [rutinaEntrante, setRutinaEntrante] = useState<RutinaCompartida | null>(null)
  useEffect(() => {
    if (!location.hash.includes('rutina=')) return
    leerRutinaDelHash(location.hash).then((r) => {
      history.replaceState(null, '', location.pathname)
      if (r) setRutinaEntrante(r)
    })
  }, [])

  return (
    <div className="mx-auto flex h-full max-w-md flex-col">
      {!enSesion && (
        <header className="pt-safe flex items-center justify-between px-4 pb-2 pt-3">
          <div className="text-xl font-bold tracking-tight">
            {tab === 'ajustes' ? 'Ajustes' : 'Carga'}
          </div>
          <button
            type="button"
            aria-label="Ajustes"
            onClick={() => setTab(tab === 'ajustes' ? 'hoy' : 'ajustes')}
            className="flex h-10 w-10 items-center justify-center rounded-full text-texto-2 active:bg-superficie-2"
          >
            {tab === 'ajustes' ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6l12 12M18 6L6 18" /></svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>
            )}
          </button>
        </header>
      )}

      <main className={`flex-1 overflow-y-auto px-4 ${enSesion ? 'pt-safe' : ''} pb-safe`}>
        <LimiteError key={tab}>
          {tab === 'hoy' && <Hoy />}
          {tab === 'plan' && <Plan />}
          {tab === 'progreso' && <Suspense fallback={null}><Progreso /></Suspense>}
          {tab === 'ajustes' && <Ajustes />}
        </LimiteError>
      </main>

      <Hoja abierta={!!rutinaEntrante} onCerrar={() => setRutinaEntrante(null)} titulo="Te compartieron una rutina">
        {rutinaEntrante && (
          <div className="space-y-3">
            <div className="text-lg font-semibold">{rutinaEntrante.nombre}</div>
            {rutinaEntrante.descripcion && <p className="text-sm text-texto-2">{rutinaEntrante.descripcion}</p>}
            <ul className="space-y-1 text-sm">
              {rutinaEntrante.dias.map((d, i) => <li key={i} className="flex justify-between"><span>{d.nombre}{d.opcional ? <span className="ml-1 text-xs text-texto-3">opcional</span> : ''}</span><span className="text-texto-2">{d.lineas.length} ejercicios</span></li>)}
            </ul>
            <p className="text-xs text-texto-3">Se importa como programa nuevo y queda activo. Tu plan actual no se borra: queda guardado, inactivo. El historial no se toca.</p>
            <button type="button" className="btn-grande" onClick={async () => { await importarRutina(rutinaEntrante); setRutinaEntrante(null); setTab('plan') }}>Importar y activar</button>
            <button type="button" className="btn-secundario w-full" onClick={() => setRutinaEntrante(null)}>Ahora no</button>
          </div>
        )}
      </Hoja>

      {tab !== 'ajustes' && (
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-borde bg-fondo/95 backdrop-blur">
          <div className="mx-auto flex max-w-md justify-around pb-[env(safe-area-inset-bottom,0px)]">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex h-16 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium ${tab === t.id ? 'text-acento' : 'text-texto-3'}`}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={t.icono} /></svg>
                {t.nombre}
              </button>
            ))}
          </div>
        </nav>
      )}
    </div>
  )
}
