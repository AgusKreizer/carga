import { useEffect, useRef, useState } from 'react'
import * as repo from '../../data/repo'
import { descargarJSON, exportarTodo, restaurarTodo, validarRespaldo } from '../../data/exportar'
import { bajarBackup, cerrarSesionNube, enviarMagicLink, subirBackup, usuarioActual } from '../../data/backup-supabase'
import { useAjustes } from '../hooks'
import { MUSCULOS, type MusculoId } from '../../domain/types'
import { Stepper } from '../componentes/basicos'
import { fechaLocal, haceCuanto } from '../../lib/fechas'
import { pedirPermisoNotificaciones, permisoNotificaciones } from '../../lib/notificaciones'

export function Ajustes() {
  const a = useAjustes()
  const [msg, setMsg] = useState<string | null>(null)
  const [usuario, setUsuario] = useState<{ email: string | null } | null>(null)
  const [email, setEmail] = useState('')
  const archivo = useRef<HTMLInputElement>(null)

  useEffect(() => { usuarioActual().then(setUsuario).catch(() => setUsuario(null)) }, [a?.supabaseUrl, a?.supabaseAnonKey])

  if (!a) return null
  const aviso = (t: string) => { setMsg(t); setTimeout(() => setMsg(null), 3500) }
  const input = 'h-12 w-full rounded-xl bg-superficie-2 px-3 text-base outline-none'
  const prioridades: MusculoId[] = ['pecho', 'espalda', 'deltLat', 'deltPost', 'triceps', 'biceps', 'cuads', 'isquios', 'gluteos', 'gemelos', 'abs']

  const restaurarArchivo = async (f: File) => {
    try {
      const json = JSON.parse(await f.text())
      if (!validarRespaldo(json)) throw new Error('El archivo no es un respaldo de Carga.')
      if (!confirm(`Reemplazar TODO lo local por el respaldo del ${json.fecha.slice(0, 10)}?`)) return
      await restaurarTodo(json)
      location.reload()
    } catch (e) {
      aviso((e as Error).message)
    }
  }

  return (
    <div className="space-y-4 pt-1">
      {msg && <div className="rounded-xl bg-superficie-2 px-3 py-2 text-sm">{msg}</div>}

      <Seccion titulo="Perfil">
        <label className="block">
          <div className="mb-1 text-[11px] text-texto-3">Nombre</div>
          <input defaultValue={a.nombre} onBlur={(e) => repo.guardarAjustes({ nombre: e.target.value })} className={input} />
        </label>
        <div className="flex items-center justify-between"><span className="text-sm">Minutos por sesión</span><Stepper valor={a.minutosSesion} paso={5} min={20} onCambio={(v) => repo.guardarAjustes({ minutosSesion: v })} /></div>
      </Seccion>

      <Seccion titulo="Volumen">
        <div>
          <div className="mb-1 text-[11px] text-texto-3">Cuánto vale una serie indirecta</div>
          <div className="flex gap-1.5">{[0, 0.33, 0.5].map((f) => <button key={f} type="button" className={`chip flex-1 ${a.factorIndirecto === f ? 'chip-activo' : ''}`} onClick={() => repo.guardarAjustes({ factorIndirecto: f })}>{f === 0 ? 'No cuenta' : f}</button>)}</div>
        </div>
        <div>
          <div className="mb-1 text-[11px] text-texto-3">Músculos prioritarios</div>
          <div className="flex flex-wrap gap-1.5">
            {prioridades.map((m) => {
              const on = a.prioridades.includes(m)
              return <button key={m} type="button" className={`chip ${on ? 'chip-activo' : ''}`} onClick={() => repo.guardarAjustes({ prioridades: on ? a.prioridades.filter((x) => x !== m) : [...a.prioridades, m] })}>{MUSCULOS[m]}</button>
            })}
          </div>
        </div>
        <p className="text-[11px] text-texto-3">Las bandas por músculo son referencias para intermedios, no verdades: la respuesta al volumen es individual.</p>
      </Seccion>

      <Seccion titulo="Descanso">
        <NotificacionesToggle />
      </Seccion>

      <Seccion titulo="Discos (calculadora)">
        <div className="flex items-center justify-between"><span className="text-sm">Barra olímpica</span><Stepper valor={a.pesoBarra} paso={2.5} min={0} onCambio={(v) => repo.guardarAjustes({ pesoBarra: v })} sufijo="kg" /></div>
        <div className="flex items-center justify-between"><span className="text-sm">Barra del Smith</span><Stepper valor={a.pesoBarraSmith} paso={2.5} min={0} onCambio={(v) => repo.guardarAjustes({ pesoBarraSmith: v })} sufijo="kg" /></div>
        <div>
          <div className="mb-1 text-[11px] text-texto-3">Discos disponibles</div>
          <div className="flex flex-wrap gap-1.5">
            {[25, 20, 15, 10, 5, 2.5, 1.25, 0.5].map((d) => {
              const on = a.discos.includes(d)
              return <button key={d} type="button" className={`chip ${on ? 'chip-activo' : ''}`} onClick={() => repo.guardarAjustes({ discos: on ? a.discos.filter((x) => x !== d) : [...a.discos, d].sort((x, y) => y - x) })}>{d}</button>
            })}
          </div>
        </div>
      </Seccion>

      <Seccion titulo="Respaldo local">
        <div className="flex gap-2">
          <button type="button" className="btn-secundario flex-1" onClick={async () => { descargarJSON(`carga-${fechaLocal()}.json`, await exportarTodo()); aviso('Respaldo descargado.') }}>Exportar JSON</button>
          <button type="button" className="btn-secundario flex-1" onClick={() => archivo.current?.click()}>Restaurar…</button>
          <input ref={archivo} type="file" accept="application/json" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) restaurarArchivo(f); e.target.value = '' }} />
        </div>
        <p className="text-[11px] text-texto-3">El historial es lo más valioso. Exportá cada tanto aunque uses la nube.</p>
      </Seccion>

      <Seccion titulo="Nube (Supabase)">
        <input defaultValue={a.supabaseUrl} placeholder="https://xxxx.supabase.co" onBlur={(e) => repo.guardarAjustes({ supabaseUrl: e.target.value.trim() })} className={input} />
        <input defaultValue={a.supabaseAnonKey} placeholder="anon key" onBlur={(e) => repo.guardarAjustes({ supabaseAnonKey: e.target.value.trim() })} className={input} />
        {a.supabaseUrl && a.supabaseAnonKey && !usuario && (
          <div className="flex gap-2">
            <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@mail.com" inputMode="email" className={input} />
            <button type="button" className="btn-secundario shrink-0" onClick={async () => { try { await enviarMagicLink(email); aviso('Revisá el mail y tocá el link.') } catch (e) { aviso((e as Error).message) } }}>Enviar link</button>
          </div>
        )}
        {usuario && (
          <>
            <div className="text-sm text-texto-2">Conectado como {usuario.email}. {a.ultimoBackup ? `Último backup ${haceCuanto(a.ultimoBackup)}.` : 'Sin backup todavía.'}</div>
            <div className="flex gap-2">
              <button type="button" className="btn-secundario flex-1" onClick={async () => { try { await subirBackup(); aviso('Backup subido.') } catch (e) { aviso((e as Error).message) } }}>Subir ahora</button>
              <button type="button" className="btn-secundario flex-1" onClick={async () => {
                try {
                  const r = await bajarBackup()
                  if (!r) return aviso('No hay backup en la nube.')
                  if (!confirm(`Reemplazar TODO lo local por el backup del ${r.fecha.slice(0, 10)}?`)) return
                  await restaurarTodo(r); location.reload()
                } catch (e) { aviso((e as Error).message) }
              }}>Restaurar de la nube</button>
            </div>
            <button type="button" className="w-full py-1 text-sm text-texto-3" onClick={async () => { await cerrarSesionNube(); setUsuario(null) }}>Cerrar sesión</button>
          </>
        )}
        <p className="text-[11px] text-texto-3">Se sube un respaldo completo al terminar cada sesión. El SQL para crear la tabla está en docs/supabase.sql.</p>
      </Seccion>

      <div className="pb-6 text-center text-[11px] text-texto-3">Carga · datos locales en este dispositivo</div>
    </div>
  )
}

function NotificacionesToggle() {
  const [estado, setEstado] = useState(permisoNotificaciones())
  if (estado === 'no-soportado') return <div className="text-sm text-texto-2">Este navegador no soporta notificaciones. En el celu, instalá la app en la pantalla de inicio.</div>
  if (estado === 'granted') return <div className="text-sm text-texto-2">Notificación al terminar el descanso: activada. Si la app queda en segundo plano, te avisa igual.</div>
  if (estado === 'denied') return <div className="text-sm text-texto-2">Notificaciones bloqueadas. Activalas desde los permisos del sitio en el navegador.</div>
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-sm text-texto-2">Avisarte cuando termina el descanso aunque la app esté en segundo plano.</div>
      <button type="button" className="btn-secundario shrink-0" onClick={async () => setEstado(await pedirPermisoNotificaciones())}>Activar</button>
    </div>
  )
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="tarjeta space-y-3">
      <div className="text-[11px] font-medium uppercase tracking-wider text-texto-3">{titulo}</div>
      {children}
    </section>
  )
}
