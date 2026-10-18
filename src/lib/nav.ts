// 내비게이터(components/Navigator)에 쓰는 태양계 목록: 은하에 놓인 순서(오래된 회차 → 최근)
import { systemProfile } from './cosmos'
import { galaxyOrder } from './layout'
import { pad2 } from './sessions'

export const systemNavItems = galaxyOrder.map((s, i) => ({
  slug: s.slug,
  to: `/sessions/${s.slug}`,
  no: pad2(s.number ?? i + 1),
  title: `${s.number !== undefined ? `No.${pad2(s.number)} ` : ''}${s.title}`,
  color: systemProfile(s).corona,
}))

// 은하로 돌아갈 때 떠날 때의 검색·태그·보기(?q=…&tag=…&view=list)를 그대로 되살린다
let galaxySearch = ''
export function rememberGalaxySearch(search: string) {
  galaxySearch = search
}
export const galaxyHref = () => `/${galaxySearch}`
