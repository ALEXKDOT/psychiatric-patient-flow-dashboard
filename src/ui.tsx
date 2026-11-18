import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const dialog = ref.current!
    dialog.showModal()
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      dialog.close()
      document.body.style.overflow = previous
      opener?.focus()
    }
  }, [])
  return (
    <dialog
      ref={ref}
      aria-label={title}
      className={'atlas-modal' + (wide ? ' wide' : '')}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
    >
      <div className="modal-bar">
        <span className="eyebrow">{title}</span>
        <button onClick={onClose} className="icon-btn" aria-label="Close dialog">
          <X size={18} />
        </button>
      </div>
      <div className="modal-content">{children}</div>
    </dialog>
  )
}
export function clockLabel(minute: number) {
  const m = Math.max(0, Math.floor(minute))
  return (
    'D' +
    (1 + Math.floor(m / 1440)) +
    ' · ' +
    String(Math.floor(m / 60) % 24).padStart(2, '0') +
    ':' +
    String(m % 60).padStart(2, '0')
  )
}
export function Trendline({ data, color = 'currentColor' }: { data: number[]; color?: string }) {
  if (!data.length) return null
  const lo = Math.min(...data),
    hi = Math.max(...data)
  const points = data.map((n, i) => [
    (i * 80) / Math.max(1, data.length - 1),
    hi === lo ? 12 : 21 - ((n - lo) / (hi - lo)) * 17,
  ])
  const path = points.map(([x, y], i) => (i ? 'H' + x + 'V' : 'M' + x + ' ') + y).join(' ')
  return (
    <svg className="mini-trend" viewBox="0 0 82 26" aria-hidden="true">
      <path d={path} stroke={color} fill="none" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}
