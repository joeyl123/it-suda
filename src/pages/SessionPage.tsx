import { Link, useParams } from 'react-router-dom'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import TagChip from '../components/TagChip'
import { formatDate, getSession, sessions } from '../lib/sessions'
import NotFoundPage from './NotFoundPage'

export default function SessionPage() {
  const { slug } = useParams()
  const session = slug ? getSession(slug) : undefined
  if (!session) return <NotFoundPage />

  const idx = sessions.indexOf(session)
  const newer = sessions[idx - 1]
  const older = sessions[idx + 1]

  return (
    <article className="session">
      <Link to="/" className="back">← 아카이브로</Link>
      <header className="session-header">
        <div className="card-meta">
          {session.number !== undefined && <span className="badge">{session.number}회차</span>}
          <time>{formatDate(session.date)}</time>
          {session.location && <span>· {session.location}</span>}
        </div>
        <h1>{session.title}</h1>
        {session.summary && <p className="session-summary">{session.summary}</p>}
        <div className="chips">
          {session.tags.map((t) => <TagChip key={t} tag={t} />)}
        </div>
      </header>

      <div className="prose">
        <Markdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ node: _node, ...props }) => <a {...props} target="_blank" rel="noreferrer" />,
          }}
        >
          {session.body}
        </Markdown>
      </div>

      <nav className="pager">
        {older ? <Link to={`/sessions/${older.slug}`}>← {older.title}</Link> : <span />}
        {newer ? <Link to={`/sessions/${newer.slug}`}>{newer.title} →</Link> : <span />}
      </nav>
    </article>
  )
}
