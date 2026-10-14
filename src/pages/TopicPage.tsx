import { lazy, Suspense, type CSSProperties } from 'react'
import { Link, useParams } from 'react-router-dom'
import Prose from '../components/Prose'
import SceneFallback from '../components/SceneFallback'
import { planetProfile, starCorona } from '../lib/cosmos'
import { getSession, pad2 } from '../lib/sessions'
import { hasWebGL } from '../lib/webgl'
import NotFoundPage from './NotFoundPage'

const PlanetScene = lazy(() => import('../three/PlanetScene'))
const webgl = hasWebGL()

export default function TopicPage() {
  const { slug, topic: topicParam } = useParams()
  const session = slug ? getSession(slug) : undefined
  const topic = session?.topicList.find((t) => String(t.index) === topicParam)
  if (!session || !topic) return <NotFoundPage />

  const profile = planetProfile(session, topic)
  const prev = session.topicList[topic.index - 2]
  const next = session.topicList[topic.index]
  const no = session.number !== undefined ? pad2(session.number) : '··'

  return (
    <div className="split" style={{ '--glow': profile.biome.glow, '--land': profile.biome.land } as CSSProperties}>
      <div className="stage">
        {webgl && (
          <Suspense fallback={<SceneFallback />}>
            <PlanetScene key={profile.key} profile={profile} sunColor={starCorona(session)} />
          </Suspense>
        )}
        <div className="stage-tag biome-tag">
          <span className="label">{profile.biome.name}</span>
          <span>{profile.biome.blurb}</span>
        </div>
      </div>

      <aside className="panel">
        <nav className="crumbs">
          <Link to="/">은하</Link>
          <span>/</span>
          <Link to={`/sessions/${session.slug}`}>No.{no}</Link>
          <span>/</span>
          <span aria-current="page">행성 {pad2(topic.index)}</span>
        </nav>
        <p className="planet-badge">
          <span className="planet-dot" aria-hidden="true" />
          PLANET {pad2(topic.index)} / {pad2(session.topicList.length)} · {session.title}
        </p>
        <h1 className="panel-title">{topic.title}</h1>
        {topic.body ? <Prose>{topic.body}</Prose> : <p className="muted">아직 기록된 내용이 없는 행성이에요.</p>}

        <nav className="pager">
          {prev ? (
            <Link to={`/sessions/${session.slug}/${prev.index}`} className="prev">
              <span className="label">← 이전 행성</span>
              <span className="title">{prev.title}</span>
            </Link>
          ) : (
            <Link to={`/sessions/${session.slug}`} className="prev">
              <span className="label">← 태양계로</span>
              <span className="title">{session.title}</span>
            </Link>
          )}
          {next ? (
            <Link to={`/sessions/${session.slug}/${next.index}`} className="next">
              <span className="label">다음 행성 →</span>
              <span className="title">{next.title}</span>
            </Link>
          ) : (
            <Link to={`/sessions/${session.slug}`} className="next">
              <span className="label">태양계로 →</span>
              <span className="title">{session.title}</span>
            </Link>
          )}
        </nav>
      </aside>
    </div>
  )
}
