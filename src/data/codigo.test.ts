import { describe, expect, it } from 'vitest'
import { generarCodigo, normalizarCodigo } from './backup-supabase'

describe('código de respaldo', () => {
  it('genera 4 grupos de 4 sin caracteres ambiguos', () => {
    const c = generarCodigo()
    expect(c).toMatch(/^[A-HJ-KM-NP-Z2-9]{4}(-[A-HJ-KM-NP-Z2-9]{4}){3}$/)
  })
  it('normaliza minúsculas, espacios y guiones', () => {
    expect(normalizarCodigo('abcd efgh-jkmn pqrs')).toBe('ABCD-EFGH-JKMN-PQRS')
    expect(normalizarCodigo('abc')).toBe('')
  })
})
