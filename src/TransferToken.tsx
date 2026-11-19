import { useLayoutEffect, useRef } from 'react'
import { useReplayClock } from './ReplayContext'
import type { Point } from './cartography/base'
import { prefixPath, tokenTransform } from './transferPath'
import type { MapTransfer } from './GeoMap'

export function TransferToken({
  trip,
  a,
  b,
  c,
  onSelect,
}: {
  trip: MapTransfer
  a: Point
  b: Point
  c: Point
  onSelect?: (id: string) => void
}) {
  const clock = useReplayClock()
  const node = useRef<SVGGElement>(null)
  const tail = useRef<SVGPathElement>(null)
  const { id, startMinute, endMinute, progress } = trip
  useLayoutEffect(() => {
    function draw(minute: number) {
      if (!node.current || !tail.current) return
      const t = (minute - startMinute) / (endMinute - startMinute)
      const active = t >= 0 && t < 1
      node.current.style.visibility = tail.current.style.visibility = active ? 'visible' : 'hidden'
      if (!active) return
      node.current.setAttribute('transform', tokenTransform(a, c, b, t))
      tail.current.setAttribute('d', prefixPath(a, c, b, t))
    }
    return clock.subscribeFrame(draw)
  }, [a, b, c, startMinute, endMinute, clock])
  return (
    <>
      <path
        ref={tail}
        data-trail-prefix={id}
        d={prefixPath(a, c, b, progress)}
        fill="none"
        stroke="#d7652a"
        strokeWidth="2.2"
        pointerEvents="none"
        aria-hidden="true"
      />
      <g
        ref={node}
        data-token={id}
        className="geo-traveler"
        transform={tokenTransform(a, c, b, progress)}
        pointerEvents="all"
        role={onSelect ? 'button' : undefined}
        tabIndex={onSelect ? 0 : undefined}
        aria-label={'In transit · ' + id}
        onClick={() => onSelect?.(id)}
        onKeyDown={(e) => {
          if (onSelect && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            onSelect(id)
          }
        }}
      >
        <title>Simulated transfer · {id}</title>
        <circle r="12" fill="transparent" />
        <path d="M-6 -4.5h8L8 0 2 4.5h-8z" className="traveler-body" />
        <path d="M-1 -2v4" stroke="white" strokeWidth="1.5" />
      </g>
    </>
  )
}
