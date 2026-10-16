import { useEffect, useState } from 'react'

/**
 * 3D 우주가 첫 장면을 그릴 때까지 보이는 로딩 화면 (design.md §4).
 * three.js 없이 CSS만으로 그려서 가장 먼저 뜬다. ready가 되면 서서히 사라진다.
 */
export default function Loader({ ready }: { ready: boolean }) {
  const [gone, setGone] = useState(false)
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    if (!ready) return
    const t = window.setTimeout(() => setGone(true), 700)
    return () => window.clearTimeout(t)
  }, [ready])

  // 아주 느린 연결: 잠깐 뒤 안내 문구를 바꿔 준다
  useEffect(() => {
    const t = window.setTimeout(() => setSlow(true), 6000)
    return () => window.clearTimeout(t)
  }, [])

  if (gone) return null
  return (
    <div className={`loader${ready ? ' is-done' : ''}`} role="status" aria-live="polite">
      <div className="loader-orbit" aria-hidden="true">
        <span className="loader-star" />
        <span className="loader-ring" />
        <span className="loader-planet" />
      </div>
      <p className="loader-text">{slow ? '거의 다 왔어요… 별들을 배치하는 중' : '우주를 불러오는 중…'}</p>
    </div>
  )
}
