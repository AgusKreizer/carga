import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { desactivarFoto, fotosActivas, guardarFoto } from '../../data/fotos'
import type { AnguloFoto, Foto } from '../../domain/types'
import { fechaCorta, fechaLocal } from '../../lib/fechas'

const ANGULOS: [AnguloFoto, string][] = [['frente', 'Frente'], ['perfil', 'Perfil'], ['espalda', 'Espalda']]

/** Fotos de progreso: misma luz, misma hora, cada 4 semanas. Comparador con cortina entre dos fechas. */
export function Fotos() {
  const fotos = useLiveQuery(() => fotosActivas(), []) ?? []
  const [angulo, setAngulo] = useState<AnguloFoto>('frente')
  const [a, setA] = useState<string | null>(null)
  const [b, setB] = useState<string | null>(null)
  const [corte, setCorte] = useState(50)
  const [subiendo, setSubiendo] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const hoy = fechaLocal()

  const delAngulo = useMemo(() => fotos.filter((f) => f.angulo === angulo), [fotos, angulo])
  const fa = delAngulo.find((f) => f.id === a) ?? delAngulo[0]
  const fb = delAngulo.find((f) => f.id === b) ?? delAngulo[delAngulo.length - 1]

  const subir = async (file: File) => {
    setSubiendo(true)
    try { await guardarFoto(hoy, angulo, file) } finally { setSubiendo(false) }
  }

  return (
    <div className="tarjeta space-y-3">
      <div className="flex items-baseline justify-between">
        <div className="text-[11px] font-medium uppercase tracking-wider text-texto-3">Fotos (cada 4 semanas)</div>
        <button type="button" className="text-xs text-acento" disabled={subiendo} onClick={() => input.current?.click()}>{subiendo ? 'Guardando…' : 'Sacar o subir'}</button>
        <input ref={input} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) subir(f); e.target.value = '' }} />
      </div>
      <div className="flex gap-1.5">{ANGULOS.map(([k, t]) => <button key={k} type="button" className={`chip flex-1 ${angulo === k ? 'chip-activo' : ''}`} onClick={() => setAngulo(k)}>{t}</button>)}</div>

      {delAngulo.length === 0 ? (
        <div className="text-sm text-texto-2">Sin fotos de {angulo}. Misma luz, misma hora, misma distancia: así se compara en serio. Se guardan solo en este dispositivo.</div>
      ) : delAngulo.length === 1 ? (
        <Imagen foto={delAngulo[0]} className="h-80 w-full rounded-xl object-cover" />
      ) : (
        <>
          <div className="relative h-80 select-none overflow-hidden rounded-xl bg-superficie-2">
            {fa && <Imagen foto={fa} className="absolute inset-0 h-full w-full object-cover" />}
            {fb && <Imagen foto={fb} className="absolute inset-0 h-full w-full object-cover" style={{ clipPath: `inset(0 0 0 ${corte}%)` }} />}
            <div className="absolute inset-y-0 w-0.5 bg-acento" style={{ left: `${corte}%` }} />
            {fa && <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[11px]">{fechaCorta(fa.fecha + 'T12:00:00')}</span>}
            {fb && <span className="absolute right-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[11px]">{fechaCorta(fb.fecha + 'T12:00:00')}</span>}
          </div>
          <input type="range" min={0} max={100} value={corte} onChange={(e) => setCorte(Number(e.target.value))} className="w-full accent-[#ffb020]" aria-label="cortina" />
          <div className="grid grid-cols-2 gap-2">
            <select value={fa?.id ?? ''} onChange={(e) => setA(e.target.value)} className="h-10 rounded-xl bg-superficie-2 px-2 text-sm outline-none">
              {delAngulo.map((f) => <option key={f.id} value={f.id}>{fechaCorta(f.fecha + 'T12:00:00')}</option>)}
            </select>
            <select value={fb?.id ?? ''} onChange={(e) => setB(e.target.value)} className="h-10 rounded-xl bg-superficie-2 px-2 text-sm outline-none">
              {delAngulo.map((f) => <option key={f.id} value={f.id}>{fechaCorta(f.fecha + 'T12:00:00')}</option>)}
            </select>
          </div>
        </>
      )}

      {delAngulo.length > 0 && (
        <div className="sin-scrollbar flex gap-2 overflow-x-auto">
          {delAngulo.map((f) => (
            <div key={f.id} className="relative shrink-0">
              <Imagen foto={f} className="h-20 w-14 rounded-lg object-cover" />
              <button type="button" className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-superficie-2 text-[10px]" aria-label="quitar" onClick={() => { if (confirm('¿Quitar la foto? Queda oculta, no se borra.')) desactivarFoto(f.id) }}>×</button>
              <div className="mt-0.5 text-center text-[10px] text-texto-3">{fechaCorta(f.fecha + 'T12:00:00')}</div>
            </div>
          ))}
        </div>
      )}
      <div className="text-[11px] text-texto-3">Las fotos no viajan en el respaldo JSON ni a la nube (pesan). Si cambiás de teléfono, se quedan en este.</div>
    </div>
  )
}

function Imagen({ foto, className, style }: { foto: Foto; className?: string; style?: React.CSSProperties }) {
  const [url, setUrl] = useState<string>('')
  useEffect(() => {
    const u = URL.createObjectURL(foto.blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [foto.blob])
  return url ? <img src={url} alt={`${foto.angulo} ${foto.fecha}`} className={className} style={style} draggable={false} /> : null
}
