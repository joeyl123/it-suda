import type { CSSProperties } from 'react'
import { Link, useParams } from 'react-router-dom'
import Prose from '../components/Prose'
import DepthNav from '../components/DepthNav'
import Sheet from '../components/Sheet'
import { planetColors, planetProfile } from '../lib/cosmos'
import { getSession, pad2 } from '../lib/sessions'
import { useTitle } from '../lib/useTitle'
import NotFoundPage from './NotFoundPage'

/** 행성 화면: 3D 행성(뒤 배경 Universe) 위에 오른쪽 패널. */
export default function TopicPage() {
  const { slug, topic: topicParam } = useParams()
  const session = slug ? getSession(slug) : undefined
  const topic = session?.topicList.find((t) => String(t.index) === topicParam)
  useTitle(!topic || !session ? '궤도를 벗어났어요' : `${topic.title} · ${session.title}`)
  if (!session || !topic) return <NotFoundPage />

  const profile = planetProfile(session, topic)
  const no = session.number !== undefined ? pad2(session.number) : '··'
  const facts = [
    profile.sea > 0.1 ? '바다가 넓음' : profile.sea < -0.5 ? '물이 거의 없음' : null,
    profile.ring ? '고리 있음' : null,
    profile.moons ? `위성 ${profile.moons}개` : null,
    profile.clouds > 0.8 ? '구름 많음' : null,
  ].filter(Boolean)
  const tone = { '--glow': profile.biome.glow, '--land': planetColors(profile).land } as CSSProperties

  return (
    <>
      <div className="hud-tag biome-tag" style={tone}>
        <span className="label">{profile.biome.name}</span>
        <span>{profile.biome.blurb}</span>
        <span className="stage-sub">
          SEED {profile.seed}
          {facts.length > 0 && ` · ${facts.join(' · ')}`}
        </span>
      </div>

      <Sheet className="panel panel-right" style={tone}>
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
      </Sheet>

      <DepthNav up={{ to: `/sessions/${session.slug}`, label: `태양계 No.${no}로` }} />
    </>
  )
}
