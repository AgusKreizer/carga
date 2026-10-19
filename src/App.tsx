import { lazy, Suspense, useEffect, useState } from 'react'
import { Hoy } from './ui/hoy/Hoy'
import { Plan } from './ui/plan/Plan'
const Progreso = lazy(() => import('./ui/progreso/Progreso').then((m) => ({ default: m.Progreso })))
import { Ajustes } from './ui/ajustes/Ajustes'
import { useAjustes, useSesionActiva, useSesionesTerminadas } from './ui/hooks'
import { Onboarding } from './ui/onboarding/Onboarding'
import { LimiteError } from './ui/componentes/LimiteError'
import { Hoja } from './ui/componentes/basicos'
import { importarRutina, leerRutinaDelHash, type RutinaCompartida } from './data/compartir'
import { alIniciar } from './data/sincronizacion'
import { esNativa } from './lib/nativo'
import { Intro } from './ui/Intro'
import { Logo } from './ui/componentes/Logo'
import { definirClave, esRecuperacion, sesionDesdeUrl } from './data/backup-supabase'
import { restaurarTodo, type Respaldo } from './data/exportar'
import { alIrA } from './ui/navegacion'

type Tab = 'hoy' | 'plan' | 'progreso' | 'ajustes'

const TABS: { id: Tab; nombre: string; icono: string }[] = [
  { id: 'hoy', nombre: 'Hoy', icono: 'M4 12h16M12 4v16' },
  { id: 'plan', nombre: 'Plan', icono: 'M4 6h16M4 12h16M4 18h10' },
  { id: 'progreso', nombre: 'Progreso', icono: 'M4 18L10 11l4 4 6-8' },
]

export default function App() {
  // ?tab=plan|progreso|ajustes abre directo esa pestaña (links y notificaciones)
  const [tab, setTab] = useState<Tab>(() => {
    const t = new URLSearchParams(location.search).get('tab') as Tab | null
    return t && ['hoy', 'plan', 'progreso', 'ajustes'].includes(t) ? t : 'hoy'
  })
  const sesion = useSesionActiva()
  const enSesion = !!sesion && tab === 'hoy'
  const [rutinaEntrante, setRutinaEntrante] = useState<RutinaCompartida | null>(null)
  const [intro, setIntro] = useState(() => !sessionStorage.getItem('carga.intro'))
  const cerrarIntro = () => { setIntro(false); try { sessionStorage.setItem('carga.intro', '1') } catch { /* sin storage */ } }
  const ajustes = useAjustes()
  const terminadas = useSesionesTerminadas(1)
  const [onboardingCerrado, setOnboardingCerrado] = useState(false)
  const mostrarOnboarding = !!ajustes && !ajustes.onboardingHecho && terminadas.length === 0 && !onboardingCerrado && !rutinaEntrante
  const [respaldoNube, setRespaldoNube] = useState<Respaldo | null>(null)
  const [recuperando, setRecuperando] = useState(false)
  const [claveNueva, setClaveNueva] = useState('')
  const [msgClave, setMsgClave] = useState<string | null>(null)
  useEffect(() => { esRecuperacion().then((r) => { if (r) { setRecuperando(true); setIntro(false) } }) }, [])
  useEffect(() => {
    alIniciar().then((r) => { if (r.ofrecer) setRespaldoNube(r.ofrecer) })
    const quitarIrA = alIrA((t) => setTab(t))
    if (!esNativa()) return quitarIrA
    let quitar: (() => void) | null = null
    import('@capacitor/app').then(({ App: CapApp }) => {
      CapApp.addListener('appUrlOpen', async ({ url }) => {
        if (url.startsWith('ar.carga.app://auth')) { if (await sesionDesdeUrl(url)) { setTab('ajustes'); alIniciar().then((r) => { if (r.ofrecer) setRespaldoNube(r.ofrecer) }) } }
        else if (url.includes('#rutina=')) leerRutinaDelHash(url.slice(url.indexOf('#'))).then((r) => r && setRutinaEntrante(r))
      }).then((h) => { quitar = () => h.remove() })
    })
    return () => { quitar?.(); quitarIrA() }
  }, [])
  useEffect(() => {
    if (!location.hash.includes('rutina=')) return
    leerRutinaDelHash(location.hash).then((r) => {
      history.replaceState(null, '', location.pathname)
      if (r) setRutinaEntrante(r)
    })
  }, [])

  return (
    <div className="mx-auto flex h-full max-w-md flex-col">
      {intro && <Intro onFin={cerrarIntro} />}
      {!enSesion && (
        <header className="pt-safe flex items-center justify-between px-4 pb-2 pt-3">
          <div className="flex items-center gap-2 text-xl font-bold tracking-tight">
            {tab !== 'ajustes' && <Logo tamano={26} />}
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

      <Hoja abierta={recuperando} onCerrar={() => { setRecuperando(false); history.replaceState(null, '', location.pathname) }} titulo="Elegí tu contraseña">
        {msgClave ? (
          <div className="space-y-3">
            <p className="text-sm">{msgClave}</p>
            <button type="button" className="btn-grande" onClick={() => { setRecuperando(false); history.replaceState(null, '', location.pathname) }}>Listo</button>
          </div>
        ) : (
          <div className="space-y-3">
            <input value={claveNueva} onChange={(e) => setClaveNueva(e.target.value)} type="password" autoComplete="new-password" placeholder="Contraseña nueva (mínimo 6)" className="h-12 w-full rounded-xl bg-superficie-2 px-3 text-base outline-none" />
            <button type="button" className="btn-grande" disabled={claveNueva.length < 6} onClick={async () => {
              try { await definirClave(claveNueva); setClaveNueva(''); setMsgClave('Contraseña guardada. Si usás Carga desde la pantalla de inicio del iPhone, abrila y en Ajustes → Nube tocá Entrar con tu mail y esta contraseña.') }
              catch (e) { setMsgClave((e as Error).message) }
            }}>Guardar contraseña</button>
          </div>
        )}
      </Hoja>

      <Hoja abierta={!!respaldoNube} onCerrar={() => setRespaldoNube(null)} titulo="Hay un respaldo en la nube">
        {respaldoNube && (
          <div className="space-y-3">
            <p className="text-sm text-texto-2">Este dispositivo está vacío y tu cuenta tiene un respaldo del {respaldoNube.fecha.slice(0, 10)} con {(respaldoNube.tablas.sesiones as unknown[]).length} sesiones. ¿Lo traemos acá?</p>
            <button type="button" className="btn-grande" onClick={async () => { await restaurarTodo(respaldoNube); location.reload() }}>Restaurar</button>
            <button type="button" className="btn-secundario w-full" onClick={() => setRespaldoNube(null)}>Empezar de cero</button>
          </div>
        )}
      </Hoja>

      <Onboarding abierto={mostrarOnboarding && !respaldoNube && !recuperando} onCerrar={() => setOnboardingCerrado(true)} permitirSaltar />

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
