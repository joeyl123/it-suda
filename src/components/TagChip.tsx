import { Link, useLocation, useSearchParams } from 'react-router-dom'

/**
 * 태그 칩 = 은하의 태그 필터. 은하 화면에서 누르면 지금의 검색어와 보기(은하/목록)는 그대로 두고 태그만 바꾼다.
 * 다른 화면(태양계 패널)에서는 그 태그로 걸러진 은하로 간다.
 */
export default function TagChip({ tag, active, count }: { tag: string; active?: boolean; count?: number }) {
  const { pathname } = useLocation()
  const [params] = useSearchParams()
  const next = new URLSearchParams(pathname === '/' ? params : undefined)
  if (active) next.delete('tag')
  else next.set('tag', tag)
  const qs = next.toString()
  return (
    <Link to={`/${qs ? `?${qs}` : ''}`} className={`chip${active ? ' chip-active' : ''}`}>
      #{tag}
      {count !== undefined && <span className="chip-count">{count}</span>}
    </Link>
  )
}
