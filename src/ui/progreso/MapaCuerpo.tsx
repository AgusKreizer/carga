import { MUSCULOS, type Banda, type MusculoId } from '../../domain/types'
import { zona } from '../../domain/coach/volumen'
import { COLOR } from './comun'

/**
 * Cuerpo anatómico estilizado, frente y espalda, con los grupos musculares del modelo.
 * Deliberadamente esquemático: la app sabe series por grupo, no por fibra.
 */
interface Props {
  valores: Partial<Record<MusculoId, number>>
  bandas: Partial<Record<MusculoId, Banda>>
  seleccionado: MusculoId | null
  onTocar: (m: MusculoId) => void
}

const SILUETA = '#1c1c21'
const BORDE = '#26262c'

export function MapaCuerpo({ valores, bandas, seleccionado, onTocar }: Props) {
  const color = (m: MusculoId) => {
    const v = valores[m] ?? 0
    if (v === 0) return '#2a2a31'
    const z = zona(v, bandas[m])
    return z === 'bajo' ? COLOR.aviso : z === 'alto' ? COLOR.alerta : z === 'productivo' ? COLOR.ok : COLOR.pierna
  }
  const g = (m: MusculoId, children: React.ReactNode) => (
    <g
      key={m}
      role="button"
      aria-label={MUSCULOS[m]}
      onClick={() => onTocar(m)}
      fill={color(m)}
      stroke={seleccionado === m ? '#f4f4f5' : BORDE}
      strokeWidth={seleccionado === m ? 2 : 1}
      style={{ cursor: 'pointer', opacity: seleccionado && seleccionado !== m ? 0.55 : 1 }}
    >
      {children}
    </g>
  )

  return (
    <div className="flex justify-center gap-6">
      {/* FRENTE */}
      <svg viewBox="0 0 200 420" className="h-72 w-auto" aria-label="frente">
        <Silueta />
        {g('deltLat', <><ellipse cx="54" cy="92" rx="15" ry="13" /><ellipse cx="146" cy="92" rx="15" ry="13" /></>)}
        {g('pecho', <><path d="M62 84 Q98 78 99 98 L99 128 Q80 136 62 126 Z" /><path d="M138 84 Q102 78 101 98 L101 128 Q120 136 138 126 Z" /></>)}
        {g('biceps', <><rect x="32" y="104" width="20" height="58" rx="10" /><rect x="148" y="104" width="20" height="58" rx="10" /></>)}
        {g('antebrazo', <><rect x="24" y="166" width="20" height="62" rx="9" /><rect x="156" y="166" width="20" height="62" rx="9" /></>)}
        {g('abs', <rect x="80" y="134" width="40" height="72" rx="10" />)}
        {g('cuads', <><rect x="66" y="214" width="32" height="108" rx="14" /><rect x="102" y="214" width="32" height="108" rx="14" /></>)}
        {g('gemelos', <><rect x="70" y="330" width="24" height="60" rx="11" /><rect x="106" y="330" width="24" height="60" rx="11" /></>)}
      </svg>
      {/* ESPALDA */}
      <svg viewBox="0 0 200 420" className="h-72 w-auto" aria-label="espalda">
        <Silueta />
        {g('deltPost', <><ellipse cx="54" cy="92" rx="15" ry="13" /><ellipse cx="146" cy="92" rx="15" ry="13" /></>)}
        {g('espalda', <path d="M62 82 L138 82 L142 120 L132 200 L100 212 L68 200 L58 120 Z" />)}
        {g('triceps', <><rect x="32" y="104" width="20" height="58" rx="10" /><rect x="148" y="104" width="20" height="58" rx="10" /></>)}
        {g('antebrazo', <><rect x="24" y="166" width="20" height="62" rx="9" /><rect x="156" y="166" width="20" height="62" rx="9" /></>)}
        {g('gluteos', <><path d="M66 214 Q100 206 100 230 L100 252 Q82 260 66 248 Z" /><path d="M134 214 Q100 206 100 230 L100 252 Q118 260 134 248 Z" /></>)}
        {g('isquios', <><rect x="66" y="258" width="32" height="66" rx="13" /><rect x="102" y="258" width="32" height="66" rx="13" /></>)}
        {g('gemelos', <><rect x="70" y="330" width="24" height="60" rx="11" /><rect x="106" y="330" width="24" height="60" rx="11" /></>)}
      </svg>
    </div>
  )
}

function Silueta() {
  return (
    <g fill={SILUETA} stroke={BORDE} strokeWidth="1">
      <circle cx="100" cy="42" r="22" />
      <rect x="90" y="62" width="20" height="16" />
      <path d="M44 80 L156 80 L150 206 L136 212 L64 212 L50 206 Z" />
      <rect x="28" y="84" width="26" height="150" rx="12" />
      <rect x="146" y="84" width="26" height="150" rx="12" />
      <rect x="62" y="208" width="38" height="190" rx="16" />
      <rect x="100" y="208" width="38" height="190" rx="16" />
    </g>
  )
}

export function Leyenda() {
  const items: [string, string][] = [['Sin series', '#2a2a31'], ['Bajo mínimo', COLOR.aviso], ['Productivo', COLOR.ok], ['Por encima', COLOR.alerta], ['Sin banda', COLOR.pierna]]
  return (
    <div className="flex flex-wrap gap-3 text-[11px] text-texto-3">
      {items.map(([t, c]) => <span key={t} className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-sm" style={{ background: c }} />{t}</span>)}
    </div>
  )
}
