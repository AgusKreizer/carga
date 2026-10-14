/**
 * Marca "Carga": una barra olímpica vista de frente con discos que forman una C.
 * Un acento (ámbar) sobre negro. Con `animado`, los discos entran de a uno y la barra se levanta.
 */
export function Logo({ tamano = 64, animado = false }: { tamano?: number; animado?: boolean }) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 120 120" className={animado ? 'logo-animado' : ''} aria-label="Carga">
      {/* sombra de piso */}
      <ellipse className="logo-sombra" cx="60" cy="104" rx="34" ry="4" fill="#000" opacity="0.5" />
      <g className="logo-barra">
        {/* barra */}
        <rect x="8" y="56" width="104" height="8" rx="3" fill="#f4f4f5" />
        {/* topes */}
        <rect x="26" y="50" width="4" height="20" rx="1.5" fill="#a1a1aa" />
        <rect x="90" y="50" width="4" height="20" rx="1.5" fill="#a1a1aa" />
        {/* discos izquierda (3) y derecha (3): la C la forma el disco grande con el corte */}
        <g className="logo-disco d1"><rect x="12" y="40" width="7" height="40" rx="2.5" fill="#ffb020" /></g>
        <g className="logo-disco d2"><rect x="19" y="34" width="7" height="52" rx="2.5" fill="#ffb020" /></g>
        <g className="logo-disco d3"><rect x="30" y="28" width="9" height="64" rx="3" fill="#ffb020" /></g>
        <g className="logo-disco d4"><rect x="81" y="28" width="9" height="64" rx="3" fill="#ffb020" /></g>
        <g className="logo-disco d5"><rect x="94" y="34" width="7" height="52" rx="2.5" fill="#ffb020" /></g>
        <g className="logo-disco d6"><rect x="101" y="40" width="7" height="40" rx="2.5" fill="#ffb020" /></g>
      </g>
    </svg>
  )
}
