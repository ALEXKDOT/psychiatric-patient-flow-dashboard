import { useContext, useLayoutEffect, useMemo, useRef } from 'react'
import { ReplayContext } from '../ReplayContext'
import type { MotionSegment } from '../sim'
import type { Coordinate } from './geometry'
import { journeyCoordinates, localTraveler } from './journey'

interface Props {
  campus: string
  transfers?: MotionSegment[]
  project: (ll: Coordinate) => Coordinate
  width: number
  height: number
  onInspect?: (id: string) => void
}

function PlanTraveler({
  segment,
  project,
  width,
  height,
  onInspect,
}: Omit<Props, 'campus' | 'transfers'> & { segment: MotionSegment }) {
  const clock = useContext(ReplayContext)
  const { id, from, to, startMinute, endMinute } = segment
  const coord = useMemo(() => journeyCoordinates({ from, to }), [from, to])
  const hit = useRef<SVGGElement>(null)
  const trail = useRef<SVGPathElement>(null)
  useLayoutEffect(() => {
    if (!clock) return
    const draw = (time: number) => {
      if (!hit.current || !trail.current) return
      const view = localTraveler(
        { from, to, startMinute, endMinute },
        time,
        coord,
        project,
        width,
        height,
      )
      hit.current.style.display = trail.current.style.display = view ? '' : 'none'
      if (!view) return
      trail.current.setAttribute('d', view.path)
      hit.current.setAttribute('transform', `translate(${view.pixel.join(' ')})`)
      hit.current.dataset.longitude = String(view.coordinate[0])
      hit.current.dataset.latitude = String(view.coordinate[1])
    }
    return clock.subscribeFrame(draw)
  }, [clock, project, width, height, from, to, startMinute, endMinute, coord])
  const inspect = () => onInspect?.(id)
  return (
    <>
      <path
        ref={trail}
        data-campus-prefix={id}
        style={{ display: 'none' }}
        stroke="#c65424"
        strokeWidth="2.2"
        strokeDasharray="4 3"
        fill="none"
        pointerEvents="none"
        aria-hidden="true"
      />
      <g
        ref={hit}
        role="button"
        tabIndex={0}
        data-campus-hit={id}
        aria-label={'Inspect simulated transfer ' + id}
        style={{ display: 'none', cursor: 'pointer' }}
        onClick={inspect}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            event.stopPropagation()
            inspect()
          }
        }}
      >
        <title>{id} · Schematic connection</title>
        <circle r="13" fill="transparent" />
        <path d="M0 -7L7 0 0 7 -7 0Z" stroke="white" strokeWidth="1.5" fill="#b64e24" />
      </g>
    </>
  )
}
export function CampusPlanTravelers({ campus, transfers = [], ...props }: Props) {
  return (
    <>
      {transfers
        .filter((s) => s.from === campus || s.to === campus)
        .map((segment) => (
          <PlanTraveler key={segment.id} segment={segment} {...props} />
        ))}
    </>
  )
}
