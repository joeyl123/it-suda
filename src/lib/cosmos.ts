// 세션/토픽 → 우주 오브젝트 매핑. three.js 없이 순수 TS로 둬서
// 3D가 로드되기 전에도 패널(행성 이름, 색)을 그릴 수 있게 한다.
import type { Session, Topic } from './sessions'

/** 문자열 키로 항상 같은 난수열을 만든다 (xmur3 → mulberry32). */
export function seeded(key: string) {
  let h = 1779033703 ^ key.length
  for (let i = 0; i < key.length; i++) {
    h = Math.imul(h ^ key.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507)
  h = Math.imul(h ^ (h >>> 13), 3266489909)
  let a = (h ^= h >>> 16) >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type PropKind = 'tree' | 'crystal' | 'rock' | 'tower' | 'spike'

export interface Biome {
  id: string
  name: string
  blurb: string
  ocean: string
  land: string
  peak: string
  prop: PropKind
  propColor: string
  propGlow: boolean
  glow: string
}

// design.md §2-B "Cosmic palette"
export const BIOMES: Biome[] = [
  {
    id: 'forest', name: '숲 행성', blurb: '아이디어가 무성하게 자라는 곳',
    ocean: '#2b4f7a', land: '#4f8a5b', peak: '#d8e8b8', prop: 'tree', propColor: '#2f6b46', propGlow: false, glow: '#7fd1b9',
  },
  {
    id: 'crystal', name: '수정 행성', blurb: '단단하게 정리된 인사이트의 결정',
    ocean: '#2a1f4a', land: '#6a3fa0', peak: '#e2d3f7', prop: 'crystal', propColor: '#b898ea', propGlow: true, glow: '#b898ea',
  },
  {
    id: 'dune', name: '사구 행성', blurb: '경험이 켜켜이 쌓인 모래 언덕',
    ocean: '#7a3b2a', land: '#d9744f', peak: '#f2dc7e', prop: 'rock', propColor: '#a8553a', propGlow: false, glow: '#f0946e',
  },
  {
    id: 'city', name: '도시 행성', blurb: '도구와 서비스가 불을 밝힌 거리',
    ocean: '#1a2340', land: '#3b4a6b', peak: '#9fb4d8', prop: 'tower', propColor: '#f2dc7e', propGlow: true, glow: '#7aa8f0',
  },
  {
    id: 'ice', name: '빙하 행성', blurb: '차갑게 식혀 오래 남기는 지식',
    ocean: '#2b5b7a', land: '#bfe0ef', peak: '#ffffff', prop: 'spike', propColor: '#e6f4ff', propGlow: false, glow: '#a8dcf0',
  },
]

export interface PlanetProfile {
  key: string
  biome: Biome
  /** 태양계 화면에서의 반지름 */
  size: number
  sea: number
  tilt: number
  ring: boolean
  moons: number
}

export function planetProfile(session: Session, topic: Topic): PlanetProfile {
  const key = `${session.slug}#${topic.index}#${topic.title}`
  const rand = seeded(key)
  return {
    key,
    biome: BIOMES[Math.floor(rand() * BIOMES.length)],
    size: 0.5 + rand() * 0.35,
    sea: -0.25 + rand() * 0.4,
    tilt: (rand() - 0.5) * 0.6,
    ring: rand() < 0.35,
    moons: Math.floor(rand() * 3),
  }
}

// 거울 원칙: 홀수 회차는 바이올렛, 짝수 회차는 살구색 코로나
export function starCorona(session: Session, fallbackIndex = 0) {
  const n = session.number ?? fallbackIndex
  return n % 2 === 1 ? '#b898ea' : '#f0946e'
}
