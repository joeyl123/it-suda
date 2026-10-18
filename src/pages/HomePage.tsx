import { useEffect, useMemo, type CSSProperties } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import SessionCard from '../components/SessionCard'
import TagChip from '../components/TagChip'
import Navigator from '../components/Navigator'
import { rememberGalaxySearch, systemNavItems } from '../lib/nav'
import Sheet from '../components/Sheet'
import { allTags, pad2, searchSessions, sessions } from '../lib/sessions'
import { hasWebGL } from '../lib/webgl'
import { useTitle } from '../lib/useTitle'

const webgl = hasWebGL()

/** 은하 화면: 3D 은하(뒤 배경 Universe) 위에 소개 카드 하나. 목록 보기는 가운데 패널. */
export default function HomePage() {
  const [params, setParams] = useSearchParams()
  const { search } = useLocation()
  useTitle()
  // 태양계로 들어갔다 돌아올 때 이 검색·태그·보기를 되살린다
  useEffect(() => rememberGalaxySearch(search), [search])
  const query = params.get('q') ?? ''
  const tag = params.get('tag')
  const view = !webgl || params.get('view') === 'list' ? 'list' : 'galaxy'
  const tags = useMemo(allTags, [])
  const results = useMemo(() => searchSessions(query, tag), [query, tag])
  const topicCount = sessions.reduce((n, s) => n + s.topicList.length, 0)

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const controls = (
    <div className="toolbar">
      <div className="search">
        <input
          type="search"
          placeholder="제목, 내용, 태그로 검색"
          value={query}
          onChange={(e) => setParam('q', e.target.value)}
          aria-label="아카이브 검색"
        />
      </div>
      {tags.length > 0 && (
        <div className="chips">
          {tags.map(([t, count]) => (
            <TagChip key={t} tag={t} count={count} active={t === tag} />
          ))}
        </div>
      )}
    </div>
  )

  const viewToggle = webgl && (
    <div className="view-toggle" role="tablist" aria-label="보기 방식">
      <button role="tab" aria-selected={view === 'galaxy'} onClick={() => setParam('view', null)}>은하</button>
      <button role="tab" aria-selected={view === 'list'} onClick={() => setParam('view', 'list')}>목록</button>
    </div>
  )

  if (view === 'galaxy') {
    // 내비게이터: 시간순 번호 + "태양계 탐사" (검색 중이면 걸린 태양계부터, 걸리지 않은 번호는 흐리게)
    const filtering = Boolean(query || tag)
    const hits = new Set(results.map((s) => s.slug))
    const items = systemNavItems.map((it) => ({ ...it, dim: filtering && !hits.has(it.slug) }))
    const lit = items.filter((it) => !it.dim)
    const start = lit[0]
    const navigator = items.length > 0 && (
      <Navigator
        kind="태양계"
        items={items}
        current={-1}
        overviewLabel={filtering ? `태양계 ${lit.length} / ${items.length}개 빛나는 중` : `태양계 ${items.length}개 · 시간순`}
        action={start && { to: start.to, label: filtering ? '찾은 태양계 탐사' : '태양계 탐사 시작', sub: `${start.title}부터` }}
        keys={{ next: start?.to, prev: lit.at(-1)?.to }}
      />
    )
    return (
      <>
        <Sheet as="section" className="panel panel-left galaxy-hero" footer={navigator} footerFloat={false}>
          <p className="label">당근 IT 소모임 · 자기계발 &amp; 정보 공유</p>
          <h1>
            IT 수다 <span className="accent">은하</span>
          </h1>
          <p className="hero-desc">
            모임 하나는 <b>태양계</b>, 그날 나눈 토픽 하나는 <b>행성</b>. 별을 눌러 들어가 보세요.
          </p>
          <dl className="stats">
            <div><dt>SYSTEMS</dt><dd>{pad2(sessions.length)}</dd></div>
            <div><dt>PLANETS</dt><dd>{pad2(topicCount)}</dd></div>
            <div><dt>TAGS</dt><dd>{pad2(tags.length)}</dd></div>
          </dl>
          {controls}
          {(query || tag) && (
            <p className="match-note">{results.length > 0 ? `${results.length}개 태양계가 빛나고 있어요` : '찾는 태양계가 없어요'}</p>
          )}
        </Sheet>
        <div className="hud-bottom">
          {viewToggle}
          <p className="hint">드래그로 회전 · 스크롤로 확대 · 별을 눌러 입장</p>
        </div>
      </>
    )
  }

  return (
    <section className="panel panel-center">
      <div className="hero">
        <p className="label">당근 IT 소모임 · 자기계발 &amp; 정보 공유</p>
        <h1>
          IT 수다 <span className="accent">은하</span>
        </h1>
        <p className="hero-desc">마주 앉아 나눈 IT 트렌드, 노하우, 그리고 온갖 이야기들을 차곡차곡 기록합니다.</p>
        {viewToggle}
      </div>
      {controls}
      {results.length > 0 ? (
        <div className="timeline">
          {results.map((s, i) => (
            <div key={s.slug} className={`entry ${i % 2 === 0 ? 'entry-left' : 'entry-right'}`} style={{ '--i': i } as CSSProperties}>
              <span className="node" aria-hidden="true">{s.number !== undefined ? pad2(s.number) : '··'}</span>
              <SessionCard session={s} />
            </div>
          ))}
          <span className="timeline-end label">— 첫 수다 —</span>
        </div>
      ) : (
        <p className="empty">검색 결과가 없어요. 다른 키워드로 찾아보세요.</p>
      )}
    </section>
  )
}
