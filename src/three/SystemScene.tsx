import { useMemo, useRef, useState, type CSSProperties } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { planetProfile, seeded, starCorona } from '../lib/cosmos'
import { pad2, type Session } from '../lib/sessions'
import { Anchor, Glow, IsoStage, OrbitRing, useHoverCursor, useLabelRegistry, type LabelRegistry } from './common'
import Planet from './Planet'

interface Props {
  session: Session
  onSelect: (topicIndex: number) => void
}

export default function SystemScene({ session, onSelect }: Props) {
  const corona = starCorona(session)
  const planets = useMemo(
    () =>
      session.topicList.map((topic, i) => {
        const profile = planetProfile(session, topic)
        return {
          topic,
          profile,
          orbit: 3.2 + i * 2.1,
          speed: 0.32 / (1 + i * 0.45),
          phase: seeded(profile.key + '/phase')() * Math.PI * 2,
        }
      }),
    [session],
  )
  const extent = (planets.at(-1)?.orbit ?? 2) + 1.6
  const [hovered, setHovered] = useState<number | null>(null)
  useHoverCursor(hovered !== null)
  const { registry, bind } = useLabelRegistry()
  const hover = (n: number) => (on: boolean) => setHovered((h) => (on ? n : h === n ? null : h))

  return (
    <>
      <IsoStage extent={extent}>
        <Sun corona={corona} />
        {planets.map((p) => (
          <group key={p.profile.key}>
            <OrbitRing radius={p.orbit} color={hovered === p.topic.index ? p.profile.biome.glow : corona} opacity={hovered === p.topic.index ? 0.6 : 0.22} />
            <OrbitingPlanet
              {...p}
              registry={registry}
              paused={hovered !== null}
              hovered={hovered === p.topic.index}
              onHover={hover(p.topic.index)}
              onSelect={() => onSelect(p.topic.index)}
            />
          </group>
        ))}
      </IsoStage>
      <div className="label-layer">
        {planets.map(({ topic, profile }) => (
          <button
            key={profile.key}
            ref={bind(profile.key)}
            type="button"
            className={`planet-label${hovered === topic.index ? ' is-hover' : ''}`}
            style={{ '--glow': profile.biome.glow } as CSSProperties}
            onClick={() => onSelect(topic.index)}
            onPointerEnter={() => hover(topic.index)(true)}
            onPointerLeave={() => hover(topic.index)(false)}
          >
            <span className="planet-no">{pad2(topic.index)}</span>
            <span>{topic.title}</span>
          </button>
        ))}
      </div>
    </>
  )
}

function Sun({ corona }: { corona: string }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (ref.current) ref.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 1.4) * 0.03)
  })
  return (
    <group ref={ref}>
      <mesh>
        <icosahedronGeometry args={[1.1, 3]} />
        <meshBasicMaterial color="#fff6d8" />
      </mesh>
      <Glow color="#f2dc7e" scale={4.5} />
      <Glow color={corona} scale={9} opacity={0.6} />
      <pointLight intensity={30} distance={40} decay={1.4} color="#ffe9c4" />
    </group>
  )
}

type OrbitingProps = {
  topic: Session['topicList'][number]
  profile: ReturnType<typeof planetProfile>
  orbit: number
  speed: number
  phase: number
  registry: LabelRegistry
  paused: boolean
  hovered: boolean
  onHover: (on: boolean) => void
  onSelect: () => void
}

function OrbitingPlanet({ profile, orbit, speed, phase, registry, paused, hovered, onHover, onSelect }: OrbitingProps) {
  const ref = useRef<THREE.Group>(null)
  const angle = useRef(phase)

  useFrame((_, dt) => {
    const g = ref.current
    if (!g) return
    if (!paused) angle.current += dt * speed
    g.position.set(Math.cos(angle.current) * orbit, 0, Math.sin(angle.current) * orbit)
    g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, profile.size * 1.5 * (hovered ? 1.25 : 1), 10, dt))
  })

  return (
    <group ref={ref} scale={profile.size * 1.5}>
      <Planet
        profile={profile}
        detail={7}
        propCount={45}
        spin={0.4}
        onPointerOver={(e) => {
          e.stopPropagation()
          onHover(true)
        }}
        onPointerOut={() => onHover(false)}
        onClick={(e) => {
          e.stopPropagation()
          onSelect()
        }}
      />
      {hovered && <Glow color={profile.biome.glow} scale={4.2} opacity={0.5} />}
      <Anchor id={profile.key} registry={registry} offsetY={52} />
    </group>
  )
}
