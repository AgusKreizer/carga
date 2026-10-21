/**
 * Sonido de fin de descanso con Web Audio (sin archivos). iOS solo deja sonar audio si antes hubo
 * un toque del usuario: el contexto se "desbloquea" en el primer toque de la página y queda listo.
 */
let ctx: AudioContext | null = null

function contexto(): AudioContext | null {
  if (ctx) return ctx
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  ctx = new AC()
  return ctx
}

/** Llamar en un toque del usuario (pointerdown) para habilitar el audio en iPhone. */
export function desbloquearAudio(): void {
  const c = contexto()
  if (!c) return
  if (c.state === 'suspended') c.resume().catch(() => {})
  // un buffer mudo de 1 muestra "despierta" el audio en Safari
  const b = c.createBuffer(1, 1, 22050)
  const s = c.createBufferSource()
  s.buffer = b
  s.connect(c.destination)
  s.start(0)
}

function tono(c: AudioContext, inicio: number, frecuencia: number, duracion: number, volumen: number) {
  const osc = c.createOscillator()
  const gan = c.createGain()
  osc.type = 'sine'
  osc.frequency.value = frecuencia
  gan.gain.setValueAtTime(0.0001, inicio)
  gan.gain.exponentialRampToValueAtTime(volumen, inicio + 0.01)
  gan.gain.exponentialRampToValueAtTime(0.0001, inicio + duracion)
  osc.connect(gan).connect(c.destination)
  osc.start(inicio)
  osc.stop(inicio + duracion + 0.02)
}

/** Tres pitidos ascendentes y cortos: "a la barra". */
export function sonarFinDescanso(): void {
  const c = contexto()
  if (!c) return
  if (c.state === 'suspended') c.resume().catch(() => {})
  const t = c.currentTime + 0.02
  tono(c, t, 880, 0.14, 0.35)
  tono(c, t + 0.18, 880, 0.14, 0.35)
  tono(c, t + 0.36, 1320, 0.28, 0.4)
}

/** Pitido suave de aviso (quedan 3 segundos). */
export function sonarAviso(): void {
  const c = contexto()
  if (!c) return
  tono(c, c.currentTime + 0.02, 660, 0.08, 0.15)
}
