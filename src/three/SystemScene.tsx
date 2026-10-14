import { useMemo, useRef, useState, type CSSProperties } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { planetProfile, seeded, systemProfile, type PlanetProfile, type StarType } from '../lib/cosmos'
import { pad2, type Session, type Topic } from '../lib/sessions'
import { Anchor, Glow, IsoStage, OrbitRing, useHoverCursor, useLabelRegistry, type LabelRegistry } from './common'
import { AsteroidBelt, Comet } from './effects'
import Planet from './Planet'

const SCALE = 1.5

interface Props {
  session: Session
  onSelect: (topicIndex: number) => void
}

export default function SystemScene({ session, onSelect }: Props) {
  const { star, corona, seed } = systemProfile(session)
  const planets = useMemo(() => {
    // 행성 크기가 제각각이라 궤도 간격도 크기에 맞춰 벌린다
    let orbit = 1.6 + star.size * 1.2
    let prev = 0
    return session.topicList.map((topic, i) => {
      const profile = planetProfile(session, topic)
      const r = profile.size * SCALE * (profile.ring ? 2.1 : 1.15)
      orbit += prev + r + 0.6
      prev = r
      return {
        id: `p${topic.index}`,
        topic,
        profile,
        orbit,
        speed: 0.32 / (1 + i * 0.45),
        phase: seeded(profile.seed + '/phase')() * Math.PI * 2,
      }
    })
  }, [session, star.size])
  // 시드가 정하는 태양계의 덤: 바깥 소행성대, 긴 타원 궤도의 혜성
  const extras = useMemo(() => {
    const r = seeded(seed + '/extras')
    return { belt: r() < 0.65, comet: r() < 0.55 }
  }, [seed])
  const last = planets.at(-1)?.orbit ?? 2
  const extent = last + (extras.belt ? 2.6 : 1.6)
  const [hovered, setHovered] = useState<number | null>(null)
  useHoverCursor(hovered !== null)
  const { registry, bind } = useLabelRegistry()
  const hover = (n: number) => (on: boolean) => setHovered((h) => (on ? n : h === n ? null : h))

  return (
    <>
      <IsoStage extent={extent}>
        <Sun star={star} corona={corona} />
        {planets.map((p) => {
          const lit = hovered === p.topic.index
          return (
            <group key={p.id}>
              <OrbitRing radius={p.orbit} color={lit ? p.profile.biome.glow : corona} opacity={lit ? 0.6 : 0.22} />
              <OrbitingPlanet
                {...p}
                registry={registry}
                paused={hovered !== null}
                hovered={lit}
                onHover={hover(p.topic.index)}
                onSelect={() => onSelect(p.topic.index)}
              />
            </group>
          )
        })}
        {extras.belt && <AsteroidBelt inner={last + 1.1} outer={last + 2.2} seed={seed} />}
        {extras.comet && <Comet a={extent * 0.62} e={0.72} seed={seed} />}
      </IsoStage>
      <div className="label-layer">
        {planets.map(({ id, topic, profile }) => (
          <button
            key={id}
            ref={bind(id)}
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

function Sun({ star, corona }: { star: StarType; corona: string }) {
  const ref = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (ref.current) ref.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 1.4) * 0.03)
  })
  return (
    <group ref={ref}>
      <mesh>
        <icosahedronGeometry args={[1.1 * star.size, 3]} />
        <meshBasicMaterial color={star.core} />
      </mesh>
      <Glow color={star.core} scale={4.5 * star.size} />
      <Glow color={corona} scale={9 * star.size} opacity={0.6} />
      <pointLight intensity={30} distance={60} decay={1.4} color={star.core} />
    </group>
  )
}

type OrbitingProps = {
  id: string
  topic: Topic
  profile: PlanetProfile
  orbit: number
  speed: number
  phase: number
  registry: LabelRegistry
  paused: boolean
  hovered: boolean
  onHover: (on: boolean) => void
  onSelect: () => void
}

function OrbitingPlanet({ id, profile, orbit, speed, phase, registry, paused, hovered, onHover, onSelect }: OrbitingProps) {
  const ref = useRef<THREE.Group>(null)
  const angle = useRef(phase)
  const size = profile.size * SCALE

  useFrame((_, dt) => {
    const g = ref.current
    if (!g) return
    if (!paused) angle.current += dt * speed
    g.position.set(Math.cos(angle.current) * orbit, 0, Math.sin(angle.current) * orbit)
    g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, size * (hovered ? 1.25 : 1), 10, dt))
  })

  return (
    <group ref={ref} scale={size}>
      <Planet
        profile={profile}
        detail={8}
        propBudget={55}
        cloudBudget={12}
        spin={profile.spin * 4}
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
      <Anchor id={id} registry={registry} offsetY={30 + size * 20} />
    </group>
  )
}
