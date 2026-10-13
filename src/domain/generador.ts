import type { Bloque, Dia, DiaEjercicio, Ejercicio, Equipo, Molestia, MusculoId, Patron, Programa } from './types'
import { nuevoId } from '../lib/ids'

/**
 * Generador de rutinas por reglas (sin IA). Plantillas por días disponibles, slots por patrón,
 * ejercicios elegidos del catálogo según equipo y molestias, series ajustadas a los minutos.
 */
export interface PerfilGenerador {
  nivel: 'principiante' | 'intermedio'
  diasPorSemana: 3 | 4 | 5 | 6
  minutos: number
  equipo: Equipo[]
  molestias: Molestia[]
  prioridades: MusculoId[]
}

interface Slot {
  patron: Patron
  /** músculo que debe ser principal (factor 1) en el ejercicio elegido */
  musculo?: MusculoId
  series: number
  /** evita repetir un ejercicio ya usado en la semana si hay alternativa */
  variar?: boolean
}

interface PlantillaDia { nombre: string; opcional?: boolean; slots: Slot[] }

const TORSO_A: PlantillaDia = { nombre: 'Torso A', slots: [
  { patron: 'empuje-horizontal', musculo: 'pecho', series: 4 },
  { patron: 'tiron-vertical', musculo: 'espalda', series: 3 },
  { patron: 'empuje-horizontal', musculo: 'pecho', series: 3, variar: true },
  { patron: 'tiron-horizontal', musculo: 'espalda', series: 3 },
  { patron: 'aislamiento-hombro', musculo: 'deltLat', series: 3 },
  { patron: 'triceps', musculo: 'triceps', series: 2 },
  { patron: 'biceps', musculo: 'biceps', series: 2 },
] }
const TORSO_B: PlantillaDia = { nombre: 'Torso B', slots: [
  { patron: 'empuje-vertical', musculo: 'deltAnt', series: 3 },
  { patron: 'tiron-horizontal', musculo: 'espalda', series: 3, variar: true },
  { patron: 'tiron-vertical', musculo: 'espalda', series: 3, variar: true },
  { patron: 'aislamiento-pecho', musculo: 'pecho', series: 2 },
  { patron: 'aislamiento-hombro', musculo: 'deltLat', series: 3, variar: true },
  { patron: 'aislamiento-hombro', musculo: 'deltPost', series: 2 },
  { patron: 'biceps', musculo: 'biceps', series: 3, variar: true },
  { patron: 'triceps', musculo: 'triceps', series: 3, variar: true },
] }
const PIERNA_A: PlantillaDia = { nombre: 'Pierna A', slots: [
  { patron: 'rodilla-dominante', musculo: 'cuads', series: 4 },
  { patron: 'isquios-aislado', musculo: 'isquios', series: 3 },
  { patron: 'rodilla-dominante', musculo: 'cuads', series: 3, variar: true },
  { patron: 'cuads-aislado', musculo: 'cuads', series: 2 },
  { patron: 'gemelos', musculo: 'gemelos', series: 4 },
  { patron: 'abs', musculo: 'abs', series: 2 },
] }
const PIERNA_B: PlantillaDia = { nombre: 'Pierna B', slots: [
  { patron: 'cadera-dominante', musculo: 'isquios', series: 3 },
  { patron: 'cadera-dominante', musculo: 'gluteos', series: 3, variar: true },
  { patron: 'isquios-aislado', musculo: 'isquios', series: 3, variar: true },
  { patron: 'cuads-aislado', musculo: 'cuads', series: 3 },
  { patron: 'gemelos', musculo: 'gemelos', series: 3, variar: true },
  { patron: 'abs', musculo: 'abs', series: 2, variar: true },
] }
const BRAZOS: PlantillaDia = { nombre: 'Día 5 · Brazos y hombros', opcional: true, slots: [
  { patron: 'aislamiento-hombro', musculo: 'deltLat', series: 3 },
  { patron: 'tiron-horizontal', musculo: 'espalda', series: 3, variar: true },
  { patron: 'biceps', musculo: 'biceps', series: 3 },
  { patron: 'triceps', musculo: 'triceps', series: 3 },
  { patron: 'aislamiento-hombro', musculo: 'deltPost', series: 2 },
] }
const fullBody = (n: string, variante: 0 | 1 | 2): PlantillaDia => ({ nombre: n, slots: [
  { patron: 'rodilla-dominante', musculo: 'cuads', series: 3, variar: variante > 0 },
  { patron: variante === 1 ? 'empuje-vertical' : 'empuje-horizontal', musculo: variante === 1 ? 'deltAnt' : 'pecho', series: 3, variar: variante === 2 },
  { patron: variante === 1 ? 'tiron-vertical' : 'tiron-horizontal', musculo: 'espalda', series: 3, variar: variante === 2 },
  { patron: variante === 2 ? 'cadera-dominante' : 'isquios-aislado', musculo: 'isquios', series: 2 },
  { patron: 'aislamiento-hombro', musculo: variante === 2 ? 'deltPost' : 'deltLat', series: 2 },
  { patron: variante === 1 ? 'triceps' : 'biceps', musculo: variante === 1 ? 'triceps' : 'biceps', series: 2 },
  { patron: variante === 0 ? 'gemelos' : 'abs', musculo: variante === 0 ? 'gemelos' : 'abs', series: 2 },
] })
const EMPUJE: PlantillaDia = { nombre: 'Empuje', slots: [
  { patron: 'empuje-horizontal', musculo: 'pecho', series: 4 },
  { patron: 'empuje-vertical', musculo: 'deltAnt', series: 3 },
  { patron: 'empuje-horizontal', musculo: 'pecho', series: 3, variar: true },
  { patron: 'aislamiento-hombro', musculo: 'deltLat', series: 3 },
  { patron: 'triceps', musculo: 'triceps', series: 3 },
] }
const TIRON: PlantillaDia = { nombre: 'Tirón', slots: [
  { patron: 'tiron-vertical', musculo: 'espalda', series: 4 },
  { patron: 'tiron-horizontal', musculo: 'espalda', series: 3 },
  { patron: 'aislamiento-hombro', musculo: 'deltPost', series: 3 },
  { patron: 'biceps', musculo: 'biceps', series: 3 },
  { patron: 'biceps', musculo: 'biceps', series: 2, variar: true },
] }
const PIERNAS: PlantillaDia = { nombre: 'Piernas', slots: [
  { patron: 'rodilla-dominante', musculo: 'cuads', series: 4 },
  { patron: 'cadera-dominante', musculo: 'isquios', series: 3 },
  { patron: 'isquios-aislado', musculo: 'isquios', series: 3 },
  { patron: 'cuads-aislado', musculo: 'cuads', series: 2 },
  { patron: 'gemelos', musculo: 'gemelos', series: 3 },
  { patron: 'abs', musculo: 'abs', series: 2 },
] }

export function plantillaPara(dias: PerfilGenerador['diasPorSemana']): { nombre: string; descripcion: string; dias: PlantillaDia[] } {
  switch (dias) {
    case 3: return { nombre: 'Full body 3 días', descripcion: 'Todo el cuerpo cada sesión, tres variantes que rotan.', dias: [fullBody('Full body A', 0), fullBody('Full body B', 1), fullBody('Full body C', 2)] }
    case 4: return { nombre: 'Torso / Pierna 4 días', descripcion: 'Cada músculo 2× por semana.', dias: [TORSO_A, PIERNA_A, TORSO_B, PIERNA_B] }
    case 5: return { nombre: 'Torso / Pierna 4+1', descripcion: 'Cada músculo 2× por semana, día 5 opcional de brazos y hombros.', dias: [TORSO_A, PIERNA_A, TORSO_B, PIERNA_B, BRAZOS] }
    case 6: return { nombre: 'Empuje / Tirón / Piernas ×2', descripcion: 'Cada músculo 2× por semana en seis sesiones cortas.', dias: [EMPUJE, TIRON, PIERNAS, { ...EMPUJE, nombre: 'Empuje B' }, { ...TIRON, nombre: 'Tirón B' }, { ...PIERNAS, nombre: 'Piernas B' }] }
  }
}

export interface RutinaGenerada {
  programa: Programa
  bloque: Bloque
  dias: Dia[]
  lineas: DiaEjercicio[]
  avisos: string[]
}

const ORDEN_EQUIPO: Record<'principiante' | 'intermedio', Equipo[]> = {
  principiante: ['maquina', 'polea', 'smith', 'mancuerna', 'barra', 'peso-corporal'],
  intermedio: ['barra', 'mancuerna', 'maquina', 'smith', 'polea', 'peso-corporal'],
}

export function generarRutina(perfil: PerfilGenerador, catalogo: Ejercicio[], ahora: string): RutinaGenerada {
  const plantilla = plantillaPara(perfil.diasPorSemana)
  const avisos: string[] = []
  const equipo = new Set<Equipo>([...perfil.equipo, 'peso-corporal'])
  const molestias = new Set(perfil.molestias)
  const usoSemanal = new Map<string, number>()
  const rank = ORDEN_EQUIPO[perfil.nivel]

  const elegir = (slot: Slot, usadosHoy: Set<string>): Ejercicio | null => {
    const candidatos = catalogo.filter((e) =>
      e.activo && e.patron === slot.patron && equipo.has(e.equipo) && !e.evitarSi.some((m) => molestias.has(m)) &&
      (!slot.musculo || (e.musculos[slot.musculo] ?? 0) >= 1) && !usadosHoy.has(e.id),
    )
    if (!candidatos.length) return null
    candidatos.sort((a, b) => {
      const ua = usoSemanal.get(a.id) ?? 0
      const ub = usoSemanal.get(b.id) ?? 0
      if (slot.variar && ua !== ub) return ua - ub
      return rank.indexOf(a.equipo) - rank.indexOf(b.equipo)
    })
    return candidatos[0]
  }

  const programa: Programa = { id: nuevoId(), nombre: plantilla.nombre, descripcion: plantilla.descripcion, creado: ahora, activo: true }
  const bloque: Bloque = { id: nuevoId(), programaId: programa.id, nombre: 'Bloque 1', orden: 1, semanas: 6, semanaDeload: 6, fechaInicio: null, estado: 'activo', activo: true }
  const dias: Dia[] = []
  const lineas: DiaEjercicio[] = []

  plantilla.dias.forEach((pd, di) => {
    const dia: Dia = { id: nuevoId(), bloqueId: bloque.id, nombre: pd.nombre, orden: di + 1, opcional: !!pd.opcional, activo: true }
    dias.push(dia)
    const usadosHoy = new Set<string>()
    const lineasDia: DiaEjercicio[] = []
    for (const slot of pd.slots) {
      const ej = elegir(slot, usadosHoy)
      if (!ej) { avisos.push(`${pd.nombre}: sin ejercicio para ${slot.patron} con tu equipo y molestias.`); continue }
      usadosHoy.add(ej.id)
      usoSemanal.set(ej.id, (usoSemanal.get(ej.id) ?? 0) + 1)
      const prioritario = slot.musculo && perfil.prioridades.includes(slot.musculo) && slot.series <= 3
      lineasDia.push({
        id: nuevoId(), diaId: dia.id, ejercicioId: ej.id, orden: lineasDia.length + 1,
        series: slot.series + (prioritario ? 1 : 0), repsMin: ej.repsMin, repsMax: ej.repsMax, rir: ej.rir,
        descansoSeg: ej.descansoSeg, superserieCon: null, nota: '', activo: true,
      })
    }
    // ajuste al tiempo disponible: recorta series de aislamientos desde el final
    const minutos = (ls: DiaEjercicio[]) => Math.round(6 + ls.reduce((a, l) => a + l.series * (40 + l.descansoSeg), 0) / 60)
    let guardia = 20
    while (minutos(lineasDia) > perfil.minutos && guardia-- > 0) {
      const candidata = [...lineasDia].reverse().find((l) => l.series > 2 && (l.descansoSeg <= 90))
        ?? [...lineasDia].reverse().find((l) => l.series > 2)
      if (!candidata) break
      candidata.series--
    }
    if (minutos(lineasDia) > perfil.minutos + 10) avisos.push(`${pd.nombre} queda en ~${minutos(lineasDia)} min: más que tus ${perfil.minutos}. Podés quitar un ejercicio en Plan.`)
    lineas.push(...lineasDia)
  })

  return { programa, bloque, dias, lineas, avisos }
}
