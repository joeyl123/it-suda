// 은하 본체 (design.md §4-A). 한 번 정해진 모양 'it-suda-galaxy' 시드로 늘 같은 은하.
//  - 팔 4개: 굵은 주팔 2 + 가는 보조팔 2, 각자 폭·길이·색·꼬임이 다르고 곁가지(spur)가 난다
//  - 중심: 노란 팽대부 + 블랙홀과 강착원반
//  - 성운 구름, 먼지띠, 구상성단, 젊은 청색 별, 헤일로, 위성 은하, 먼 배경 은하
//  - 모든 별은 크기가 제각각이고 반짝인다 (TwinklePoints 셰이더)
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { seeded } from '../lib/cosmos'
import { getGlowTexture } from './glow'
import { ARMS, armPoint } from '../lib/layout'

// ---------------------------------------------------------------- twinkle points

const vert = /* glsl */ `
  attribute float size;
  attribute float phase;
  attribute vec3 color;
  uniform float uTime;
  uniform float uPixelRatio;
  varying vec3 vColor;
  varying float vTwinkle;
  void main() {
    vColor = color;
    vTwinkle = 0.7 + 0.3 * sin(uTime * (0.8 + phase * 2.4) + phase * 6.2831);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * uPixelRatio * (0.85 + 0.15 * vTwinkle);
  }
`
const frag = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vTwinkle;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float a = pow(1.0 - d * 2.0, 1.6);
    gl_FragColor = vec4(vColor, a * vTwinkle * uOpacity);
    #include <colorspace_fragment>
  }
`

interface Star {
  p: [number, number, number]
  c: THREE.Color
  s: number
}

export function TwinklePoints({ stars, opacity = 1, blending = THREE.AdditiveBlending }: { stars: Star[]; opacity?: number; blending?: THREE.Blending }) {
  const { gl } = useThree()
  const { geometry, material } = useMemo(() => {
    const n = stars.length
    const pos = new Float32Array(n * 3)
    const col = new Float32Array(n * 3)
    const size = new Float32Array(n)
    const phase = new Float32Array(n)
    stars.forEach((st, i) => {
      pos.set(st.p, i * 3)
      col.set([st.c.r, st.c.g, st.c.b], i * 3)
      size[i] = st.s
      phase[i] = (Math.sin(i * 91.7) + 1) / 2
    })
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
    g.setAttribute('size', new THREE.BufferAttribute(size, 1))
    g.setAttribute('phase', new THREE.BufferAttribute(phase, 1))
    const m = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms: { uTime: { value: 0 }, uPixelRatio: { value: gl.getPixelRatio() }, uOpacity: { value: opacity } },
      transparent: true,
      depthWrite: false,
      blending,
    })
    return { geometry: g, material: m }
  }, [stars, opacity, blending, gl])

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )
  useFrame(({ clock }) => {
    material.uniforms.uTime.value = clock.elapsedTime
  })
  return <points geometry={geometry} material={material} frustumCulled={false} />
}

// ---------------------------------------------------------------- galaxy

// 은하 화면과 배경 은하(태양계·행성 뒤)가 같은 별 데이터를 쓰므로 한 번만 만든다
const galaxyCache = new Map<string, ReturnType<typeof buildGalaxyData>>()

function useGalaxyData(radius: number, density: number) {
  return useMemo(() => {
    const key = `${radius}|${density}`
    let data = galaxyCache.get(key)
    if (!data) galaxyCache.set(key, (data = buildGalaxyData(radius, density)))
    return data
  }, [radius, density])
}

function buildGalaxyData(radius: number, density: number) {
  {
    // 화면 품질에 따라 별 개수를 줄인다 (lib/quality)
    const scaled = (x: number) => Math.max(1, Math.round(x * density))
    const rand = seeded('it-suda-galaxy')
    const gauss = () => (rand() + rand() + rand() + rand() - 2) / 2
    const C = (hex: string) => new THREE.Color(hex)
    const disk: Star[] = []
    const dust: Star[] = []
    const young: Star[] = []
    const nebulae: { p: [number, number, number]; color: string; scale: number; opacity: number }[] = []

    // 팔
    for (const arm of ARMS) {
      const n = scaled(15000 * arm.weight)
      const [c0, c1] = arm.colors.map(C)
      for (let i = 0; i < n; i++) {
        const t = Math.pow(rand(), 0.8)
        const pt = armPoint(arm, t, radius, gauss() * 0.28 * arm.width)
        const spread = (0.35 + t * 1.5) * arm.width
        const c = C('#fff1c4').lerp(c0, Math.min(1, t * 2)).lerp(c1, Math.max(0, t * 1.6 - 0.6)).multiplyScalar(0.45 + rand() * 0.55)
        disk.push({ p: [pt.x + gauss() * spread, gauss() * 0.45 * (1 - t * 0.6), pt.z + gauss() * spread], c, s: 1.2 + rand() * rand() * 3.2 })
      }
      // 곁가지: 팔에서 바깥으로 비스듬히 뻗는 짧은 별줄기
      for (let k = 0; k < 4; k++) {
        const t0 = 0.25 + rand() * 0.6
        const base = armPoint(arm, t0, radius)
        const dirA = base.a + 0.9 + rand() * 0.5
        for (let i = 0; i < scaled(260 * arm.width); i++) {
          const u = rand()
          const r = base.r + u * radius * 0.25
          const a = dirA + (r - base.r) * 0.05
          const x = base.x + Math.cos(a) * (r - base.r) + gauss() * 0.5
          const z = base.z + Math.sin(a) * (r - base.r) + gauss() * 0.5
          disk.push({ p: [x, gauss() * 0.25, z], c: c0.clone().multiplyScalar(0.35 + rand() * 0.4), s: 1 + rand() * 1.8 })
        }
      }
      // 먼지띠: 팔 안쪽 가장자리를 따라
      for (let i = 0; i < scaled(1600 * arm.width); i++) {
        const t = 0.12 + rand() * 0.75
        const pt = armPoint(arm, t, radius, -0.22 * arm.width + gauss() * 0.06)
        dust.push({ p: [pt.x + gauss() * 0.35, gauss() * 0.15, pt.z + gauss() * 0.35], c: C('#0b0712'), s: 3 + rand() * 4 })
      }
      // 젊은 청색 별
      for (let i = 0; i < scaled(140 * arm.width); i++) {
        const pt = armPoint(arm, 0.2 + rand() * 0.75, radius, 0.12 + gauss() * 0.1)
        young.push({ p: [pt.x + gauss() * 0.6, gauss() * 0.2, pt.z + gauss() * 0.6], c: C(rand() < 0.7 ? '#cfe0ff' : '#ffffff'), s: 3 + rand() * 3.5 })
      }
      // 성운
      const nebulaColors = ['#ff8fc7', '#7fe6df', '#b898ea', '#f0946e', '#7aa8f0', '#c77dff']
      for (let i = 0; i < 9; i++) {
        const pt = armPoint(arm, 0.15 + rand() * 0.8, radius, gauss() * 0.2)
        nebulae.push({
          p: [pt.x + gauss(), gauss() * 0.3, pt.z + gauss()],
          color: nebulaColors[Math.floor(rand() * nebulaColors.length)],
          scale: (2 + rand() * 5) * arm.width,
          opacity: 0.06 + rand() * 0.14,
        })
      }
    }

    // 팽대부 (납작한 타원체)
    for (let i = 0; i < scaled(3800); i++) {
      const r = Math.abs(gauss()) * 2.6
      const a = rand() * Math.PI * 2
      const c = C('#fff1c4').lerp(C('#ffb36b'), rand() * 0.6).multiplyScalar(0.6 + rand() * 0.4)
      disk.push({ p: [Math.cos(a) * r * 1.2, gauss() * 0.7 * (1 - r / 6), Math.sin(a) * r], c, s: 1.2 + rand() * 2.4 })
    }

    // 구상성단
    for (let k = 0; k < 7; k++) {
      const a = rand() * Math.PI * 2
      const r = 4 + rand() * radius * 0.9
      const cx = Math.cos(a) * r, cz = Math.sin(a) * r, cy = (rand() - 0.5) * 5
      for (let i = 0; i < scaled(140); i++) {
        const d = Math.abs(gauss()) * 0.45
        const v = new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize().multiplyScalar(d)
        disk.push({ p: [cx + v.x, cy + v.y, cz + v.z], c: C('#ffe9c4').multiplyScalar(0.6 + rand() * 0.4), s: 1.4 + rand() * 2 })
      }
    }

    // 헤일로
    for (let i = 0; i < scaled(900); i++) {
      const v = new THREE.Vector3(rand() - 0.5, (rand() - 0.5) * 0.6, rand() - 0.5).normalize().multiplyScalar(radius * (0.3 + rand() * 1.1))
      disk.push({ p: [v.x, v.y, v.z], c: C('#d8cfe8').multiplyScalar(0.25 + rand() * 0.3), s: 1 + rand() * 1.4 })
    }

    // 위성 은하 (작은 타원 은하)
    const dwarf = new THREE.Vector3(radius * 1.25, 3.5, -radius * 0.55)
    for (let i = 0; i < scaled(1100); i++) {
      const r = Math.abs(gauss()) * 1.8
      const a = rand() * Math.PI * 2
      disk.push({
        p: [dwarf.x + Math.cos(a) * r * 1.6, dwarf.y + gauss() * 0.5, dwarf.z + Math.sin(a) * r],
        c: C('#cfe0ff').lerp(C('#ffffff'), rand()).multiplyScalar(0.4 + rand() * 0.5),
        s: 1 + rand() * 1.8,
      })
    }

    return { disk, dust, young, nebulae, dwarf }
  }
}

/** @param starsOnly 태양계·행성 화면의 배경용: 별 점만 (블랙홀·성운·먼지띠·배경 은하 없이 가볍게) */
export default function GalaxyBody({ radius, density = 1, starsOnly = false }: { radius: number; density?: number; starsOnly?: boolean }) {
  const spin = useRef<THREE.Group>(null)
  const data = useGalaxyData(radius, density)
  useFrame((_, dt) => {
    if (spin.current) spin.current.rotation.y -= dt * 0.012
  })
  return (
    <>
      <group ref={spin}>
        <TwinklePoints stars={data.disk} />
        <TwinklePoints stars={data.young} />
        {!starsOnly && (
          <>
            <TwinklePoints stars={data.dust} opacity={0.55} blending={THREE.NormalBlending} />
            {data.nebulae.map((n, i) => (
              <sprite key={i} position={n.p} scale={[n.scale, n.scale * 0.7, 1]}>
                <spriteMaterial map={getGlowTexture()} color={n.color} transparent opacity={n.opacity} depthWrite={false} blending={THREE.AdditiveBlending} />
              </sprite>
            ))}
            <sprite position={data.dwarf} scale={[7, 4, 1]}>
              <spriteMaterial map={getGlowTexture()} color="#cfe0ff" transparent opacity={0.18} depthWrite={false} blending={THREE.AdditiveBlending} />
            </sprite>
          </>
        )}
      </group>
      {!starsOnly && (
        <>
          <BlackHole />
          <DistantGalaxies />
        </>
      )}
    </>
  )
}

function BlackHole() {
  const disk = useRef<THREE.Group>(null)
  const diskGeo = useMemo(() => {
    // 안쪽은 뜨거운 흰빛, 바깥은 주황 → 보라로 식는 강착원반
    const g = new THREE.RingGeometry(0.75, 2.6, 96, 6)
    const pos = g.attributes.position
    const col = new Float32Array(pos.count * 3)
    const hot = new THREE.Color('#fff4dc'), warm = new THREE.Color('#ff9a4a'), cool = new THREE.Color('#6a3fa0')
    const v = new THREE.Vector3()
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i)
      const t = (v.length() - 0.75) / 1.85
      const c = t < 0.35 ? hot.clone().lerp(warm, t / 0.35) : warm.clone().lerp(cool, (t - 0.35) / 0.65)
      c.multiplyScalar((1 - t) * (0.8 + 0.2 * Math.sin(Math.atan2(v.y, v.x) * 7)))
      col.set([c.r, c.g, c.b], i * 3)
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
    return g
  }, [])
  useFrame((_, dt) => {
    if (disk.current) disk.current.rotation.z += dt * 0.6
  })
  return (
    <group>
      <sprite scale={[11, 11, 1]}>
        <spriteMaterial map={getGlowTexture()} color="#f2dc7e" transparent opacity={0.55} depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      <group rotation={[-Math.PI / 2 + 0.18, 0, 0]}>
        <group ref={disk}>
          <mesh geometry={diskGeo}>
            <meshBasicMaterial vertexColors transparent side={THREE.DoubleSide} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
        </group>
        {/* 광자 고리 */}
        <mesh>
          <torusGeometry args={[0.74, 0.03, 8, 64]} />
          <meshBasicMaterial color="#fff6e0" />
        </mesh>
      </group>
      <mesh>
        <sphereGeometry args={[0.66, 32, 24]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
    </group>
  )
}

function DistantGalaxies() {
  const items = useMemo(() => {
    const r = seeded('distant-galaxies')
    const colors = ['#b898ea', '#f0946e', '#7aa8f0', '#f2dc7e', '#ff8fc7']
    return Array.from({ length: 9 }, () => {
      const v = new THREE.Vector3(r() - 0.5, (r() - 0.5) * 0.8, r() - 0.5).normalize().multiplyScalar(95 + r() * 30)
      return { p: v.toArray() as [number, number, number], w: 3 + r() * 5, h: 0.8 + r() * 1.6, color: colors[Math.floor(r() * colors.length)], o: 0.2 + r() * 0.25 }
    })
  }, [])
  return (
    <>
      {items.map((g, i) => (
        <group key={i} position={g.p}>
          <sprite scale={[g.w, g.h, 1]}>
            <spriteMaterial map={getGlowTexture()} color={g.color} transparent opacity={g.o} depthWrite={false} blending={THREE.AdditiveBlending} />
          </sprite>
          <sprite scale={[g.w * 0.3, g.h * 0.4, 1]}>
            <spriteMaterial map={getGlowTexture()} color="#ffffff" transparent opacity={g.o + 0.2} depthWrite={false} blending={THREE.AdditiveBlending} />
          </sprite>
        </group>
      ))}
    </>
  )
}
