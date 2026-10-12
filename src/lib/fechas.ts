const pad = (n: number) => String(n).padStart(2, '0')

/** YYYY-MM-DD en hora local */
export function fechaLocal(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const ahoraISO = () => new Date().toISOString()

/** Lunes de la semana de `fecha` (YYYY-MM-DD), en local. */
export function lunesDe(fecha: string): string {
  const d = deFecha(fecha)
  const dia = (d.getDay() + 6) % 7 // lunes = 0
  d.setDate(d.getDate() - dia)
  return fechaLocal(d)
}

export function deFecha(fecha: string): Date {
  const [y, m, d] = fecha.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function sumarDias(fecha: string, n: number): string {
  const d = deFecha(fecha)
  d.setDate(d.getDate() + n)
  return fechaLocal(d)
}

export function diasEntre(a: string, b: string): number {
  return Math.round((deFecha(b).getTime() - deFecha(a).getTime()) / 86_400_000)
}

/** Número de semana (1-based) del bloque para una fecha, dado el lunes de inicio. */
export function semanaDelBloque(fechaInicio: string, fecha: string): number {
  return Math.floor(diasEntre(fechaInicio, fecha) / 7) + 1
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const DIAS_SEM = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']

export function fechaCorta(iso: string): string {
  const d = new Date(iso)
  return `${d.getDate()} ${MESES[d.getMonth()]}`
}

export function fechaConDia(iso: string): string {
  const d = new Date(iso)
  return `${DIAS_SEM[d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()]}`
}

export function haceCuanto(iso: string, ahora = new Date()): string {
  const dias = Math.floor((ahora.getTime() - new Date(iso).getTime()) / 86_400_000)
  if (dias <= 0) return 'hoy'
  if (dias === 1) return 'ayer'
  if (dias < 7) return `hace ${dias} días`
  if (dias < 14) return 'hace 1 semana'
  return `hace ${Math.floor(dias / 7)} semanas`
}

export function duracion(seg: number): string {
  const m = Math.floor(seg / 60)
  const s = seg % 60
  return `${m}:${pad(s)}`
}
