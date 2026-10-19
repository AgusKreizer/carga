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

/**
 * Cuenta con mail y contraseña: funciona igual en la web, en la app de la pantalla de inicio del iPhone
 * y en la nativa. La confirmación del mail (si el proyecto la pide) se resuelve en el servidor, así que
 * el link puede abrirse en cualquier navegador.
 */
export async function crearCuenta(email: string, clave: string): Promise<'conectado' | 'confirmar'> {
  const sb = await clienteSupabase()
  if (!sb) throw new Error('Supabase no está configurado.')
  const { data, error } = await sb.auth.signUp({ email: email.trim(), password: clave, options: { emailRedirectTo: 'https://aguskreizer.github.io/carga/' } })
  if (error) throw new Error(traducir(error.message))
  // Supabase no avisa si el mail ya existe: devuelve un usuario sin identidades y no manda nada.
  if (data.user && (data.user.identities?.length ?? 0) === 0) throw new Error('Ese mail ya tiene cuenta. Si no tenés contraseña o no te la acordás, tocá "Crear o recuperar contraseña".')
  return data.session ? 'conectado' : 'confirmar'
}

const URL_APP = 'https://aguskreizer.github.io/carga/'

/** Mail para definir o recuperar la contraseña. El link abre la web, donde se elige la nueva. */
export async function enviarRecuperacion(email: string): Promise<void> {
  const sb = await clienteSupabase()
  if (!sb) throw new Error('Supabase no está configurado.')
  const { error } = await sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: URL_APP })
  if (error) throw new Error(/rate limit|security purposes/i.test(error.message) ? 'Ya se mandó un mail hace poco. Esperá unos minutos y revisá spam.' : error.message)
}

/** Si la página se abrió desde el mail de recuperación, deja la sesión lista para cambiar la contraseña. */
export async function esRecuperacion(): Promise<boolean> {
  if (!/type=recovery/.test(location.hash)) return false
  const sb = await clienteSupabase()
  if (!sb) return false
  await sb.auth.getSession() // procesa el hash de la URL
  return true
}

export async function definirClave(clave: string): Promise<void> {
  const sb = await clienteSupabase()
  if (!sb) throw new Error('Supabase no está configurado.')
  const { error } = await sb.auth.updateUser({ password: clave })
  if (error) throw new Error(traducir(error.message))
}

export async function entrar(email: string, clave: string): Promise<void> {
  const sb = await clienteSupabase()
  if (!sb) throw new Error('Supabase no está configurado.')
  const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password: clave })
  if (error) throw new Error(traducir(error.message))
}

function traducir(m: string): string {
  if (/invalid login credentials/i.test(m)) return 'Mail o contraseña incorrectos.'
  if (/email not confirmed/i.test(m)) return 'Falta confirmar el mail: abrí el link que te llegó y volvé a tocar Entrar.'
  if (/already registered/i.test(m)) return 'Ese mail ya tiene cuenta: tocá Entrar.'
  if (/at least 6/i.test(m)) return 'La contraseña tiene que tener al menos 6 caracteres.'
  return m
}

/**
 * Login con el código de 6 dígitos del mail. Es el camino que funciona en iPhone con la app en la
 * pantalla de inicio: el link abriría Safari, que tiene otro almacenamiento que la app instalada.
 */
export async function verificarCodigo(email: string, codigo: string): Promise<void> {
  const sb = await clienteSupabase()
  if (!sb) throw new Error('Supabase no está configurado.')
  const { error } = await sb.auth.verifyOtp({ email: email.trim(), token: codigo.trim(), type: 'email' })
  if (error) throw new Error(error.message.includes('expired') || error.message.includes('invalid') ? 'Código vencido o incorrecto. Pedí uno nuevo.' : error.message)
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
  const terminadas = (respaldo.tablas.sesiones as { estado?: string }[]).filter((x) => x.estado === 'terminada').length
  if (terminadas === 0) throw new Error('Este dispositivo no tiene sesiones guardadas: no se sube nada para no pisar tu respaldo.')
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
