// 모바일 하단 시트 상태 — 3D 장면이 시트를 피해 중심을 옮기는 데 쓴다 (Universe shiftOf)
import { useSyncExternalStore } from 'react'

export type SheetState = 'none' | 'peek' | 'open'

let sheet: SheetState = 'none'
const listeners = new Set<() => void>()

export function setSheet(s: SheetState) {
  if (s === sheet) return
  sheet = s
  // 화살표 버튼 등이 시트 위에 붙어 있도록 높이를 CSS 변수로도 알려 준다
  document.documentElement.dataset.sheet = s
  listeners.forEach((l) => l())
}

export function useSheet() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => sheet,
  )
}

// 3D가 가려져 보이지 않는 동안(행성 "넓게 읽기") 그리기를 멈춘다 — GPU를 쉬게 한다 (Universe RenderAndSync)
let covered = false
export function setCovered(c: boolean) {
  covered = c
}
export const isCovered = () => covered
