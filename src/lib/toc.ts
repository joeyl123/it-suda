// 행성 기록의 목차: 본문의 `### 소제목`을 순서대로 뽑는다. Prose가 같은 순서로 id(sec-1…)를 붙인다.

export interface TocItem {
  id: string
  text: string
}

/** 마크다운 꾸밈(굵게·코드·링크)을 벗긴 글자만 */
const plain = (s: string) =>
  s
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`~]/g, '')
    .trim()

export function tocOf(markdown: string): TocItem[] {
  const out: TocItem[] = []
  let fence = false
  for (const line of markdown.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence
    const m = !fence && line.match(/^###\s+(.+)$/)
    if (m) out.push({ id: `sec-${out.length + 1}`, text: plain(m[1]) })
  }
  return out
}

/** 한국어 기준 분당 약 500자 */
export function readMinutes(markdown: string) {
  const chars = markdown.replace(/[\s#*>|`\-[\]()]/g, '').length
  return Math.max(1, Math.round(chars / 500))
}
