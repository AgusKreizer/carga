import { useEffect, useRef, useState, type ReactNode } from 'react'

export function Hoja({ abierta, onCerrar, titulo, children }: { abierta: boolean; onCerrar: () => void; titulo?: string; children: ReactNode }) {
  useEffect(() => {
    if (!abierta) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [abierta, onCerrar])
  if (!abierta) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 pt-[calc(env(safe-area-inset-top,0px)+48px)]" onClick={onCerrar}>
      <div
        className="aparecer flex max-h-full w-full max-w-md flex-col rounded-t-3xl bg-superficie"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 px-5 pb-2 pt-4">
          <h2 className="min-w-0 truncate text-lg font-semibold">{titulo ?? ''}</h2>
          <button type="button" onClick={onCerrar} aria-label="Cerrar" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-superficie-2 text-texto active:bg-borde">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div className="overflow-y-auto overscroll-contain px-5 pb-[calc(env(safe-area-inset-bottom,0px)+20px)] pt-2">
          {children}
        </div>
      </div>
    </div>
  )
}

/** Control numérico sin teclado: − valor + */
export function Stepper({
  valor, paso, min = 0, onCambio, sufijo, grande, vacio, base,
}: { valor: number | null; paso: number; min?: number; onCambio: (v: number) => void; sufijo?: string; grande?: boolean; vacio?: string; base?: number }) {
  const sostener = useRef<number | null>(null)
  const cambiar = (d: number) => onCambio(Math.max(min, valor == null && base != null ? base : redondear((valor ?? 0) + d, paso)))
  const empezar = (d: number) => {
    cambiar(d)
    let n = 0
    sostener.current = window.setInterval(() => {
      n++
      cambiar(d * (n > 10 ? 4 : 1))
    }, 180)
  }
  const parar = () => {
    if (sostener.current) window.clearInterval(sostener.current)
    sostener.current = null
  }
  const txt = valor == null ? (vacio ?? '—') : formato(valor)
  const [tecleando, setTecleando] = useState(false)
  const [borrador, setBorrador] = useState('')
  const confirmarTecleo = () => {
    const n = Number(borrador.replace(',', '.'))
    if (borrador.trim() && !Number.isNaN(n)) onCambio(Math.max(min, n))
    setTecleando(false)
  }
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        className={`chip ${grande ? 'h-12 min-w-12 text-lg' : ''}`}
        onPointerDown={() => empezar(-paso)} onPointerUp={parar} onPointerLeave={parar} onPointerCancel={parar}
        aria-label="menos"
      >−</button>
      {tecleando ? (
        <input
          autoFocus
          inputMode="decimal"
          value={borrador}
          onChange={(e) => setBorrador(e.target.value)}
          onFocus={(e) => e.target.select()}
          onBlur={confirmarTecleo}
          onKeyDown={(e) => { if (e.key === 'Enter') confirmarTecleo(); if (e.key === 'Escape') setTecleando(false) }}
          className={`w-20 rounded-lg bg-superficie-2 text-center font-semibold outline-none ring-1 ring-acento ${grande ? 'h-12 text-2xl' : 'h-9 text-base'}`}
        />
      ) : (
        <button
          type="button"
          onClick={() => { setBorrador(valor == null ? '' : String(valor)); setTecleando(true) }}
          className={`min-w-16 text-center font-semibold ${grande ? 'text-2xl' : 'text-base'} ${valor == null ? 'text-texto-3' : ''}`}
          aria-label="escribir valor"
        >
          {txt}{sufijo && valor != null && <span className="ml-0.5 text-xs font-normal text-texto-2">{sufijo}</span>}
        </button>
      )}
      <button
        type="button"
        className={`chip ${grande ? 'h-12 min-w-12 text-lg' : ''}`}
        onPointerDown={() => empezar(paso)} onPointerUp={parar} onPointerLeave={parar} onPointerCancel={parar}
        aria-label="más"
      >+</button>
    </div>
  )
}

function redondear(n: number, paso: number) {
  const p = paso < 1 ? 10 : 1
  return Math.round(Math.round(n / paso) * paso * p) / p
}
function formato(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',')
}

export const RIR_OPCIONES = [0, 1, 2, 3, 4] as const

export function SelectorRir({ valor, objetivo, onCambio }: { valor: number | null; objetivo?: number; onCambio: (v: number) => void }) {
  return (
    <div className="flex gap-1.5">
      {RIR_OPCIONES.map((r) => {
        const activo = valor === r
        const esObjetivo = objetivo === r
        return (
          <button
            key={r}
            type="button"
            onClick={() => onCambio(r)}
            className={`chip h-11 flex-1 ${activo ? 'chip-activo' : esObjetivo ? 'ring-1 ring-acento/60' : ''}`}
          >
            {r === 0 ? 'Fallo' : r === 4 ? '4+' : r}
          </button>
        )
      })}
    </div>
  )
}

export function Etiqueta({ children }: { children: ReactNode }) {
  return <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-texto-3">{children}</div>
}

export function Vacio({ titulo, detalle }: { titulo: string; detalle?: string }) {
  return (
    <div className="tarjeta text-center">
      <div className="font-medium">{titulo}</div>
      {detalle && <div className="mt-1 text-sm text-texto-2">{detalle}</div>}
    </div>
  )
}

export function Escala({ valor, opciones, onCambio }: { valor: number | null; opciones: { v: number; t: string }[]; onCambio: (v: number) => void }) {
  return (
    <div className="flex gap-1.5">
      {opciones.map((o) => (
        <button key={o.v} type="button" onClick={() => onCambio(o.v)} className={`chip h-11 flex-1 ${valor === o.v ? 'chip-activo' : ''}`}>
          {o.t}
        </button>
      ))}
    </div>
  )
}

