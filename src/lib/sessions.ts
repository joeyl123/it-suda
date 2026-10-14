import { parse } from 'yaml'

export interface Topic {
  /** 1부터 시작하는 토픽 번호 (URL에 사용) */
  index: number
  title: string
  body: string
  /** `<!-- seed: 123456 -->` 로 행성 시드를 직접 지정한 경우 */
  seed?: number
}

export interface Session {
  slug: string
  title: string
  date: string
  number?: number
  /** 태양계 시드 (frontmatter `seed`) */
  seed?: number
  tags: string[]
  summary?: string
  location?: string
  body: string
  topics: string[]
  /** 첫 `## ` 헤딩 이전의 본문 */
  intro: string
  topicList: Topic[]
}

const files = import.meta.glob('/content/sessions/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/

// "## " 헤딩 하나 = 그날 나눈 토픽 하나 (= 태양계의 행성 하나)
function splitTopics(body: string) {
  const intro: string[] = []
  const topics: Topic[] = []
  let inFence = false
  for (const line of body.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence
    const heading = inFence ? null : line.match(/^##\s+(.+)$/)
    const seedNote = inFence || !topics.length ? null : line.match(/^\s*<!--\s*seed:\s*(\d+)\s*-->\s*$/)
    if (heading) topics.push({ index: topics.length + 1, title: heading[1].trim(), body: '' })
    else if (seedNote) topics[topics.length - 1].seed = Number(seedNote[1])
    else if (topics.length) topics[topics.length - 1].body += line + '\n'
    else intro.push(line)
  }
  return {
    intro: intro.join('\n').trim(),
    topics: topics.map((t) => ({ ...t, body: t.body.trim() })),
  }
}

function toSession(path: string, raw: string): Session {
  const slug = path.split('/').pop()!.replace(/\.md$/, '')
  const match = raw.match(FRONTMATTER)
  const meta = (match ? parse(match[1]) : {}) ?? {}
  const body = match ? match[2] : raw
  const date = meta.date instanceof Date ? meta.date.toISOString().slice(0, 10) : String(meta.date ?? '')
  const { intro, topics: topicList } = splitTopics(body)

  return {
    slug,
    title: meta.title ?? slug,
    date,
    number: meta.number,
    seed: typeof meta.seed === 'number' ? meta.seed : undefined,
    tags: Array.isArray(meta.tags) ? meta.tags.map(String) : [],
    summary: meta.summary,
    location: meta.location,
    body,
    topics: topicList.map((t) => t.title),
    intro,
    topicList,
  }
}

export const sessions: Session[] = Object.entries(files)
  .filter(([path]) => !path.split('/').pop()!.startsWith('_'))
  .map(([path, raw]) => toSession(path, raw))
  .sort((a, b) => b.date.localeCompare(a.date))

export function getSession(slug: string) {
  return sessions.find((s) => s.slug === slug)
}

export function allTags() {
  const counts = new Map<string, number>()
  for (const s of sessions) for (const t of s.tags) counts.set(t, (counts.get(t) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
}

export function searchSessions(query: string, tag?: string | null) {
  const q = query.trim().toLowerCase()
  return sessions.filter((s) => {
    if (tag && !s.tags.includes(tag)) return false
    if (!q) return true
    return [s.title, s.summary ?? '', s.tags.join(' '), s.body].join('\n').toLowerCase().includes(q)
  })
}

export function formatDate(date: string) {
  const d = new Date(date + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return date
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
}

export const pad2 = (n: number) => String(n).padStart(2, '0')
