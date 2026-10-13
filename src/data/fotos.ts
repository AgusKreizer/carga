import { db } from './db'
import type { AnguloFoto, Foto } from '../domain/types'
import { nuevoId } from '../lib/ids'

const LADO_MAX = 1080

/** Comprime la imagen a JPEG con lado mayor de 1080 px (≈150–300 KB) antes de guardarla. */
export async function comprimirImagen(archivo: File): Promise<Blob> {
  const bitmap = await createImageBitmap(archivo)
  const escala = Math.min(1, LADO_MAX / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * escala)
  canvas.height = Math.round(bitmap.height * escala)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('No se pudo comprimir la foto.'))), 'image/jpeg', 0.85))
}

export async function guardarFoto(fecha: string, angulo: AnguloFoto, archivo: File): Promise<Foto> {
  const blob = await comprimirImagen(archivo)
  const foto: Foto = { id: nuevoId(), fecha, angulo, blob, activo: true }
  await db.fotos.add(foto)
  return foto
}

export async function fotosActivas(): Promise<Foto[]> {
  return (await db.fotos.filter((f) => f.activo).toArray()).sort((a, b) => a.fecha.localeCompare(b.fecha))
}

export async function desactivarFoto(id: string): Promise<void> {
  await db.fotos.update(id, { activo: false })
}
