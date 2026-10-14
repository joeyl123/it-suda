import { Link } from 'react-router-dom'

export default function TagChip({ tag, active, count }: { tag: string; active?: boolean; count?: number }) {
  return (
    <Link to={active ? '/' : `/?tag=${encodeURIComponent(tag)}`} className={`chip${active ? ' chip-active' : ''}`}>
      #{tag}
      {count !== undefined && <span className="chip-count">{count}</span>}
    </Link>
  )
}
