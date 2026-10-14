// 페이지 전환 = 카메라 줌.
// in  : 은하 → 태양계 → 행성 (더 깊이)
// out : 거꾸로 (빠져나오기)
// side: 같은 깊이에서 옆으로 (이전/다음)
import { flushSync } from 'react-dom'
import { useNavigate } from 'react-router-dom'

export type ZoomDir = 'in' | 'out' | 'side'

export function setZoomDir(dir: ZoomDir) {
  document.documentElement.dataset.zoom = dir
}

export function getZoomDir(): ZoomDir {
  return (document.documentElement.dataset.zoom as ZoomDir | undefined) ?? 'in'
}

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function useZoomNavigate() {
  const navigate = useNavigate()
  return (to: string, dir: ZoomDir) => {
    setZoomDir(dir)
    if (!document.startViewTransition || prefersReducedMotion()) {
      navigate(to)
      return
    }
    document.startViewTransition(() => flushSync(() => navigate(to)))
  }
}

/** 3D 장면이 대상 쪽으로 파고드는 시간 (ms). 이후 페이지 전환. */
export const DIVE_MS = 750
