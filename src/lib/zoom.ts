// 페이지 이동 = 카메라 비행 (three/Universe.tsx). 여기에는 공용 모션 설정만 둔다.
export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
