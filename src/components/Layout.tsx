import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'

export default function Layout() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="app">
      <header className="header">
        <div className="container header-inner">
          <NavLink to="/" end className="nav-link">아카이브</NavLink>
          <Link to="/" className="brand" aria-label="IT 수다 모임 홈">
            <img src="/favicon.svg" alt="" width={30} height={30} />
            <span>IT 수다 모임</span>
          </Link>
          <NavLink to="/about" className="nav-link">소개</NavLink>
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
