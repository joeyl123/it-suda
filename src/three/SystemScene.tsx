import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { systemProfile, type StarType } from '../lib/cosmos'
import { systemLayout, type PlanetSlot } from '../lib/layout'
import type { Session } from '../lib/sessions'
import { Anchor, Emerge, Glow, OrbitRing, useDeferred } from './common'
import { AsteroidBelt, Comet } from './effects'
import Planet, { compilePlanetMaterials, prewarmPlanet } from './Planet'
import { SunAnchor } from './sunlight'
import { useQuality } from '../lib/quality'
import { motion } from './motion'
import type { SceneProps } from './Universe'

/** 태양계 장면 (태양계 좌표). 행성마다 앵커 `p<번호>`. */
// 호버·클릭은 DOM 원 마커(Universe Labels)가 맡는다. 3D 쪽에서도 받으면 둘이 서로 호버를 꺼 버린다.
export default function SystemScene({ layerId, session, hovered, hide, emerge, interactive }: SceneProps & { session: Session }) {
  const { star, corona, seed } = systemProfile(session)
  const layout = systemLayout(session)
  const paused = hovered !== null // 비행 중 멈춤은 motion.scale이 맡는다

  return (
    <>
      <Emerge source={emerge} core>
        <Sun star={star} corona={corona} />
        {/* 빛은 우주에 하나뿐인 점광원이 이 자리로 와서 비춘다 (sunlight.tsx) */}
        <SunAnchor color={star.core} />
      </Emerge>
      {/* 들어올 땐 항성에서 바깥으로 자라나고, 행성에서 나올 땐 화면 밖에서 모여든다 */}
      <Emerge source={emerge}>
        {layout.planets.map((p, i) => {
          const lit = hovered === p.id
          return (
            <group key={p.id}>
              <OrbitRing radius={p.orbit} color={lit ? p.profile.biome.glow : corona} opacity={lit ? 0.6 : 0.22} />
              <OrbitingPlanet
                slot={p}
                order={i}
                anchorId={`${layerId}::${p.id}`}
                hidden={hide === p.id}
                paused={paused}
                hovered={lit}
              />
            </group>
          )
        })}
        {layout.belt && <AsteroidBelt inner={layout.last + 1.1} outer={layout.last + 2.2} seed={seed} />}
        {layout.comet && <Comet a={layout.extent * 0.62} e={0.72} seed={seed} />}
      </Emerge>
      {/* 도착해서 둘러보는 동안에만 */}
      {interactive && <PlanetPrefetch slots={layout.planets} />}
    </>
  )
}

function Sun({ star, corona }: { star: StarType; corona: string }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (ref.current) ref.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 1.4) * 0.03)
  })
  return (
    <group ref={ref}>
      <mesh>
        <icosahedronGeometry args={[1.1 * star.size, 3]} />
        <meshBasicMaterial color={star.core} />
      </mesh>
      <Glow color={star.core} scale={4.5 * star.size} />
      <Glow color={corona} scale={9 * star.size} opacity={0.6} />
    </group>
  )
}

interface OrbitingProps {
  slot: PlanetSlot
  /** 몇 번째 행성인지 — 한 프레임에 하나씩 나눠 짓는다 */
  order: number
  anchorId: string
  hidden: boolean
  paused: boolean
  hovered: boolean
}

function OrbitingPlanet({ slot, order, anchorId, hidden, paused, hovered }: OrbitingProps) {
  const built = useDeferred(order + 1)
  const quality = useQuality().settings
  const ref = useRef<THREE.Group>(null)
  const body = useRef<THREE.Group>(null)
  const angle = useRef(slot.phase)
  const run = useRef(1)

  useFrame((_, dt) => {
    const g = ref.current
    if (!g) return
    run.current = THREE.MathUtils.damp(run.current, paused ? 0 : 1, 5, dt) // 호버로 멈출 때도 스르륵
    angle.current += dt * slot.speed * run.current * motion.scale
    g.position.set(Math.cos(angle.current) * slot.orbit, 0, Math.sin(angle.current) * slot.orbit)
    // 착륙하는 행성은 그 자리에서 자라나는 진짜 행성 장면과 겹쳐지므로 감춘다
    if (body.current) body.current.visible = !hidden
    body.current?.scale.setScalar(THREE.MathUtils.damp(body.current.scale.x, slot.size * (hovered ? 1.25 : 1), 10, dt))
  })

  return (
    <group ref={ref}>
      <group ref={body} scale={slot.size}>
        {built && (
          <Planet
            profile={slot.profile}
            detail={quality.system.detail}
            propBudget={quality.system.props}
            cloudBudget={quality.system.clouds}
            spin={slot.profile.spin * 4}
            atmosphereDetail={20}
          />
        )}
        {hovered && <Glow color={slot.profile.biome.glow} scale={4.2} opacity={0.5} />}
      </group>
      <Anchor id={anchorId} radius={slot.size * (slot.profile.ring ? 1.75 : 1.3)} offsetY={18} />
    </group>
  )
}

/**
 * 태양계에 도착해 쉬는 동안, 이 태양계의 행성들을 행성 화면 화질로 하나씩 미리 지어 두고(캐시)
 * 행성 화면 재질을 한 번 미리 컴파일한다 — 행성으로 들어가는 비행이 첫 프레임에 멈칫하지 않게.
 */
function PlanetPrefetch({ slots }: { slots: PlanetSlot[] }) {
  const quality = useQuality().settings
  const { gl, camera, scene } = useThree()
  useEffect(() => {
    let cancelled = false
    let handle = 0
    // Safari엔 requestIdleCallback이 없다
    const ric = typeof requestIdleCallback === 'function'
    const idle = (fn: () => void) => (ric ? requestIdleCallback(fn, { timeout: 2000 }) : setTimeout(fn, 200))
    const cancel = (h: number) => (ric ? cancelIdleCallback(h) : clearTimeout(h))
    const queue = slots.slice()
    let compiled = false
    const step = () => {
      if (cancelled) return
      const slot = queue.shift()
      if (!slot) return
      const { detail, props, clouds } = quality.planet
      const built = prewarmPlanet(slot.profile, detail, props, clouds)
      if (!compiled) {
        compiled = true
        compilePlanetMaterials(gl, camera, scene, built)
      }
      handle = idle(step)
    }
    handle = idle(step)
    return () => {
      cancelled = true
      cancel(handle)
    }
  }, [slots, quality, gl, camera, scene])
  return null
}
