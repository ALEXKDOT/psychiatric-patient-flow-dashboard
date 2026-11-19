import { CampusPlanTravelers } from './CampusPlanTravelers'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { RenderProps } from './CampusGL'
import {
  initialCamera,
  localProject,
  metersAt,
  pixelsPerMeter,
  ringsOf,
  pathOf,
  streetLabels,
  placeLabels,
  type Coordinate,
} from './geometry'
import { tidalWater } from '../cartography/base'

export function CampusPlan({
  pack,
  initialPose,
  controls,
  onPose,
  interrupt,
  transfers,
  onInspectTransfer,
}: RenderProps) {
  const host = useRef<SVGSVGElement>(null)
  const [size, setSize] = useState({ w: 880, h: 500 })
  const [pose, setPose] = useState(() => initialPose ?? initialCamera(pack, 880, 500))
  const drag = useRef<{ x: number; y: number; center: Coordinate } | null>(null)
  const started = useRef(false)
  const focus = pack.target.focus_lonlat
  const water = useMemo(() => pathOf(tidalWater.geometry.coordinates.flat(), focus, true), [focus])
  const [mx, my] = metersAt(focus[1])
  const ppm = pixelsPerMeter(pose.zoom, pose.center[1])
  const center = localProject(pose.center, focus)
  const tx = size.w / 2 - center[0] * ppm,
    ty = size.h / 2 - center[1] * ppm
  const project = useCallback(
    (p: Coordinate): Coordinate => {
      const [x, y] = localProject(p, focus)
      return [x * ppm + tx, y * ppm + ty]
    },
    [focus, ppm, tx, ty],
  )
  const staticGeometry = useMemo(() => {
    const target: string[] = [],
      context: string[] = []
    for (const f of pack.buildings.features)
      (f.properties.is_target ? target : context).push(pathOf(ringsOf(f.geometry), focus, true))
    const street = pack.streets.features
      .map((f) =>
        pathOf(
          f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.coordinates,
          focus,
          false,
        ),
      )
      .join('')
    return {
      target: target.join(''),
      context: context.join(''),
      street,
      labels: streetLabels(pack),
    }
  }, [pack, focus])
  useLayoutEffect(() => {
    const el = host.current!
    function measure() {
      const w = el.clientWidth,
        h = el.clientHeight
      if (!w || !h) return
      setSize((old) => (old.w === w && old.h === h ? old : { w, h }))
      if (!started.current && !initialPose) {
        started.current = true
        setPose(initialCamera(pack, w, h))
      }
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [pack, initialPose])
  const zoom = useCallback(
    (by: number) => {
      interrupt()
      setPose((p) => ({ ...p, zoom: Math.min(19.3, Math.max(15.3, p.zoom + by)) }))
    },
    [interrupt],
  )
  const pan = (x: number, y: number, from = pose.center) => {
    interrupt()
    setPose((p) => ({
      ...p,
      center: [
        Math.min(focus[0] + 420 / mx, Math.max(focus[0] - 420 / mx, from[0] + x / (mx * ppm))),
        Math.min(focus[1] + 420 / my, Math.max(focus[1] - 420 / my, from[1] - y / (my * ppm))),
      ],
    }))
  }
  const reset = useCallback(() => {
    interrupt()
    setPose(initialCamera(pack, size.w, size.h))
  }, [pack, size, interrupt])
  useEffect(() => {
    controls.current = { zoom, reset, rotate: () => {} }
    return () => {
      controls.current = null
    }
  }, [controls, zoom, reset])
  useEffect(() => {
    onPose({ ...pose, bearing: 0, pitch: 0 })
  }, [pose, onPose])
  useEffect(() => {
    const el = host.current!
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      zoom(-Math.sign(e.deltaY) * 0.2)
    }
    el.addEventListener('wheel', wheel, { passive: false })
    return () => el.removeEventListener('wheel', wheel)
  }, [zoom])
  const placed = placeLabels(staticGeometry.labels, project, size.w, size.h)
  const scaleMeters = [5, 10, 20, 50, 100, 200, 500].find((n) => n * ppm >= 35) ?? 500
  return (
    <div className="campus-plan">
      <svg
        ref={host}
        role="group"
        aria-label={
          '2D campus plan of ' + pack.target.target_label + '. Arrow keys pan, plus and minus zoom.'
        }
        tabIndex={0}
        width="100%"
        height="100%"
        onPointerDown={(e) => {
          if ((e.target as Element).closest('[role=button]')) return
          drag.current = { x: e.clientX, y: e.clientY, center: pose.center }
          e.currentTarget.setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          const d = drag.current
          if (d) pan(d.x - e.clientX, d.y - e.clientY, d.center)
        }}
        onPointerUp={() => {
          drag.current = null
        }}
        onPointerCancel={() => {
          drag.current = null
        }}
        onKeyDown={(e) => {
          const moves: Record<string, Coordinate> = {
            ArrowLeft: [-55, 0],
            ArrowRight: [55, 0],
            ArrowUp: [0, -55],
            ArrowDown: [0, 55],
          }
          if (moves[e.key]) {
            e.preventDefault()
            pan(...moves[e.key])
          } else if (['+', '=', '-', 'Home'].includes(e.key)) {
            e.preventDefault()
            if (e.key === 'Home') reset()
            else zoom(e.key === '-' ? -0.4 : 0.4)
          }
        }}
      >
        <g transform={`translate(${tx} ${ty}) scale(${ppm})`}>
          {water && <path d={water} fill="var(--campus-water)" fillRule="evenodd" />}
          <path
            d={staticGeometry.street}
            fill="none"
            stroke="var(--campus-curb)"
            strokeWidth="7"
            strokeLinejoin="round"
          />
          <path
            d={staticGeometry.street}
            fill="none"
            stroke="var(--campus-street)"
            strokeWidth="5.8"
            strokeLinejoin="round"
          />
          <path
            d={staticGeometry.context}
            fill="var(--campus-roof)"
            stroke="var(--campus-foot-edge)"
            strokeWidth=".6"
            fillRule="evenodd"
          />
          <path
            className="campus-plan-focus"
            d={staticGeometry.target}
            fill="var(--campus-target)"
            stroke="var(--campus-accent)"
            strokeWidth="2.4"
            vectorEffect="non-scaling-stroke"
            fillRule="evenodd"
          />
        </g>
        {placed.map((l) => (
          <text
            key={l.name}
            className="campus-street-label"
            transform={`translate(${l.x} ${l.y}) rotate(${l.angle})`}
          >
            {l.name}
          </text>
        ))}
        <CampusPlanTravelers
          campus={pack.target.campus_id}
          transfers={transfers}
          project={project}
          width={size.w}
          height={size.h}
          onInspect={onInspectTransfer}
        />
      </svg>
      <div
        className="campus-scale"
        style={{ '--ruler-width': scaleMeters * ppm + 'px' } as React.CSSProperties}
      >
        {scaleMeters} m
      </div>
    </div>
  )
}
