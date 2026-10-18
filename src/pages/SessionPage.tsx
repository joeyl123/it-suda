import type { CSSProperties } from 'react'
import { Link, useParams } from 'react-router-dom'
import TagChip from '../components/TagChip'
import Navigator from '../components/Navigator'
import { galaxyHref, systemNavItems } from '../lib/nav'
import Sheet from '../components/Sheet'
import Prose from '../components/Prose'
import { planetColors, planetProfile, systemProfile } from '../lib/cosmos'
import { formatDate, getSession, pad2 } from '../lib/sessions'
import { useTitle } from '../lib/useTitle'
import NotFoundPage from './NotFoundPage'

/** 태양계 화면: 3D 태양계(뒤 배경 Universe) 위에 오른쪽 패널. */
export default function SessionPage() {
  const { slug } = useParams()
  const session = slug ? getSession(slug) : undefined
  useTitle(!session ? '궤도를 벗어났어요' : `${session.number !== undefined ? `No.${pad2(session.number)} ` : ''}${session.title}`)
  if (!session) return <NotFoundPage />

  const no = session.number !== undefined ? pad2(session.number) : '··'
  const system = systemProfile(session)

  return (
    <>
      <div className="hud-tag">
        <span className="label">태양계 No.{no}</span>
        <span className="stage-sub">{system.star.name} · SEED {system.seed}</span>
        {session.topicList.length > 0 && <span className="hint">행성을 눌러 착륙</span>}
      </div>

      <Sheet
        className="panel panel-right"
        style={{ '--corona': system.corona } as CSSProperties}
        footer={
          <Navigator
            kind="태양계"
            items={systemNavItems}
            current={systemNavItems.findIndex((it) => it.slug === session.slug)}
            back={{ to: galaxyHref(), label: '은하로' }}
          />
        }
      >
        <nav className="crumbs">
          <Link to={galaxyHref()}>은하</Link>
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
        {session.topicList.length === 0 ? (
          <p className="planet-empty">아직 발견된 행성이 없어요. 탐사 기록이 정리되면 하나씩 떠오를 거예요.</p>
        ) : (
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
        )}
      </Sheet>

    </>
  )
}
