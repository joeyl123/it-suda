// vite.config.ts의 sessionsPlugin이 만드는 모듈: 미리 파싱된 회차 목록 (최신순)
declare module 'virtual:sessions' {
  import type { Session } from './lib/parse'
  const sessions: Session[]
  export default sessions
}
