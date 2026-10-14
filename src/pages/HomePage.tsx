import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import SessionCard from '../components/SessionCard'
import TagChip from '../components/TagChip'
import { allTags, searchSessions, sessions } from '../lib/sessions'

export default function HomePage() {
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const tag = params.get('tag')
  const tags = useMemo(allTags, [])
  const results = useMemo(() => searchSessions(query, tag), [query, tag])
  const topicCount = sessions.reduce((n, s) => n + s.topics.length, 0)

  const setQuery = (q: string) => {
    const next = new URLSearchParams(params)
    if (q) next.set('q', q)
    else next.delete('q')
    setParams(next, { replace: true })
  }

  return (
    <>
      <section className="hero">
        <p className="eyebrow">당근 소모임 · IT 자기계발 & 정보 공유</p>
        <h1>IT 수다 모임 아카이브</h1>
        <p className="hero-desc">모임에서 나눈 IT 트렌드, 노하우, 그리고 온갖 이야기들을 차곡차곡 기록합니다.</p>
        <dl className="stats">
          <div><dt>모임</dt><dd>{sessions.length}회</dd></div>
          <div><dt>나눈 토픽</dt><dd>{topicCount}개</dd></div>
          <div><dt>태그</dt><dd>{tags.length}개</dd></div>
        </dl>
      </section>

      <div className="search">
        <input
          type="search"
          placeholder="제목, 내용, 태그로 검색…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
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

      {results.length > 0 ? (
        <div className="grid">
          {results.map((s) => (
            <SessionCard key={s.slug} session={s} />
          ))}
        </div>
      ) : (
        <p className="empty">검색 결과가 없어요. 다른 키워드로 찾아보세요.</p>
      )}
    </>
  )
}
