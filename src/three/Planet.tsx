import { useEffect, useMemo, useRef } from 'react'
import { useFrame, type ThreeElements } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { motion } from './motion'
import { seeded, type PlanetProfile, type PropKind, type PropSpec } from '../lib/cosmos'

// ---------------------------------------------------------------- terrain noise

const WAVES = 8

function makeNoise(seed: number, freq: number) {
  const rand = seeded(seed + '/terrain')
  // 파동 8개를 평평한 배열로 (x, y, z, 주파수, 위상, 세기) — 행성 하나에 수만 번 불리므로 반복문으로 계산한다
  const w = new Float64Array(WAVES * 6)
  let norm = 0
  for (let i = 0; i < WAVES; i++) {
    const dir = new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize()
    const f = freq * (1 + i * 0.95) + rand()
    const ph = rand() * Math.PI * 2
    const a = 1 / Math.pow(i + 1, 1.15)
    w.set([dir.x, dir.y, dir.z, f, ph, a], i * 6)
    norm += a
  }
  const k = 2.2 / norm
  return (v: THREE.Vector3) => {
    let sum = 0
    for (let i = 0; i < WAVES * 6; i += 6) sum += Math.sin((v.x * w[i] + v.y * w[i + 1] + v.z * w[i + 2]) * w[i + 3] + w[i + 4]) * w[i + 5]
    const h = sum * k
    return h < -1 ? -1 : h > 1 ? 1 : h
  }
}

// ---------------------------------------------------------------- landscape props
// 소품 하나 = 부품 여러 개. 부품마다 InstancedMesh 하나, 행렬은 공유.
// tint: true 인 부품만 인스턴스별 색(생태계 팔레트)을 받는다.

interface Part {
  geo: THREE.BufferGeometry
  tint?: boolean
  color?: string
  emissive?: string
}

const at = (g: THREE.BufferGeometry, x: number, y: number, z = 0) => g.translate(x, y, z)
const TRUNK = '#6b4a2f'

function propParts(kind: PropKind): Part[] {
  switch (kind) {
    case 'conifer':
      return [
        { geo: at(new THREE.CylinderGeometry(0.005, 0.007, 0.03, 5), 0, 0.015), color: TRUNK },
        { geo: at(new THREE.ConeGeometry(0.032, 0.07, 6), 0, 0.055), tint: true },
        { geo: at(new THREE.ConeGeometry(0.022, 0.05, 6), 0, 0.09), tint: true },
      ]
    case 'broadleaf':
      return [
        { geo: at(new THREE.CylinderGeometry(0.005, 0.008, 0.04, 5), 0, 0.02), color: TRUNK },
        { geo: at(new THREE.IcosahedronGeometry(0.034, 0), 0, 0.06), tint: true },
      ]
    case 'palm':
      return [
        { geo: at(new THREE.CylinderGeometry(0.003, 0.005, 0.07, 5), 0, 0.035), color: '#b08a5a' },
        { geo: at(new THREE.ConeGeometry(0.04, 0.014, 6), 0, 0.072), tint: true },
      ]
    case 'cactus':
      return [
        { geo: at(new THREE.CylinderGeometry(0.008, 0.009, 0.06, 6), 0, 0.03), tint: true },
        { geo: at(new THREE.CylinderGeometry(0.005, 0.005, 0.022, 6), 0.013, 0.038), tint: true },
        { geo: at(new THREE.CylinderGeometry(0.005, 0.005, 0.016, 6), -0.012, 0.03), tint: true },
      ]
    case 'acacia':
      return [
        { geo: at(new THREE.CylinderGeometry(0.004, 0.006, 0.045, 5), 0, 0.0225), color: TRUNK },
        { geo: at(new THREE.CylinderGeometry(0.045, 0.03, 0.012, 7), 0, 0.05), tint: true },
      ]
    case 'shrub':
      return [{ geo: at(new THREE.IcosahedronGeometry(0.018, 0), 0, 0.008), tint: true }]
    case 'flower':
      return [
        { geo: at(new THREE.CylinderGeometry(0.0015, 0.0015, 0.02, 4), 0, 0.01), color: '#4f8a3a' },
        { geo: at(new THREE.IcosahedronGeometry(0.008, 0), 0, 0.022), tint: true },
      ]
    case 'rock':
      return [{ geo: at(new THREE.DodecahedronGeometry(0.026, 0).scale(1, 0.6, 1), 0, 0.004), tint: true }]
    case 'iceSpike':
      return [
        { geo: at(new THREE.ConeGeometry(0.018, 0.11, 4), 0, 0.055), tint: true },
        { geo: at(new THREE.ConeGeometry(0.01, 0.06, 4), 0.016, 0.03), tint: true },
      ]
    case 'volcano':
      return [
        { geo: at(new THREE.CylinderGeometry(0.016, 0.065, 0.065, 8), 0, 0.0325), tint: true },
        { geo: at(new THREE.CylinderGeometry(0.014, 0.014, 0.004, 8), 0, 0.066), color: '#ff7a33', emissive: '#ff5a1a' },
      ]
    case 'reed':
      return [-0.008, 0, 0.008].map((x, i) => ({
        geo: at(new THREE.CylinderGeometry(0.0015, 0.002, 0.045 + i * 0.008, 4), x, 0.024, (i - 1) * 0.004),
        tint: true,
      }))
    case 'coral':
      return [
        { geo: at(new THREE.IcosahedronGeometry(0.02, 0).scale(1, 1.5, 1), 0, 0.02), tint: true },
        { geo: at(new THREE.IcosahedronGeometry(0.012, 0).scale(1, 1.6, 1), 0.018, 0.014), tint: true },
      ]
  }
}

interface Placement {
  matrix: THREE.Matrix4
  color: THREE.Color
}

function placeProps(spec: PropSpec, count: number, seed: number, noise: (v: THREE.Vector3) => number, profile: PlanetProfile) {
  const rand = seeded(`${seed}/props/${spec.kind}`)
  const { sea, amp } = profile
  const out: Placement[] = []
  const up = new THREE.Vector3(0, 1, 0)
  const twist = new THREE.Quaternion()
  const palette = spec.colors.map((c) => new THREE.Color(c).offsetHSL(...profile.hsl))
  for (let tries = 0; tries < count * 8 && out.length < count; tries++) {
    const dir = new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize()
    const h = noise(dir)
    if (spec.underwater) {
      if (h > sea - 0.03 || h < sea - 0.45) continue
    } else {
      const t = (h - sea) / (1 - sea)
      if (h < sea + 0.015 || t < spec.band[0] || t > spec.band[1]) continue
      if (profile.biome.polarCap && Math.abs(dir.y) > 1 - profile.biome.polarCap) continue
    }
    const q = new THREE.Quaternion().setFromUnitVectors(up, dir).multiply(twist.setFromAxisAngle(up, rand() * Math.PI * 2))
    const s = 0.7 + rand() * 0.65
    const pos = dir.clone().multiplyScalar(1 + h * amp - 0.004)
    out.push({
      matrix: new THREE.Matrix4().compose(pos, q, new THREE.Vector3(s, s * (0.85 + rand() * 0.4), s)),
      color: palette[Math.floor(rand() * palette.length)].clone().offsetHSL(0, 0, (rand() - 0.5) * 0.08),
    })
  }
  return out
}

function instanced(part: Part, placements: Placement[]) {
  const mat = new THREE.MeshStandardMaterial({
    color: part.tint ? '#ffffff' : (part.color ?? '#ffffff'),
    flatShading: true,
    roughness: 0.75,
    emissive: part.emissive ?? '#000000',
    emissiveIntensity: part.emissive ? 1.2 : 0,
  })
  const mesh = new THREE.InstancedMesh(part.geo, mat, Math.max(1, placements.length))
  mesh.count = placements.length
  placements.forEach((p, i) => {
    mesh.setMatrixAt(i, p.matrix)
    if (part.tint) mesh.setColorAt(i, p.color)
  })
  mesh.instanceMatrix.needsUpdate = true
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  return mesh
}

// ---------------------------------------------------------------- build

const SNOW = new THREE.Color('#f4f8fb')

function buildPlanet(profile: PlanetProfile, detail: number, propBudget: number, cloudBudget: number) {
  const { biome, sea, amp, hsl, seed } = profile
  const noise = makeNoise(seed, profile.freq)
  const capNoise = makeNoise(seed + 7, 3)
  const tone = (c: string) => new THREE.Color(c).offsetHSL(...hsl)
  const [low, mid, high] = biome.land.map(tone)
  const seabed = tone(biome.seabed)
  const deep = seabed.clone().multiplyScalar(0.55)
  const shore = low.clone().lerp(new THREE.Color('#ffffff'), 0.15)

  // 지형: 같은 자리의 꼭짓점을 하나로 합친 뒤 계산한다 (노이즈 계산·GPU 메모리 약 1/6).
  // flatShading은 면 법선을 화면에서 직접 구하므로 합쳐도 모습은 같다.
  const sphere = new THREE.IcosahedronGeometry(1, detail)
  sphere.deleteAttribute('normal')
  sphere.deleteAttribute('uv')
  const geo = mergeVertices(sphere)
  sphere.dispose()
  const pos = geo.attributes.position
  const colors = new Float32Array(pos.count * 3)
  const v = new THREE.Vector3()
  const c = new THREE.Color()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize()
    const h = noise(v)
    if (h < sea) {
      c.copy(deep).lerp(seabed, THREE.MathUtils.smoothstep(h, sea - 0.6, sea))
    } else {
      const t = (h - sea) / (1 - sea)
      if (t < 0.06) c.copy(shore)
      else if (t < 0.5) c.copy(low).lerp(mid, t / 0.5)
      else c.copy(mid).lerp(high, (t - 0.5) / 0.5)
      if (t > biome.snowLine) c.lerp(SNOW, THREE.MathUtils.smoothstep(t, biome.snowLine, biome.snowLine + 0.12))
    }
    if (biome.polarCap && Math.abs(v.y) > 1 - biome.polarCap + capNoise(v) * 0.06) c.copy(SNOW)
    const r = 1 + h * amp
    pos.setXYZ(i, v.x * r, v.y * r, v.z * r)
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geo.computeVertexNormals()

  // 물 (또는 용암, 얼음 바다)
  const water =
    sea > -0.98
      ? new THREE.Mesh(
          new THREE.IcosahedronGeometry(1 + sea * amp, Math.max(3, Math.floor(detail * 0.6))),
          new THREE.MeshStandardMaterial({
            color: tone(biome.water),
            transparent: biome.waterOpacity < 1,
            opacity: biome.waterOpacity,
            roughness: biome.waterGlow ? 0.9 : 0.25,
            metalness: 0.05,
            flatShading: true,
            emissive: biome.waterGlow ? tone(biome.water) : new THREE.Color('#000000'),
            emissiveIntensity: biome.waterGlow ? 0.9 : 0,
          }),
        )
      : null

  // 소품
  const props: THREE.InstancedMesh[] = []
  const totalWeight = biome.props.reduce((s, p) => s + p.weight, 0)
  for (const spec of biome.props) {
    const count = Math.round((propBudget * profile.density * spec.weight) / totalWeight)
    if (!count) continue
    const placements = placeProps(spec, count, seed, noise, profile)
    for (const part of propParts(spec.kind)) props.push(instanced(part, placements))
  }

  // 구름
  let clouds: THREE.InstancedMesh | null = null
  const cloudCount = Math.round(cloudBudget * profile.clouds)
  if (cloudCount > 0) {
    const rand = seeded(seed + '/clouds')
    clouds = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(0.06, 1),
      new THREE.MeshStandardMaterial({ color: biome.cloudColor, transparent: true, opacity: 0.82, flatShading: true, roughness: 1 }),
      cloudCount,
    )
    const up = new THREE.Vector3(0, 1, 0)
    for (let i = 0; i < cloudCount; i++) {
      const dir = new THREE.Vector3(rand() - 0.5, (rand() - 0.5) * 1.4, rand() - 0.5).normalize()
      const q = new THREE.Quaternion().setFromUnitVectors(up, dir)
      const s = 0.6 + rand() * 1.1
      clouds.setMatrixAt(i, new THREE.Matrix4().compose(dir.multiplyScalar(1 + amp + 0.07), q, new THREE.Vector3(s * (1.4 + rand()), s * 0.35, s)))
    }
    clouds.instanceMatrix.needsUpdate = true
  }

  const dispose = () => {
    geo.dispose()
    water?.geometry.dispose()
    ;(water?.material as THREE.Material | undefined)?.dispose()
    for (const m of [...props, ...(clouds ? [clouds] : [])]) {
      m.geometry.dispose()
      ;(m.material as THREE.Material).dispose()
    }
  }

  return { geo, water, props, clouds, dispose }
}

// ---------------------------------------------------------------- cache
// 지은 행성을 잠시 보관한다: 태양계에서 행성으로 들어갔다 나오면 그 태양계의 행성들을 다시 짓지 않는다.
// 쓰는 곳이 없어진 지 1분이 지나면 버린다. (같은 열쇠의 행성이 두 곳에 동시에 걸릴 일은 없다 — 화질이 다르면 열쇠도 다르다)

type Built = ReturnType<typeof buildPlanet>
const planetCache = new Map<string, { built: Built; users: number; timer?: ReturnType<typeof setTimeout> }>()
const CACHE_TTL = 60_000

const keyOf = (profile: PlanetProfile, detail: number, propBudget: number, cloudBudget: number) =>
  `${profile.seed}|${profile.biome.name}|${detail}|${propBudget}|${cloudBudget}`

function dropLater(key: string) {
  const entry = planetCache.get(key)
  if (!entry) return
  clearTimeout(entry.timer)
  entry.timer = setTimeout(() => {
    if (entry.users > 0) return
    entry.built.dispose()
    planetCache.delete(key)
  }, CACHE_TTL)
}

function cached(profile: PlanetProfile, detail: number, propBudget: number, cloudBudget: number) {
  const key = keyOf(profile, detail, propBudget, cloudBudget)
  const hit = planetCache.get(key)
  if (hit) return hit.built
  const b = buildPlanet(profile, detail, propBudget, cloudBudget)
  planetCache.set(key, { built: b, users: 0 })
  return b
}

/**
 * 곧 들어갈지도 모를 행성을 미리 지어 둔다 (태양계 화면에서 쉬는 틈에, PlanetPrefetch).
 * 아무도 쓰지 않으면 1분 뒤 버린다. 이미 있으면 아무것도 안 한다.
 */
export function prewarmPlanet(profile: PlanetProfile, detail: number, propBudget: number, cloudBudget: number) {
  const key = keyOf(profile, detail, propBudget, cloudBudget)
  if (planetCache.has(key)) return planetCache.get(key)!.built
  const b = cached(profile, detail, propBudget, cloudBudget)
  dropLater(key)
  return b
}

/**
 * 행성 장면이 쓰는 재질들을 미리 컴파일한다. 처음 행성에 들어갈 때 셰이더 컴파일로 화면이 멈추지 않게.
 * 셰이더는 재질 종류·설정마다 한 번만 컴파일되면 되므로 행성 하나로 충분하다.
 * @param target 실제 장면 — 빛 구성이 같아야 같은 셰이더가 만들어진다
 */
// 미리 컴파일용 재질은 버리지 않는다: three.js는 아무 재질도 쓰지 않는 셰이더를 지워 버리므로,
// 이 재질들이 살아 있어야 컴파일해 둔 셰이더가 실제 행성 장면까지 남는다 (작은 재질 네 개뿐)
let warmMats: THREE.Material[] | null = null
const warmTiny = () => new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3))

export function compilePlanetMaterials(gl: THREE.WebGLRenderer, camera: THREE.Camera, target: THREE.Scene, built: Built) {
  const temp = new THREE.Scene()
  warmMats ??= [
    new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9 }), // 지형
    new THREE.MeshStandardMaterial({ transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false }), // 고리
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.12, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false }), // 대기권
    new THREE.PointsMaterial({ size: 2, sizeAttenuation: false, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), // 먼지
  ]
  const [terrainMat, ringMat, airMat, dustMat] = warmMats
  const tiny = warmTiny()
  temp.add(new THREE.Mesh(built.geo, terrainMat), new THREE.Mesh(built.geo, ringMat), new THREE.Mesh(built.geo, airMat), new THREE.Points(tiny, dustMat))
  // 행성의 실제 오브젝트는 다른 곳에 붙어 있을 수 있으므로 복제본으로 (지오메트리·재질은 공유)
  if (built.water) temp.add(built.water.clone())
  for (const m of built.props) temp.add(m.clone())
  if (built.clouds) temp.add(built.clouds.clone())
  gl.compile(temp, camera, target)
}

function usePlanetBuild(profile: PlanetProfile, detail: number, propBudget: number, cloudBudget: number) {
  const key = keyOf(profile, detail, propBudget, cloudBudget)
  const built = useMemo(() => cached(profile, detail, propBudget, cloudBudget), [key]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const entry = planetCache.get(key)
    if (!entry || entry.built !== built) return
    entry.users++
    clearTimeout(entry.timer)
    return () => {
      entry.users--
      if (entry.users === 0) dropLater(key)
    }
  }, [key, built])
  return built
}

// ---------------------------------------------------------------- component

type PlanetProps = ThreeElements['group'] & {
  profile: PlanetProfile
  detail?: number
  propBudget?: number
  cloudBudget?: number
  spin?: number
  atmosphere?: boolean
  /** 대기권 구의 분할 수 — 작게 보이는 태양계 속 행성은 낮게 */
  atmosphereDetail?: number
}

export default function Planet({
  profile,
  detail = 8,
  propBudget = 60,
  cloudBudget = 14,
  spin,
  atmosphere = true,
  atmosphereDetail = 48,
  ...group
}: PlanetProps) {
  const built = usePlanetBuild(profile, detail, propBudget, cloudBudget)
  const spinRef = useRef<THREE.Group>(null)
  const cloudRef = useRef<THREE.Group>(null)
  const speed = spin ?? profile.spin

  useFrame((_, dt) => {
    const t = dt * motion.scale
    if (spinRef.current) spinRef.current.rotation.y += t * speed
    if (cloudRef.current) cloudRef.current.rotation.y += t * speed * 1.5
  })

  const ringColor = profile.biome.land[2]

  return (
    <group {...group}>
      <group rotation={[profile.tilt, 0, profile.tilt * 0.5]}>
        <group ref={spinRef}>
          <mesh geometry={built.geo}>
            <meshStandardMaterial vertexColors flatShading roughness={0.9} />
          </mesh>
          {built.water && <primitive object={built.water} />}
          {built.props.map((m) => (
            <primitive key={m.uuid} object={m} />
          ))}
        </group>
        {built.clouds && (
          <group ref={cloudRef}>
            <primitive object={built.clouds} />
          </group>
        )}
        {profile.ring && (
          <mesh rotation={[-Math.PI / 2 + 0.25, 0, 0]}>
            <ringGeometry args={[1.5, 2.1, 96]} />
            <meshStandardMaterial color={ringColor} transparent opacity={0.4} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        )}
      </group>
      {atmosphere && (
        <mesh scale={1 + profile.amp + 0.07}>
          <sphereGeometry args={[1, atmosphereDetail, atmosphereDetail]} />
          <meshBasicMaterial
            color={profile.biome.glow}
            transparent
            opacity={0.12}
            side={THREE.BackSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}
    </group>
  )
}
