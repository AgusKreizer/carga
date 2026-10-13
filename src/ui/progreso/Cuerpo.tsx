import { useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useMedidas, usePesos } from '../hooks'
import { fechaCorta, fechaLocal, sumarDias } from '../../lib/fechas'
import { kg } from '../../lib/formato'
import { Hoja } from '../componentes/basicos'
import { PesoHoja } from '../hoy/Hoy'
import * as repo from '../../data/repo'
import { COLOR, Dato, ESTILO_TOOLTIP } from './comun'
import { FuerzaVsPeso } from './FuerzaVsPeso'

export function Cuerpo() {
  const pesos = usePesos()
  const medidas = useMedidas()
  const [pesoAbierto, setPesoAbierto] = useState(false)
  const [medidaAbierta, setMedidaAbierta] = useState(false)
  const hoy = fechaLocal()

  const datos = useMemo(() => {
    const ult = pesos.slice(-90)
    return ult.map((p, i) => {
      const ventana = ult.slice(Math.max(0, i - 6), i + 1).filter((x) => x.fecha >= sumarDias(p.fecha, -6))
      const media = ventana.reduce((a, x) => a + x.kg, 0) / ventana.length
      return { fecha: p.fecha, label: fechaCorta(p.fecha + 'T12:00:00'), kg: p.kg, media: Math.round(media * 10) / 10 }
    })
  }, [pesos])

  const ultimo = datos[datos.length - 1]
  const hace4 = datos.find((d) => d.fecha >= sumarDias(hoy, -28))
  const ultimaMedida = medidas[medidas.length - 1]
  const prevMedida = medidas[medidas.length - 2]

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Dato titulo="Peso (media 7 d)" valor={ultimo ? `${kg(ultimo.media)} kg` : '—'} delta={ultimo && hace4 && hace4 !== ultimo ? ultimo.media - hace4.media : null} unidad="kg en 4 sem" />
        <Dato titulo="Cintura" valor={ultimaMedida?.cintura ? `${kg(ultimaMedida.cintura)} cm` : '—'} delta={ultimaMedida?.cintura && prevMedida?.cintura ? ultimaMedida.cintura - prevMedida.cintura : null} unidad="cm" />
      </div>
      <div className="tarjeta">
        <div className="mb-2 flex items-baseline justify-between">
          <div className="text-[11px] font-medium uppercase tracking-wider text-texto-3">Peso corporal</div>
          <button type="button" className="text-xs text-acento" onClick={() => setPesoAbierto(true)}>Anotar hoy</button>
        </div>
        {datos.length < 2 ? (
          <div className="py-6 text-center text-sm text-texto-2">Anotá el peso 3 o más mañanas por semana. Lo que importa es la media, no el día.</div>
        ) : (
          <div className="h-44">
            <ResponsiveContainer>
              <LineChart data={datos} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid stroke="#26262c" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#63636b', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={24} />
                <YAxis tick={{ fill: '#63636b', fontSize: 11 }} axisLine={false} tickLine={false} domain={['dataMin - 1', 'dataMax + 1']} />
                <Tooltip {...ESTILO_TOOLTIP} formatter={(v, n) => [`${kg(Number(v))} kg`, n === 'kg' ? 'Día' : 'Media 7 d']} />
                <Line type="monotone" dataKey="kg" stroke="#63636b" strokeWidth={1.5} dot={{ r: 2, fill: '#63636b' }} isAnimationActive={false} />
                <Line type="monotone" dataKey="media" stroke={COLOR.acento} strokeWidth={2.5} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      <FuerzaVsPeso />
      <div className="tarjeta">
        <div className="mb-2 flex items-baseline justify-between">
          <div className="text-[11px] font-medium uppercase tracking-wider text-texto-3">Perímetros (cada 4 semanas)</div>
          <button type="button" className="text-xs text-acento" onClick={() => setMedidaAbierta(true)}>Agregar</button>
        </div>
        {medidas.length === 0 ? (
          <div className="text-sm text-texto-2">Cintura en el ombligo, brazo relajado, muslo medio. Misma hora, misma cinta.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-texto-3"><tr><th className="text-left font-medium">Fecha</th><th className="font-medium">Cintura</th><th className="font-medium">Brazo</th><th className="font-medium">Muslo</th><th className="font-medium">Pecho</th></tr></thead>
            <tbody>
              {[...medidas].reverse().map((m) => (
                <tr key={m.id}><td className="py-1 text-texto-2">{fechaCorta(m.fecha + 'T12:00:00')}</td><td className="text-center">{kg(m.cintura)}</td><td className="text-center">{kg(m.brazo)}</td><td className="text-center">{kg(m.muslo)}</td><td className="text-center">{kg(m.pecho)}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <PesoHoja abierta={pesoAbierto} onCerrar={() => setPesoAbierto(false)} inicial={pesos.find((p) => p.fecha === hoy)?.kg ?? pesos[pesos.length - 1]?.kg ?? 76} fecha={hoy} />
      <Hoja abierta={medidaAbierta} onCerrar={() => setMedidaAbierta(false)} titulo="Perímetros de hoy">
        <FormMedida onGuardar={async (m) => { await repo.guardarMedida({ fecha: hoy, ...m }); setMedidaAbierta(false) }} />
      </Hoja>
    </div>
  )
}

function FormMedida({ onGuardar }: { onGuardar: (m: { cintura: number | null; brazo: number | null; muslo: number | null; pecho: number | null }) => void }) {
  const [v, setV] = useState({ cintura: '', brazo: '', muslo: '', pecho: '' })
  const num = (s: string) => (s.trim() ? Number(s.replace(',', '.')) : null)
  const campo = (k: keyof typeof v, t: string) => (
    <label className="block">
      <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-texto-3">{t} (cm)</div>
      <input inputMode="decimal" value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} className="h-12 w-full rounded-xl bg-superficie-2 px-3 text-base outline-none" />
    </label>
  )
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">{campo('cintura', 'Cintura')}{campo('brazo', 'Brazo')}{campo('muslo', 'Muslo')}{campo('pecho', 'Pecho')}</div>
      <button type="button" className="btn-grande" onClick={() => onGuardar({ cintura: num(v.cintura), brazo: num(v.brazo), muslo: num(v.muslo), pecho: num(v.pecho) })}>Guardar</button>
    </div>
  )
}
