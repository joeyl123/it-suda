import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { seeded } from '../lib/cosmos'
import { getZoomDir } from '../lib/zoom'
import { ShootingStars, Warp } from './effects'

/** 위아래(극각) 회전 범위. 기본은 거의 정수리에서 지평선 바로 위까지 */
export const POLAR_OPEN: [number, number] = [0.08, Math.PI / 2 - 0.04]
export const POLAR_FULL: [number, number] = [0.05, Math.PI - 0.05]

interface StageProps {
  /** 화면에 꼭 들어와야 하는 반경 (월드 단위) */
  extent: number
  children: ReactNode
  pan?: boolean
  autoRotate?: boolean
  /** 넓은 화면에서 좌측 오버레이 패널만큼 장면을 오른쪽으로 민다 (px) */
  offsetX?: number
  polar?: [number, number]
}

export function IsoStage({ extent, children, pan = false, autoRotate = false, offsetX = 0, polar = POLAR_OPEN }: StageProps) {
  return (
    <Canvas
      orthographic
      dpr={[1, 2]}
      // 정확한 아이소메트릭 각도: 카메라가 (1,1,1) 방향에서 내려다보며 시작
      camera={{ position: [40, 40, 40], zoom: 10, near: 0.1, far: 500 }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.9} />
      <hemisphereLight args={['#e2d3f7', '#2a2140', 1.1]} />
      <directionalLight position={[-8, 12, 6]} intensity={2.2} color="#fff4e0" />
      <Starfield />
      <ShootingStars />
      <Warp />
      <Rig extent={extent} pan={pan} autoRotate={autoRotate} offsetX={offsetX} polar={polar} />
      {children}
    </Canvas>
  )
}

interface RigProps {
  extent: number
  pan: boolean
  autoRotate: boolean
  offsetX: number
  polar: [number, number]
}

// 도착 줌: 페이지 전환(새 화면이 자라나는 0.9초)과 겹쳐서 한 번의 움직임처럼 이어진다
const ARRIVE: Record<string, number> = { in: 0.55, out: 1.9, side: 0.85 }

function Rig({ extent, pan, autoRotate, offsetX, polar }: RigProps) {
  const { size, camera } = useThree()
  const shift = size.width >= 900 ? offsetX : 0
  const base = Math.min(size.width - shift, size.height) / (extent * 2)
  const intro = useRef(0)
  const from = useRef(ARRIVE.in)

  useEffect(() => {
    if (shift) camera.setViewOffset(size.width, size.height, -shift / 2, 0, size.width, size.height)
    else camera.clearViewOffset()
    camera.updateProjectionMatrix()
  }, [shift, size, camera])

  useEffect(() => {
    intro.current = 0
    from.current = ARRIVE[getZoomDir()] ?? ARRIVE.in
    camera.zoom = base * from.current
    camera.updateProjectionMatrix()
  }, [base, camera])

  useFrame((_, dt) => {
    if (intro.current >= 1) return
    // 첫 프레임이 무거워도(행성 생성) 한 번에 건너뛰지 않게 dt 제한
    intro.current = Math.min(1, intro.current + Math.min(dt, 1 / 30) * 0.85)
    const e = 1 - Math.pow(1 - intro.current, 3)
    camera.zoom = base * (from.current + (1 - from.current) * e)
    camera.updateProjectionMatrix()
  })

  return (
    <OrbitControls
      makeDefault
      enableDamping
      enablePan={pan}
      minPolarAngle={polar[0]}
      maxPolarAngle={polar[1]}
      minZoom={base * 0.25}
      maxZoom={base * 8}
      autoRotate={autoRotate}
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

export { Glow, getGlowTexture } from './glow'

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
 * 라벨에는 data-anchor 와 대상의 화면 좌표(data-cx/cy)가 남는다 → 줌 전환의 중심점 (lib/zoom anchorPoint)
 */
export type LabelRegistry = Map<string, HTMLElement>

export function useLabelRegistry() {
  const registry = useMemo<LabelRegistry>(() => new Map(), [])
  const bind = (id: string) => (el: HTMLElement | null) => {
    if (el) {
      el.dataset.anchor = id
      registry.set(id, el)
    } else registry.delete(id)
  }
  return { registry, bind }
}

export function Anchor({ id, registry, offsetY = 0 }: { id: string; registry: LabelRegistry; offsetY?: number }) {
  const ref = useRef<THREE.Group>(null)
  const v = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ camera, size }) => {
    const el = registry.get(id)
    if (!el || !ref.current) return
    ref.current.getWorldPosition(v).project(camera)
    const x = ((v.x + 1) / 2) * size.width
    const y = ((1 - v.y) / 2) * size.height
    el.style.transform = `translate(${x}px, ${y + offsetY}px) translate(-50%, -50%)`
    el.style.visibility = v.z < 1 ? 'visible' : 'hidden'
    el.dataset.cx = x.toFixed(0)
    el.dataset.cy = y.toFixed(0)
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
