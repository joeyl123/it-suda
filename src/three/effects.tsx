// 3D 이스터에그 모음 (design.md §5-B)
// 별똥별 · 워프 · UFO · 우주인 · 우주 고래 · 소행성 · 소행성대 · 혜성 · 인공위성 · 로켓
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { seeded } from '../lib/cosmos'
import { ASTRONAUT_LINES, cosmicToast, pickLine, SATELLITE_LINES, UFO_LINES, WHALE_LINES } from '../lib/toast'
import { getGlowTexture } from './glow'

const rnd = Math.random
const ADD = THREE.AdditiveBlending

function setCursor(on: boolean) {
  document.body.style.cursor = on ? 'pointer' : ''
}

/** 클릭 가능한 이스터에그 공통 포인터 핸들러 */
function clickable(onClick: () => void) {
  return {
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation()
      onClick()
    },
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      setCursor(true)
    },
    onPointerOut: () => setCursor(false),
  }
}

function glowSprite(color: string, opacity = 1) {
  const s = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: getGlowTexture(), color, transparent: true, opacity, depthWrite: false, blending: ADD }),
  )
  return s
}

/** 울퉁불퉁한 바위. 같은 꼭짓점은 같은 만큼 움직여서 틈이 생기지 않는다. */
export function rockGeometry(seed: string, radius: number, detail = 1) {
  const r = seeded(seed)
  const axes = Array.from({ length: 4 }, () => ({ d: new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(), f: 2 + r() * 3, p: r() * 6 }))
  const g = new THREE.IcosahedronGeometry(radius, detail)
  const pos = g.attributes.position
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize()
    const k = 1 + axes.reduce((s, a) => s + Math.sin(v.dot(a.d) * a.f + a.p) * 0.12, 0)
    v.multiplyScalar(radius * k)
    pos.setXYZ(i, v.x, v.y, v.z)
  }
  g.computeVertexNormals()
  return g
}

// ---------------------------------------------------------------- 별똥별 (모든 장면)

export function ShootingStars({ count = 1 }: { count?: number }) {
  const { camera } = useThree()
  const items = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const geo = new THREE.BufferGeometry()
        geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3))
        geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array([1, 1, 1, 1, 0.6, 0.7, 1, 0]), 4))
        const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: ADD }))
        line.frustumCulled = false
        line.visible = false
        const head = glowSprite('#fff4dc')
        head.visible = false
        return { line, head, wait: 6 + i * 8 + rnd() * 8, t: 0, life: 1, start: new THREE.Vector3(), dir: new THREE.Vector3(), speed: 0, len: 0 }
      }),
    [count],
  )
  const tmp = useMemo(() => ({ right: new THREE.Vector3(), up: new THREE.Vector3(), h: new THREE.Vector3(), tl: new THREE.Vector3() }), [])

  useFrame((_, dt) => {
    const zoom = (camera as THREE.OrthographicCamera).zoom
    tmp.right.setFromMatrixColumn(camera.matrixWorld, 0)
    tmp.up.setFromMatrixColumn(camera.matrixWorld, 1)
    for (const m of items) {
      if (m.wait > 0) {
        m.wait -= dt
        if (m.wait > 0) continue
        // 화면 위쪽 어딘가에서 비스듬히 아래로
        m.start.set(rnd() * 1.6 - 0.8, rnd() * 0.8 - 0.05, 0.6).unproject(camera)
        const a = -(0.3 + rnd() * 0.6)
        const sx = rnd() < 0.5 ? 1 : -1
        m.dir.copy(tmp.right).multiplyScalar(Math.cos(a) * sx).addScaledVector(tmp.up, Math.sin(a)).normalize()
        m.speed = 650 + rnd() * 650
        m.len = 110 + rnd() * 170
        m.life = 0.55 + rnd() * 0.5
        m.t = 0
        m.line.visible = m.head.visible = true
      }
      m.t += dt
      const k = m.t / m.life
      if (k >= 1) {
        m.line.visible = m.head.visible = false
        m.wait = 10 + rnd() * 15
        continue
      }
      tmp.h.copy(m.start).addScaledVector(m.dir, (m.speed * m.t) / zoom)
      tmp.tl.copy(tmp.h).addScaledVector(m.dir, -(m.len * Math.min(1, k * 3)) / zoom)
      const pos = m.line.geometry.attributes.position as THREE.BufferAttribute
      pos.setXYZ(0, tmp.h.x, tmp.h.y, tmp.h.z)
      pos.setXYZ(1, tmp.tl.x, tmp.tl.y, tmp.tl.z)
      pos.needsUpdate = true
      const fade = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3
      ;(m.line.material as THREE.LineBasicMaterial).opacity = fade
      m.head.position.copy(tmp.h)
      m.head.scale.setScalar(16 / zoom)
      m.head.material.opacity = fade
    }
  })

  return (
    <>
      {items.map((m, i) => (
        <group key={i}>
          <primitive object={m.line} />
          <primitive object={m.head} />
        </group>
      ))}
    </>
  )
}

// ---------------------------------------------------------------- 워프 (코나미 코드 / "suda")

const KONAMI = ['arrowup', 'arrowup', 'arrowdown', 'arrowdown', 'arrowleft', 'arrowright', 'arrowleft', 'arrowright', 'b', 'a']
const WARP_SECONDS = 2.8

export function Warp({ count = 220 }: { count?: number }) {
  const { camera } = useThree()
  const started = useRef(-1)
  const streaks = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 6), 3))
    const col = new Float32Array(count * 8)
    const tints = ['#ffffff', '#b898ea', '#a8dcf0', '#f2dc7e']
    for (let i = 0; i < count; i++) {
      const c = new THREE.Color(tints[i % tints.length])
      col.set([c.r, c.g, c.b, 1, c.r, c.g, c.b, 0], i * 8)
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 4))
    const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, depthTest: false, blending: ADD }))
    lines.frustumCulled = false
    lines.renderOrder = 999
    lines.visible = false
    const seeds = Array.from({ length: count }, () => ({ a: rnd() * Math.PI * 2, r: 20 + rnd() * 200, v: 0.6 + rnd() * 0.9 }))
    return { lines, seeds }
  }, [count])
  const tmp = useMemo(() => ({ right: new THREE.Vector3(), up: new THREE.Vector3(), c: new THREE.Vector3() }), [])

  useEffect(() => {
    let keys: string[] = []
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      keys = [...keys, e.key.toLowerCase()].slice(-10)
      const konami = keys.join() === KONAMI.join()
      const suda = keys.slice(-4).join('') === 'suda'
      if (konami || suda) {
        keys = []
        started.current = performance.now()
        cosmicToast('🚀 워프 드라이브 가동! 꽉 잡으세요')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useFrame(() => {
    const { lines, seeds } = streaks
    if (started.current < 0) return
    const t = (performance.now() - started.current) / 1000
    if (t > WARP_SECONDS) {
      lines.visible = false
      started.current = -1
      return
    }
    lines.visible = true
    const zoom = (camera as THREE.OrthographicCamera).zoom
    tmp.right.setFromMatrixColumn(camera.matrixWorld, 0)
    tmp.up.setFromMatrixColumn(camera.matrixWorld, 1)
    tmp.c.set(0, 0, -0.9).unproject(camera)
    const pos = lines.geometry.attributes.position as THREE.BufferAttribute
    const accel = t * t * 900
    seeds.forEach((s, i) => {
      const r0 = (s.r + accel * s.v) % 900
      const r1 = r0 + 30 + t * 220 * s.v
      const cx = Math.cos(s.a), cy = Math.sin(s.a)
      for (const [j, r] of [[0, r1], [1, r0]] as const) {
        const x = tmp.c.x + (tmp.right.x * cx + tmp.up.x * cy) * (r / zoom)
        const y = tmp.c.y + (tmp.right.y * cx + tmp.up.y * cy) * (r / zoom)
        const z = tmp.c.z + (tmp.right.z * cx + tmp.up.z * cy) * (r / zoom)
        pos.setXYZ(i * 2 + j, x, y, z)
      }
    })
    pos.needsUpdate = true
    const fade = Math.min(1, t * 3, (WARP_SECONDS - t) * 2)
    ;(lines.material as THREE.LineBasicMaterial).opacity = fade
  })

  return <primitive object={streaks.lines} />
}

// ---------------------------------------------------------------- UFO

function UfoModel({ beam }: { beam: React.RefObject<THREE.Mesh | null> }) {
  const lights = useRef<(THREE.Mesh | null)[]>([])
  const colors = ['#ff6a6a', '#ffd84a', '#6aff9a', '#6ad8ff', '#c77dff', '#ff8fc7', '#ffffff', '#ffb36b']
  useFrame(({ clock }) => {
    lights.current.forEach((m, i) => {
      if (m) (m.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.4 + Math.max(0, Math.sin(clock.elapsedTime * 6 - i * 0.8)) * 2.2
    })
  })
  return (
    <group>
      <mesh scale={[1, 0.24, 1]}>
        <sphereGeometry args={[1, 28, 14]} />
        <meshStandardMaterial color="#b8bcc8" metalness={0.7} roughness={0.28} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.98, 0.06, 8, 40]} />
        <meshStandardMaterial color="#6f7480" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.12, 0]}>
        <sphereGeometry args={[0.46, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#7fe6ff" emissive="#3fb6d6" emissiveIntensity={0.6} transparent opacity={0.7} />
      </mesh>
      {/* 조종사 */}
      <mesh position={[0, 0.25, 0]}>
        <sphereGeometry args={[0.12, 12, 10]} />
        <meshStandardMaterial color="#8fe08a" />
      </mesh>
      {colors.map((c, i) => {
        const a = (i / colors.length) * Math.PI * 2
        return (
          <mesh key={i} ref={(m) => void (lights.current[i] = m)} position={[Math.cos(a) * 0.86, -0.04, Math.sin(a) * 0.86]}>
            <sphereGeometry args={[0.07, 8, 6]} />
            <meshStandardMaterial color={c} emissive={c} emissiveIntensity={1} />
          </mesh>
        )
      })}
      <mesh ref={beam} position={[0, -1.7, 0]} visible={false}>
        <cylinderGeometry args={[0.22, 1.1, 3.2, 24, 1, true]} />
        <meshBasicMaterial color="#bfffe8" transparent opacity={0.28} side={THREE.DoubleSide} depthWrite={false} blending={ADD} />
      </mesh>
    </group>
  )
}

/**
 * flyby: 가끔 화면을 가로질러 날아간다 (은하)
 * orbit: 행성 주위를 맴돌며 가끔 광선을 쏜다 (행성)
 */
export function Ufo({ mode, span = 12, scale = 0.6 }: { mode: 'flyby' | 'orbit'; span?: number; scale?: number }) {
  const group = useRef<THREE.Group>(null)
  const beam = useRef<THREE.Mesh>(null)
  const st = useRef({ t: 0, wait: mode === 'flyby' ? 40 + rnd() * 40 : 0, from: new THREE.Vector3(), to: new THREE.Vector3(), hold: 0, beamUntil: 0, angle: rnd() * 6 })
  const q = useMemo(() => new THREE.Quaternion(), [])
  const down = useMemo(() => new THREE.Vector3(0, -1, 0), [])

  const poke = () => {
    st.current.hold = 2.6
    st.current.beamUntil = performance.now() + 2600
    cosmicToast(pickLine(UFO_LINES))
  }

  useFrame(({ clock }, dt) => {
    const g = group.current
    const s = st.current
    if (!g) return
    const now = performance.now()
    if (beam.current) {
      beam.current.visible = now < s.beamUntil
      ;(beam.current.material as THREE.MeshBasicMaterial).opacity = 0.2 + Math.sin(clock.elapsedTime * 20) * 0.06
    }
    if (s.hold > 0) {
      s.hold -= dt
      g.position.y += Math.sin(clock.elapsedTime * 8) * 0.002
      return
    }
    if (mode === 'orbit') {
      s.angle += dt * 0.35
      const r = span
      g.position.set(Math.cos(s.angle) * r, Math.sin(s.angle * 0.7) * r * 0.35, Math.sin(s.angle) * r)
      // 배가 항상 행성 쪽을 보게
      q.setFromUnitVectors(down, g.position.clone().normalize().negate())
      g.quaternion.slerp(q, 0.1)
      if (rnd() < dt * 0.06) s.beamUntil = now + 1800
      return
    }
    // flyby
    if (s.wait > 0) {
      s.wait -= dt
      g.visible = false
      if (s.wait <= 0) {
        const a = rnd() * Math.PI * 2
        s.from.set(Math.cos(a) * span, 2 + rnd() * 3, Math.sin(a) * span)
        s.to.set(-Math.cos(a + 0.6) * span, 1 + rnd() * 3, -Math.sin(a + 0.6) * span)
        s.t = 0
      }
      return
    }
    g.visible = true
    s.t += dt / 11
    if (s.t >= 1) {
      s.wait = 90 + rnd() * 90
      return
    }
    g.position.lerpVectors(s.from, s.to, s.t)
    g.position.y += Math.sin(s.t * Math.PI * 6) * 0.6
    g.rotation.z = Math.sin(clock.elapsedTime * 3) * 0.12
  })

  return (
    <group ref={group} scale={scale} {...clickable(poke)}>
      <UfoModel beam={beam} />
    </group>
  )
}

// ---------------------------------------------------------------- 우주인

export function Astronaut({ span = 14 }: { span?: number }) {
  const group = useRef<THREE.Group>(null)
  const st = useRef({ t: 0, wait: 75 + rnd() * 60, spin: 0, from: new THREE.Vector3(), to: new THREE.Vector3() })
  const poke = () => {
    st.current.spin = 1.2
    cosmicToast(pickLine(ASTRONAUT_LINES))
  }
  useFrame((_, dt) => {
    const g = group.current
    const s = st.current
    if (!g) return
    if (s.wait > 0) {
      s.wait -= dt
      g.visible = false
      if (s.wait <= 0) {
        const a = rnd() * Math.PI * 2
        s.from.set(Math.cos(a) * span, 4 + rnd() * 2, Math.sin(a) * span)
        s.to.set(Math.cos(a + 2.2) * span, 1 + rnd() * 2, Math.sin(a + 2.2) * span)
        s.t = 0
      }
      return
    }
    g.visible = true
    s.t += dt / 45
    if (s.t >= 1) {
      s.wait = 150 + rnd() * 120
      return
    }
    g.position.lerpVectors(s.from, s.to, s.t)
    g.rotation.x += dt * 0.25
    g.rotation.z += dt * 0.15
    if (s.spin > 0) {
      s.spin -= dt
      g.rotation.y += dt * 9
    }
  })
  const white = <meshStandardMaterial color="#f4f4f4" roughness={0.6} />
  return (
    <group ref={group} scale={0.75} {...clickable(poke)}>
      <mesh>{<capsuleGeometry args={[0.2, 0.32, 6, 12]} />}{white}</mesh>
      <mesh position={[0, 0.46, 0]}>
        <sphereGeometry args={[0.2, 16, 12]} />
        {white}
      </mesh>
      <mesh position={[0, 0.47, 0.11]} scale={[1, 0.8, 0.6]}>
        <sphereGeometry args={[0.14, 16, 12]} />
        <meshStandardMaterial color="#f0946e" metalness={0.9} roughness={0.15} emissive="#5a2a10" />
      </mesh>
      <mesh position={[0, 0.06, -0.2]}>
        <boxGeometry args={[0.3, 0.36, 0.14]} />
        <meshStandardMaterial color="#d8d8d8" />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 0.28, 0.08, 0]} rotation={[0, 0, s * 0.9]}>
            <capsuleGeometry args={[0.07, 0.22, 4, 8]} />
            {white}
          </mesh>
          <mesh position={[s * 0.1, -0.4, 0]} rotation={[0, 0, s * 0.15]}>
            <capsuleGeometry args={[0.08, 0.24, 4, 8]} />
            {white}
          </mesh>
        </group>
      ))}
      <mesh position={[0.04, 0.2, 0.19]}>
        <boxGeometry args={[0.1, 0.06, 0.02]} />
        <meshStandardMaterial color="#b898ea" emissive="#b898ea" emissiveIntensity={0.8} />
      </mesh>
    </group>
  )
}

// ---------------------------------------------------------------- 우주 고래

export function SpaceWhale({ radius = 16 }: { radius?: number }) {
  const group = useRef<THREE.Group>(null)
  const tail = useRef<THREE.Group>(null)
  const dust = useRef<THREE.Points>(null)
  const st = useRef({ a: rnd() * 6, spout: 0, wait: 50 + rnd() * 40, swim: 0 })
  const look = useMemo(() => new THREE.Vector3(), [])
  const dustGeo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(60 * 3), 3))
    return g
  }, [])
  const dustVel = useMemo(() => Array.from({ length: 60 }, () => new THREE.Vector3((rnd() - 0.5) * 1.2, 1.5 + rnd() * 2.5, (rnd() - 0.5) * 1.2)), [])

  const poke = () => {
    st.current.spout = 1.6
    cosmicToast(pickLine(WHALE_LINES))
  }

  useFrame(({ clock }, dt) => {
    const g = group.current
    const s = st.current
    if (!g) return
    if (s.wait > 0) {
      s.wait -= dt
      g.visible = false
      if (s.wait <= 0) s.swim = 40
      return
    }
    s.swim -= dt
    if (s.swim <= 0) {
      s.wait = 180 + rnd() * 120
      return
    }
    g.visible = true
    s.a += dt * 0.035
    const y = 3.5 + Math.sin(s.a * 3) * 0.8
    g.position.set(Math.cos(s.a) * radius, y, Math.sin(s.a) * radius)
    look.set(Math.cos(s.a + 0.05) * radius, y + Math.cos(s.a * 3) * 0.12, Math.sin(s.a + 0.05) * radius)
    g.lookAt(look)
    if (tail.current) tail.current.rotation.x = Math.sin(clock.elapsedTime * 1.6) * 0.35
    // 물 대신 별가루를 뿜는다
    const pts = dust.current
    if (pts) {
      pts.visible = s.spout > 0
      if (s.spout > 0) {
        const age = 1.6 - s.spout
        s.spout -= dt
        const pos = dustGeo.attributes.position as THREE.BufferAttribute
        dustVel.forEach((v, i) => pos.setXYZ(i, v.x * age, 0.6 + v.y * age - age * age * 1.4, 0.7 + v.z * age))
        pos.needsUpdate = true
        ;(pts.material as THREE.PointsMaterial).opacity = Math.min(1, s.spout)
      }
    }
  })

  const body = '#5b6fb8'
  return (
    <group ref={group} scale={0.55} {...clickable(poke)}>
      {/* 모델은 +z 방향을 본다 (lookAt) */}
      <mesh scale={[0.95, 0.85, 2.4]}>
        <sphereGeometry args={[1, 20, 14]} />
        <meshStandardMaterial color={body} flatShading roughness={0.7} />
      </mesh>
      <mesh position={[0, -0.28, 0.15]} scale={[0.82, 0.6, 2.1]}>
        <sphereGeometry args={[1, 18, 12]} />
        <meshStandardMaterial color="#cfd8ff" flatShading />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 0.45, 0.2, 1.45]}>
            <sphereGeometry args={[0.09, 8, 6]} />
            <meshStandardMaterial color="#14102a" />
          </mesh>
          <mesh position={[s * 1.0, -0.35, 0.6]} rotation={[0.2, 0, s * 0.7]} scale={[0.9, 0.08, 0.45]}>
            <sphereGeometry args={[1, 10, 6]} />
            <meshStandardMaterial color={body} flatShading />
          </mesh>
        </group>
      ))}
      <group ref={tail} position={[0, 0, -2.2]}>
        <mesh position={[0, 0, -0.5]} scale={[0.35, 0.3, 0.9]}>
          <sphereGeometry args={[1, 10, 8]} />
          <meshStandardMaterial color={body} flatShading />
        </mesh>
        <mesh position={[0, 0, -1.25]} scale={[1.3, 0.07, 0.45]}>
          <sphereGeometry args={[1, 12, 6]} />
          <meshStandardMaterial color={body} flatShading />
        </mesh>
      </group>
      {/* 몸에 박힌 별무늬 */}
      {[[0.5, 0.55, 0.8], [-0.4, 0.62, 0.2], [0.2, 0.7, -0.6], [-0.6, 0.45, -1.1]].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]}>
          <sphereGeometry args={[0.05, 6, 4]} />
          <meshBasicMaterial color="#f2dc7e" />
        </mesh>
      ))}
      <points ref={dust} geometry={dustGeo} visible={false}>
        <pointsMaterial color="#f2dc7e" size={3} sizeAttenuation={false} transparent depthWrite={false} blending={ADD} />
      </points>
    </group>
  )
}

// ---------------------------------------------------------------- 떠다니는 소행성 (클릭하면 펑)

let asteroidScore = 0

function Burst({ at, color, onDone }: { at: THREE.Vector3; color: string; onDone: () => void }) {
  const ref = useRef<THREE.Points>(null)
  const age = useRef(0)
  const { geo, vel } = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(48 * 3), 3))
    return { geo: g, vel: Array.from({ length: 48 }, () => new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize().multiplyScalar(1 + rnd() * 2.5)) }
  }, [])
  useFrame((_, dt) => {
    age.current += dt
    const pos = geo.attributes.position as THREE.BufferAttribute
    vel.forEach((v, i) => pos.setXYZ(i, at.x + v.x * age.current, at.y + v.y * age.current, at.z + v.z * age.current))
    pos.needsUpdate = true
    if (ref.current) (ref.current.material as THREE.PointsMaterial).opacity = Math.max(0, 1 - age.current / 1.2)
    if (age.current > 1.2) onDone()
  })
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial color={color} size={3.5} sizeAttenuation={false} transparent depthWrite={false} blending={ADD} />
    </points>
  )
}

function DriftingRock({ span, index }: { span: number; index: number }) {
  const ref = useRef<THREE.Mesh>(null)
  const geo = useMemo(() => rockGeometry('drift' + index, 0.35 + rnd() * 0.35), [index])
  const st = useRef({ pos: new THREE.Vector3(), vel: new THREE.Vector3(), spin: new THREE.Vector3(), alive: false, wait: 20 + index * 30 + rnd() * 20 })
  const [burst, setBurst] = useState<THREE.Vector3 | null>(null)

  const respawn = () => {
    const s = st.current
    const a = rnd() * Math.PI * 2
    s.pos.set(Math.cos(a) * span, (rnd() - 0.3) * 4, Math.sin(a) * span)
    s.vel.set(-Math.cos(a + (rnd() - 0.5)), (rnd() - 0.5) * 0.1, -Math.sin(a + (rnd() - 0.5))).multiplyScalar(0.6 + rnd() * 0.8)
    s.spin.set(rnd(), rnd(), rnd()).multiplyScalar(1.5)
    s.alive = true
  }

  const poke = () => {
    const s = st.current
    s.alive = false
    s.wait = 30 + rnd() * 30
    asteroidScore += 100
    setBurst(s.pos.clone())
    cosmicToast(`💥 소행성 격파! +100 (총 ${asteroidScore}점)`)
  }

  useFrame((_, dt) => {
    const m = ref.current
    const s = st.current
    if (!m) return
    if (!s.alive) {
      m.visible = false
      s.wait -= dt
      if (s.wait <= 0) respawn()
      return
    }
    m.visible = true
    s.pos.addScaledVector(s.vel, dt)
    m.position.copy(s.pos)
    m.rotation.x += s.spin.x * dt
    m.rotation.y += s.spin.y * dt
    if (s.pos.length() > span * 1.15) {
      s.alive = false
      s.wait = 20 + rnd() * 30
    }
  })

  return (
    <>
      <mesh ref={ref} geometry={geo} visible={false} {...clickable(poke)}>
        <meshStandardMaterial color="#8a7f74" flatShading roughness={0.95} />
      </mesh>
      {burst && <Burst at={burst} color="#ffb36b" onDone={() => setBurst(null)} />}
    </>
  )
}

export function DriftingAsteroids({ count = 1, span = 16 }: { count?: number; span?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <DriftingRock key={i} index={i} span={span} />
      ))}
    </>
  )
}

// ---------------------------------------------------------------- 소행성대 (태양계)

export function AsteroidBelt({ inner, outer, seed, count = 280 }: { inner: number; outer: number; seed: number; count?: number }) {
  const ref = useRef<THREE.Group>(null)
  const mesh = useMemo(() => {
    const r = seeded(seed + '/belt')
    const m = new THREE.InstancedMesh(rockGeometry('belt' + seed, 0.07, 0), new THREE.MeshStandardMaterial({ flatShading: true, roughness: 1 }), count)
    const tones = ['#8a7f74', '#6f665e', '#a0907c', '#7a6a5a'].map((c) => new THREE.Color(c))
    const q = new THREE.Quaternion()
    const e = new THREE.Euler()
    for (let i = 0; i < count; i++) {
      const a = r() * Math.PI * 2
      const rad = inner + r() * (outer - inner)
      const s = 0.4 + r() * r() * 2.2
      q.setFromEuler(e.set(r() * 6, r() * 6, r() * 6))
      m.setMatrixAt(i, new THREE.Matrix4().compose(new THREE.Vector3(Math.cos(a) * rad, (r() - 0.5) * 0.25, Math.sin(a) * rad), q, new THREE.Vector3(s, s * (0.6 + r() * 0.6), s)))
      m.setColorAt(i, tones[Math.floor(r() * tones.length)])
    }
    m.instanceMatrix.needsUpdate = true
    return m
  }, [inner, outer, seed, count])
  useEffect(() => () => {
    mesh.geometry.dispose()
    ;(mesh.material as THREE.Material).dispose()
  }, [mesh])
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.03
  })
  return (
    <group ref={ref}>
      <primitive object={mesh} />
    </group>
  )
}

// ---------------------------------------------------------------- 혜성 (태양계)

export function Comet({ a, e, seed, tilt = 0.25 }: { a: number; e: number; seed: number; tilt?: number }) {
  const head = useRef<THREE.Group>(null)
  const tail = useRef<THREE.Points>(null)
  const N = 70
  const st = useRef({ theta: seeded(seed + '/comet')() * Math.PI * 2 })
  const { tailGeo, path } = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3))
    const col = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) {
      const c = new THREE.Color('#bfe6ff').lerp(new THREE.Color('#6a3fa0'), i / N).multiplyScalar(1 - i / N)
      col.set([c.r, c.g, c.b], i * 3)
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
    const pts: THREE.Vector3[] = []
    for (let i = 0; i <= 160; i++) {
      const th = (i / 160) * Math.PI * 2
      const r = (a * (1 - e * e)) / (1 + e * Math.cos(th))
      pts.push(new THREE.Vector3(Math.cos(th) * r, 0, Math.sin(th) * r))
    }
    return { tailGeo: g, path: new THREE.BufferGeometry().setFromPoints(pts) }
  }, [a, e])
  const tmp = useMemo(() => ({ p: new THREE.Vector3(), away: new THREE.Vector3(), side: new THREE.Vector3() }), [])

  useFrame((_, dt) => {
    const s = st.current
    const r = (a * (1 - e * e)) / (1 + e * Math.cos(s.theta))
    s.theta += (dt * 2.2) / (r * r) * a // 태양 가까이서 빨라진다 (케플러 제2법칙 흉내)
    tmp.p.set(Math.cos(s.theta) * r, 0, Math.sin(s.theta) * r)
    head.current?.position.copy(tmp.p)
    // 꼬리는 언제나 태양 반대쪽
    tmp.away.copy(tmp.p).normalize()
    tmp.side.set(-tmp.away.z, 0, tmp.away.x)
    const len = 2.8 * (a / r) ** 0.8
    const pos = tailGeo.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < N; i++) {
      const k = i / N
      const wob = Math.sin(i * 12.9898) * 0.5 * k * k
      pos.setXYZ(i, tmp.p.x + tmp.away.x * len * k + tmp.side.x * wob, Math.sin(i * 7.1) * 0.12 * k, tmp.p.z + tmp.away.z * len * k + tmp.side.z * wob)
    }
    pos.needsUpdate = true
  })

  return (
    <group rotation={[tilt, 0.6, 0]}>
      <lineLoop geometry={path}>
        <lineBasicMaterial color="#bfe6ff" transparent opacity={0.08} />
      </lineLoop>
      <group ref={head}>
        <mesh>
          <icosahedronGeometry args={[0.12, 1]} />
          <meshBasicMaterial color="#eaf6ff" />
        </mesh>
        <sprite scale={[1.4, 1.4, 1]}>
          <spriteMaterial map={getGlowTexture()} color="#9fd8ff" transparent depthWrite={false} blending={ADD} />
        </sprite>
      </group>
      <points ref={tail} geometry={tailGeo}>
        <pointsMaterial vertexColors size={3} sizeAttenuation={false} transparent opacity={0.9} depthWrite={false} blending={ADD} />
      </points>
    </group>
  )
}

// ---------------------------------------------------------------- 인공위성 (행성)

export function Satellite({ radius = 1.6, tilt = 0.6 }: { radius?: number; tilt?: number }) {
  const ref = useRef<THREE.Group>(null)
  const blink = useRef<THREE.Mesh>(null)
  const st = useRef({ a: rnd() * 6 })
  useFrame(({ clock }, dt) => {
    st.current.a += dt * 0.5
    const a = st.current.a
    ref.current?.position.set(Math.cos(a) * radius, 0, Math.sin(a) * radius)
    if (ref.current) ref.current.rotation.y = -a
    if (blink.current) blink.current.visible = Math.sin(clock.elapsedTime * 5) > 0.6
  })
  return (
    <group rotation={[tilt, 0, 0.3]}>
      <group ref={ref} scale={0.9} {...clickable(() => cosmicToast(pickLine(SATELLITE_LINES)))}>
        <mesh>
          <boxGeometry args={[0.07, 0.07, 0.1]} />
          <meshStandardMaterial color="#d8b45a" metalness={0.8} roughness={0.3} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.13, 0, 0]}>
            <boxGeometry args={[0.16, 0.004, 0.07]} />
            <meshStandardMaterial color="#2a4f9a" emissive="#1a3a8a" emissiveIntensity={0.5} metalness={0.5} />
          </mesh>
        ))}
        <mesh position={[0, 0.07, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.04, 0.03, 12, 1, true]} />
          <meshStandardMaterial color="#e8e8e8" side={THREE.DoubleSide} />
        </mesh>
        <mesh ref={blink} position={[0, -0.05, 0.05]}>
          <sphereGeometry args={[0.012, 6, 4]} />
          <meshBasicMaterial color="#ff4a4a" />
        </mesh>
      </group>
    </group>
  )
}

// ---------------------------------------------------------------- 로켓 발사 (행성 클릭)

export interface Launch {
  id: number
  dir: THREE.Vector3
}

function Rocket({ dir, surface, onDone }: { dir: THREE.Vector3; surface: number; onDone: () => void }) {
  const ref = useRef<THREE.Group>(null)
  const flame = useRef<THREE.Mesh>(null)
  const smoke = useRef<THREE.Points>(null)
  const age = useRef(0)
  const q = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir), [dir])
  const smokeGeo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(40 * 3), 3))
    return g
  }, [])
  const jitter = useMemo(() => Array.from({ length: 40 }, () => new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(0.05)), [])

  useFrame(({ clock }, dt) => {
    age.current += dt
    const t = age.current
    const h = surface + 0.02 + (t < 0.6 ? 0 : (t - 0.6) ** 2 * 0.9)
    ref.current?.position.copy(dir).multiplyScalar(h)
    if (flame.current) flame.current.scale.set(1, 0.7 + Math.sin(clock.elapsedTime * 40) * 0.3 + Math.min(1, t), 1)
    const pos = smokeGeo.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < 40; i++) {
      const k = i / 40
      const r = surface + 0.02 + Math.max(0, h - surface - 0.02) * (1 - k)
      pos.setXYZ(i, dir.x * r + jitter[i].x * (1 + k * 4), dir.y * r + jitter[i].y * (1 + k * 4), dir.z * r + jitter[i].z * (1 + k * 4))
    }
    pos.needsUpdate = true
    if (smoke.current) (smoke.current.material as THREE.PointsMaterial).opacity = Math.max(0, 0.7 - t * 0.15)
    if (t > 4.5) onDone()
  })

  return (
    <>
      <group ref={ref} quaternion={q} scale={0.6}>
        <mesh position={[0, 0.06, 0]}>
          <cylinderGeometry args={[0.022, 0.026, 0.12, 10]} />
          <meshStandardMaterial color="#f4f4f4" />
        </mesh>
        <mesh position={[0, 0.145, 0]}>
          <coneGeometry args={[0.022, 0.05, 10]} />
          <meshStandardMaterial color="#f0946e" />
        </mesh>
        {[0, 1, 2].map((i) => (
          <mesh key={i} position={[Math.cos((i * Math.PI * 2) / 3) * 0.028, 0.015, Math.sin((i * Math.PI * 2) / 3) * 0.028]} rotation={[0, (-i * Math.PI * 2) / 3, 0]}>
            <boxGeometry args={[0.02, 0.03, 0.004]} />
            <meshStandardMaterial color="#b898ea" />
          </mesh>
        ))}
        <mesh ref={flame} position={[0, -0.02, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.018, 0.06, 8]} />
          <meshBasicMaterial color="#ffb347" transparent opacity={0.9} blending={ADD} />
        </mesh>
      </group>
      <points ref={smoke} geometry={smokeGeo}>
        <pointsMaterial color="#e8e2da" size={4} sizeAttenuation={false} transparent depthWrite={false} />
      </points>
    </>
  )
}

/** 행성 표면에서 로켓 발사: 클릭한 지점 + 가끔 저절로 */
export function RocketPad({ launches, surface, onDone }: { launches: Launch[]; surface: number; onDone: (id: number) => void }) {
  return (
    <>
      {launches.map((l) => (
        <Rocket key={l.id} dir={l.dir} surface={surface} onDone={() => onDone(l.id)} />
      ))}
    </>
  )
}
