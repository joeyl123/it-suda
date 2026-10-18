import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export interface NavItem {
  to: string
  /** 화면에 보이는 이름 (미리보기·이전/다음 카드) */
  title: string
  /** 번호 버튼 글자: "01" */
  no: string
  /** 번호 아래 색 막대 (항성·생태계 색) */
  color?: string
  /** 검색에 걸리지 않아 흐리게 */
  dim?: boolean
}

interface Props {
  /** '태양계' | '행성' */
  kind: string
  items: NavItem[]
  /** 지금 보고 있는 항목. 은하처럼 목록 위(개요)에 있으면 -1 */
  current: number
  /** 한 단계 위로 — 늘 보이는 뒤로 버튼, Esc */
  back?: { to: string; label: string }
  /** 개요 화면(은하)의 주 행동: "태양계 탐사 시작" */
  action?: { to: string; label: string; sub?: string }
  /** 개요 화면에서 ← → 키가 갈 곳 (이전·다음 카드가 없을 때) */
  keys?: { prev?: string; next?: string }
  /** 개요 화면의 위치 문구 ("태양계 4개") */
  overviewLabel?: string
}

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']
const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * 우주 내비게이터 (design.md §5).
 *  ┌ [‹ 뒤로]                         태양계 02 / 04 ┐
 *  │ 지금 제목 (번호에 올리거나 포커스하면 그 목적지)  │
 *  │ [01] [02] [03] [04]   ← 번호 = 회차·행성 번호     │
 *  └ [‹ 이전 · 제목 ]  [ 다음 · 제목 ›]  또는 [태양계 탐사 시작 →] ┘
 * 순서는 늘 시간순(오래된 회차 → 최근). 끝에서는 돌아가지 않고 "첫/마지막"이라고 알려 준다.
 * 키보드: ← → 이웃, Esc 뒤로. 코나미 커맨드(↑↑↓↓←→←→BA)를 치는 중엔 움직이지 않는다.
 * 모바일에서는 Sheet의 footer로 시트 아래쪽에 붙는다 (Sheet.tsx).
 */
export default function Navigator({ kind, items, current, back, action, keys, overviewLabel }: Props) {
  const navigate = useNavigate()
  const atOverview = current < 0
  const prev = atOverview ? undefined : items[current - 1]
  const next = atOverview ? undefined : items[current + 1]
  const keyPrev = prev?.to ?? keys?.prev
  const keyNext = next?.to ?? keys?.next
  const seq = useRef<string[]>([])
  const select = useRef<HTMLOListElement>(null)
  const [peek, setPeek] = useState<NavItem | null>(null)

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

      if (e.key === 'ArrowLeft' && keyPrev && !inKonami) navigate(keyPrev)
      else if (e.key === 'ArrowRight' && keyNext && !inKonami) navigate(keyNext)
      else if (e.key === 'Escape' && back && !document.querySelector('.panel-reader.is-wide')) navigate(back.to) // 넓게 읽는 중엔 Esc가 먼저 그걸 닫는다
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [keyPrev, keyNext, back, navigate])

  // 번호가 많아 옆으로 넘치면 지금 번호가 가운데 오도록 (세로 스크롤은 건드리지 않게 scrollLeft만)
  useLayoutEffect(() => {
    const box = select.current
    const el = box?.querySelector<HTMLElement>('[aria-current="page"]')
    if (!box || !el || box.scrollWidth <= box.clientWidth) return
    box.scrollTo({ left: el.offsetLeft - box.clientWidth / 2 + el.offsetWidth / 2, behavior: reduceMotion() ? 'auto' : 'smooth' })
  }, [current])

  const now = items[current]
  const position = atOverview ? overviewLabel : `${kind} ${now?.no} / ${String(items.length).padStart(2, '0')}`
  const preview = peek ?? now

  return (
    <nav className="navigator" aria-label={`${kind} 탐색`}>
      <div className="nav-head">
        {back && (
          <Link to={back.to} className="nav-back" aria-label={`${back.label} (Esc)`}>
            <Chevron dir="prev" />
            <span>{back.label}</span>
          </Link>
        )}
        {position && <p className="nav-pos">{position}</p>}
      </div>

      <p className={`nav-preview${peek && peek !== now ? ' is-peek' : ''}`} aria-hidden="true">
        {preview ? (peek && peek !== now ? `→ ${preview.title}` : preview.title) : '번호를 눌러 바로 가거나, 처음부터 탐사해 보세요'}
      </p>

      {items.length > 0 && (
        <ol className="nav-select" ref={select} aria-label={`${kind} 바로 가기`} onMouseLeave={() => setPeek(null)}>
          {items.map((it, i) => (
            <li key={it.to}>
              <Link
                to={it.to}
                className={`nav-num${it.dim ? ' is-dim' : ''}`}
                style={{ '--dot': it.color } as CSSProperties}
                aria-label={`${kind} ${it.no}: ${it.title}${it.dim ? ' (검색 결과 아님)' : ''}`}
                aria-current={i === current ? 'page' : undefined}
                title={it.title}
                onMouseEnter={() => setPeek(it)}
                onFocus={() => setPeek(it)}
                onBlur={() => setPeek(null)}
              >
                {it.no}
              </Link>
            </li>
          ))}
        </ol>
      )}

      {action ? (
        <Link to={action.to} className="nav-action">
          <span>
            <strong>{action.label}</strong>
            {action.sub && <small>{action.sub}</small>}
          </span>
          <Chevron dir="next" />
        </Link>
      ) : (
        !atOverview && (
          <div className="nav-steps">
            <Step dir="prev" item={prev} kind={kind} />
            <Step dir="next" item={next} kind={kind} />
          </div>
        )
      )}
    </nav>
  )
}

function Step({ dir, item, kind }: { dir: 'prev' | 'next'; item?: NavItem; kind: string }) {
  const word = dir === 'prev' ? '이전' : '다음'
  if (!item)
    return (
      <span className={`nav-step is-${dir} is-end`} aria-disabled="true">
        <span className="nav-step-dir">{dir === 'prev' ? `첫 ${kind}예요` : `마지막 ${kind}예요`}</span>
      </span>
    )
  return (
    <Link to={item.to} className={`nav-step is-${dir}`} aria-label={`${word} ${kind} ${item.no}: ${item.title}`}>
      <span className="nav-step-dir">
        {dir === 'prev' && <Chevron dir="prev" />}
        {word} {kind} {item.no}
        {dir === 'next' && <Chevron dir="next" />}
      </span>
      <span className="nav-step-title" title={item.title}>
        {item.title}
      </span>
    </Link>
  )
}

function Chevron({ dir }: { dir: 'prev' | 'next' }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={dir === 'prev' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
    </svg>
  )
}
