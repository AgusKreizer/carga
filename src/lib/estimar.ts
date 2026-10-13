/** Minutos estimados de una sesión: ~40 s por serie de ejecución + descanso, más 6 min de calentamiento. */
export function estimarMinutos(lineas: { series: number; descanso: number }[]): number {
  const seg = lineas.reduce((a, l) => a + l.series * (40 + l.descanso), 0)
  return Math.round(6 + seg / 60)
}
