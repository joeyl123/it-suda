// 우주의 지도: 무엇이 어디에, 어떤 크기로 있는지 (design.md §4).
// three.js 없이 순수 계산만 한다 → 3D 장면, 라벨, 카메라 비행이 모두 같은 지도를 본다.
//
// 좌표계는 중첩되어 있다.
//   은하 좌표 1        = 기준
//   태양계 좌표 1      = 은하 좌표 SYSTEM_SCALE  (태양계는 은하 속 자기 별 자리에 있다)
//   행성 좌표 1(반지름) = 태양계 속 그 행성의 반지름
// 그래서 "별을 눌러 들어가기"는 진짜로 그 점을 향해 카메라가 날아가는 것이다.
import { planetProfile, seeded, systemProfile, type PlanetProfile } from './cosmos'
import { getSession, sessions, type Session, type Topic } from './sessions'

export const GALAXY_RADIUS = 18
export const SYSTEM_SCALE = 0.3
export const PLANET_SCALE = 1.5

// ---------------------------------------------------------------- galaxy arms

export interface Arm {
  offset: number
  twist: number
  width: number
  length: number
  weight: number
  colors: [string, string]
}

export const ARMS: Arm[] = [
  { offset: 0, twist: 0.33, width: 1, length: 1, weight: 0.34, colors: ['#b898ea', '#ff8fc7'] },
  { offset: Math.PI, twist: 0.31, width: 1.1, length: 0.95, weight: 0.34, colors: ['#f0946e', '#f2dc7e'] },
  { offset: Math.PI / 2 + 0.3, twist: 0.36, width: 0.6, length: 0.75, weight: 0.16, colors: ['#7aa8f0', '#7fe6df'] },
  { offset: -Math.PI / 2 + 0.2, twist: 0.29, width: 0.55, length: 0.85, weight: 0.16, colors: ['#9be7a0', '#a8dcf0'] },
]

/** 팔 위 한 점. t: 0(중심)~1(끝) */
export function armPoint(arm: Arm, t: number, radius: number, wobble = 0) {
  const r = 1.2 + t * radius * arm.length
  const a = arm.offset + r * arm.twist + Math.sin(r * 0.55 + arm.offset) * 0.18 + wobble
  return { r, a, x: Math.cos(a) * r, z: Math.sin(a) * r }
}

/** 오래된 회차일수록 은하 중심 가까이. 두 주팔을 번갈아 놓인다. */
export const galaxyOrder: Session[] = [...sessions].sort((a, b) => a.date.localeCompare(b.date))

export function systemPosition(slug: string): [number, number, number] {
  const i = Math.max(0, galaxyOrder.findIndex((s) => s.slug === slug))
  const n = galaxyOrder.length
  const p = armPoint(ARMS[i % 2], 0.22 + (0.68 * (i + 1)) / (n + 1), GALAXY_RADIUS)
  return [p.x, 0.3, p.z]
}

// ---------------------------------------------------------------- solar system

export interface PlanetSlot {
  id: string
  topic: Topic
  profile: PlanetProfile
  orbit: number
  speed: number
  phase: number
  /** 태양계 좌표에서의 행성 반지름 */
  size: number
}

export interface SystemLayout {
  planets: PlanetSlot[]
  belt: boolean
  comet: boolean
  last: number
  extent: number
}

const layoutCache = new Map<string, SystemLayout>()

export function systemLayout(session: Session): SystemLayout {
  const hit = layoutCache.get(session.slug)
  if (hit) return hit
  const { star, seed } = systemProfile(session)
  // 행성 크기가 제각각이라 궤도 간격도 크기에 맞춰 벌린다
  let orbit = 1.6 + star.size * 1.2
  let prev = 0
  const planets = session.topicList.map((topic, i) => {
    const profile = planetProfile(session, topic)
    const size = profile.size * PLANET_SCALE
    const r = size * (profile.ring ? 2.1 : 1.15)
    orbit += prev + r + 0.6
    prev = r
    return { id: `p${topic.index}`, topic, profile, orbit, size, speed: 0.32 / (1 + i * 0.45), phase: seeded(profile.seed + '/phase')() * Math.PI * 2 }
  })
  const extras = seeded(seed + '/extras')
  const belt = extras() < 0.4
  const comet = extras() < 0.3
  const last = planets.at(-1)?.orbit ?? 2
  const layout = { planets, belt, comet, last, extent: last + (belt ? 2.6 : 1.6) }
  layoutCache.set(session.slug, layout)
  return layout
}

// ---------------------------------------------------------------- views & frames

export type View =
  | { kind: 'galaxy' }
  | { kind: 'system'; session: Session }
  | { kind: 'planet'; session: Session; topic: Topic }

export function viewKey(v: View) {
  return v.kind === 'galaxy' ? 'galaxy' : v.kind === 'system' ? `system:${v.session.slug}` : `planet:${v.session.slug}:${v.topic.index}`
}

/** URL → 보여줄 우주. 은하가 아닌 페이지(소개, 목록, 404)는 은하를 배경으로 쓴다. */
export function viewFromPath(pathname: string): View {
  const m = pathname.match(/^\/sessions\/([^/]+)(?:\/(\d+))?\/?$/)
  const session = m ? getSession(decodeURIComponent(m[1])) : undefined
  if (!session) return { kind: 'galaxy' }
  const topic = m?.[2] ? session.topicList.find((t) => String(t.index) === m[2]) : undefined
  if (m?.[2] && !topic) return { kind: 'galaxy' }
  return topic ? { kind: 'planet', session, topic } : { kind: 'system', session }
}

/** 화면에 꼭 들어와야 하는 반경 (그 장면 자체 좌표) */
export function extentOf(v: View) {
  if (v.kind === 'galaxy') return GALAXY_RADIUS * 0.85
  if (v.kind === 'system') return systemLayout(v.session).extent
  const p = planetProfile(v.session, v.topic)
  return p.ring || p.moons ? 2.5 : 1.75
}

/** 그 장면 좌표의 원점·축척을 은하 좌표로: 은하좌표 = c + 장면좌표 × k */
export interface Frame {
  c: [number, number, number]
  k: number
}

export function planetRestPosition(session: Session, index: number): [number, number, number] {
  const slot = systemLayout(session).planets[index - 1]
  return slot ? [Math.cos(slot.phase) * slot.orbit, 0, Math.sin(slot.phase) * slot.orbit] : [0, 0, 0]
}

/** @param planetAt 태양계 속 행성의 실제 위치(공전 중인 현재 자리). 없으면 처음 자리. */
export function frameOf(v: View, planetAt?: [number, number, number]): Frame {
  if (v.kind === 'galaxy') return { c: [0, 0, 0], k: 1 }
  const s = systemPosition(v.session.slug)
  if (v.kind === 'system') return { c: s, k: SYSTEM_SCALE }
  const p = planetAt ?? planetRestPosition(v.session, v.topic.index)
  const slot = systemLayout(v.session).planets[v.topic.index - 1]
  return {
    c: [s[0] + p[0] * SYSTEM_SCALE, s[1] + p[1] * SYSTEM_SCALE, s[2] + p[2] * SYSTEM_SCALE],
    k: SYSTEM_SCALE * (slot?.size ?? 1),
  }
}

/**
 * B가 A 안에 들어 있으면(줌인) A 속에서 B를 나타내는 오브젝트의 앵커 id.
 * 비행하는 동안 그 오브젝트는 숨기고, 그 자리에서 B 장면이 자라난다.
 */
export function childAnchor(parent: View, child: View): string | undefined {
  if (parent.kind === 'galaxy' && child.kind !== 'galaxy') return `sys:${child.session.slug}`
  if (parent.kind === 'system' && child.kind === 'planet' && child.session.slug === parent.session.slug) return `p${child.topic.index}`
  return undefined
}
