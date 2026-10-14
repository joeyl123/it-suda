import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { seeded } from '../lib/cosmos'
import { getZoomDir } from '../lib/zoom'

// 정확한 아이소메트릭 각도: 카메라가 (1,1,1) 방향에서 내려다본다
const ISO_POLAR = Math.acos(1 / Math.sqrt(3))

interface StageProps {
  /** 화면에 꼭 들어와야 하는 반경 (월드 단위) */
  extent: number
  children: ReactNode
  pan?: boolean
  autoRotate?: boolean
  /** 넓은 화면에서 좌측 오버레이 패널만큼 장면을 오른쪽으로 민다 (px) */
  offsetX?: number
  /** 이 앵커 id 쪽으로 카메라가 파고든다 (페이지 전환 직전) */
  focus?: string | null
  registry?: LabelRegistry
}

export function IsoStage({ extent, children, pan = false, autoRotate = false, offsetX = 0, focus = null, registry }: StageProps) {
  return (
    <Canvas
      orthographic
      dpr={[1, 2]}
      camera={{ position: [40, 40, 40], zoom: 10, near: 0.1, far: 400 }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.9} />
      <hemisphereLight args={['#e2d3f7', '#2a2140', 1.1]} />
      <directionalLight position={[-8, 12, 6]} intensity={2.2} color="#fff4e0" />
      <Starfield />
      <Rig extent={extent} pan={pan} autoRotate={autoRotate} offsetX={offsetX} focus={focus} registry={registry} />
      {children}
    </Canvas>
  )
}

interface RigProps {
  extent: number
  pan: boolean
  autoRotate: boolean
  offsetX: number
  focus: string | null
  registry?: LabelRegistry
}

type Controls = { target: THREE.Vector3; update: () => void }

function Rig({ extent, pan, autoRotate, offsetX, focus, registry }: RigProps) {
  const { size, camera } = useThree()
  const controls = useThree((s) => s.controls) as unknown as Controls | null
  const shift = size.width >= 900 ? offsetX : 0
  const base = Math.min(size.width - shift, size.height) / (extent * 2)
  const intro = useRef(0)
  const from = useRef(0.35)
  const tmp = useMemo(() => ({ p: new THREE.Vector3(), d: new THREE.Vector3() }), [])

  useEffect(() => {
    if (shift) camera.setViewOffset(size.width, size.height, -shift / 2, 0, size.width, size.height)
    else camera.clearViewOffset()
    camera.updateProjectionMatrix()
  }, [shift, size, camera])

  // 진입 연출: 들어올 때는 멀리서 다가오고, 빠져나올 때는 가까이서 멀어진다
  useEffect(() => {
    intro.current = 0
    const dir = getZoomDir()
    from.current = dir === 'out' ? 2.6 : dir === 'side' ? 0.75 : 0.3
    camera.zoom = base * from.current
    camera.updateProjectionMatrix()
  }, [base, camera])

  useFrame((_, dt) => {
    // 전환 직전: 대상에게 카메라 중심을 옮기며 크게 확대
    if (focus && registry && controls) {
      const obj = registry.anchors.get(focus)
      if (!obj) return
      const k = 1 - Math.exp(-dt * 5)
      obj.getWorldPosition(tmp.p)
      tmp.d.subVectors(tmp.p, controls.target).multiplyScalar(k)
      controls.target.add(tmp.d)
      camera.position.add(tmp.d)
      camera.zoom += (base * 7 - camera.zoom) * k * 0.9
      camera.updateProjectionMatrix()
      controls.update()
      return
    }
    if (intro.current >= 1) return
    intro.current = Math.min(1, intro.current + dt * 0.9)
    const e = 1 - Math.pow(1 - intro.current, 4)
    camera.zoom = base * (from.current + (1 - from.current) * e)
    camera.updateProjectionMatrix()
  })

  return (
    <OrbitControls
      makeDefault
      enabled={!focus}
      enableDamping
      enablePan={pan}
      minPolarAngle={ISO_POLAR - 0.3}
      maxPolarAngle={ISO_POLAR + 0.12}
      minZoom={base * 0.25}
      maxZoom={base * 8}
      autoRotate={autoRotate && !focus}
      autoRotateSpeed={0.35}
    />
  )
}

function Starfield({ count = 1400 }: { count?: number }) {
  const geometry = useMemo(() => {
    const rand = seeded('starfield')
    const pos = new Float32Array(count * 3)
    const col = new Float32Array(count * 3)
    const tints = ['#ffffff', '#f2dc7e', '#b898ea', '#f0946e', '#a8dcf0'].map((c) => new THREE.Color(c))
    for (let i = 0; i < count; i++) {
      const v = new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize().multiplyScalar(70 + rand() * 60)
      pos.set([v.x, v.y, v.z], i * 3)
      const c = tints[Math.floor(rand() * tints.length)].clone().multiplyScalar(0.4 + rand() * 0.6)
      col.set([c.r, c.g, c.b], i * 3)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
    return g
  }, [count])

  return (
    <points geometry={geometry}>
      <pointsMaterial size={1.6} sizeAttenuation={false} vertexColors transparent opacity={0.9} depthWrite={false} />
    </points>
  )
}

let glowTexture: THREE.Texture | null = null
/** 부드러운 원형 빛 번짐 텍스처 (한 번만 생성) */
export function getGlowTexture() {
  if (glowTexture) return glowTexture
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.2, 'rgba(255,255,255,0.55)')
  g.addColorStop(0.5, 'rgba(255,255,255,0.12)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 128, 128)
  glowTexture = new THREE.CanvasTexture(c)
  return glowTexture
}

export function Glow({ color, scale, opacity = 1 }: { color: string; scale: number; opacity?: number }) {
  return (
    <sprite scale={[scale, scale, 1]}>
      <spriteMaterial
        map={getGlowTexture()}
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </sprite>
  )
}

/** 공전 궤도선 */
export function OrbitRing({ radius, color = '#b898ea', opacity = 0.22, width = 0.012 }: { radius: number; color?: string; opacity?: number; width?: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius - width, radius + width, 128]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  )
}

/**
 * 3D 위치를 따라다니는 DOM 라벨.
 * 라벨은 캔버스 밖 일반 DOM(.label-layer)에 그리고, 매 프레임 이 앵커의 화면 좌표로 옮긴다.
 * (drei <Html>은 라벨마다 React root를 따로 만들어 불안정해서 쓰지 않는다)
 * 앵커 오브젝트는 카메라가 파고들 대상(focus)으로도 쓰인다.
 */
export interface LabelRegistry {
  els: Map<string, HTMLElement>
  anchors: Map<string, THREE.Object3D>
}

export function useLabelRegistry() {
  const registry = useMemo<LabelRegistry>(() => ({ els: new Map(), anchors: new Map() }), [])
  const bind = (id: string) => (el: HTMLElement | null) => {
    if (el) registry.els.set(id, el)
    else registry.els.delete(id)
  }
  return { registry, bind }
}

export function Anchor({ id, registry, offsetY = 0 }: { id: string; registry: LabelRegistry; offsetY?: number }) {
  const ref = useRef<THREE.Group>(null)
  const v = useMemo(() => new THREE.Vector3(), [])
  useEffect(() => {
    const obj = ref.current
    if (!obj) return
    registry.anchors.set(id, obj)
    return () => {
      registry.anchors.delete(id)
    }
  }, [id, registry])
  useFrame(({ camera, size }) => {
    const el = registry.els.get(id)
    if (!el || !ref.current) return
    ref.current.getWorldPosition(v).project(camera)
    const x = ((v.x + 1) / 2) * size.width
    const y = ((1 - v.y) / 2) * size.height + offsetY
    el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`
    el.style.visibility = 'visible'
  })
  return <group ref={ref} />
}

export function useHoverCursor(active: boolean) {
  useEffect(() => {
    document.body.style.cursor = active ? 'pointer' : ''
    return () => {
      document.body.style.cursor = ''
    }
  }, [active])
}
