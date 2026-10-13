/** Discos por lado para una carga total, con greedy sobre los discos disponibles. */
export function discosPorLado(carga: number, barra: number, discos: number[]): { porLado: number[]; alcanzado: number; diferencia: number } {
  const objetivo = Math.max(0, (carga - barra) / 2)
  const orden = [...discos].sort((a, b) => b - a)
  const porLado: number[] = []
  let resto = objetivo
  for (const d of orden) {
    while (resto + 1e-9 >= d) {
      porLado.push(d)
      resto -= d
    }
  }
  const alcanzado = barra + 2 * porLado.reduce((a, b) => a + b, 0)
  return { porLado, alcanzado, diferencia: Math.round((carga - alcanzado) * 100) / 100 }
}
