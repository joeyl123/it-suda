// 페이지 전환 = 카메라 줌. (design.md §6)
// in  : 은하 → 태양계 → 행성 (더 깊이)
// out : 거꾸로 (빠져나오기)
// side: 같은 깊이에서 옆으로 (이전/다음)
//
// 한 번의 연속된 움직임으로 보이게:
//  - 클릭 즉시 View Transition 시작. 옛 화면 스냅샷은 클릭한 별/행성 위치를 향해 확대되며 사라지고
//  - 새 페이지는 그 순간 바로 마운트되어(라이브 레이어) 3D가 로드·렌더되는 동안 같은 점에서 자라난다.
//  - 3D 장면 코드는 미리 받아 둔다(prefetchScenes) → 전환 중 빈 화면 없음.
import { flushSync } from 'react-dom'
import { useNavigate } from 'react-router-dom'

export type ZoomDir = 'in' | 'out' | 'side'
export interface Point {
  x: number
  y: number
}

export function setZoomDir(dir: ZoomDir) {
  document.documentElement.dataset.zoom = dir
}

export function getZoomDir(): ZoomDir {
  return (document.documentElement.dataset.zoom as ZoomDir | undefined) ?? 'in'
}

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** 줌의 중심점 (뷰포트 px). 없으면 화면 가운데. */
function setOrigin(p?: Point | null) {
  const s = document.documentElement.style
  s.setProperty('--vt-x', p ? `${Math.round(p.x)}px` : '50%')
  s.setProperty('--vt-y', p ? `${Math.round(p.y)}px` : '50%')
}

/** 3D 라벨(앵커)이 가리키는 별/행성의 화면 좌표 */
export function anchorPoint(id: string): Point | null {
  const el = document.querySelector<HTMLElement>(`[data-anchor="${CSS.escape(id)}"]`)
  const layer = el?.parentElement
  if (!el || !layer || el.dataset.cx === undefined) return null
  const r = layer.getBoundingClientRect()
  return { x: r.left + Number(el.dataset.cx), y: r.top + Number(el.dataset.cy) }
}

export function useZoomNavigate() {
  const navigate = useNavigate()
  return (to: string, dir: ZoomDir, origin?: Point | null) => {
    setZoomDir(dir)
    setOrigin(origin)
    if (!document.startViewTransition || prefersReducedMotion()) {
      navigate(to)
      return
    }
    document.startViewTransition(() => flushSync(() => navigate(to)))
  }
}

/** 첫 화면이 뜬 뒤 한가할 때 3D 장면 코드를 미리 받아 둔다. */
export function prefetchScenes() {
  const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1200))
  idle(() => {
    void import('../three/GalaxyScene')
    void import('../three/SystemScene')
    void import('../three/PlanetScene')
  })
}
