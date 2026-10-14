import ZoomLink from './ZoomLink'
import { formatDate, type Session } from '../lib/sessions'

export default function SessionCard({ session }: { session: Session }) {
  return (
    <article className="card">
      <ZoomLink to={`/sessions/${session.slug}`} dir="in" className="card-link">
        <div className="card-meta">
          <time>{formatDate(session.date)}</time>
          {session.location && (
            <>
              <span className="dot">·</span>
              <span>{session.location}</span>
            </>
          )}
        </div>
        <h2 className="card-title">{session.title}</h2>
        {session.summary && <p className="card-summary">{session.summary}</p>}
        {session.topics.length > 0 && (
          <ul className="card-topics">
            {session.topics.slice(0, 4).map((t) => (
              <li key={t}>{t}</li>
            ))}
            {session.topics.length > 4 && <li className="more">+{session.topics.length - 4}개 더</li>}
          </ul>
        )}
      </ZoomLink>
      <div className="card-tags">
        {session.tags.map((t) => (
          <span key={t} className="tag">#{t}</span>
        ))}
      </div>
    </article>
  )
}
