import { lazy, Suspense } from 'react'

// 마크다운 렌더러(react-markdown + remark 플러그인)는 무거워서 따로 받는다 — 은하 첫 화면에는 필요 없다.
// 첫 화면이 뜬 뒤 쉬는 틈에 미리 받아 두므로(prefetchProse) 패널을 열 때는 보통 이미 와 있다.
const load = () => import('./ProseMarkdown')
const ProseMarkdown = lazy(load)

export function prefetchProse() {
  const go = () => void load()
  if (typeof requestIdleCallback === 'function') requestIdleCallback(go, { timeout: 3000 })
  else setTimeout(go, 1500)
}

export default function Prose({ children }: { children: string }) {
  return (
    <Suspense fallback={<div className="prose" aria-busy="true" />}>
      <ProseMarkdown>{children}</ProseMarkdown>
    </Suspense>
  )
}
