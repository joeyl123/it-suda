import { Link, type LinkProps } from 'react-router-dom'
import { useZoomNavigate, type ZoomDir } from '../lib/zoom'

type Props = Omit<LinkProps, 'to'> & { to: string; dir?: ZoomDir }

/** 줌 전환이 붙은 <Link>. 새 탭 열기(⌘/Ctrl 클릭 등)는 그대로 둔다. */
export default function ZoomLink({ to, dir = 'in', onClick, ...rest }: Props) {
  const go = useZoomNavigate()
  return (
    <Link
      to={to}
      {...rest}
      onClick={(e) => {
        onClick?.(e)
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
        e.preventDefault()
        go(to, dir)
      }}
    />
  )
}
