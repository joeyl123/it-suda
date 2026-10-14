import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { seeded, type PlanetProfile } from '../lib/cosmos'
import { Glow, IsoStage, OrbitRing } from './common'
import Planet from './Planet'

/** 토픽 하나 = 행성 하나의 생태계. 가까이서 본 모습. */
export default function PlanetScene({ profile, sunColor }: { profile: PlanetProfile; sunColor: string }) {
  const moons = useMemo(() => {
    const rand = seeded(profile.key + '/moons')
    return Array.from({ length: profile.moons }, (_, i) => ({
      orbit: 2.25 + i * 0.3 + rand() * 0.15,
      size: 0.1 + rand() * 0.1,
      speed: 0.5 + rand() * 0.4,
      phase: rand() * Math.PI * 2,
      tilt: (rand() - 0.5) * 0.8,
    }))
  }, [profile])

  return (
    <IsoStage extent={profile.ring || profile.moons ? 2.5 : 1.7}>
      <Planet profile={profile} detail={22} propCount={260} spin={0.08} />
      {moons.map((m, i) => (
        <Moon key={i} {...m} color={profile.biome.peak} />
      ))}
      <Satellites color={profile.biome.glow} />
      {/* 멀리 보이는 이 태양계의 항성 */}
      <group position={[-14, 6, -18]}>
        <Glow color="#f2dc7e" scale={5} />
        <Glow color={sunColor} scale={12} opacity={0.5} />
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
