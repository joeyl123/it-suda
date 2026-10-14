import { useMemo, useRef, useState, type CSSProperties } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { planetColors, planetProfile, seeded, systemProfile } from '../lib/cosmos'
import { formatDate, pad2, type Session } from '../lib/sessions'
import { Anchor, Glow, IsoStage, OrbitRing, useHoverCursor, useLabelRegistry, type LabelRegistry } from './common'
import GalaxyBody, { ARMS, armPoint } from './GalaxyBody'
import { Astronaut, DriftingAsteroids, SpaceWhale, Ufo } from './effects'

const RADIUS = 18

/** 태양계는 두 주팔을 번갈아, 오래된 회차일수록 중심 가까이 놓인다. */
function systemPosition(i: number, n: number): [number, number, number] {
  const arm = ARMS[i % 2]
  const t = 0.22 + (0.68 * (i + 1)) / (n + 1)
  const p = armPoint(arm, t, RADIUS)
  return [p.x, 0.3, p.z]
}

interface Props {
  sessions: Session[]
  matches: Set<string>
  onSelect: (slug: string) => void
}

export default function GalaxyScene({ sessions, matches, onSelect }: Props) {
  const ordered = useMemo(() => [...sessions].sort((a, b) => a.date.localeCompare(b.date)), [sessions])
  const [hovered, setHovered] = useState<string | null>(null)
  useHoverCursor(hovered !== null)
  const { registry, bind } = useLabelRegistry()
  const hover = (slug: string) => (on: boolean) => setHovered((h) => (on ? slug : h === slug ? null : h))

  return (
    <>
      <IsoStage extent={RADIUS * 0.85} pan autoRotate={hovered === null} offsetX={460}>
        <GalaxyBody radius={RADIUS} />
        {ordered.map((s, i) => (
          <StarSystem
            key={s.slug}
            session={s}
            index={i}
            position={systemPosition(i, ordered.length)}
            dim={!matches.has(s.slug)}
            hovered={hovered === s.slug}
            registry={registry}
            onHover={hover(s.slug)}
            onSelect={() => onSelect(s.slug)}
          />
        ))}
        <Ufo mode="flyby" span={RADIUS * 0.9} scale={0.55} />
        <Astronaut span={RADIUS * 0.8} />
        <SpaceWhale radius={RADIUS * 0.95} />
        <DriftingAsteroids count={3} span={RADIUS} />
      </IsoStage>
      <div className="label-layer">
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
