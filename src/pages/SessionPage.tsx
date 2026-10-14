import type { CSSProperties } from 'react'
import { Link, useParams } from 'react-router-dom'
import TagChip from '../components/TagChip'
import DepthNav from '../components/DepthNav'
import Prose from '../components/Prose'
import { planetColors, planetProfile, systemProfile } from '../lib/cosmos'
import { formatDate, getSession, pad2 } from '../lib/sessions'
import NotFoundPage from './NotFoundPage'

/** 태양계 화면: 3D 태양계(뒤 배경 Universe) 위에 오른쪽 패널. */
export default function SessionPage() {
  const { slug } = useParams()
  const session = slug ? getSession(slug) : undefined
  if (!session) return <NotFoundPage />

  const first = session.topicList[0]
  const no = session.number !== undefined ? pad2(session.number) : '··'
  const system = systemProfile(session)

  return (
    <>
      <div className="hud-tag">
        <span className="label">태양계 No.{no}</span>
        <span className="stage-sub">{system.star.name} · SEED {system.seed}</span>
        <span className="hint">행성을 눌러 착륙</span>
      </div>

      <aside className="panel panel-right" style={{ '--corona': system.corona } as CSSProperties}>
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
                <Link to={`/sessions/${session.slug}/${t.index}`} style={{ '--glow': p.biome.glow, '--land': planetColors(p).land } as CSSProperties}>
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
      </aside>

      <DepthNav
        up={{ to: '/', label: '은하로' }}
        down={first && { to: `/sessions/${session.slug}/${first.index}`, label: `행성 ${pad2(first.index)}로 착륙` }}
      />
    </>
  )
}
