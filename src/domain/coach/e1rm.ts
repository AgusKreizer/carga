/**
 * 1RM estimado (Epley) ajustado por RIR: las reps "efectivas" son reps + RIR.
 * Poco confiable por encima de ~12 reps efectivas; se marca con `confiable`.
 */
export function e1rm(carga: number, reps: number, rir: number | null): { valor: number; confiable: boolean } {
  const efectivas = reps + (rir ?? 0)
  if (carga <= 0 || efectivas <= 0) return { valor: 0, confiable: false }
  const valor = efectivas === 1 ? carga : carga * (1 + efectivas / 30)
  return { valor: Math.round(valor * 10) / 10, confiable: efectivas <= 12 }
}

/** Mejor e1RM de una lista de series (ignora calentamientos). */
export function mejorE1rm(series: { carga: number; reps: number; rir: number | null; calentamiento?: boolean }[]) {
  let mejor = 0
  for (const s of series) {
    if (s.calentamiento) continue
    const v = e1rm(s.carga, s.reps, s.rir).valor
    if (v > mejor) mejor = v
  }
  return mejor
}
