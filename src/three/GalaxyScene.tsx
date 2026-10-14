import { useMemo, useRef, useState, type CSSProperties } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { planetColors, planetProfile, seeded, systemProfile } from '../lib/cosmos'
import { formatDate, pad2, type Session } from '../lib/sessions'
import { Anchor, Glow, IsoStage, OrbitRing, useHoverCursor, useLabelRegistry, type LabelRegistry } from './common'

const ARMS = 3
const TWIST = 0.32

/** 오래된 회차가 은하 중심 가까이, 최신 회차가 바깥쪽 나선 팔에 놓인다. */
function systemPosition(i: number): [number, number, number] {
  const r = 4 + i * 2.6
  const a = r * TWIST + (i % ARMS) * ((Math.PI * 2) / ARMS)
  return [Math.cos(a) * r, 0, Math.sin(a) * r]
}

interface Props {
  sessions: Session[]
  matches: Set<string>
  /** 이 태양계로 파고드는 중 (전환 직전) */
  focus: string | null
  onSelect: (slug: string) => void
}

export default function GalaxyScene({ sessions, matches, focus, onSelect }: Props) {
  const ordered = useMemo(() => [...sessions].sort((a, b) => a.date.localeCompare(b.date)), [sessions])
  const radius = Math.max(14, 4 + ordered.length * 2.6 + 5)
  const [hovered, setHovered] = useState<string | null>(null)
  useHoverCursor(hovered !== null && !focus)
  const { registry, bind } = useLabelRegistry()
  const hover = (slug: string) => (on: boolean) => setHovered((h) => (on ? slug : h === slug ? null : h))

  return (
    <>
      <IsoStage extent={radius * 0.8} pan autoRotate={hovered === null} offsetX={460} focus={focus} registry={registry}>
        <SpiralArms radius={radius} />
        <Glow color="#f2dc7e" scale={9} opacity={0.9} />
        <Glow color="#b898ea" scale={18} opacity={0.35} />
        {ordered.map((s, i) => (
          <StarSystem
            key={s.slug}
            session={s}
            index={i}
            position={systemPosition(i)}
            dim={!matches.has(s.slug)}
            hovered={hovered === s.slug || focus === s.slug}
            registry={registry}
            onHover={hover(s.slug)}
            onSelect={() => onSelect(s.slug)}
          />
        ))}
      </IsoStage>
      <div className={`label-layer${focus ? ' is-leaving' : ''}`}>
        {ordered.map((s, i) => (
          <button
            key={s.slug}
            ref={bind(s.slug)}
            type="button"
            className={`sys-label${hovered === s.slug ? ' is-hover' : ''}${matches.has(s.slug) ? '' : ' is-dim'}`}
            style={{ '--corona': systemProfile(s, i + 1).corona } as CSSProperties}
            onClick={() => onSelect(s.slug)}
            onPointerEnter={() => hover(s.slug)(true)}
            onPointerLeave={() => hover(s.slug)(false)}
          >
            <span className="sys-no">No.{s.number !== undefined ? pad2(s.number) : '··'}</span>
            <span className="sys-title">{s.title}</span>
            <span className="sys-meta">
              {formatDate(s.date)} · 행성 {s.topicList.length}개
            </span>
          </button>
        ))}
      </div>
    </>
  )
}

function SpiralArms({ radius, count = 9000 }: { radius: number; count?: number }) {
  const ref = useRef<THREE.Points>(null)
  const geometry = useMemo(() => {
    const rand = seeded('galaxy-arms')
    const gauss = () => (rand() + rand() + rand() - 1.5) / 1.5
    const pos = new Float32Array(count * 3)
    const col = new Float32Array(count * 3)
    const core = new THREE.Color('#f2dc7e')
    const armColors = ['#b898ea', '#f0946e', '#7aa8f0'].map((c) => new THREE.Color(c))
    const c = new THREE.Color()
    for (let i = 0; i < count; i++) {
      const arm = i % ARMS
      const t = Math.pow(rand(), 0.75)
      const r = 0.6 + t * radius
      const a = r * TWIST + arm * ((Math.PI * 2) / ARMS) + gauss() * 0.35
      const spread = 0.4 + t * 1.4
      pos.set([Math.cos(a) * r + gauss() * spread, gauss() * 0.5 * (1 - t * 0.7), Math.sin(a) * r + gauss() * spread], i * 3)
      c.copy(core).lerp(armColors[arm], Math.min(1, t * 1.6)).multiplyScalar(0.55 + rand() * 0.45)
      col.set([c.r, c.g, c.b], i * 3)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('color', new THREE.BufferAttribute(col, 3))
    return g
  }, [radius, count])

  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y -= dt * 0.015
  })

  return (
    <points ref={ref} geometry={geometry}>
      <pointsMaterial size={2.2} sizeAttenuation={false} vertexColors transparent opacity={0.85} depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  )
}

interface SystemProps {
  session: Session
  index: number
  position: [number, number, number]
  dim: boolean
  hovered: boolean
  registry: LabelRegistry
  onHover: (on: boolean) => void
  onSelect: () => void
}

function StarSystem({ session, index, position, dim, hovered, registry, onHover, onSelect }: SystemProps) {
  const group = useRef<THREE.Group>(null)
  const planetRefs = useRef<(THREE.Mesh | null)[]>([])
  const { star, corona } = systemProfile(session, index + 1)
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
    const target = (dim ? 0.65 : 1) * (hovered ? 1.35 : 1)
    g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, target, 8, dt))
    planets.forEach((p, i) => {
      const m = planetRefs.current[i]
      if (!m) return
      const a = p.phase + clock.elapsedTime * p.speed
      m.position.set(Math.cos(a) * p.orbit, 0, Math.sin(a) * p.orbit)
    })
  })

  return (
    <group ref={group} position={position}>
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
      {/* 클릭 영역 */}
      <mesh
        onPointerOver={(e) => {
          e.stopPropagation()
          onHover(true)
        }}
        onPointerOut={() => onHover(false)}
        onClick={(e) => {
          e.stopPropagation()
          onSelect()
        }}
      >
        <sphereGeometry args={[reach, 16, 16]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <Anchor id={session.slug} registry={registry} offsetY={64} />
    </group>
  )
}
