import type { SupabaseClient } from '@supabase/supabase-js'
import * as repo from './repo'
import { exportarTodo, restaurarTodo, validarRespaldo, type Respaldo } from './exportar'
import { ahoraISO } from '../lib/fechas'
import { esNativa, REDIRECT_NATIVO, tokensDeUrl } from '../lib/nativo'

let cliente: SupabaseClient | null = null
let clienteUrl = ''

/** Cliente según los ajustes guardados. null si no está configurado. */
export async function clienteSupabase(): Promise<SupabaseClient | null> {
  const a = await repo.ajustes()
  if (!a.supabaseUrl || !a.supabaseAnonKey) return null
  if (!cliente || clienteUrl !== a.supabaseUrl) {
    const { createClient } = await import('@supabase/supabase-js')
    cliente = createClient(a.supabaseUrl, a.supabaseAnonKey)
    clienteUrl = a.supabaseUrl
  }
  return cliente
}

export async function usuarioActual(): Promise<{ id: string; email: string | null } | null> {
  const sb = await clienteSupabase()
  if (!sb) return null
  const { data } = await sb.auth.getUser()
  return data.user ? { id: data.user.id, email: data.user.email ?? null } : null
}

export async function enviarMagicLink(email: string): Promise<void> {
  const sb = await clienteSupabase()
  if (!sb) throw new Error('Supabase no está configurado.')
  const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: esNativa() ? REDIRECT_NATIVO : window.location.origin } })
  if (error) throw error
}

export async function cerrarSesionNube(): Promise<void> {
  const sb = await clienteSupabase()
  await sb?.auth.signOut()
}

/** En la app nativa, el magic link vuelve por deep link: se toma la sesión de la URL. */
export async function sesionDesdeUrl(url: string): Promise<boolean> {
  const t = tokensDeUrl(url)
  const sb = await clienteSupabase()
  if (!t || !sb) return false
  const { error } = await sb.auth.setSession(t)
  return !error
}

/** Sube el respaldo completo (una fila por usuario, last-write-wins). */
export async function subirBackup(): Promise<void> {
  const sb = await clienteSupabase()
  const u = await usuarioActual()
  if (!sb || !u) throw new Error('No hay sesión en la nube.')
  const respaldo = await exportarTodo()
  const { error } = await sb.from('user_data').upsert({ user_id: u.id, data: respaldo, updated_at: ahoraISO() })
  if (error) throw error
  await repo.guardarAjustes({ ultimoBackup: ahoraISO() })
}

export async function bajarBackup(): Promise<Respaldo | null> {
  const sb = await clienteSupabase()
  const u = await usuarioActual()
  if (!sb || !u) throw new Error('No hay sesión en la nube.')
  const { data, error } = await sb.from('user_data').select('data, updated_at').eq('user_id', u.id).maybeSingle()
  if (error) throw error
  if (!data || !validarRespaldo(data.data)) return null
  return data.data
}

export async function restaurarDesdeNube(): Promise<boolean> {
  const r = await bajarBackup()
  if (!r) return false
  await restaurarTodo(r)
  return true
}

/** Backup silencioso si hay configuración y sesión. Nunca lanza. */
export async function respaldarSiCorresponde(): Promise<void> {
  try {
    const u = await usuarioActual()
    if (!u) return
    await subirBackup()
  } catch {
    /* sin red o sin sesión: se reintenta en la próxima */
  }
}
