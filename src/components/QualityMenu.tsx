import { useEffect, useRef, useState } from 'react'
import { QUALITY_LABEL, setQualityPref, useQuality, type QualityPref } from '../lib/quality'

const OPTIONS: { pref: QualityPref; hint: string }[] = [
  { pref: 'auto', hint: '기기에 맞춰 알아서' },
  { pref: 'high', hint: '가장 화려하게' },
  { pref: 'medium', hint: '균형' },
  { pref: 'low', hint: '배터리·느린 폰' },
]

/** 헤더의 ⚙ — 화면 품질 고르기 (lib/quality) */
export default function QualityMenu() {
  const { pref, level } = useQuality()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('pointerdown', close)
    window.addEventListener('keydown', esc)
    return () => {
      window.removeEventListener('pointerdown', close)
      window.removeEventListener('keydown', esc)
    }
  }, [open])

  return (
    <div className="quality" ref={root}>
      <button type="button" className="nav-link quality-btn" aria-label="화면 품질" aria-expanded={open} title="화면 품질" onClick={() => setOpen((o) => !o)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />
        </svg>
      </button>
      {open && (
        <div className="quality-menu" role="menu">
          <p className="quality-title">화면 품질</p>
          {OPTIONS.map((o) => (
            <button
              key={o.pref}
              type="button"
              role="menuitemradio"
              aria-checked={pref === o.pref}
              className="quality-opt"
              onClick={() => {
                setQualityPref(o.pref)
                setOpen(false)
              }}
            >
              <span className="quality-name">
                {QUALITY_LABEL[o.pref]}
                {o.pref === 'auto' && pref === 'auto' && <small> · 지금 {QUALITY_LABEL[level]}</small>}
              </span>
              <span className="quality-hint">{o.hint}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
