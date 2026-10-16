import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { planetColors, planetProfile, seeded, systemProfile } from '../lib/cosmos'
import { GALAXY_RADIUS, galaxyOrder, systemPosition } from '../lib/layout'
import type { Session } from '../lib/sessions'
import { Anchor, Glow, OrbitRing } from './common'
import GalaxyBody from './GalaxyBody'
import { useQuality } from '../lib/quality'
import { Astronaut, DriftingAsteroids, SpaceWhale, Ufo } from './effects'
import type { SceneProps } from './Universe'

/** 은하 장면 (은하 좌표). 태양계마다 앵커 `sys:<slug>`. */
// 호버·클릭은 DOM 원 마커(Universe Labels)가 맡는다. 3D 쪽에서도 받으면 둘이 서로 호버를 꺼 버린다.
// backdrop: 태양계·행성 화면 뒤에 깔리는 은하 — 별 점만 (블랙홀·성운·다른 회차 태양계·이스터에그 없이 가볍게)
export default function GalaxyScene({ layerId, matches, hovered, hide, backdrop = false }: SceneProps & { matches: Set<string>; backdrop?: boolean }) {
  const { settings } = useQuality()
  return (
    <>
      <GalaxyBody radius={GALAXY_RADIUS} density={settings.stars} starsOnly={backdrop} />
      {!backdrop && galaxyOrder.map((s, i) => {
        const id = `sys:${s.slug}`
        return (
          <StarSystem
            key={s.slug}
            layerId={layerId}
            session={s}
            index={i}
            hidden={hide === id}
            dim={!matches.has(s.slug)}
            hovered={hovered === id}
          />
        )
      })}
      {!backdrop && (
        <>
          <Ufo mode="flyby" span={GALAXY_RADIUS * 0.9} scale={0.32} />
          <Astronaut span={GALAXY_RADIUS * 0.8} />
          <SpaceWhale radius={GALAXY_RADIUS * 0.95} />
          <DriftingAsteroids count={1} span={GALAXY_RADIUS} />
        </>
      )}
    </>
  )
}

interface SystemProps {
  layerId: string
  session: Session
  index: number
  hidden: boolean
  dim: boolean
  hovered: boolean
}

function StarSystem({ layerId, session, index, hidden, dim, hovered }: SystemProps) {
  const group = useRef<THREE.Group>(null)
  const planetRefs = useRef<(THREE.Mesh | null)[]>([])
  const { star, corona } = systemProfile(session, index + 1)
  const position = useMemo(() => systemPosition(session.slug), [session.slug])
  const planets = useMemo(() => {
    let orbit = 0.75
    return session.topicList.map((t, i) => {
      const profile = planetProfile(session, t)
      orbit += 0.25 + profile.size * 0.18
      return { profile, color: planetColors(profile).land, orbit, speed: 0.9 / (1 + i * 0.6), phase: seeded(profile.seed)() * Math.PI * 2 }
    })
  }, [session])
  const reach = (planets.at(-1)?.orbit ?? 0.8) + 0.3

  useFrame(({ clock }, dt) => {
    const g = group.current
    if (!g) return
    // 들어가는 중인 태양계는 그 자리에서 자라나는 진짜 태양계에 자리를 내준다
    const target = hidden ? 0.001 : (dim ? 0.65 : 1) * (hovered ? 1.35 : 1)
    g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, target, hidden ? 14 : 8, dt))
    planets.forEach((p, i) => {
      const m = planetRefs.current[i]
      if (!m) return
      const a = p.phase + clock.elapsedTime * p.speed
      m.position.set(Math.cos(a) * p.orbit, 0, Math.sin(a) * p.orbit)
    })
  })

  return (
    <group position={position}>
      <group ref={group}>
        <mesh>
          <sphereGeometry args={[0.34 * star.size, 24, 24]} />
          <meshBasicMaterial color={dim ? '#5e566e' : star.core} />
        </mesh>
        <Glow color={star.core} scale={1.7 * star.size} opacity={dim ? 0.2 : 0.9} />
        <Glow color={corona} scale={hovered ? 4.2 : 3} opacity={dim ? 0.12 : 0.7} />
        {planets.map((p, i) => (
          <group key={p.profile.seed + '-' + i}>
            <OrbitRing radius={p.orbit} color={corona} opacity={dim ? 0.06 : 0.25} width={0.008} />
            <mesh ref={(m) => void (planetRefs.current[i] = m)}>
              <icosahedronGeometry args={[0.07 + p.profile.size * 0.07, 1]} />
              <meshStandardMaterial color={p.color} flatShading emissive={p.color} emissiveIntensity={0.25} />
            </mesh>
          </group>
        ))}
      </group>
      <Anchor id={`${layerId}::sys:${session.slug}`} radius={0.85} offsetY={34} />
    </group>
  )
}
