import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { systemProfile, type StarType } from '../lib/cosmos'
import { systemLayout, type PlanetSlot } from '../lib/layout'
import type { Session } from '../lib/sessions'
import { Anchor, Emerge, Glow, OrbitRing } from './common'
import { AsteroidBelt, Comet } from './effects'
import Planet from './Planet'
import { useQuality } from '../lib/quality'
import { motion } from './motion'
import type { SceneProps } from './Universe'

/** 태양계 장면 (태양계 좌표). 행성마다 앵커 `p<번호>`. */
// 호버·클릭은 DOM 원 마커(Universe Labels)가 맡는다. 3D 쪽에서도 받으면 둘이 서로 호버를 꺼 버린다.
export default function SystemScene({ layerId, session, hovered, hide, emerge }: SceneProps & { session: Session }) {
  const { star, corona, seed } = systemProfile(session)
  const layout = systemLayout(session)
  const paused = hovered !== null // 비행 중 멈춤은 motion.scale이 맡는다

  return (
    <>
      <Emerge source={emerge} core>
        <Sun star={star} corona={corona} />
      </Emerge>
      {/* 들어올 땐 항성에서 바깥으로 자라나고, 행성에서 나올 땐 화면 밖에서 모여든다 */}
      <Emerge source={emerge}>
        {layout.planets.map((p) => {
          const lit = hovered === p.id
          return (
            <group key={p.id}>
              <OrbitRing radius={p.orbit} color={lit ? p.profile.biome.glow : corona} opacity={lit ? 0.6 : 0.22} />
              <OrbitingPlanet
                slot={p}
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
      <pointLight intensity={30} distance={60} decay={1.4} color={star.core} />
    </group>
  )
}

interface OrbitingProps {
  slot: PlanetSlot
  anchorId: string
  hidden: boolean
  paused: boolean
  hovered: boolean
}

function OrbitingPlanet({ slot, anchorId, hidden, paused, hovered }: OrbitingProps) {
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
        <Planet
          profile={slot.profile}
          detail={quality.system.detail}
          propBudget={quality.system.props}
          cloudBudget={quality.system.clouds}
          spin={slot.profile.spin * 4}
        />
        {hovered && <Glow color={slot.profile.biome.glow} scale={4.2} opacity={0.5} />}
      </group>
      <Anchor id={anchorId} radius={slot.size * (slot.profile.ring ? 1.75 : 1.3)} offsetY={18} />
    </group>
  )
}
