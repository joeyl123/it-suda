import { useEffect, useRef, type CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export interface NavItem {
  to: string
  /** 점 위에 뜨는 이름, 화살표 툴팁 */
  title: string
  /** 점 색 (항성·생태계 색) */
  color?: string
  /** 화살표 툴팁 윗줄 (기본: "이전 행성" 등) */
  hint?: string
}

interface Props {
  /** '태양계' | '행성' — "행성 03 / 06" */
  kind: string
  items: NavItem[]
  /** 지금 보고 있는 항목. 은하처럼 목록 위(개요)에 있으면 -1 */
  current: number
  /** 개요 화면에서 쓸 문구 (current === -1) */
  overview?: { meta: string; title: string; prev?: NavItem; next?: NavItem }
  /** Esc로 한 단계 위로 */
  up?: string
}

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']
const pad2 = (n: number) => String(n).padStart(2, '0')

/**
 * 우주 내비게이터 (design.md §5): 같은 단계의 이웃 사이를 좌우로 오간다.
 *  - ‹ › 이전·다음 태양계 / 이전·다음 행성 (끝이면 비활성)
 *  - 가운데: 위치("행성 03 / 06")와 지금 제목, 아래 점들(누르면 그 자리로, 색 = 항성·생태계)
 *  - 키보드: ← → 이웃으로, Esc 한 단계 위로. 코나미 커맨드(↑↑↓↓←→←→BA)를 치는 중엔 움직이지 않는다
 * 위로 올라가는 길은 패널의 경로(은하 / No.03 / …)와 Esc가 맡는다.
 */
export default function Navigator({ kind, items, current, overview, up }: Props) {
  const navigate = useNavigate()
  const atOverview = current < 0
  const prev = atOverview ? overview?.prev : items[current - 1]
  const next = atOverview ? overview?.next : items[current + 1]
  const seq = useRef<string[]>([])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement | null
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return
      // 코나미 커맨드를 치는 중인지: 지금까지 누른 키가 커맨드의 앞부분이면 화살표로 이동하지 않는다
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key
      seq.current.push(key)
      while (seq.current.length && !seq.current.every((k, i) => KONAMI[i] === k)) seq.current.shift()
      const inKonami = seq.current.length >= 4

      if (e.key === 'ArrowLeft' && prev && !inKonami) navigate(prev.to)
      else if (e.key === 'ArrowRight' && next && !inKonami) navigate(next.to)
      else if (e.key === 'Escape' && up && !document.querySelector('.panel-reader.is-wide')) navigate(up) // 넓게 읽는 중엔 Esc가 먼저 그걸 닫는다
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [prev, next, up, navigate])

  const now = items[current]
  const meta = atOverview ? overview?.meta : `${kind} ${pad2(current + 1)} / ${pad2(items.length)}`
  const title = atOverview ? overview?.title : now?.title

  return (
    <nav className="navigator" aria-label="우주 탐색">
      <Arrow dir="prev" item={prev} kind={kind} />
      <div className="nav-body">
        <p className="nav-meta">{meta}</p>
        <p className="nav-title" title={title}>
          {title}
        </p>
        {items.length > 1 && items.length <= 12 && (
          <div className="nav-dots">
            {items.map((it, i) => (
              <Link
                key={it.to}
                to={it.to}
                className={`nav-dot${i === current ? ' is-current' : ''}`}
                style={{ '--dot': it.color } as CSSProperties}
                aria-label={`${kind} ${pad2(i + 1)}: ${it.title}`}
                aria-current={i === current ? 'page' : undefined}
              >
                <span className="nav-dot-tip">{it.title}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
      <Arrow dir="next" item={next} kind={kind} />
    </nav>
  )
}

function Arrow({ dir, item, kind }: { dir: 'prev' | 'next'; item?: NavItem; kind: string }) {
  const word = dir === 'prev' ? '이전' : '다음'
  const icon = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={dir === 'prev' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
    </svg>
  )
  if (!item)
    return (
      <span className={`nav-arrow is-${dir}`} aria-disabled="true" title={`${word} ${kind} 없음`}>
        {icon}
      </span>
    )
  return (
    <Link to={item.to} className={`nav-arrow is-${dir}`} aria-label={`${item.hint ?? `${word} ${kind}`}: ${item.title}`}>
      {icon}
      <span className="nav-tip">
        <small>
          {item.hint ?? `${word} ${kind}`} · {dir === 'prev' ? '←' : '→'}
        </small>
        {item.title}
      </span>
    </Link>
  )
}
