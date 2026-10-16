import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { seeded } from '../lib/cosmos'

export { Glow, getGlowTexture } from './glow'

/** 위아래(극각) 회전 범위. 기본은 거의 정수리에서 지평선 바로 위까지 */
export const POLAR_OPEN: [number, number] = [0.08, Math.PI / 2 - 0.04]
export const POLAR_FULL: [number, number] = [0.05, Math.PI - 0.05]

/** 아주 먼 배경 별. 카메라가 어디로 날아가든 따라다녀서 무한히 멀리 있는 것처럼 보인다. */
export function Starfield({ count = 1600 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null)
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3 } | null
  const geometry = useMemo(() => {
    const rand = seeded('starfield')
    const pos = new Float32Array(count * 3)
    const col = new Float32Array(count * 3)
    const tints = ['#ffffff', '#f2dc7e', '#b898ea', '#f0946e', '#a8dcf0'].map((c) => new THREE.Color(c))
    for (let i = 0; i < count; i++) {
      const v = new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize().multiplyScalar(260 + rand() * 120)
      pos.set([v.x, v.y, v.z], i * 3)
      const c = tints[Math.floor(rand() * tints.length)].clone().multiplyScalar(0.4 + rand() * 0.6)
      col.set([c.r, c.g, c.b], i * 3)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
    return g
  }, [count])

  useFrame(() => {
    if (ref.current && controls) ref.current.position.copy(controls.target)
  })

  return (
    <points ref={ref} geometry={geometry} frustumCulled={false} renderOrder={-1}>
      <pointsMaterial size={1.6} sizeAttenuation={false} vertexColors transparent opacity={0.9} depthWrite={false} />
    </points>
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
 * 3D 위치를 따라다니는 DOM 라벨 + 카메라 비행의 목적지.
 * 라벨은 캔버스 밖 일반 DOM(.label-layer)에 그리고, 매 프레임 앵커의 화면 좌표로 옮긴다.
 * (drei <Html>은 라벨마다 React root를 따로 만들어 불안정해서 쓰지 않는다)
 * id는 `${레이어 id}::${앵커 id}` — 비행 중엔 두 장면이 함께 있으므로 레이어로 구분한다.
 */
export const registry = {
  els: new Map<string, HTMLElement>(),
  objs: new Map<string, THREE.Object3D>(),
}

export function bindLabel(id: string) {
  return (el: HTMLElement | null) => {
    if (el) registry.els.set(id, el)
    else registry.els.delete(id)
  }
}

interface AnchorEntry {
  obj: THREE.Object3D
  offsetY: number
  radius?: number
}
const anchors = new Map<string, AnchorEntry>()
const tmpPos = new THREE.Vector3()
const tmpScale = new THREE.Vector3()

/**
 * 3D 오브젝트 자리를 표시하는 점. 실제 DOM 이동은 `syncAnchors`가 **3D를 그린 직후** 한꺼번에 한다
 * — 그래야 카메라·공전이 그 프레임에 움직인 뒤의 위치를 쓰므로 마커·라벨이 한 프레임도 밀리지 않는다.
 * @param radius 대상의 반지름(이 장면 좌표). 주면 화면상 크기에 맞는 원 마커(`id|marker`)를 함께 움직이고,
 *               라벨은 그 원 바로 아래(offsetY만큼 더)에 둔다.
 */
export function Anchor({ id, offsetY = 0, radius }: { id: string; offsetY?: number; radius?: number }) {
  const ref = useRef<THREE.Group>(null)
  useEffect(() => {
    const obj = ref.current
    if (!obj) return
    registry.objs.set(id, obj)
    anchors.set(id, { obj, offsetY, radius })
    return () => {
      if (registry.objs.get(id) === obj) registry.objs.delete(id)
      if (anchors.get(id)?.obj === obj) anchors.delete(id)
    }
  }, [id, offsetY, radius])
  return <group ref={ref} />
}

/** 3D 렌더 직후 호출: 모든 앵커의 화면 좌표로 마커·라벨 DOM을 옮긴다 (Universe의 RenderAndSync) */
export function syncAnchors(camera: THREE.Camera, size: { width: number; height: number }) {
  const zoom = (camera as THREE.OrthographicCamera).zoom
  anchors.forEach((a, id) => {
    const el = registry.els.get(id)
    const marker = registry.els.get(id + '|marker')
    if (!el && !marker) return
    a.obj.getWorldPosition(tmpPos).project(camera)
    const x = ((tmpPos.x + 1) / 2) * size.width
    const y = ((1 - tmpPos.y) / 2) * size.height
    const visibility = Math.abs(tmpPos.z) < 1 ? 'visible' : 'hidden'
    let r = 0
    if (a.radius) {
      a.obj.getWorldScale(tmpScale)
      r = Math.max(14, a.radius * tmpScale.x * zoom)
    }
    if (marker) {
      marker.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`
      const d = `${Math.round(r * 2)}px`
      if (marker.style.width !== d) marker.style.width = marker.style.height = d
      marker.style.visibility = visibility
    }
    if (el) {
      el.style.transform = `translate3d(${x}px, ${y + r + a.offsetY}px, 0) translate(-50%, -50%)`
      el.style.visibility = visibility
    }
  })
}

export function useHoverCursor(active: boolean) {
  useEffect(() => {
    document.body.style.cursor = active ? 'pointer' : ''
    return () => {
      document.body.style.cursor = ''
    }
  }, [active])
}
