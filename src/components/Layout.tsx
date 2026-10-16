import { lazy, Suspense, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import CosmicToast from './CosmicToast'
import Loader from './Loader'
import QualityMenu from './QualityMenu'
import { hasWebGL } from '../lib/webgl'

// 화면 전체에 늘 떠 있는 하나의 3D 우주. 페이지는 그 위에 뜬 패널일 뿐이다.
const Universe = lazy(() => import('../three/Universe'))
const webgl = hasWebGL()

export default function Layout() {
  const location = useLocation()
  const atHome = location.pathname === '/'
  const atAbout = location.pathname === '/about'
  const [ready, setReady] = useState(!webgl)

  return (
    <>
      {webgl && (
        <Suspense fallback={null}>
          <Universe onReady={() => setReady(true)} />
        </Suspense>
      )}
      <Loader ready={ready} />
      <div className="app">
        <header className="header">
          <div className="header-inner">
            <Link to="/" className={`nav-link${atHome ? ' active' : ''}`}>아카이브</Link>
            <Link to="/" className="brand" aria-label="IT 수다 모임 홈">
              <img src="/favicon.svg" alt="" width={30} height={30} />
              <span>IT 수다 모임</span>
            </Link>
            <div className="header-right">
              <Link to="/about" className={`nav-link${atAbout ? ' active' : ''}`}>소개</Link>
              {webgl && <QualityMenu />}
            </div>
          </div>
        </header>
        {/* 경로가 바뀌면 패널이 새로 떠오른다 */}
        <main className="hud" key={location.pathname}>
          <Outlet />
        </main>
        <CosmicToast />
      </div>
    </>
  )
}
