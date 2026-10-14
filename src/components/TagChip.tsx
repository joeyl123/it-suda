import { Link } from 'react-router-dom'
import ZoomLink from './ZoomLink'

/** 은하 화면 안에서는 그냥 필터, 태양계·행성 화면에서는 은하로 줌아웃(zoomOut). */
export default function TagChip({ tag, active, count, zoomOut }: { tag: string; active?: boolean; count?: number; zoomOut?: boolean }) {
  const to = active ? '/' : `/?tag=${encodeURIComponent(tag)}`
  const className = `chip${active ? ' chip-active' : ''}`
  const body = (
    <>
      #{tag}
      {count !== undefined && <span className="chip-count">{count}</span>}
    </>
  )
  return zoomOut ? (
    <ZoomLink to={to} dir="out" className={className}>{body}</ZoomLink>
  ) : (
    <Link to={to} className={className}>{body}</Link>
  )
}
