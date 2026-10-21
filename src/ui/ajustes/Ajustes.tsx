import { useEffect, useRef, useState } from 'react'
import * as repo from '../../data/repo'
import { descargarJSON, descargarTexto, exportarCSV, exportarTodo, restaurarTodo, validarRespaldo } from '../../data/exportar'
import { asegurarCuentaAutomatica, bajarBackup, entrarConCodigo, subirBackup, usuarioActual } from '../../data/backup-supabase'
import { useAjustes } from '../hooks'
import { MUSCULOS, type MusculoId } from '../../domain/types'
import { Stepper } from '../componentes/basicos'
import { fechaLocal, haceCuanto } from '../../lib/fechas'
import { pedirPermisoNotificaciones, permisoNotificaciones } from '../../lib/notificaciones'
import { generarICS } from '../../lib/calendario-ics'
import { sonarFinDescanso } from '../../lib/sonido'
import { esNativa, programarRecordatorios } from '../../lib/nativo'

export function Ajustes() {
  const a = useAjustes()
  const [msg, setMsg] = useState<string | null>(null)
  const [usuario, setUsuario] = useState<{ email: string | null } | null>(null)
  const [codigoIn, setCodigoIn] = useState('')
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
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm">Sonido al terminar el descanso</div>
          <div className="flex gap-1.5">
            <button type="button" className={`chip ${a.sonidoDescanso !== false ? 'chip-activo' : ''}`} onClick={() => { repo.guardarAjustes({ sonidoDescanso: true }); sonarFinDescanso() }}>Sí</button>
            <button type="button" className={`chip ${a.sonidoDescanso === false ? 'chip-activo' : ''}`} onClick={() => repo.guardarAjustes({ sonidoDescanso: false })}>No</button>
          </div>
        </div>
        <div className="text-[11px] text-texto-3">Suena con la app abierta (aviso suave a 3 s del final y tres pitidos al terminar). Si el iPhone está en silencio con el botón lateral, no suena.</div>
        <NotificacionesToggle />
      </Seccion>

      <Seccion titulo="Recordatorios">
        <Recordatorios minutos={a.minutosSesion} onAviso={aviso} />
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
        <button type="button" className="btn-secundario w-full" onClick={async () => { descargarTexto(`carga-series-${fechaLocal()}.csv`, await exportarCSV()); aviso('CSV descargado.') }}>Exportar series a CSV (Excel)</button>
        <p className="text-[11px] text-texto-3">El historial es lo más valioso. Exportá cada tanto aunque uses la nube.</p>
      </Seccion>

      <Seccion titulo="Respaldo en la nube">
        {usuario ? (
          <>
            <div className="flex items-center gap-2 text-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-ok" />
              <span>Activo. {a.ultimoBackup ? `Último respaldo ${haceCuanto(a.ultimoBackup)}.` : 'Se sube al terminar tu próxima sesión.'}</span>
            </div>
            {a.codigoRespaldo && usuario.email?.endsWith('@respaldo.carga.app') && (
              <div className="rounded-xl bg-superficie-2 p-3">
                <div className="text-[11px] font-medium uppercase tracking-wider text-texto-3">Tu código de respaldo</div>
                <div className="mt-1 select-all font-mono text-xl font-semibold tracking-wider">{a.codigoRespaldo}</div>
                <div className="mt-1 text-xs text-texto-2">Con este código recuperás todo en otro teléfono. Sacale una captura o guardalo en Notas.</div>
                <button type="button" className="btn-secundario mt-2 w-full" onClick={async () => { try { await navigator.clipboard.writeText(a.codigoRespaldo!); await repo.guardarAjustes({ codigoGuardado: true }); aviso('Código copiado.') } catch { aviso('Mantené apretado el código para copiarlo.') } }}>Copiar código</button>
              </div>
            )}
            {usuario.email && !usuario.email.endsWith('@respaldo.carga.app') && <div className="text-xs text-texto-2">Cuenta: {usuario.email}</div>}
            <div className="flex gap-2">
              <button type="button" className="btn-secundario flex-1" onClick={async () => { try { await subirBackup(); aviso('Respaldo subido.') } catch (e) { aviso((e as Error).message) } }}>Subir ahora</button>
              <button type="button" className="btn-secundario flex-1" onClick={async () => {
                try {
                  const r = await bajarBackup()
                  if (!r) return aviso('No hay respaldo en la nube.')
                  if (!confirm(`¿Reemplazar todo lo de este teléfono por el respaldo del ${r.fecha.slice(0, 10)}?`)) return
                  await restaurarTodo(r); location.reload()
                } catch (e) { aviso((e as Error).message) }
              }}>Traer de la nube</button>
            </div>
          </>
        ) : (
          <>
            <div className="text-sm text-texto-2">Se activa solo cuando terminás tu primera sesión. Si ya tenés un código de respaldo de otro teléfono, ponelo acá:</div>
            <div className="flex gap-2">
              <input value={codigoIn} onChange={(e) => setCodigoIn(e.target.value.toUpperCase())} placeholder="ABCD-EFGH-JKLM-NPQR" autoCapitalize="characters" className={`${input} font-mono tracking-wider`} />
              <button type="button" className="btn-secundario shrink-0 bg-acento text-black" disabled={codigoIn.replace(/[^A-Za-z0-9]/g, '').length !== 16} onClick={async () => {
                try {
                  await entrarConCodigo(codigoIn); const u = await usuarioActual(); setUsuario(u); setCodigoIn('')
                  const r = await bajarBackup()
                  if (r && confirm(`Encontré tu respaldo del ${r.fecha.slice(0, 10)}. ¿Lo traigo a este teléfono?`)) { await restaurarTodo(r); location.reload() }
                  else aviso('Conectado.')
                } catch (e) { aviso((e as Error).message) }
              }}>Recuperar</button>
            </div>
            <button type="button" className="btn-secundario w-full" onClick={async () => {
              try { if (await asegurarCuentaAutomatica()) { setUsuario(await usuarioActual()); await subirBackup().catch(() => {}); aviso('Respaldo activado.') } } catch (e) { aviso((e as Error).message) }
            }}>Activar respaldo ahora</button>
          </>
        )}
      </Seccion>

      <Seccion titulo="Créditos">
        <p className="text-[11px] text-texto-3">
          Modelo anatómico 3D derivado de <a className="underline" href="https://github.com/Z-Anatomy/Models-of-human-anatomy" target="_blank" rel="noreferrer">Z-Anatomy</a> y de
          "BodyParts3D – The Database Center for Life Science – CC-BY-SA 2.1 Japan", bajo licencia <a className="underline" href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>.
          Modificado: músculos superficiales agrupados y decimados. El derivado se distribuye con la misma licencia.
        </p>
      </Seccion>

      <div className="pb-6 text-center text-[11px] text-texto-3">Carga · datos locales en este dispositivo</div>
    </div>
  )
}

function Recordatorios({ minutos, onAviso }: { minutos: number; onAviso: (t: string) => void }) {
  const [dias, setDias] = useState<number[]>([0, 1, 3, 4])
  const [hora, setHora] = useState('18:30')
  const nombres = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
  return (
    <div className="space-y-3">
      <div className="text-sm text-texto-2">{esNativa() ? 'Aviso en el celular los días que elijas, a la hora que elijas.' : 'La web no puede avisarte a futuro sin un servidor. El atajo: un evento semanal en tu calendario, con alarma una hora antes.'}</div>
      <div className="flex gap-1.5">{nombres.map((n, i) => <button key={i} type="button" className={`chip flex-1 ${dias.includes(i) ? 'chip-activo' : ''}`} onClick={() => setDias(dias.includes(i) ? dias.filter((d) => d !== i) : [...dias, i].sort())}>{n}</button>)}</div>
      <div className="flex items-center justify-between gap-3">
        <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="h-12 flex-1 rounded-xl bg-superficie-2 px-3 text-base outline-none" />
        <button type="button" className="btn-secundario shrink-0" disabled={!dias.length} onClick={async () => {
          if (esNativa()) { const ok = await programarRecordatorios(dias, hora); onAviso(ok ? 'Recordatorios programados.' : 'Sin permiso de notificaciones.'); return }
          descargarTexto(`carga-entrenar.ics`, generarICS(dias, hora, minutos), 'text/calendar'); onAviso('Abrí el archivo .ics y agregalo a tu calendario.')
        }}>{esNativa() ? 'Programar avisos' : 'Agregar al calendario'}</button>
      </div>
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
