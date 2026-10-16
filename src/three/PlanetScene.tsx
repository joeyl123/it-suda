import { useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { planetProfile, seeded, systemProfile } from '../lib/cosmos'
import { planetRestPosition } from '../lib/layout'
import type { Session, Topic } from '../lib/sessions'
import { cosmicToast } from '../lib/toast'
import { Emerge, Glow, OrbitRing } from './common'
import { RocketPad, Satellite, Ufo, type Launch } from './effects'
import Planet from './Planet'
import { useQuality } from '../lib/quality'
import type { SceneProps } from './Universe'

const MOON_COLORS = ['#c9c4bc', '#a8a29a', '#d8cbb0', '#9aa3ad']
let launchId = 0
let firstLaunchHint = true

/** 토픽 하나 = 행성 하나의 생태계 (행성 좌표, 반지름 1). 표면을 누르면 그 자리에서 로켓이 발사된다. */
export default function PlanetScene({ session, topic, interactive, emerge }: SceneProps & { session: Session; topic: Topic }) {
  const quality = useQuality().settings
  const profile = useMemo(() => planetProfile(session, topic), [session, topic])
  const system = systemProfile(session)
  const moons = useMemo(() => {
    const rand = seeded(profile.seed + '/moons')
    return Array.from({ length: profile.moons }, (_, i) => ({
      orbit: 2.25 + i * 0.3 + rand() * 0.15,
      size: 0.08 + rand() * 0.12,
      speed: 0.5 + rand() * 0.4,
      phase: rand() * Math.PI * 2,
      tilt: (rand() - 0.5) * 0.8,
      color: MOON_COLORS[Math.floor(rand() * MOON_COLORS.length)],
    }))
  }, [profile])
  const extras = useMemo(() => {
    const r = seeded(profile.seed + '/visitors')
    return { ufo: r() < 0.15, satellite: r() < 0.35 }
  }, [profile])
  // 이 태양계의 항성은 실제로 있는 방향(행성 → 태양)에 멀리 보인다
  const sunAt = useMemo(() => {
    const p = planetRestPosition(session, topic.index)
    return new THREE.Vector3(-p[0], 4, -p[2]).normalize().multiplyScalar(22).toArray() as [number, number, number]
  }, [session, topic.index])

  const [launches, setLaunches] = useState<Launch[]>([])
  const launch = (dir: THREE.Vector3) => setLaunches((l) => [...l.slice(-5), { id: launchId++, dir: dir.clone().normalize() }])

  return (
    <>
      <Planet
        profile={profile}
        detail={quality.planet.detail}
        propBudget={quality.planet.props}
        cloudBudget={quality.planet.clouds}
        onClick={(e) => {
          if (!interactive || e.delta > 6) return // 드래그였음
          e.stopPropagation()
          // 조작 가능한 장면은 항상 원점·축척 1에 있으므로 클릭 지점 = 행성 좌표
          launch(e.point)
          if (firstLaunchHint) {
            firstLaunchHint = false
            cosmicToast('🚀 발사! 행성 아무 데나 눌러 보세요')
          }
        }}
      />
      <RocketPad launches={launches} surface={1 + profile.amp * 0.6} onDone={(id) => setLaunches((l) => l.filter((x) => x.id !== id))} />
      {/* 위성·먼지·방문자는 행성에서부터 퍼져 나온다 */}
      <Emerge source={emerge}>
        {moons.map((m, i) => (
          <Moon key={i} {...m} />
        ))}
        <Satellites color={profile.biome.glow} />
        {extras.satellite && <Satellite radius={1.45 + profile.amp} tilt={profile.tilt + 0.5} />}
        {extras.ufo && <Ufo mode="orbit" span={1.75 + profile.amp} scale={0.11} />}
      </Emerge>
      {/* 멀리 보이는 이 태양계의 항성 — 다른 주변 오브젝트처럼 행성에서 퍼져 나오며 밝아지고, 나갈 땐 오그라들며 사라진다 */}
      <Emerge source={emerge}>
        <group position={sunAt}>
          <Glow color={system.star.core} scale={5 * system.star.size} />
          <Glow color={system.corona} scale={12} opacity={0.5} />
        </group>
      </Emerge>
    </>
  )
}

function Moon({ orbit, size, speed, phase, tilt, color }: { orbit: number; size: number; speed: number; phase: number; tilt: number; color: string }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    const a = phase + clock.elapsedTime * speed
    ref.current?.position.set(Math.cos(a) * orbit, 0, Math.sin(a) * orbit)
  })
  return (
    <group rotation={[tilt, 0, 0]}>
      <OrbitRing radius={orbit} color={color} opacity={0.12} width={0.006} />
      <mesh ref={ref}>
        <icosahedronGeometry args={[size, 1]} />
        <meshStandardMaterial color={color} flatShading roughness={0.9} />
      </mesh>
    </group>
  )
}

/** 행성 주위를 도는 작은 빛 입자들 */
function Satellites({ color, count = 160 }: { color: string; count?: number }) {
  const ref = useRef<THREE.Points>(null)
  const geometry = useMemo(() => {
    const rand = seeded('dust/' + color)
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const v = new THREE.Vector3(rand() - 0.5, (rand() - 0.5) * 0.5, rand() - 0.5).normalize().multiplyScalar(1.5 + rand() * 1.2)
      pos.set([v.x, v.y, v.z], i * 3)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return g
  }, [color, count])
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.05
  })
  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial color={color} size={2} sizeAttenuation={false} transparent opacity={0.6} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  )
}
