import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { setSheet } from '../lib/ui'

const MOBILE = '(max-width: 899px)'

/**
 * 떠 있는 패널. 데스크톱에서는 그냥 패널, 모바일에서는 아래에서 올라오는 접이식 시트 (design.md §4).
 * 처음엔 접혀서(제목 정도만) 3D가 화면 대부분을 쓰고, 손잡이를 탭하거나 위로 끌면 펼쳐진다.
 */
export default function Sheet({
  as: Tag = 'aside',
  className,
  style,
  children,
}: {
  as?: 'aside' | 'section'
  className: string
  style?: CSSProperties
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [mobile, setMobile] = useState(() => window.matchMedia(MOBILE).matches)
  const drag = useRef<{ y: number; moved: boolean } | null>(null)
  const body = useRef<HTMLElement>(null)

  useEffect(() => {
    const mq = window.matchMedia(MOBILE)
    const on = () => setMobile(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  useEffect(() => {
    setSheet(mobile ? (open ? 'open' : 'peek') : 'none')
  }, [mobile, open])
  useEffect(() => () => setSheet('none'), [])

  // 접을 때는 맨 위로 되돌려서 다시 제목이 보이게
  useEffect(() => {
    if (!open && body.current) body.current.scrollTop = 0
  }, [open])

  const state = !mobile ? undefined : open ? 'open' : 'peek'

  return (
    <Tag ref={body as never} className={className} style={style} data-sheet={state}>
      {mobile && (
        <button
          type="button"
          className="sheet-handle"
          aria-expanded={open}
          aria-label={open ? '패널 접기' : '패널 펼치기'}
          onPointerDown={(e) => {
            drag.current = { y: e.clientY, moved: false }
            ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
          }}
          onPointerMove={(e) => {
            const d = drag.current
            if (!d) return
            const dy = e.clientY - d.y
            if (Math.abs(dy) > 30 && !d.moved) {
              d.moved = true
              setOpen(dy < 0)
            }
          }}
          onPointerUp={() => {
            if (drag.current && !drag.current.moved) setOpen((o) => !o)
            drag.current = null
          }}
        >
          <span className="sheet-grip" aria-hidden="true" />
        </button>
      )}
      {children}
      {/* 접힌 상태에서 내용을 탭하면 펼친다 (링크를 잘못 누르지 않게 덮개로) */}
      {state === 'peek' && <button type="button" className="sheet-cover" aria-label="패널 펼치기" onClick={() => setOpen(true)} />}
    </Tag>
  )
}
