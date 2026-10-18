import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'

export interface Step {
  to: string
  label: string
}
type Dir = 'up' | 'left' | 'down' | 'right'

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']
const KEYS: Record<string, Dir> = { ArrowUp: 'up', ArrowLeft: 'left', ArrowDown: 'down', ArrowRight: 'right' }
const TEXT: Record<Dir, string> = { up: '위로', left: '이전', down: '들어가기', right: '다음' }
const PATH: Record<Dir, string> = { up: 'M6 15l6-6 6 6', down: 'M6 9l6 6 6-6', left: 'M15 6l-6 6 6 6', right: 'M9 6l6 6-6 6' }

/**
 * 방향키 내비게이터 (design.md §5): 십자 배치 ↑ 위로 / ← 이전 · → 다음 / ↓ 들어가기.
 *: ← → 같은 단계의 이웃(시간순), ↑ 한 단계 위로, ↓ 한 단계 안으로.
 * 키보드 방향키도 같다 (입력창·패널 안에서는 무시, 코나미 커맨드 중엔 무시).
 */
export default function Navigator(steps: Partial<Record<Dir, Step>>) {
  const navigate = useNavigate()

  useEffect(() => {
    let seq: string[] = []
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return
      seq = [...seq, e.key.length === 1 ? e.key.toLowerCase() : e.key]
      while (seq.length && !seq.every((k, i) => KONAMI[i] === k)) seq.shift()
      if (seq.length >= 2) return // 코나미 커맨드를 치는 중
      const t = e.target
      if (t instanceof Element && t.closest('input, textarea, select, [contenteditable], .panel')) return // 글 읽기·스크롤은 방해하지 않는다
      const to = steps[KEYS[e.key]]?.to
      if (to) {
        e.preventDefault()
        navigate(to)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [steps.up?.to, steps.left?.to, steps.down?.to, steps.right?.to, navigate]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <nav className="navigator" aria-label="우주 이동">
      {(['up', 'down', 'left', 'right'] as const).map((dir) => {
        const step = steps[dir]
        const icon = (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={PATH[dir]} />
          </svg>
        )
        return step ? (
          <Link key={dir} to={step.to} className={`nav-key is-${dir}`} aria-label={step.label} title={step.label}>
            {icon}
            <span>{TEXT[dir]}</span>
          </Link>
        ) : (
          <span key={dir} className={`nav-key is-${dir}`} aria-hidden="true">
            {icon}
            <span>{TEXT[dir]}</span>
          </span>
        )
      })}
    </nav>
  )
}
