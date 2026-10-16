import { useEffect } from 'react'

const SITE = 'IT 수다 모임'

/** 브라우저 탭 제목. 링크 미리보기용 제목은 빌드 때 scripts/prerender.tsx 가 HTML에 따로 써 넣는다. */
export function useTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${SITE}` : `${SITE} · IT 수다 은하`
  }, [title])
}
