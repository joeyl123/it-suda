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
          <Link to="/" className="brand">
            <img src="/favicon.svg" alt="" width={28} height={28} />
            <span>IT 수다 모임</span>
          </Link>
          <nav className="nav">
            <NavLink to="/" end>아카이브</NavLink>
            <NavLink to="/about">소개</NavLink>
          </nav>
        </div>
      </header>
      <main className="container main">
        <Outlet />
      </main>
      <footer className="footer">
        <div className="container">IT 수다 모임 · 당근 소모임에서 나눈 이야기들을 기록합니다.</div>
      </footer>
    </div>
  )
}
