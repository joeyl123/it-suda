import { useEffect, useState } from 'react'

/** 이스터에그 메시지. 화면 아래 가운데에 잠깐 떴다 사라진다. */
export default function CosmicToast() {
  const [msg, setMsg] = useState<{ text: string; id: number } | null>(null)

  useEffect(() => {
    let timer = 0
    const onToast = (e: Event) => {
      setMsg({ text: (e as CustomEvent<string>).detail, id: Date.now() })
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setMsg(null), 3600)
    }
    window.addEventListener('cosmic-toast', onToast)
    return () => {
      window.removeEventListener('cosmic-toast', onToast)
      window.clearTimeout(timer)
    }
  }, [])

  return (
    <div className="cosmic-toast-wrap" aria-live="polite">
      {msg && (
        <div key={msg.id} className="cosmic-toast">
          {msg.text}
        </div>
      )}
    </div>
  )
}
