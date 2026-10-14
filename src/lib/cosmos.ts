// 세션/토픽 → 우주 오브젝트 매핑. three.js 없이 순수 TS로 둬서
// 3D가 로드되기 전에도 패널(행성 이름, 색, 시드)을 그릴 수 있게 한다.
//
// 시드 체계 (design.md §8)
//   태양계 시드 = frontmatter의 `seed` (6자리 숫자). 없으면 파일명에서 계산.
//   행성 시드   = 태양계 시드 + 토픽 번호에서 계산. 토픽 아래 `<!-- seed: 123456 -->`로 개별 지정 가능.
//   같은 시드 = 언제 봐도 같은 행성. 제목을 고쳐도 행성은 그대로다.
import type { Session, Topic } from './sessions'

/** 문자열/숫자 키로 항상 같은 난수열을 만든다 (xmur3 → mulberry32). */
export function seeded(key: string | number) {
  const str = String(key)
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
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

const sixDigits = (key: string) => 100000 + Math.floor(seeded(key)() * 900000)

export function systemSeed(session: Session) {
  return session.seed ?? sixDigits(session.slug)
}

export function planetSeed(session: Session, topic: Topic) {
  return topic.seed ?? sixDigits(`${systemSeed(session)}/${topic.index}`)
}

// ---------------------------------------------------------------- stars

export interface StarType {
  name: string
  core: string
  size: number
}

const STAR_TYPES: (StarType & { weight: number })[] = [
  { name: '적색 왜성', core: '#ffb08a', size: 0.8, weight: 3 },
  { name: '주황 왜성', core: '#ffd29a', size: 0.9, weight: 3 },
  { name: '황색 왜성', core: '#fff1c4', size: 1, weight: 3 },
  { name: '백색 별', core: '#ffffff', size: 1.12, weight: 2 },
  { name: '청색 거성', core: '#d6e4ff', size: 1.35, weight: 1 },
]

function pick<T extends { weight: number }>(items: T[], r: number) {
  let x = r * items.reduce((s, i) => s + i.weight, 0)
  for (const item of items) if ((x -= item.weight) < 0) return item
  return items[items.length - 1]
}

export interface SystemProfile {
  seed: number
  star: StarType
  /** 거울 원칙: 홀수 회차 바이올렛, 짝수 회차 살구색 */
  corona: string
}

export function systemProfile(session: Session, fallbackIndex = 0): SystemProfile {
  const seed = systemSeed(session)
  const n = session.number ?? fallbackIndex
  return { seed, star: pick(STAR_TYPES, seeded(seed)()), corona: n % 2 === 1 ? '#b898ea' : '#f0946e' }
}

// ---------------------------------------------------------------- biomes

export type PropKind =
  | 'conifer' | 'broadleaf' | 'palm' | 'cactus' | 'acacia' | 'shrub'
  | 'rock' | 'iceSpike' | 'volcano' | 'reed' | 'coral' | 'flower'

export interface PropSpec {
  kind: PropKind
  /** 이 생태계 소품 중 차지하는 비율 */
  weight: number
  colors: string[]
  /** 해수면 위 높이 비율 구간 [0=해안, 1=최고봉] */
  band: [number, number]
  /** 물속에 놓이는 소품 (산호) */
  underwater?: boolean
}

export interface Biome {
  id: string
  name: string
  blurb: string
  weight: number
  water: string
  waterOpacity: number
  /** 용암처럼 스스로 빛나는 물 */
  waterGlow?: boolean
  seabed: string
  /** 땅 색: 해안 → 중턱 → 꼭대기 */
  land: [string, string, string]
  /** 이 높이 비율 위로는 눈 (1이면 없음) */
  snowLine: number
  /** 극지방 만년설 크기 (0이면 없음) */
  polarCap: number
  sea: [number, number]
  amp: number
  freq: number
  density: number
  clouds: number
  cloudColor: string
  glow: string
  props: PropSpec[]
}

// design.md §2-B — 실제 지구 생태계에서 가져온 12가지 생물군계
export const BIOMES: Biome[] = [
  {
    id: 'ocean', name: '대양 행성', blurb: '수평선 너머까지 이어지는 깊은 바다와 작은 섬들', weight: 3,
    water: '#2f7fc1', waterOpacity: 0.88, seabed: '#1a3a66',
    land: ['#e6d29a', '#5f9a52', '#6f6a5e'], snowLine: 1, polarCap: 0.12,
    sea: [0.3, 0.5], amp: 0.11, freq: 1.4, density: 0.5, clouds: 1, cloudColor: '#ffffff', glow: '#8fd3ff',
    props: [
      { kind: 'palm', weight: 0.7, colors: ['#3f9a4a', '#5bb35a'], band: [0, 0.4] },
      { kind: 'shrub', weight: 0.3, colors: ['#4c8a45'], band: [0.2, 0.9] },
    ],
  },
  {
    id: 'reef', name: '산호초 행성', blurb: '얕고 투명한 바다 아래 알록달록한 산호 숲', weight: 2,
    water: '#3fd0c9', waterOpacity: 0.55, seabed: '#e9d6a8',
    land: ['#f1e2b5', '#7cbf6a', '#8a8a78'], snowLine: 1, polarCap: 0,
    sea: [0.15, 0.3], amp: 0.08, freq: 1.8, density: 1.1, clouds: 0.5, cloudColor: '#ffffff', glow: '#7fe6df',
    props: [
      { kind: 'coral', weight: 0.75, colors: ['#ff7f7f', '#ffb36b', '#c77dff', '#ff8fc7', '#7fe0ff'], band: [0, 1], underwater: true },
      { kind: 'palm', weight: 0.25, colors: ['#3f9a4a', '#5bb35a'], band: [0, 0.5] },
    ],
  },
  {
    id: 'jungle', name: '정글 행성', blurb: '빽빽한 수관 아래로 강이 굽이치는 열대우림', weight: 3,
    water: '#2d6f5e', waterOpacity: 0.9, seabed: '#1f3f33',
    land: ['#4c8f3c', '#2f7a3a', '#5f7f45'], snowLine: 1, polarCap: 0,
    sea: [-0.05, 0.12], amp: 0.12, freq: 2.2, density: 1.8, clouds: 0.9, cloudColor: '#f2fbf2', glow: '#9be7a0',
    props: [
      { kind: 'broadleaf', weight: 0.8, colors: ['#2e8b3d', '#3fa34d', '#1f6b30', '#5cae3e'], band: [0, 0.9] },
      { kind: 'palm', weight: 0.2, colors: ['#3f9a4a'], band: [0, 0.25] },
    ],
  },
  {
    id: 'desert', name: '사막 행성', blurb: '바람이 빚은 모래 언덕과 드문드문한 오아시스', weight: 3,
    water: '#3fa7b5', waterOpacity: 0.9, seabed: '#c99a5e',
    land: ['#f0cf8a', '#e0a95c', '#b9703f'], snowLine: 1, polarCap: 0,
    sea: [-0.75, -0.55], amp: 0.1, freq: 1.6, density: 0.45, clouds: 0, cloudColor: '#ffffff', glow: '#f5c98a',
    props: [
      { kind: 'cactus', weight: 0.55, colors: ['#5f9a4a', '#4f8a3e'], band: [0, 0.7] },
      { kind: 'rock', weight: 0.45, colors: ['#a8653f', '#8f5636', '#c48a5a'], band: [0.3, 1] },
    ],
  },
  {
    id: 'savanna', name: '사바나 행성', blurb: '황금빛 풀밭 위로 우산 모양 나무의 긴 그림자', weight: 2,
    water: '#4b8fa8', waterOpacity: 0.9, seabed: '#6b6040',
    land: ['#d8c46a', '#bfa04a', '#8a6e3b'], snowLine: 1, polarCap: 0,
    sea: [-0.45, -0.25], amp: 0.07, freq: 1.5, density: 0.7, clouds: 0.35, cloudColor: '#fff8e6', glow: '#f2dc9a',
    props: [
      { kind: 'acacia', weight: 0.55, colors: ['#6f8f3a', '#7f9a40'], band: [0, 0.8] },
      { kind: 'shrub', weight: 0.45, colors: ['#9a8f45', '#7f8a3e'], band: [0, 1] },
    ],
  },
  {
    id: 'grassland', name: '초원 행성', blurb: '탁 트인 들판에 들꽃이 흩날리는 온대 초원', weight: 2,
    water: '#3f86b8', waterOpacity: 0.88, seabed: '#2f4f5f',
    land: ['#8fbf5a', '#a9c46a', '#c9c98a'], snowLine: 1, polarCap: 0.1,
    sea: [-0.3, -0.1], amp: 0.06, freq: 1.3, density: 0.8, clouds: 0.6, cloudColor: '#ffffff', glow: '#d8f0b0',
    props: [
      { kind: 'flower', weight: 0.5, colors: ['#ffd84a', '#ff8fb1', '#ffffff', '#b98cff'], band: [0, 1] },
      { kind: 'shrub', weight: 0.35, colors: ['#5f9a45', '#6fa84f'], band: [0, 1] },
      { kind: 'broadleaf', weight: 0.15, colors: ['#3f8a45'], band: [0, 0.6] },
    ],
  },
  {
    id: 'wetland', name: '습지 행성', blurb: '얕은 물웅덩이와 갈대가 끝없이 이어지는 늪지', weight: 2,
    water: '#4f7a5a', waterOpacity: 0.8, seabed: '#3a4a2a',
    land: ['#6f8a42', '#5d7a3e', '#8a8f5a'], snowLine: 1, polarCap: 0,
    sea: [-0.02, 0.08], amp: 0.04, freq: 2.6, density: 1.2, clouds: 0.8, cloudColor: '#e8efe6', glow: '#b8d8a0',
    props: [
      { kind: 'reed', weight: 0.6, colors: ['#9aa35a', '#b5b06a', '#7f8f45'], band: [0, 0.5] },
      { kind: 'broadleaf', weight: 0.25, colors: ['#4f7f3a'], band: [0.3, 1] },
      { kind: 'shrub', weight: 0.15, colors: ['#6f8a42'], band: [0, 1] },
    ],
  },
  {
    id: 'taiga', name: '타이가 행성', blurb: '곧게 뻗은 침엽수가 끝없이 이어지는 북방림', weight: 2,
    water: '#2c5872', waterOpacity: 0.9, seabed: '#1f3442',
    land: ['#4f6b4a', '#3e5f45', '#8a8f86'], snowLine: 0.75, polarCap: 0.3,
    sea: [-0.15, 0.05], amp: 0.12, freq: 1.9, density: 1.6, clouds: 0.6, cloudColor: '#f4f8fb', glow: '#a8d8c8',
    props: [
      { kind: 'conifer', weight: 0.85, colors: ['#1f4f35', '#2a5f3f', '#173f2b'], band: [0, 0.75] },
      { kind: 'rock', weight: 0.15, colors: ['#7a7f7a'], band: [0.6, 1] },
    ],
  },
  {
    id: 'tundra', name: '툰드라 행성', blurb: '얼어붙은 땅 위에 이끼와 키 작은 덤불만 버티는 곳', weight: 2,
    water: '#3d6e84', waterOpacity: 0.85, seabed: '#2a4352',
    land: ['#8a8f62', '#9a9474', '#c8c6b8'], snowLine: 0.55, polarCap: 0.45,
    sea: [-0.2, 0], amp: 0.07, freq: 1.7, density: 0.6, clouds: 0.4, cloudColor: '#f4f8fb', glow: '#c9e3e8',
    props: [
      { kind: 'shrub', weight: 0.5, colors: ['#7a7f4a', '#8f6f4a', '#6f7a45'], band: [0, 0.6] },
      { kind: 'rock', weight: 0.5, colors: ['#8a8a86', '#6f6f6a'], band: [0, 1] },
    ],
  },
  {
    id: 'glacier', name: '빙하 행성', blurb: '얼음 바다와 푸른 빙하, 하늘을 찌르는 얼음 첨탑', weight: 2,
    water: '#bfe6f5', waterOpacity: 0.95, seabed: '#8fbfd6',
    land: ['#e3f2fa', '#f4fbff', '#ffffff'], snowLine: 1, polarCap: 0,
    sea: [0.05, 0.25], amp: 0.1, freq: 1.6, density: 0.8, clouds: 0.3, cloudColor: '#ffffff', glow: '#cdeeff',
    props: [{ kind: 'iceSpike', weight: 1, colors: ['#e6f4ff', '#bfe0ff', '#d6f0ff'], band: [0, 1] }],
  },
  {
    id: 'alpine', name: '고산 행성', blurb: '구름 위로 솟은 만년설 봉우리와 깊은 계곡', weight: 2,
    water: '#2e6d9e', waterOpacity: 0.9, seabed: '#1d3f5c',
    land: ['#5f7f4a', '#7d7469', '#9a948c'], snowLine: 0.55, polarCap: 0.2,
    sea: [-0.35, -0.15], amp: 0.2, freq: 2.4, density: 0.9, clouds: 0.7, cloudColor: '#ffffff', glow: '#bcd6f0',
    props: [
      { kind: 'conifer', weight: 0.6, colors: ['#2a5f3f', '#1f4f35'], band: [0, 0.4] },
      { kind: 'rock', weight: 0.4, colors: ['#8a847c', '#6f6a64'], band: [0.35, 0.8] },
    ],
  },
  {
    id: 'volcanic', name: '화산 행성', blurb: '용암이 흐르는 검은 대지, 끓어오르는 화구', weight: 2,
    water: '#ff6a2a', waterOpacity: 1, waterGlow: true, seabed: '#3a1a10',
    land: ['#2b2326', '#3d3135', '#5c4a44'], snowLine: 1, polarCap: 0,
    sea: [-0.1, 0.1], amp: 0.14, freq: 2, density: 0.7, clouds: 0.3, cloudColor: '#5a4a4a', glow: '#ff8a5c',
    props: [
      { kind: 'volcano', weight: 0.35, colors: ['#3a2e2e', '#2b2224'], band: [0.3, 1] },
      { kind: 'rock', weight: 0.65, colors: ['#2a2224', '#4a3a36'], band: [0, 1] },
    ],
  },
]

// ---------------------------------------------------------------- planets

export interface PlanetProfile {
  seed: number
  /** 화면에 표시하는 시드 */
  label: string
  biome: Biome
  /** 생태계 색을 이 행성만의 톤으로 살짝 비튼 값 [hue, saturation, lightness] */
  hsl: [number, number, number]
  /** 태양계 화면에서의 크기 배율 */
  size: number
  sea: number
  amp: number
  freq: number
  density: number
  clouds: number
  tilt: number
  spin: number
  ring: boolean
  moons: number
}

export function planetProfile(session: Session, topic: Topic): PlanetProfile {
  const seed = planetSeed(session, topic)
  const rand = seeded(seed)
  const biome = pick(BIOMES, rand())
  const between = ([a, b]: [number, number]) => a + rand() * (b - a)
  return {
    seed,
    label: String(seed),
    biome,
    hsl: [(rand() - 0.5) * 0.06, (rand() - 0.5) * 0.16, (rand() - 0.5) * 0.08],
    size: 0.45 + rand() * 0.6,
    sea: between(biome.sea),
    amp: biome.amp * (0.8 + rand() * 0.45),
    freq: biome.freq * (0.85 + rand() * 0.3),
    density: biome.density * (0.7 + rand() * 0.6),
    clouds: biome.clouds * (0.6 + rand() * 0.8),
    tilt: (rand() - 0.5) * 0.7,
    spin: 0.05 + rand() * 0.1,
    ring: rand() < 0.28,
    moons: Math.floor(rand() * rand() * 4),
  }
}

/** 색 하나에 행성 고유 톤을 적용 (CSS용, three 없이) */
export function shiftHex(hex: string, [dh, ds, dl]: [number, number, number]) {
  const n = parseInt(hex.slice(1), 16)
  let r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
    h /= 6
  }
  const H = (h + dh + 1) % 1, S = Math.min(1, Math.max(0, s + ds)), L = Math.min(1, Math.max(0, l + dl))
  const f = (p: number, q: number, t: number) => {
    t = (t + 1) % 1
    return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p
  }
  const q = L < 0.5 ? L * (1 + S) : L + S - L * S, p = 2 * L - q
  ;[r, g, b] = S === 0 ? [L, L, L] : [f(p, q, H + 1 / 3), f(p, q, H), f(p, q, H - 1 / 3)]
  return '#' + [r, g, b].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('')
}

export function planetColors(p: PlanetProfile) {
  return { land: shiftHex(p.biome.land[1], p.hsl), glow: p.biome.glow }
}

export function seedTag(session: Session, topic?: Topic) {
  return topic ? `${planetSeed(session, topic)}` : `${systemSeed(session)}`
}
