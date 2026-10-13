import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { MusculoId } from '../../domain/types'

/**
 * Cuerpo 3D procedural con malla suave (sin modelos externos): torso por revolución,
 * extremidades cónicas y vientres musculares como elipsoides, agrupados por músculo.
 * Se rota con el dedo y se toca un músculo para seleccionarlo. Mismos colores que el 2D.
 */
interface Props {
  colorDe: (m: MusculoId) => string
  seleccionado: MusculoId | null
  onTocar: (m: MusculoId) => void
  /** 0 = frente, Math.PI = espalda; se anima al cambiar */
  giro: number
}

const PIEL = 0x202026

export function Cuerpo3D({ colorDe, seleccionado, onTocar, giro }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const estado = useRef<{ objetivoGiro: number; pintar: () => void } | null>(null)
  const colorDeRef = useRef(colorDe)
  colorDeRef.current = colorDe
  const onTocarRef = useRef(onTocar)
  onTocarRef.current = onTocar
  const seleccionadoRef = useRef(seleccionado)
  seleccionadoRef.current = seleccionado

  useEffect(() => {
    const cont = ref.current
    if (!cont) return
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio))
    renderer.setSize(cont.clientWidth, cont.clientHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    cont.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(24, cont.clientWidth / cont.clientHeight, 0.1, 20)
    camera.position.set(0, 0.93, 4.7)
    camera.lookAt(0, 0.9, 0)

    scene.add(new THREE.HemisphereLight(0xffffff, 0x15151a, 0.9))
    const clave = new THREE.DirectionalLight(0xffffff, 1.6)
    clave.position.set(2.5, 4, 3)
    scene.add(clave)
    const relleno = new THREE.DirectionalLight(0x9cb4ff, 0.5)
    relleno.position.set(-3, 2, 1)
    scene.add(relleno)
    const contra = new THREE.DirectionalLight(0xffb020, 0.6)
    contra.position.set(0, 2, -4)
    scene.add(contra)

    const grupo = new THREE.Group()
    scene.add(grupo)
    const mallas = new Map<MusculoId, THREE.Mesh[]>()
    const tocables: THREE.Mesh[] = []

    const mat = (hex: number) => new THREE.MeshStandardMaterial({ color: hex, roughness: 0.62, metalness: 0.04 })
    const add = (geo: THREE.BufferGeometry, pos: [number, number, number], m: MusculoId | null, rot?: [number, number, number], esc?: [number, number, number]) => {
      const mesh = new THREE.Mesh(geo, mat(PIEL))
      mesh.position.set(...pos)
      if (rot) mesh.rotation.set(...rot)
      if (esc) mesh.scale.set(...esc)
      grupo.add(mesh)
      if (m) {
        mesh.userData.musculo = m
        ;(mallas.get(m) ?? mallas.set(m, []).get(m)!).push(mesh)
        tocables.push(mesh)
      }
      return mesh
    }
    const esfera = (r: number) => new THREE.SphereGeometry(r, 24, 18)
    const cono = (rTop: number, rBot: number, h: number) => new THREE.CylinderGeometry(rTop, rBot, h, 20, 1)
    const lathe = (perfil: [number, number][]) => new THREE.LatheGeometry(perfil.map(([r, y]) => new THREE.Vector2(r, y)), 28)

    // ---- Silueta (piel) ----
    // torso por revolución: (radio, altura) de la pelvis al cuello; se escala en z para aplanarlo
    const torso = add(lathe([[0.12, 0.84], [0.17, 0.9], [0.19, 0.98], [0.17, 1.08], [0.165, 1.18], [0.19, 1.3], [0.22, 1.4], [0.2, 1.48], [0.09, 1.52], [0.07, 1.56]]), [0, 0, 0], null)
    torso.scale.set(1, 1, 0.62)
    add(cono(0.055, 0.065, 0.1), [0, 1.6, 0], null)
    const cabeza = add(esfera(0.115), [0, 1.74, 0], null)
    cabeza.scale.set(0.92, 1.12, 0.98)
    for (const s of [-1, 1]) {
      // hombro + brazo + antebrazo + mano
      add(cono(0.052, 0.045, 0.3), [s * 0.285, 1.26, 0], null, [0, 0, s * 0.12])
      add(esfera(0.047), [s * 0.3, 1.1, 0], null) // codo
      add(cono(0.044, 0.034, 0.27), [s * 0.31, 0.96, 0.01], null, [0.08, 0, s * 0.05])
      add(esfera(0.04), [s * 0.315, 0.81, 0.02], null, undefined, [1, 1.3, 0.7]) // mano
      // pierna
      add(cono(0.095, 0.075, 0.42), [s * 0.1, 0.63, 0], null, [0, 0, s * -0.03])
      add(esfera(0.075), [s * 0.105, 0.41, 0], null) // rodilla
      add(cono(0.066, 0.045, 0.36), [s * 0.11, 0.22, 0], null)
      add(esfera(0.05), [s * 0.11, 0.035, 0.06], null, undefined, [1, 0.7, 2]) // pie
    }

    // ---- Músculos (vientres sobre la piel) ----
    for (const s of [-1, 1]) {
      add(esfera(0.09), [s * 0.095, 1.35, 0.1], 'pecho', [0.2, 0, s * -0.25], [1.1, 0.7, 0.5])
      add(esfera(0.072), [s * 0.265, 1.44, 0.01], 'deltLat', undefined, [1, 1.05, 0.9])
      add(esfera(0.06), [s * 0.25, 1.42, -0.085], 'deltPost', undefined, [1, 1.1, 0.7])
      add(esfera(0.052), [s * 0.29, 1.24, 0.04], 'biceps', [0, 0, s * 0.12], [0.9, 2.2, 0.8])
      add(esfera(0.05), [s * 0.29, 1.25, -0.045], 'triceps', [0, 0, s * 0.12], [0.9, 2.3, 0.8])
      add(esfera(0.044), [s * 0.315, 0.98, 0.0], 'antebrazo', [0.08, 0, s * 0.05], [0.95, 2.7, 0.85])
      add(esfera(0.1), [s * 0.1, 0.9, -0.1], 'gluteos', undefined, [1.05, 0.95, 0.85])
      add(esfera(0.085), [s * 0.1, 0.64, 0.055], 'cuads', [0, 0, s * -0.03], [1, 2.4, 0.75])
      add(esfera(0.075), [s * 0.1, 0.64, -0.065], 'isquios', [0, 0, s * -0.03], [1, 2.3, 0.7])
      add(esfera(0.06), [s * 0.11, 0.26, -0.055], 'gemelos', undefined, [1, 1.9, 0.75])
    }
    add(esfera(0.1), [0, 1.1, 0.1], 'abs', undefined, [1.05, 1.55, 0.45])
    add(esfera(0.17), [0, 1.26, -0.09], 'espalda', undefined, [1.25, 1.35, 0.4])
    add(esfera(0.1), [0, 1.5, -0.03], 'espalda', undefined, [1.7, 0.42, 0.7]) // trapecio

    // piso
    const sombra = new THREE.Mesh(new THREE.CircleGeometry(0.42, 32), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4 }))
    sombra.rotation.x = -Math.PI / 2
    sombra.position.y = -0.005
    grupo.add(sombra)

    const pintar = () => {
      const sel = seleccionadoRef.current
      for (const [m, ms] of mallas) {
        const c = new THREE.Color(colorDeRef.current(m))
        for (const mesh of ms) {
          const mt = mesh.material as THREE.MeshStandardMaterial
          mt.color.copy(c)
          mt.emissive.set(sel === m ? 0x3a3a3a : 0x000000)
          mt.transparent = !!sel
          mt.opacity = sel && sel !== m ? 0.55 : 1
        }
      }
    }
    const st = { objetivoGiro: giro, pintar }
    estado.current = st
    pintar()

    // interacción
    let arrastrando = false
    let x0 = 0
    let movido = 0
    let giroInicial = 0
    let giroActual = giro
    const el = renderer.domElement
    el.style.touchAction = 'pan-y'
    const onDown = (e: PointerEvent) => { arrastrando = true; x0 = e.clientX; movido = 0; giroInicial = st.objetivoGiro; el.setPointerCapture(e.pointerId) }
    const onMove = (e: PointerEvent) => {
      if (!arrastrando) return
      const dx = e.clientX - x0
      movido = Math.max(movido, Math.abs(dx))
      st.objetivoGiro = giroInicial + dx * 0.012
      giroActual = st.objetivoGiro
    }
    const raycaster = new THREE.Raycaster()
    const onUp = (e: PointerEvent) => {
      arrastrando = false
      if (movido > 6) return
      const r = el.getBoundingClientRect()
      raycaster.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera)
      const hit = raycaster.intersectObjects(tocables, false)[0]
      if (hit) onTocarRef.current(hit.object.userData.musculo as MusculoId)
    }
    const onCancel = () => { arrastrando = false }
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onCancel)

    let vivo = true
    let ultimo = performance.now()
    const loop = (t: number) => {
      if (!vivo) return
      const dt = Math.min(0.05, (t - ultimo) / 1000)
      ultimo = t
      giroActual += (st.objetivoGiro - giroActual) * Math.min(1, dt * 8)
      grupo.rotation.y = giroActual
      renderer.render(scene, camera)
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)

    const ro = new ResizeObserver(() => {
      renderer.setSize(cont.clientWidth, cont.clientHeight)
      camera.aspect = cont.clientWidth / cont.clientHeight
      camera.updateProjectionMatrix()
    })
    ro.observe(cont)

    return () => {
      vivo = false
      ro.disconnect()
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onCancel)
      grupo.traverse((o) => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); (o.material as THREE.Material).dispose() } })
      renderer.dispose()
      cont.removeChild(el)
      estado.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { estado.current?.pintar() }, [colorDe, seleccionado])
  useEffect(() => { if (estado.current) estado.current.objetivoGiro = giro }, [giro])

  return <div ref={ref} className="h-80 w-full" aria-label="cuerpo 3D" />
}

export default Cuerpo3D
