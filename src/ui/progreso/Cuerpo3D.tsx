import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { MusculoId } from '../../domain/types'

/**
 * Cuerpo low-poly procedural (sin modelos externos): primitivas agrupadas por músculo.
 * Se rota con el dedo, se toca un músculo para seleccionarlo. Mismo esquema de colores que el 2D.
 */
interface Props {
  colorDe: (m: MusculoId) => string
  seleccionado: MusculoId | null
  onTocar: (m: MusculoId) => void
  /** 0 = frente, Math.PI = espalda; se anima al cambiar */
  giro: number
}

const NEUTRO = 0x1c1c21
const BORDE = 0x26262c

export function Cuerpo3D({ colorDe, seleccionado, onTocar, giro }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const estado = useRef<{
    mallas: Map<MusculoId, THREE.Mesh[]>
    grupo: THREE.Group
    objetivoGiro: number
    renderer: THREE.WebGLRenderer
    pintar: () => void
  } | null>(null)
  const colorDeRef = useRef(colorDe)
  colorDeRef.current = colorDe
  const onTocarRef = useRef(onTocar)
  onTocarRef.current = onTocar

  useEffect(() => {
    const cont = ref.current
    if (!cont) return
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio))
    renderer.setSize(cont.clientWidth, cont.clientHeight)
    cont.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(26, cont.clientWidth / cont.clientHeight, 0.1, 20)
    camera.position.set(0, 0.92, 3.6)
    camera.lookAt(0, 0.88, 0)

    scene.add(new THREE.HemisphereLight(0xffffff, 0x222228, 1.1))
    const luz = new THREE.DirectionalLight(0xffffff, 1.4)
    luz.position.set(2, 4, 3)
    scene.add(luz)
    const luz2 = new THREE.DirectionalLight(0xffb020, 0.25)
    luz2.position.set(-3, 1, -2)
    scene.add(luz2)

    const grupo = new THREE.Group()
    scene.add(grupo)
    const mallas = new Map<MusculoId, THREE.Mesh[]>()
    const todas: THREE.Mesh[] = []

    const mat = (hex: number | string) => new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), flatShading: true, roughness: 0.75, metalness: 0.05 })
    const add = (geo: THREE.BufferGeometry, pos: [number, number, number], m: MusculoId | null, rot?: [number, number, number], escala?: [number, number, number]) => {
      const mesh = new THREE.Mesh(geo, mat(NEUTRO))
      mesh.position.set(...pos)
      if (rot) mesh.rotation.set(...rot)
      if (escala) mesh.scale.set(...escala)
      grupo.add(mesh)
      if (m) {
        mesh.userData.musculo = m
        ;(mallas.get(m) ?? mallas.set(m, []).get(m)!).push(mesh)
        todas.push(mesh)
      }
      return mesh
    }
    const esfera = (r: number, seg = 10) => new THREE.SphereGeometry(r, seg, Math.max(6, seg - 2))
    const capsula = (r: number, l: number) => new THREE.CapsuleGeometry(r, l, 3, 8)
    const caja = (x: number, y: number, z: number) => new THREE.BoxGeometry(x, y, z)

    // Silueta neutra
    add(esfera(0.12, 12), [0, 1.64, 0], null)
    add(new THREE.CylinderGeometry(0.05, 0.06, 0.1, 8), [0, 1.5, 0], null)
    add(caja(0.42, 0.5, 0.2), [0, 1.22, 0], null)
    add(caja(0.34, 0.2, 0.2), [0, 0.92, 0], null)
    for (const s of [-1, 1]) {
      add(esfera(0.045, 8), [s * 0.31, 0.84, 0], null) // mano
      add(esfera(0.085, 8), [s * 0.1, 0.42, 0], null) // rodilla
      add(caja(0.1, 0.08, 0.22), [s * 0.1, 0.04, 0.04], null) // pie
      add(capsula(0.045, 0.26), [s * 0.1, 0.22, 0.03], null) // tibia
    }

    // Músculos
    for (const s of [-1, 1]) {
      add(esfera(0.11, 10), [s * 0.11, 1.33, 0.09], 'pecho', undefined, [1, 0.8, 0.55])
      add(esfera(0.08, 10), [s * 0.245, 1.44, 0.02], 'deltLat')
      add(esfera(0.055, 8), [s * 0.235, 1.43, -0.08], 'deltPost')
      add(capsula(0.047, 0.2), [s * 0.275, 1.22, 0.045], 'biceps')
      add(capsula(0.047, 0.2), [s * 0.275, 1.22, -0.045], 'triceps')
      add(capsula(0.04, 0.22), [s * 0.295, 0.99, 0], 'antebrazo')
      add(esfera(0.1, 10), [s * 0.095, 0.9, -0.1], 'gluteos', undefined, [1, 0.9, 0.8])
      add(capsula(0.075, 0.34), [s * 0.1, 0.63, 0.05], 'cuads')
      add(capsula(0.065, 0.32), [s * 0.1, 0.63, -0.06], 'isquios')
      add(capsula(0.05, 0.24), [s * 0.1, 0.24, -0.05], 'gemelos')
    }
    add(caja(0.2, 0.28, 0.06), [0, 1.07, 0.11], 'abs')
    add(caja(0.38, 0.44, 0.06), [0, 1.24, -0.11], 'espalda')

    // Suelo suave
    const sombra = new THREE.Mesh(new THREE.CircleGeometry(0.5, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 }))
    sombra.rotation.x = -Math.PI / 2
    sombra.position.y = -0.01
    grupo.add(sombra)

    // Bordes sutiles
    const lineas = new THREE.LineSegments(new THREE.EdgesGeometry(caja(0.42, 0.5, 0.2), 30), new THREE.LineBasicMaterial({ color: BORDE }))
    lineas.position.set(0, 1.22, 0)
    grupo.add(lineas)

    let giroActual = giro
    const st = {
      mallas, grupo, objetivoGiro: giro, renderer,
      pintar: () => {
        for (const [m, ms] of mallas) {
          const c = new THREE.Color(colorDeRef.current(m))
          for (const mesh of ms) {
            const mat = mesh.material as THREE.MeshStandardMaterial
            mat.color.copy(c)
            const sel = seleccionadoRef.current
            mat.emissive.set(sel === m ? 0x444444 : 0x000000)
            mat.opacity = sel && sel !== m ? 0.6 : 1
            mat.transparent = !!sel
          }
        }
      },
    }
    estado.current = st
    st.pintar()

    // Interacción: arrastrar para rotar, tocar para seleccionar
    let arrastrando = false
    let x0 = 0
    let movido = 0
    let giroInicial = 0
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
      const p = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
      raycaster.setFromCamera(p, camera)
      const hit = raycaster.intersectObjects(todas, false)[0]
      if (hit) onTocarRef.current(hit.object.userData.musculo as MusculoId)
    }
    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', () => { arrastrando = false })

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
      renderer.dispose()
      grupo.traverse((o) => { if (o instanceof THREE.Mesh) { o.geometry.dispose(); (o.material as THREE.Material).dispose() } })
      cont.removeChild(el)
      estado.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const seleccionadoRef = useRef(seleccionado)
  seleccionadoRef.current = seleccionado
  useEffect(() => { estado.current?.pintar() }, [colorDe, seleccionado])
  useEffect(() => { if (estado.current) estado.current.objetivoGiro = giro }, [giro])

  return <div ref={ref} className="h-80 w-full" aria-label="cuerpo 3D" />
}

export default Cuerpo3D
