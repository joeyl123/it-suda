import { useEffect, useMemo, useRef } from 'react'
import { useFrame, type ThreeElements } from '@react-three/fiber'
import * as THREE from 'three'
import { seeded, type PlanetProfile, type PropKind } from '../lib/cosmos'

const AMP = 0.12

function makeNoise(key: string) {
  const rand = seeded(key + '/terrain')
  const waves = Array.from({ length: 7 }, (_, i) => ({
    dir: new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize(),
    f: 1.6 + i * 1.4 + rand(),
    ph: rand() * Math.PI * 2,
    a: 1 / (i + 1),
  }))
  const norm = waves.reduce((s, w) => s + w.a, 0)
  return (v: THREE.Vector3) =>
    THREE.MathUtils.clamp((waves.reduce((s, w) => s + Math.sin(v.dot(w.dir) * w.f + w.ph) * w.a, 0) / norm) * 2.2, -1, 1)
}

function propGeometry(kind: PropKind) {
  let g: THREE.BufferGeometry
  switch (kind) {
    case 'tree':
      g = new THREE.ConeGeometry(0.035, 0.13, 6)
      g.translate(0, 0.065, 0)
      break
    case 'crystal':
      g = new THREE.OctahedronGeometry(0.045)
      g.scale(0.8, 2.4, 0.8)
      g.translate(0, 0.07, 0)
      break
    case 'rock':
      g = new THREE.DodecahedronGeometry(0.04)
      g.scale(1, 0.6, 1)
      break
    case 'tower':
      g = new THREE.BoxGeometry(0.04, 0.14, 0.04)
      g.translate(0, 0.07, 0)
      break
    case 'spike':
      g = new THREE.ConeGeometry(0.028, 0.17, 4)
      g.translate(0, 0.085, 0)
      break
  }
  return g
}

function buildPlanet(profile: PlanetProfile, detail: number, propCount: number) {
  const { biome, sea } = profile
  const noise = makeNoise(profile.key)
  const geo = new THREE.IcosahedronGeometry(1, detail)
  const pos = geo.attributes.position
  const colors = new Float32Array(pos.count * 3)
  const ocean = new THREE.Color(biome.ocean)
  const deep = ocean.clone().multiplyScalar(0.7)
  const land = new THREE.Color(biome.land)
  const peak = new THREE.Color(biome.peak)
  const v = new THREE.Vector3()
  const c = new THREE.Color()

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize()
    const h = noise(v)
    let r: number
    if (h < sea) {
      r = 1 + sea * AMP
      c.copy(deep).lerp(ocean, THREE.MathUtils.clamp((h + 1) / (sea + 1), 0, 1))
    } else {
      r = 1 + h * AMP
      const t = THREE.MathUtils.smoothstep(h, sea, 1)
      c.copy(land).lerp(peak, t * t)
    }
    pos.setXYZ(i, v.x * r, v.y * r, v.z * r)
    colors.set([c.r, c.g, c.b], i * 3)
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geo.computeVertexNormals()

  // 지형 위에 소품(나무, 수정, 빌딩...)을 흩뿌린다
  const rand = seeded(profile.key + '/props')
  const matrices: THREE.Matrix4[] = []
  const up = new THREE.Vector3(0, 1, 0)
  const q = new THREE.Quaternion()
  const twist = new THREE.Quaternion()
  for (let tries = 0; tries < propCount * 4 && matrices.length < propCount; tries++) {
    const dir = new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize()
    const h = noise(dir)
    if (h < sea + 0.06) continue
    q.setFromUnitVectors(up, dir).multiply(twist.setFromAxisAngle(up, rand() * Math.PI * 2))
    const s = 0.35 + rand() * 0.45
    const scale = biome.prop === 'tower' ? new THREE.Vector3(s, s * (0.5 + rand() * 1.1), s) : new THREE.Vector3(s, s, s)
    matrices.push(new THREE.Matrix4().compose(dir.multiplyScalar(1 + h * AMP - 0.005), q.clone(), scale))
  }

  const props = new THREE.InstancedMesh(
    propGeometry(biome.prop),
    new THREE.MeshStandardMaterial({
      color: biome.propColor,
      flatShading: true,
      roughness: 0.6,
      emissive: biome.propGlow ? biome.propColor : '#000000',
      emissiveIntensity: biome.propGlow ? 0.55 : 0,
    }),
    Math.max(1, matrices.length),
  )
  props.count = matrices.length
  matrices.forEach((m, i) => props.setMatrixAt(i, m))
  props.instanceMatrix.needsUpdate = true

  return { geo, props }
}

type PlanetProps = ThreeElements['group'] & {
  profile: PlanetProfile
  detail?: number
  propCount?: number
  spin?: number
  atmosphere?: boolean
}

export default function Planet({ profile, detail = 8, propCount = 60, spin = 0.12, atmosphere = true, ...group }: PlanetProps) {
  const { geo, props } = useMemo(() => buildPlanet(profile, detail, propCount), [profile, detail, propCount])
  const spinRef = useRef<THREE.Group>(null)

  useEffect(
    () => () => {
      geo.dispose()
      props.geometry.dispose()
      ;(props.material as THREE.Material).dispose()
    },
    [geo, props],
  )

  useFrame((_, dt) => {
    if (spinRef.current) spinRef.current.rotation.y += dt * spin
  })

  return (
    <group {...group}>
      <group rotation={[profile.tilt, 0, profile.tilt * 0.5]}>
        <group ref={spinRef}>
          <mesh geometry={geo}>
            <meshStandardMaterial vertexColors flatShading roughness={0.85} />
          </mesh>
          <primitive object={props} />
        </group>
        {profile.ring && (
          <mesh rotation={[-Math.PI / 2 + 0.25, 0, 0]}>
            <ringGeometry args={[1.45, 2.05, 96]} />
            <meshStandardMaterial color={profile.biome.peak} transparent opacity={0.45} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        )}
      </group>
      {atmosphere && (
        <mesh scale={1.14}>
          <sphereGeometry args={[1, 48, 48]} />
          <meshBasicMaterial
            color={profile.biome.glow}
            transparent
            opacity={0.18}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  )
}
