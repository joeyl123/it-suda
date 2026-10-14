import { lazy, Suspense, type CSSProperties } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import TagChip from '../components/TagChip'
import Prose from '../components/Prose'
import SceneFallback from '../components/SceneFallback'
import { planetProfile, starCorona } from '../lib/cosmos'
import { formatDate, getSession, pad2, sessions } from '../lib/sessions'
import { hasWebGL } from '../lib/webgl'
import NotFoundPage from './NotFoundPage'

const SystemScene = lazy(() => import('../three/SystemScene'))
const webgl = hasWebGL()

export default function SessionPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const session = slug ? getSession(slug) : undefined
  if (!session) return <NotFoundPage />

  const idx = sessions.indexOf(session)
  const newer = sessions[idx - 1]
  const older = sessions[idx + 1]
  const no = session.number !== undefined ? pad2(session.number) : '··'

  return (
    <div className="split" style={{ '--corona': starCorona(session) } as CSSProperties}>
      <div className="stage">
        {webgl && (
          <Suspense fallback={<SceneFallback />}>
            <SystemScene key={session.slug} session={session} onSelect={(n) => navigate(`/sessions/${session.slug}/${n}`)} />
          </Suspense>
        )}
        <p className="stage-tag label">태양계 No.{no}</p>
        {webgl && <p className="hint stage-hint">행성을 눌러 착륙</p>}
      </div>

      <aside className="panel">
        <nav className="crumbs">
          <Link to="/">은하</Link>
          <span>/</span>
          <span aria-current="page">No.{no}</span>
        </nav>
        <div className="card-meta">
          <time>{formatDate(session.date)}</time>
          {session.location && (
            <>
              <span className="dot">·</span>
              <span>{session.location}</span>
            </>
          )}
        </div>
        <h1 className="panel-title">{session.title}</h1>
        {session.summary && <p className="panel-summary">{session.summary}</p>}
        <div className="chips chips-left">
          {session.tags.map((t) => (
            <TagChip key={t} tag={t} />
          ))}
        </div>

        {session.intro && <Prose>{session.intro}</Prose>}

        <h2 className="label section-label">이 태양계의 행성 · {session.topicList.length}</h2>
        <ol className="planet-list">
          {session.topicList.map((t) => {
            const p = planetProfile(session, t)
            return (
              <li key={t.index}>
                <Link to={`/sessions/${session.slug}/${t.index}`} style={{ '--glow': p.biome.glow, '--land': p.biome.land } as CSSProperties}>
                  <span className="planet-dot" aria-hidden="true" />
                  <span className="planet-no">{pad2(t.index)}</span>
                  <span className="planet-name">
                    {t.title}
                    <small>{p.biome.name}</small>
                  </span>
                  <span className="arrow" aria-hidden="true">→</span>
                </Link>
              </li>
            )
          })}
        </ol>

        <nav className="pager">
          {older ? (
            <Link to={`/sessions/${older.slug}`} className="prev">
              <span className="label">← 이전 태양계</span>
              <span className="title">{older.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {newer && (
            <Link to={`/sessions/${newer.slug}`} className="next">
              <span className="label">다음 태양계 →</span>
              <span className="title">{newer.title}</span>
            </Link>
          )}
        </nav>
      </aside>
    </div>
  )
}
