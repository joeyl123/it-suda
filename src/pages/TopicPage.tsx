import { lazy, Suspense, type CSSProperties } from 'react'
import { useParams } from 'react-router-dom'
import Prose from '../components/Prose'
import SceneFallback from '../components/SceneFallback'
import ZoomLink from '../components/ZoomLink'
import { planetColors, planetProfile, systemProfile } from '../lib/cosmos'
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
  const system = systemProfile(session)
  const prev = session.topicList[topic.index - 2]
  const next = session.topicList[topic.index]
  const no = session.number !== undefined ? pad2(session.number) : '··'
  const facts = [
    profile.sea > 0.1 ? '바다가 넓음' : profile.sea < -0.5 ? '물이 거의 없음' : null,
    profile.ring ? '고리 있음' : null,
    profile.moons ? `위성 ${profile.moons}개` : null,
    profile.clouds > 0.8 ? '구름 많음' : null,
  ].filter(Boolean)

  return (
    <div className="split" style={{ '--glow': profile.biome.glow, '--land': planetColors(profile).land } as CSSProperties}>
      <div className="stage">
        {webgl && (
          <Suspense fallback={<SceneFallback />}>
            <PlanetScene key={profile.seed} profile={profile} system={system} />
          </Suspense>
        )}
        <div className="stage-tag biome-tag">
          <span className="label">{profile.biome.name}</span>
          <span>{profile.biome.blurb}</span>
          <span className="stage-sub">
            SEED {profile.seed}
            {facts.length > 0 && ` · ${facts.join(' · ')}`}
          </span>
        </div>
      </div>

      <aside className="panel">
        <nav className="crumbs">
          <ZoomLink to="/" dir="out">은하</ZoomLink>
          <span>/</span>
          <ZoomLink to={`/sessions/${session.slug}`} dir="out">No.{no}</ZoomLink>
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
            <ZoomLink to={`/sessions/${session.slug}/${prev.index}`} dir="side" className="prev">
              <span className="label">← 이전 행성</span>
              <span className="title">{prev.title}</span>
            </ZoomLink>
          ) : (
            <ZoomLink to={`/sessions/${session.slug}`} dir="out" className="prev">
              <span className="label">← 태양계로</span>
              <span className="title">{session.title}</span>
            </ZoomLink>
          )}
          {next ? (
            <ZoomLink to={`/sessions/${session.slug}/${next.index}`} dir="side" className="next">
              <span className="label">다음 행성 →</span>
              <span className="title">{next.title}</span>
            </ZoomLink>
          ) : (
            <ZoomLink to={`/sessions/${session.slug}`} dir="out" className="next">
              <span className="label">태양계로 →</span>
              <span className="title">{session.title}</span>
            </ZoomLink>
          )}
        </nav>
      </aside>
    </div>
  )
}
