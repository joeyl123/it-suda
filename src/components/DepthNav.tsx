import { Link } from 'react-router-dom'

interface Step {
  to: string
  label: string
}

/**
 * 우주의 위아래로만 움직이는 화살표 (design.md §5).
 * ↑ 한 단계 빠져나오기 (행성 → 태양계 → 은하), ↓ 한 단계 들어가기.
 * 옆으로(이전/다음) 가는 버튼은 두지 않는다.
 */
export default function DepthNav({ up, down }: { up?: Step; down?: Step }) {
  return (
    <nav className="depth-nav" aria-label="우주 이동">
      {up && (
        <Link to={up.to} className="depth-btn" aria-label={up.label} title={up.label}>
          <Chevron dir="up" />
          <span className="depth-tip">{up.label}</span>
        </Link>
      )}
      {down && (
        <Link to={down.to} className="depth-btn" aria-label={down.label} title={down.label}>
          <Chevron dir="down" />
          <span className="depth-tip">{down.label}</span>
        </Link>
      )}
    </nav>
  )
}

function Chevron({ dir }: { dir: 'up' | 'down' }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={dir === 'up' ? 'M6 15l6-6 6 6' : 'M6 9l6 6 6-6'} />
    </svg>
  )
}
