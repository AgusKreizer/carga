import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import * as repo from '../data/repo'
import type { Ejercicio } from '../domain/types'

export function useEjercicios(): Ejercicio[] {
  return useLiveQuery(() => db.ejercicios.filter((e) => e.activo).toArray(), []) ?? []
}

export function useMapaEjercicios(): Map<string, Ejercicio> {
  const lista = useLiveQuery(() => db.ejercicios.toArray(), []) ?? []
  return useMemo(() => new Map(lista.map((e) => [e.id, e])), [lista])
}

export const usePlan = () => useLiveQuery(() => repo.planActivo(), [])
export const useAjustes = () => useLiveQuery(() => repo.ajustes(), [])
export const useSesionActiva = () => useLiveQuery(() => repo.sesionActiva(), [])
export const useSeriesDeSesion = (sesionId: string | undefined) =>
  useLiveQuery(() => (sesionId ? repo.seriesDeSesion(sesionId) : Promise.resolve([])), [sesionId]) ?? []
export const useEventosPendientes = () => useLiveQuery(() => repo.eventosPendientes(), []) ?? []
export const useSesionesTerminadas = (limite = 50) => useLiveQuery(() => repo.sesionesTerminadas(limite), [limite]) ?? []
export const usePesos = () => useLiveQuery(() => repo.pesos(), []) ?? []
export const useMedidas = () => useLiveQuery(() => repo.medidas(), []) ?? []
export const useTodasLasSeries = () =>
  useLiveQuery(() => db.series.filter((s) => s.activo && !s.calentamiento).toArray(), []) ?? []
