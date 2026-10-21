import { useEffect, useState } from 'react'
import { asegurarCuentaAutomatica, subirBackup, usuarioActual } from '../../data/backup-supabase'
import * as repo from '../../data/repo'
import { useAjustes } from '../hooks'
import { haceCuanto } from '../../lib/fechas'

const DIAS_VIEJO = 3

/**
 * Estado del respaldo en Hoy. Sin respaldo: un toque lo activa (cuenta automática con código, sin mail).
 * Activo con código sin guardar: muestra el código para sacarle captura. Viejo: avisa y sube.
 */
export function EstadoRespaldo() {
  const ajustes = useAjustes()
  const [usuario, setUsuario] = useState<{ email: string | null } | null | undefined>(undefined)
  const [trabajando, setTrabajando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { usuarioActual().then(setUsuario).catch(() => setUsuario(null)) }, [ajustes?.ultimoBackup, ajustes?.codigoRespaldo])

  if (usuario === undefined || !ajustes) return null

  const activar = async () => {
    setTrabajando(true); setError(null)
    try {
      await asegurarCuentaAutomatica()
      await subirBackup()
      setUsuario(await usuarioActual())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setTrabajando(false)
    }
  }

  if (!usuario) {
    return (
      <div className="tarjeta flex items-center gap-3 border border-alerta/40">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-alerta" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">Sin respaldo en la nube</div>
          <div className="text-xs text-texto-2">{error ?? 'Tu historial está solo en este teléfono. Un toque y queda respaldado: sin mail ni contraseña.'}</div>
        </div>
        <button type="button" className="chip shrink-0 bg-acento text-black" disabled={trabajando} onClick={activar}>{trabajando ? '…' : 'Activar'}</button>
      </div>
    )
  }

  const porCodigo = !!ajustes.codigoRespaldo && !!usuario.email?.endsWith('@respaldo.carga.app')
  if (porCodigo && !ajustes.codigoGuardado) {
    return (
      <div className="tarjeta space-y-2 border border-ok/40">
        <div className="flex items-center gap-2 text-sm font-semibold"><span className="h-2.5 w-2.5 rounded-full bg-ok" />Respaldo activo</div>
        <div className="text-xs text-texto-2">Guardá este código: con él recuperás todo si cambiás de teléfono. Sacale una captura de pantalla.</div>
        <div className="select-all rounded-xl bg-superficie-2 px-3 py-2 text-center font-mono text-xl font-semibold tracking-wider">{ajustes.codigoRespaldo}</div>
        <button type="button" className="btn-secundario w-full" onClick={() => repo.guardarAjustes({ codigoGuardado: true })}>Ya lo guardé</button>
      </div>
    )
  }

  const ultimo = ajustes.ultimoBackup
  const viejo = !ultimo || Date.now() - new Date(ultimo).getTime() > DIAS_VIEJO * 86_400_000
  if (!viejo) return null
  return (
    <button type="button" className="tarjeta flex w-full items-center gap-3 border border-aviso/40 text-left" disabled={trabajando} onClick={activar}>
      <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-aviso" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">Respaldo desactualizado</div>
        <div className="text-xs text-texto-2">{error ?? `${ultimo ? `Último respaldo ${haceCuanto(ultimo)}.` : 'Todavía no se subió ningún respaldo.'} Tocá para subir uno ahora.`}</div>
      </div>
    </button>
  )
}
