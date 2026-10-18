import data from 'virtual:sessions'
import type { Session } from './parse'

export type { Session, Topic } from './parse'

// 회차 마크다운은 빌드할 때 미리 파싱된다 (vite.config.ts sessionsPlugin) — 최신순
export const sessions: Session[] = data

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
