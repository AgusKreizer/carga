import { useEffect, useState } from 'react'
import { usuarioActual } from '../../data/backup-supabase'
import { useAjustes } from '../hooks'
import { haceCuanto } from '../../lib/fechas'
import { irA } from '../navegacion'

const DIAS_VIEJO = 3

/**
 * Aviso fijo en Hoy mientras el historial no esté a salvo: sin cuenta en la nube, o con el último
 * respaldo de hace más de 3 días. Desaparece solo cuando se resuelve; no se puede descartar.
 */
export function EstadoRespaldo() {
  const ajustes = useAjustes()
  const [usuario, setUsuario] = useState<{ email: string | null } | null | undefined>(undefined)
  useEffect(() => { usuarioActual().then(setUsuario).catch(() => setUsuario(null)) }, [ajustes?.ultimoBackup])

  if (usuario === undefined || !ajustes) return null
  if (!usuario) {
    return (
      <button type="button" className="tarjeta flex w-full items-center gap-3 border border-alerta/40 text-left" onClick={() => irA('ajustes')}>
        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-alerta" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">Sin respaldo en la nube</div>
          <div className="text-xs text-texto-2">Tu historial está solo en este teléfono. Si se borra Safari o cambiás de celu, se pierde.</div>
        </div>
        <span className="chip shrink-0 bg-acento text-black">Conectar</span>
      </button>
    )
  }
  const ultimo = ajustes.ultimoBackup
  const viejo = !ultimo || Date.now() - new Date(ultimo).getTime() > DIAS_VIEJO * 86_400_000
  if (!viejo) return null
  return (
    <button type="button" className="tarjeta flex w-full items-center gap-3 border border-aviso/40 text-left" onClick={() => irA('ajustes')}>
      <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-aviso" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">Respaldo desactualizado</div>
        <div className="text-xs text-texto-2">{ultimo ? `Último respaldo ${haceCuanto(ultimo)}.` : 'Todavía no se subió ningún respaldo.'} Tocá para subir uno ahora.</div>
      </div>
    </button>
  )
}
