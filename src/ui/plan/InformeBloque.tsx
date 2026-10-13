import { useMemo } from 'react'
import { informeDeBloque } from '../../domain/coach/informe'
import type { PlanActivo } from '../../data/repo'
import { useAjustes, useMapaEjercicios, useMedidas, usePesos, useSesionesTerminadas, useTodasLasSeries } from '../hooks'
import { kg } from '../../lib/formato'

export function InformeBloque({ plan }: { plan: PlanActivo }) {
  const sesiones = useSesionesTerminadas(1000)
  const series = useTodasLasSeries()
  const ejercicios = useMapaEjercicios()
  const pesos = usePesos()
  const medidas = useMedidas()
  const ajustes = useAjustes()

  const inf = useMemo(
    () => informeDeBloque({ bloque: plan.bloque, dias: plan.dias, lineas: plan.lineas, sesiones, series, ejercicios, pesos, medidas, prioridades: ajustes?.prioridades ?? [] }),
    [plan, sesiones, series, ejercicios, pesos, medidas, ajustes],
  )

  const color = { progreso: 'text-ok', estancado: 'text-aviso', bajo: 'text-alerta', 'pocos-datos': 'text-texto-3' }
  const etiqueta = { progreso: 'Progresó', estancado: 'Estancado', bajo: 'Bajó', 'pocos-datos': 'Pocos datos' }
  const tipoColor = { volumen: 'border-acento', ejercicio: 'border-aviso', adherencia: 'border-alerta', nutricion: 'border-pierna', ok: 'border-ok' }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Mini t="Sesiones" v={`${inf.sesionesHechas}/${inf.sesionesPlanificadas}`} s={`${Math.round(inf.adherencia * 100)} %`} />
        <Mini t="PRs" v={String(inf.prs)} s="de carga" />
        <Mini t="Duración" v={inf.minutosPromedio != null ? `${inf.minutosPromedio}′` : '—'} s="promedio" />
      </div>

      <div>
        <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-texto-3">Qué hacer en el próximo bloque</div>
        <ul className="space-y-2">
          {inf.recomendaciones.map((r, i) => (
            <li key={i} className={`rounded-xl border-l-2 bg-superficie-2 px-3 py-2 ${tipoColor[r.tipo]}`}>
              <div className="text-sm font-medium">{r.titulo}</div>
              <div className="text-xs text-texto-2">{r.detalle}</div>
            </li>
          ))}
        </ul>
      </div>

      {(inf.pesoInicio != null || inf.cinturaInicio != null) && (
        <div className="grid grid-cols-2 gap-2">
          <Mini t="Peso" v={inf.pesoFin != null ? `${kg(inf.pesoInicio)} → ${kg(inf.pesoFin)}` : `${kg(inf.pesoInicio)} kg`} s={inf.pesoFin != null && inf.pesoInicio != null ? `${inf.pesoFin - inf.pesoInicio >= 0 ? '+' : ''}${(inf.pesoFin - inf.pesoInicio).toFixed(1)} kg` : 'sin cierre'} />
          <Mini t="Cintura" v={inf.cinturaFin != null ? `${kg(inf.cinturaInicio)} → ${kg(inf.cinturaFin)}` : inf.cinturaInicio != null ? `${kg(inf.cinturaInicio)} cm` : '—'} s={inf.cinturaFin != null && inf.cinturaInicio != null ? `${inf.cinturaFin - inf.cinturaInicio >= 0 ? '+' : ''}${(inf.cinturaFin - inf.cinturaInicio).toFixed(1)} cm` : 'medí al cerrar'} />
        </div>
      )}

      <div>
        <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-texto-3">Por ejercicio · carga al inicio → al final</div>
        {inf.ejercicios.length === 0 ? (
          <div className="text-sm text-texto-2">Todavía no hay sesiones en este bloque.</div>
        ) : (
          <ul className="divide-y divide-borde">
            {inf.ejercicios.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <div className="truncate">{e.nombre}</div>
                  <div className="text-[11px] text-texto-3">{kg(e.cargaInicio)} → {kg(e.cargaFin)} kg · 1RM {e.e1rmInicio} → {e.e1rmFin} · {e.sesiones} ses.</div>
                </div>
                <span className={`shrink-0 text-xs ${color[e.estado]}`}>{etiqueta[e.estado]}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function Mini({ t, v, s }: { t: string; v: string; s?: string }) {
  return (
    <div className="rounded-xl bg-superficie-2 p-3">
      <div className="text-[11px] font-medium uppercase tracking-wider text-texto-3">{t}</div>
      <div className="text-base font-semibold">{v}</div>
      {s && <div className="text-[11px] text-texto-3">{s}</div>}
    </div>
  )
}
