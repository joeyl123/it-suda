import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Link, useParams } from 'react-router-dom'
import Prose from '../components/Prose'
import DepthNav from '../components/DepthNav'
import Sheet from '../components/Sheet'
import { planetColors, planetProfile } from '../lib/cosmos'
import { formatDate, getSession, pad2 } from '../lib/sessions'
import { readMinutes, tocOf } from '../lib/toc'
import { setCovered } from '../lib/ui'
import { useTitle } from '../lib/useTitle'
import NotFoundPage from './NotFoundPage'

const WIDE_KEY = 'it-suda:reader-wide'
const readWide = () => {
  try {
    return localStorage.getItem(WIDE_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * 행성 화면: 3D 행성(뒤 배경 Universe) 옆에 넓은 읽기 패널 (design.md §4).
 * 기록이 길어서 — 목차·읽기 진행률·"넓게 읽기"(가운데 큰 화면)를 둔다.
 */
export default function TopicPage() {
  const { slug, topic: topicParam } = useParams()
  const session = slug ? getSession(slug) : undefined
  const topic = session?.topicList.find((t) => String(t.index) === topicParam)
  useTitle(!topic || !session ? '궤도를 벗어났어요' : `${topic.title} · ${session.title}`)

  const toc = useMemo(() => (topic ? tocOf(topic.body) : []), [topic])
  const [wide, setWide] = useState(readWide)
  // 한 번이라도 넓게/좁게 바꿨으면 패널 등장 애니메이션을 다시 틀지 않는다 (바꿀 때마다 사라졌다 나타나지 않게)
  const [toggled, setToggled] = useState(false)
  const [current, setCurrent] = useState<string | null>(null)
  const progress = useRef<HTMLSpanElement>(null)

  const toggleWide = (next: boolean) => {
    setWide(next)
    setToggled(true)
    try {
      localStorage.setItem(WIDE_KEY, next ? '1' : '0')
    } catch {
      /* 저장 못 해도 이번엔 적용 */
    }
  }
  // 데스크톱에서 넓게 읽는 동안엔 3D가 완전히 가려지므로 그리기를 멈춘다
  useEffect(() => {
    setCovered(wide && window.matchMedia('(min-width: 900px)').matches)
    return () => setCovered(false)
  }, [wide])
  useEffect(() => {
    if (!wide) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && toggleWide(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [wide])

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

  // 읽기 진행률 막대 + 지금 읽는 소제목 (리렌더 없이 막대는 직접, 목차 강조만 상태로)
  const onScroll = (el: HTMLElement) => {
    const max = el.scrollHeight - el.clientHeight
    progress.current?.style.setProperty('--p', String(max > 0 ? el.scrollTop / max : 0))
    let now: string | null = null
    for (const item of toc) {
      const h = el.querySelector<HTMLElement>(`#${item.id}`)
      if (h && h.getBoundingClientRect().top - el.getBoundingClientRect().top < 120) now = item.id
    }
    if (now !== current) setCurrent(now)
  }

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

      {wide && <div className="reader-dim" onClick={() => toggleWide(false)} aria-hidden="true" />}

      <Sheet className={`panel panel-right panel-reader${wide ? ' is-wide' : ''}${toggled && !wide ? ' no-enter' : ''}`} style={tone} onScroll={onScroll}>
        <div className="reader-bar">
          <nav className="crumbs">
            <Link to="/">은하</Link>
            <span>/</span>
            <Link to={`/sessions/${session.slug}`}>No.{no}</Link>
            <span>/</span>
            <span aria-current="page">행성 {pad2(topic.index)}</span>
          </nav>
          <button type="button" className="btn-ghost reader-wide-btn" onClick={() => toggleWide(!wide)} aria-pressed={wide}>
            <WideIcon wide={wide} />
            {wide ? '패널로 보기' : '넓게 읽기'}
          </button>
          <span className="reader-progress" aria-hidden="true">
            <span ref={progress} />
          </span>
        </div>

        <div className="reader-main">
          <header className="reader-head">
            <p className="planet-badge">
              <span className="planet-dot" aria-hidden="true" />
              행성 {pad2(topic.index)} / {pad2(session.topicList.length)} · {profile.biome.name}
            </p>
            <h1 className="panel-title">{topic.title}</h1>
            <p className="reader-meta">
              <Link to={`/sessions/${session.slug}`}>{session.title}</Link>
              <span aria-hidden="true">·</span>
              <time>{formatDate(session.date)}</time>
              {topic.body && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>약 {readMinutes(topic.body)}분 읽기</span>
                </>
              )}
            </p>
          </header>

          {toc.length > 1 && (
            <nav className="toc" aria-label="목차">
              <p className="toc-title">목차</p>
              <ol>
                {toc.map((item) => (
                  <li key={item.id}>
                    <a
                      href={`#${item.id}`}
                      className={current === item.id ? 'is-current' : undefined}
                      onClick={(e) => {
                        e.preventDefault()
                        document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                      }}
                    >
                      {item.text}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          )}

          <div className="reader-body">
            {topic.body ? <Prose>{topic.body}</Prose> : <p className="muted">아직 기록된 내용이 없는 행성이에요.</p>}
          </div>
        </div>
      </Sheet>

      <DepthNav up={{ to: `/sessions/${session.slug}`, label: `태양계 No.${no}로` }} />
    </>
  )
}

function WideIcon({ wide }: { wide: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {wide ? <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /> : <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />}
    </svg>
  )
}
