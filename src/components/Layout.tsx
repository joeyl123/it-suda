import { useEffect, useRef } from 'react'
import { Outlet, useLocation, useNavigationType } from 'react-router-dom'
import ZoomLink from './ZoomLink'
import { setZoomDir } from '../lib/zoom'

/** 은하(0) → 태양계(1) → 행성(2) */
const depth = (path: string) => (path.startsWith('/sessions/') ? path.split('/').filter(Boolean).length - 1 : 0)

export default function Layout() {
  const location = useLocation()
  const navType = useNavigationType()
  const prev = useRef(location)

  // 브라우저 뒤로/앞으로 가기: 깊이를 비교해 줌 방향을 정한다.
  // 자식 장면이 마운트되며 방향을 읽기 전에 정해져야 해서 렌더 중에 처리한다.
  if (prev.current.key !== location.key) {
    if (navType === 'POP') {
      const a = depth(prev.current.pathname)
      const b = depth(location.pathname)
      setZoomDir(b < a ? 'out' : b > a ? 'in' : 'side')
    }
    prev.current = location
  }

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  const atHome = location.pathname === '/'
  const atAbout = location.pathname === '/about'

  return (
    <div className="app">
      <header className="header">
        <div className="container header-inner">
          <ZoomLink to="/" dir="out" className={`nav-link${atHome ? ' active' : ''}`}>아카이브</ZoomLink>
          <ZoomLink to="/" dir="out" className="brand" aria-label="IT 수다 모임 홈">
            <img src="/favicon.svg" alt="" width={30} height={30} />
            <span>IT 수다 모임</span>
          </ZoomLink>
          <ZoomLink to="/about" dir="side" className={`nav-link${atAbout ? ' active' : ''}`}>소개</ZoomLink>
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
      <footer className="footer">
        <div className="container">
          <div className="footer-mark" aria-hidden="true"><span className="l">◐</span><span className="r">◑</span></div>
          IT 수다 모임 · 당근 소모임에서 마주 앉아 나눈 이야기들
        </div>
      </footer>
    </div>
  )
}
