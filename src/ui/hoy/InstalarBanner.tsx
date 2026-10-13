import { useEffect, useState } from 'react'
import { esIOS, estaInstalada, instalar, puedeInstalar, suscribirInstalar } from '../../lib/instalar'

const CLAVE = 'carga.instalar.cerrado'

export function InstalarBanner() {
  const [, refrescar] = useState(0)
  const [cerrado, setCerrado] = useState<boolean>(() => { try { return localStorage.getItem(CLAVE) === '1' } catch { return false } })
  useEffect(() => suscribirInstalar(() => refrescar((n) => n + 1)), [])
  if (cerrado || estaInstalada()) return null
  const ios = esIOS()
  if (!ios && !puedeInstalar()) return null
  const cerrar = () => { setCerrado(true); try { localStorage.setItem(CLAVE, '1') } catch { /* sin storage */ } }
  return (
    <div className="tarjeta flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-sm font-medium">Agregá Carga a la pantalla de inicio</div>
        <div className="text-xs text-texto-2">{ios ? 'En Safari: botón Compartir → "Agregar a inicio". Queda como app y con notificaciones.' : 'Abre como app, sin barra del navegador y funciona sin señal.'}</div>
      </div>
      {ios ? (
        <button type="button" className="chip shrink-0" onClick={cerrar}>Ok</button>
      ) : (
        <div className="flex shrink-0 flex-col gap-1">
          <button type="button" className="btn-secundario h-9 bg-acento px-3 text-black" onClick={async () => { if (await instalar()) cerrar() }}>Instalar</button>
          <button type="button" className="text-center text-[11px] text-texto-3" onClick={cerrar}>Ahora no</button>
        </div>
      )}
    </div>
  )
}
