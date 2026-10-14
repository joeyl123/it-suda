import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { seeded, type PlanetProfile, type SystemProfile } from '../lib/cosmos'
import { cosmicToast } from '../lib/toast'
import { Glow, IsoStage, OrbitRing, POLAR_FULL } from './common'
import { RocketPad, Satellite, Ufo, type Launch } from './effects'
import Planet from './Planet'

const MOON_COLORS = ['#c9c4bc', '#a8a29a', '#d8cbb0', '#9aa3ad']
let launchId = 0
let firstLaunchHint = true

/** 토픽 하나 = 행성 하나의 생태계. 가까이서 본 모습. 표면을 누르면 그 자리에서 로켓이 발사된다. */
export default function PlanetScene({ profile, system }: { profile: PlanetProfile; system: SystemProfile }) {
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
    return { ufo: r() < 0.5, satellite: r() < 0.75 }
  }, [profile])

  const [launches, setLaunches] = useState<Launch[]>([])
  const launch = (dir: THREE.Vector3) => setLaunches((l) => [...l.slice(-5), { id: launchId++, dir: dir.clone().normalize() }])

  // 가끔 저절로 발사
  useEffect(() => {
    const t = window.setInterval(() => {
      if (Math.random() < 0.5) launch(new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.3, Math.random() - 0.5))
    }, 9000)
    return () => window.clearInterval(t)
  }, [])

  return (
    <IsoStage extent={profile.ring || profile.moons ? 2.5 : 1.75} polar={POLAR_FULL}>
      <Planet
        profile={profile}
        detail={24}
        propBudget={320}
        cloudBudget={46}
        onClick={(e) => {
          e.stopPropagation()
          launch(e.point)
          if (firstLaunchHint) {
            firstLaunchHint = false
            cosmicToast('🚀 발사! 행성 아무 데나 눌러 보세요')
          }
        }}
      />
      <RocketPad launches={launches} surface={1 + profile.amp * 0.6} onDone={(id) => setLaunches((l) => l.filter((x) => x.id !== id))} />
      {moons.map((m, i) => (
        <Moon key={i} {...m} />
      ))}
      <Satellites color={profile.biome.glow} />
      {extras.satellite && <Satellite radius={1.45 + profile.amp} tilt={profile.tilt + 0.5} />}
      {extras.ufo && <Ufo mode="orbit" span={1.75 + profile.amp} scale={0.11} />}
      {/* 멀리 보이는 이 태양계의 항성 */}
      <group position={[-14, 6, -18]}>
        <Glow color={system.star.core} scale={5 * system.star.size} />
        <Glow color={system.corona} scale={12} opacity={0.5} />
      </group>
    </IsoStage>
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
