// 화면 품질 (design.md §7). 기기에 맞춰 3D의 무게를 조절한다.
//  - 처음엔 기기 정보(코어 수·메모리·화면 크기)로 추측
//  - 자동(auto)이면 실제 프레임률을 보고 한 단계씩 내리거나 올린다 (Universe의 PerformanceMonitor)
//  - 직접 고른 값은 이 기기에 저장된다
import { useSyncExternalStore } from 'react'

export type Quality = 'high' | 'medium' | 'low'
export type QualityPref = 'auto' | Quality

export interface QualitySettings {
  /** 최대 픽셀 밀도 */
  dpr: number
  /** 은하 별 개수 배율 */
  stars: number
  starfield: number
  planet: { detail: number; props: number; clouds: number }
  system: { detail: number; props: number; clouds: number }
  /** 0이면 화면 주사율대로, 아니면 이 fps로 제한 (배터리 절약) */
  fps: number
}

export const QUALITY: Record<Quality, QualitySettings> = {
  high: { dpr: 2, stars: 1, starfield: 1600, planet: { detail: 24, props: 320, clouds: 46 }, system: { detail: 8, props: 55, clouds: 12 }, fps: 0 },
  medium: { dpr: 1.5, stars: 0.6, starfield: 1000, planet: { detail: 16, props: 180, clouds: 28 }, system: { detail: 6, props: 30, clouds: 8 }, fps: 0 },
  low: { dpr: 1, stars: 0.35, starfield: 600, planet: { detail: 10, props: 80, clouds: 14 }, system: { detail: 4, props: 15, clouds: 4 }, fps: 30 },
}

export const QUALITY_LABEL: Record<QualityPref, string> = { auto: '자동', high: '높음', medium: '보통', low: '가벼움' }

const ORDER: Quality[] = ['low', 'medium', 'high']
const KEY = 'it-suda:quality'

function detect(): Quality {
  if (typeof window === 'undefined') return 'high'
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'low'
  const cores = navigator.hardwareConcurrency ?? 4
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4
  const small = Math.min(window.screen.width, window.screen.height) < 600
  if (memory <= 2 || cores <= 2) return 'low'
  if (small || cores <= 4 || memory <= 4) return 'medium'
  return 'high'
}

function readPref(): QualityPref {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'auto' || v === 'high' || v === 'medium' || v === 'low') return v
  } catch {
    /* 저장소를 못 쓰는 환경 — 자동으로 */
  }
  return 'auto'
}

const detected = detect()
let state = { pref: readPref(), level: detected as Quality }
if (state.pref !== 'auto') state.level = state.pref

const listeners = new Set<() => void>()
function emit() {
  document.documentElement.dataset.quality = state.level
  listeners.forEach((l) => l())
}
if (typeof document !== 'undefined') document.documentElement.dataset.quality = state.level

export function setQualityPref(pref: QualityPref) {
  try {
    localStorage.setItem(KEY, pref)
  } catch {
    /* 저장 실패해도 이번 방문에는 적용 */
  }
  state = { pref, level: pref === 'auto' ? detected : pref }
  emit()
}

/** 자동일 때만: 버벅이면 한 단계 내리고, 여유가 있으면 (처음 추측한 수준까지만) 올린다 */
export function stepQuality(dir: -1 | 1) {
  if (state.pref !== 'auto') return
  const i = ORDER.indexOf(state.level) + dir
  const ceiling = ORDER.indexOf(detected)
  if (i < 0 || i > ceiling) return
  state = { ...state, level: ORDER[i] }
  emit()
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}
const snapshot = () => state

export function useQuality() {
  const s = useSyncExternalStore(subscribe, snapshot)
  return { ...s, settings: QUALITY[s.level] }
}
