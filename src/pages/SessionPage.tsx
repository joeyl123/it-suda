import { lazy, Suspense, type CSSProperties } from 'react'
import { useParams } from 'react-router-dom'
import TagChip from '../components/TagChip'
import Prose from '../components/Prose'
import SceneFallback from '../components/SceneFallback'
import ZoomLink from '../components/ZoomLink'
import { planetColors, planetProfile, systemProfile } from '../lib/cosmos'
import { formatDate, getSession, pad2, sessions } from '../lib/sessions'
import { hasWebGL } from '../lib/webgl'
import { anchorPoint, useZoomNavigate } from '../lib/zoom'
import NotFoundPage from './NotFoundPage'

const SystemScene = lazy(() => import('../three/SystemScene'))
const webgl = hasWebGL()

export default function SessionPage() {
  const { slug } = useParams()
  const go = useZoomNavigate()
  const session = slug ? getSession(slug) : undefined
  if (!session) return <NotFoundPage />

  const idx = sessions.indexOf(session)
  const newer = sessions[idx - 1]
  const older = sessions[idx + 1]
  const no = session.number !== undefined ? pad2(session.number) : '··'
  const system = systemProfile(session)

  // 행성을 고르면 그 행성을 중심으로 바로 줌인 전환 (목록에서 눌러도 3D 속 그 행성 위치에서)
  const enter = (n: number, fallback?: { x: number; y: number }) =>
    go(`/sessions/${session.slug}/${n}`, 'in', anchorPoint(`p${n}`) ?? fallback)

  return (
    <div className="split" style={{ '--corona': system.corona } as CSSProperties}>
      <div className="stage">
        {webgl && (
          <Suspense fallback={<SceneFallback />}>
            <SystemScene key={session.slug} session={session} onSelect={(n) => enter(n)} />
          </Suspense>
        )}
        <div className="stage-tag">
          <span className="label">태양계 No.{no}</span>
          <span className="stage-sub">{system.star.name} · SEED {system.seed}</span>
        </div>
        {webgl && <p className="hint stage-hint">행성을 눌러 착륙</p>}
      </div>

      <aside className="panel">
        <nav className="crumbs">
          <ZoomLink to="/" dir="out">은하</ZoomLink>
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
            <TagChip key={t} tag={t} zoomOut />
          ))}
        </div>

        {session.intro && <Prose>{session.intro}</Prose>}

        <h2 className="label section-label">이 태양계의 행성 · {session.topicList.length}</h2>
        <ol className="planet-list">
          {session.topicList.map((t) => {
            const p = planetProfile(session, t)
            return (
              <li key={t.index}>
                <a
                  href={`/sessions/${session.slug}/${t.index}`}
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
                    e.preventDefault()
                    enter(t.index, { x: e.clientX, y: e.clientY })
                  }}
                  style={{ '--glow': p.biome.glow, '--land': planetColors(p).land } as CSSProperties}
                >
                  <span className="planet-dot" aria-hidden="true" />
                  <span className="planet-no">{pad2(t.index)}</span>
                  <span className="planet-name">
                    {t.title}
                    <small>{p.biome.name}</small>
                  </span>
                  <span className="arrow" aria-hidden="true">→</span>
                </a>
              </li>
            )
          })}
        </ol>

        <nav className="pager">
          {older ? (
            <ZoomLink to={`/sessions/${older.slug}`} dir="side" className="prev">
              <span className="label">← 이전 태양계</span>
              <span className="title">{older.title}</span>
            </ZoomLink>
          ) : (
            <span />
          )}
          {newer && (
            <ZoomLink to={`/sessions/${newer.slug}`} dir="side" className="next">
              <span className="label">다음 태양계 →</span>
              <span className="title">{newer.title}</span>
            </ZoomLink>
          )}
        </nav>
      </aside>
    </div>
  )
}
