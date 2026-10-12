/** 80 → "80", 82.5 → "82,5" */
export function kg(n: number | null | undefined): string {
  if (n == null) return '—'
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace('.', ',')
}

export function redondearA(n: number, paso: number): number {
  if (paso <= 0) return n
  return Math.round(n / paso) * paso
}

export function rirTexto(rir: number | null): string {
  if (rir == null) return '—'
  if (rir === 0) return 'Fallo'
  if (rir >= 4) return '4+'
  return String(rir)
}

export function plural(n: number, uno: string, varios: string): string {
  return `${n} ${n === 1 ? uno : varios}`
}
