import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { MusculoId } from '../../domain/types'
import { Cuerpo3D } from './Cuerpo3D'

/**
 * Cuerpo anatómico real: malla derivada de Z-Anatomy (CC BY-SA 4.0), ~150 k triángulos, 2,7 MB,
 * con un nodo por grupo muscular (grupo_pecho, grupo_espalda, …) más relleno neutro y huesos.
 * Si el modelo no carga (sin red la primera vez), cae al cuerpo procedural.
 */
interface Props {
  colorDe: (m: MusculoId) => string
  seleccionado: MusculoId | null
  onTocar: (m: MusculoId) => void
  giro: number
}

const PIEL = 0x24242a
const HUESO = 0x3a3a40
const URL_MODELO = `${import.meta.env.BASE_URL}modelo/cuerpo.glb`

let cache: Promise<THREE.Group> | null = null
function cargarModelo(): Promise<THREE.Group> {
  if (!cache) {
    cache = new GLTFLoader().loadAsync(URL_MODELO).then((g) => g.scene)
    cache.catch(() => { cache = null })
  }
  return cache
}

export function Cuerpo3DMalla(props: Props) {
  const [fallo, setFallo] = useState(false)
  if (fallo) return <Cuerpo3D {...props} />
  return <Malla {...props} onFallo={() => setFallo(true)} />
}

function Malla({ colorDe, seleccionado, onTocar, giro, onFallo }: Props & { onFallo: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [cargando, setCargando] = useState(true)
  const estado = useRef<{ objetivoGiro: number; pintar: () => void } | null>(null)
  const colorDeRef = useRef(colorDe); colorDeRef.current = colorDe
  const onTocarRef = useRef(onTocar); onTocarRef.current = onTocar
  const selRef = useRef(seleccionado); selRef.current = seleccionado

  useEffect(() => {
    const cont = ref.current
    if (!cont) return
    let vivo = true
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio))
    renderer.setSize(cont.clientWidth, cont.clientHeight)
    renderer.outputColorSpace = THREE.SRGBColorSpace
    cont.appendChild(renderer.domElement)
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(24, cont.clientWidth / cont.clientHeight, 0.1, 50)
    scene.add(new THREE.HemisphereLight(0xffffff, 0x15151a, 0.9))
    const clave = new THREE.DirectionalLight(0xffffff, 1.5); clave.position.set(2.5, 4, 3); scene.add(clave)
    const relleno = new THREE.DirectionalLight(0x9cb4ff, 0.45); relleno.position.set(-3, 2, 1); scene.add(relleno)
    const contra = new THREE.DirectionalLight(0xffb020, 0.5); contra.position.set(0, 2, -4); scene.add(contra)
    const grupo = new THREE.Group()
    scene.add(grupo)
    const mallas = new Map<MusculoId, THREE.Mesh[]>()
    const tocables: THREE.Mesh[] = []
    let giroActual = giro
    const st = { objetivoGiro: giro, pintar: () => {} }
    estado.current = st

    cargarModelo().then((modelo) => {
      if (!vivo) return
      const cuerpo = modelo.clone(true)
      cuerpo.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return
        const nombre = o.name.replace(/^grupo_/, '')
        const esMusculo = !['neutro', 'hueso'].includes(nombre)
        o.material = new THREE.MeshStandardMaterial({ color: nombre === 'hueso' ? HUESO : PIEL, roughness: 0.6, metalness: 0.03 })
        if (esMusculo) {
          o.userData.musculo = nombre
          ;(mallas.get(nombre as MusculoId) ?? mallas.set(nombre as MusculoId, []).get(nombre as MusculoId)!).push(o)
          tocables.push(o)
        }
      })
      // normalizar: centrar en x/z, apoyar en y=0, altura 1.8
      const caja = new THREE.Box3().setFromObject(cuerpo)
      const tam = caja.getSize(new THREE.Vector3())
      const esc = 1.8 / tam.y
      cuerpo.scale.setScalar(esc)
      const caja2 = new THREE.Box3().setFromObject(cuerpo)
      const c = caja2.getCenter(new THREE.Vector3())
      cuerpo.position.set(-c.x, -caja2.min.y, -c.z)
      grupo.add(cuerpo)
      camera.position.set(0, 0.93, 4.25)
      camera.lookAt(0, 0.9, 0)
      st.pintar = () => {
        const sel = selRef.current
        for (const [m, ms] of mallas) {
          const col = new THREE.Color(colorDeRef.current(m))
          for (const mesh of ms) {
            const mt = mesh.material as THREE.MeshStandardMaterial
            mt.color.copy(col)
            mt.emissive.set(sel === m ? 0x3a3a3a : 0x000000)
            mt.transparent = !!sel
            mt.opacity = sel && sel !== m ? 0.55 : 1
          }
        }
      }
      st.pintar()
      setCargando(false)
    }).catch(() => { if (vivo) onFallo() })

    const el = renderer.domElement
    el.style.touchAction = 'pan-y'
    let arrastrando = false, x0 = 0, movido = 0, giroInicial = 0
    const onDown = (e: PointerEvent) => { arrastrando = true; x0 = e.clientX; movido = 0; giroInicial = st.objetivoGiro; el.setPointerCapture(e.pointerId) }
    const onMove = (e: PointerEvent) => { if (!arrastrando) return; const dx = e.clientX - x0; movido = Math.max(movido, Math.abs(dx)); st.objetivoGiro = giroInicial + dx * 0.012; giroActual = st.objetivoGiro }
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
    el.addEventListener('pointerdown', onDown); el.addEventListener('pointermove', onMove); el.addEventListener('pointerup', onUp); el.addEventListener('pointercancel', onCancel)

    let ultimo = performance.now()
    const loop = (t: number) => {
      if (!vivo) return
      const dt = Math.min(0.05, (t - ultimo) / 1000); ultimo = t
      giroActual += (st.objetivoGiro - giroActual) * Math.min(1, dt * 8)
      grupo.rotation.y = giroActual
      renderer.render(scene, camera)
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
    const ro = new ResizeObserver(() => { renderer.setSize(cont.clientWidth, cont.clientHeight); camera.aspect = cont.clientWidth / cont.clientHeight; camera.updateProjectionMatrix() })
    ro.observe(cont)
    return () => {
      vivo = false
      ro.disconnect()
      el.removeEventListener('pointerdown', onDown); el.removeEventListener('pointermove', onMove); el.removeEventListener('pointerup', onUp); el.removeEventListener('pointercancel', onCancel)
      grupo.traverse((o) => { if (o instanceof THREE.Mesh) (o.material as THREE.Material).dispose() })
      renderer.dispose()
      cont.removeChild(el)
      estado.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { estado.current?.pintar() }, [colorDe, seleccionado, cargando])
  useEffect(() => { if (estado.current) estado.current.objetivoGiro = giro }, [giro])

  return (
    <div className="relative">
      <div ref={ref} className="h-80 w-full" aria-label="cuerpo 3D anatómico" />
      {cargando && <div className="absolute inset-0 flex items-center justify-center text-sm text-texto-3">Cargando modelo (2,7 MB, solo la primera vez)…</div>}
    </div>
  )
}

export default Cuerpo3DMalla
