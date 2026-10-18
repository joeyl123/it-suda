// 내비게이터(components/Navigator)에 쓰는 태양계 목록: 은하에 놓인 순서(오래된 회차 → 최근)
import { systemProfile } from './cosmos'
import { galaxyOrder } from './layout'
import { pad2 } from './sessions'

export const systemNavItems = galaxyOrder.map((s) => ({
  to: `/sessions/${s.slug}`,
  title: `${s.number !== undefined ? `No.${pad2(s.number)} ` : ''}${s.title}`,
  color: systemProfile(s).corona,
}))
