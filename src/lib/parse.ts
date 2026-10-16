// 회차 마크다운 → Session. Vite 없이도 동작하므로 빌드 스크립트(scripts/prerender.tsx)도 같은 파서를 쓴다.
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
  // 마크다운 주석(<!-- ... -->)은 작성자용 메모 → 화면에 보이지 않게
  const clean = (text: string) => text.replace(/<!--[\s\S]*?-->/g, '').trim()
  return {
    intro: clean(intro.join('\n')),
    topics: topics.map((t) => ({ ...t, body: clean(t.body) })),
  }
}

export function toSession(path: string, raw: string): Session {
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
