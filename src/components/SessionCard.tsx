import { Link } from 'react-router-dom'
import { formatDate, type Session } from '../lib/sessions'

export default function SessionCard({ session }: { session: Session }) {
  return (
    <article className="card">
      <Link to={`/sessions/${session.slug}`} className="card-link">
        <div className="card-meta">
          {session.number !== undefined && <span className="badge">{session.number}회차</span>}
          <time>{formatDate(session.date)}</time>
        </div>
        <h2 className="card-title">{session.title}</h2>
        {session.summary && <p className="card-summary">{session.summary}</p>}
        {session.topics.length > 0 && (
          <ul className="card-topics">
            {session.topics.slice(0, 4).map((t) => (
              <li key={t}>{t}</li>
            ))}
            {session.topics.length > 4 && <li className="muted">+{session.topics.length - 4}개 더</li>}
          </ul>
        )}
      </Link>
      <div className="card-tags">
        {session.tags.map((t) => (
          <span key={t} className="tag">#{t}</span>
        ))}
      </div>
    </article>
  )
}
