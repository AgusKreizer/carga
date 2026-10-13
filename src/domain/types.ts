// Modelo de dominio. Nada se borra: todo registro tiene `activo` y se desactiva con flag.

export type MusculoId =
  | 'pecho' | 'espalda' | 'deltLat' | 'deltPost' | 'deltAnt'
  | 'biceps' | 'triceps' | 'cuads' | 'isquios' | 'gluteos'
  | 'gemelos' | 'abs' | 'antebrazo'

export const MUSCULOS: Record<MusculoId, string> = {
  pecho: 'Pecho',
  espalda: 'Espalda',
  deltLat: 'Deltoide lateral',
  deltPost: 'Deltoide posterior',
  deltAnt: 'Deltoide anterior',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  cuads: 'Cuádriceps',
  isquios: 'Isquios',
  gluteos: 'Glúteos',
  gemelos: 'Gemelos',
  abs: 'Abdomen',
  antebrazo: 'Antebrazo',
}

export type Equipo = 'barra' | 'mancuerna' | 'maquina' | 'polea' | 'smith' | 'peso-corporal'

export type Patron =
  | 'empuje-horizontal' | 'empuje-vertical' | 'tiron-vertical' | 'tiron-horizontal'
  | 'aislamiento-pecho' | 'aislamiento-hombro' | 'biceps' | 'triceps'
  | 'rodilla-dominante' | 'cadera-dominante' | 'isquios-aislado' | 'cuads-aislado'
  | 'gluteos-aislado' | 'gemelos' | 'abs'

export type Molestia = 'hombro' | 'muneca' | 'lumbar' | 'rodilla' | 'codo'

export interface Ejercicio {
  id: string
  nombre: string
  patron: Patron
  /** músculo → factor de serie (1 directa, 0.5 indirecta) */
  musculos: Partial<Record<MusculoId, number>>
  equipo: Equipo
  repsMin: number
  repsMax: number
  rir: number
  descansoSeg: number
  evitarSi: Molestia[]
  nota: string
  porQue: string
  /** incremento mínimo de carga en kg para este equipo */
  incremento: number
  custom: boolean
  activo: boolean
  actualizado: string
}

export interface Programa {
  id: string
  nombre: string
  descripcion: string
  creado: string
  activo: boolean
}

export type EstadoBloque = 'pendiente' | 'activo' | 'cerrado'

export interface Bloque {
  id: string
  programaId: string
  nombre: string
  orden: number
  semanas: number
  /** número de semana (1-based) que es deload, o null */
  semanaDeload: number | null
  /** YYYY-MM-DD del lunes de la semana 1, o null si no arrancó */
  fechaInicio: string | null
  estado: EstadoBloque
  activo: boolean
}

export interface Dia {
  id: string
  bloqueId: string
  nombre: string
  orden: number
  opcional: boolean
  activo: boolean
}

export interface DiaEjercicio {
  id: string
  diaId: string
  ejercicioId: string
  orden: number
  series: number
  repsMin: number
  repsMax: number
  rir: number
  descansoSeg: number
  /** id de otro DiaEjercicio del mismo día con el que se alterna */
  superserieCon: string | null
  nota: string
  activo: boolean
}

export interface DiaEjercicioSnapshot extends DiaEjercicio {
  ejercicioNombre: string
}

export type EstadoSesion = 'activa' | 'terminada' | 'descartada'

export interface Sesion {
  id: string
  diaId: string
  diaNombre: string
  bloqueId: string
  semana: number
  esDeload: boolean
  fechaInicio: string
  fechaFin: string | null
  estado: EstadoSesion
  /** copia del día del plan al momento de iniciar */
  snapshot: DiaEjercicioSnapshot[]
  energia: number | null
  dolor: number | null
  sueno: number | null
  notas: string
  activo: boolean
}

export interface SerieLog {
  id: string
  sesionId: string
  diaEjercicioId: string
  /** ejercicio efectivamente realizado (puede diferir del plan si sustituyó) */
  ejercicioId: string
  /** ejercicio que decía el plan */
  ejercicioPlanId: string
  orden: number
  objetivoCarga: number | null
  objetivoReps: number | null
  rirObjetivo: number
  carga: number
  reps: number
  /** RIR real: nunca se prellena; null si el usuario no lo cargó */
  rir: number | null
  calentamiento: boolean
  ts: string
  activo: boolean
}

export interface PesoCorporal {
  id: string
  fecha: string
  kg: number
  activo: boolean
}

export interface Medida {
  id: string
  fecha: string
  cintura: number | null
  brazo: number | null
  muslo: number | null
  pecho: number | null
  activo: boolean
}

export type TipoCoachEvento =
  | 'subir-carga' | 'sumar-serie' | 'cambiar-ejercicio' | 'deload-anticipado'
  | 'revisar-recuperacion' | 'bajar-carga-por-pausa' | 'pr' | 'pedir-rir' | 'dolor'

export interface CoachEvento {
  id: string
  tipo: TipoCoachEvento
  ejercicioId: string | null
  diaEjercicioId: string | null
  mensaje: string
  razon: string
  fecha: string
  estado: 'pendiente' | 'aceptado' | 'ignorado' | 'informativo'
  payload: Record<string, unknown> | null
  activo: boolean
}

export interface Banda { min: number; max: number }

export interface Ajustes {
  id: 'global'
  nombre: string
  nivel: 'principiante' | 'intermedio'
  factorIndirecto: number
  bandas: Partial<Record<MusculoId, Banda>>
  prioridades: MusculoId[]
  objetivoPeso: 'estable' | 'subir' | 'bajar'
  minutosSesion: number
  onboardingHecho: boolean
  supabaseUrl: string
  supabaseAnonKey: string
  ultimoBackup: string | null
  /** calculadora de discos */
  pesoBarra: number
  pesoBarraSmith: number
  discos: number[]
}

/** Objetivo calculado por el motor para una serie de hoy */
export interface ObjetivoSerie {
  carga: number | null
  reps: number | null
}

export interface ObjetivoEjercicio {
  diaEjercicioId: string
  ejercicioId: string
  series: ObjetivoSerie[]
  rir: number
  /** una línea que explica por qué este objetivo */
  porQue: string
  /** true si el motor propone subir carga respecto de la última sesión */
  subeCarga: boolean
}
