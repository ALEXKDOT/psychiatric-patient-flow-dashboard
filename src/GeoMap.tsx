import { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { Check, Crosshair, Layers2, Minus, Plus } from 'lucide-react'
import GeoBase from './cartography/GeoBase'
import Graticule from './cartography/Graticule'
import {
  cityCamera,
  regionCamera,
  labels,
  landPath,
  waterPath,
  shorePath,
  tractsPath,
  latitudeOf,
  localPoint,
  mercatorLat,
  palette,
  plateUrl,
  plateBounds,
} from './cartography/base'
import type { Camera, Point } from './cartography/base'
import './map.css'

export interface MapFacility {
  id: string
  name: string
  latitude: number
  longitude: number
  code?: string
}
export interface MapTransfer {
  id: string
  from: string
  to: string
  progress: number
  recent?: boolean
}
export interface MapLayers {
  facilities?: boolean
  transfers?: boolean
  referrals?: boolean
  labels?: boolean
  trails?: boolean
}
interface Props {
  facilities: MapFacility[]
  selectedId: string
  onSelect: (id: string) => void
  transfers: MapTransfer[]
  visibleIds?: string[]
  referrals?: { from: string; to: string }[]
  layers?: MapLayers
  selectedPool?: {
    capacity: number
    occupied: number
    reserved: number
    turnaround: number
    free: number
  }
  onTransferSelect?: (id: string) => void
}
const layerLabels = {
  facilities: 'Campuses',
  transfers: 'In transit',
  trails: 'Trails · last 2h',
  referrals: 'Selected referrals',
  labels: 'Place names',
}
const allLayers = { facilities: true, transfers: true, trails: true, referrals: true, labels: true }
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

function curve(a: Point, b: Point) {
  const dx = b[0] - a[0],
    dy = b[1] - a[1]
  return [a[0] + dx / 2 + dy * 0.19, a[1] + dy / 2 - dx * 0.19] as Point
}
function position(a: Point, c: Point, b: Point, t: number) {
  const w = 1 - t
  return [
    w * w * a[0] + 2 * w * t * c[0] + t * t * b[0],
    w * w * a[1] + 2 * w * t * c[1] + t * t * b[1],
  ]
}

const BasemapPaths = memo(function BasemapPaths({ id }: { id: string }) {
  const upperLeft = localPoint(plateBounds.west, plateBounds.north)
  const lowerRight = localPoint(plateBounds.east, plateBounds.south)
  return (
    <g>
      <defs>
        <path
          id={id + '-land'}
          d={landPath}
          fillRule="evenodd"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <path id={id + '-tract'} d={tractsPath} fill="none" vectorEffect="non-scaling-stroke" />
      </defs>
      <use href={'#' + id + '-land'} fill={palette.land} stroke="#d2d7d5" strokeWidth="5" />
      <use href={'#' + id + '-land'} fill={palette.land} stroke="#fbfcfa" strokeWidth="3" />
      <image
        href={plateUrl}
        x={upperLeft[0]}
        y={upperLeft[1]}
        width={lowerRight[0] - upperLeft[0]}
        height={lowerRight[1] - upperLeft[1]}
        preserveAspectRatio="none"
      />
      <use href={'#' + id + '-tract'} stroke={palette.tractLight} strokeWidth="1.3" opacity=".55" />
      <use href={'#' + id + '-tract'} stroke={palette.tracts} strokeWidth=".48" opacity=".75" />
      <use href={'#' + id + '-land'} fill="none" stroke={palette.shoreline} strokeWidth="1" />
      <path d={waterPath} fill={palette.water} fillRule="evenodd" />
      <path
        d={shorePath}
        fill="none"
        stroke="#f8faf7"
        strokeWidth="2.8"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={shorePath}
        fill="none"
        stroke="#899997"
        strokeWidth=".75"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  )
})

export function GeoMap({
  facilities,
  selectedId,
  onSelect,
  transfers,
  visibleIds,
  referrals = [],
  layers,
  selectedPool,
  onTransferSelect,
}: Props) {
  const id = useId().replace(/:/g, '')
  const host = useRef<HTMLDivElement>(null)
  const canvas = useRef<SVGSVGElement>(null)
  const dragging = useRef<{ x: number; y: number; camera: Camera } | null>(null)
  const [size, setSize] = useState({ width: 800, height: 480 })
  const [camera, setCamera] = useState<Camera>(cityCamera)
  const [extent, setExtent] = useState<'city' | 'region'>('city')
  const [gl, setGl] = useState(false)
  const [settings, setSettings] = useState(false)
  const [localLayers, setLocalLayers] = useState(allLayers)
  const [hovered, setHovered] = useState('')
  const layer = { ...localLayers, ...layers }
  const layerHost = useRef<HTMLDivElement>(null)
  const layerButton = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!host.current) return
    const observer = new ResizeObserver(([entry]) =>
      setSize({
        width: Math.max(1, entry.contentRect.width),
        height: Math.max(1, entry.contentRect.height),
      }),
    )
    observer.observe(host.current)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    if (!settings) return
    const close = (event: PointerEvent) => {
      if (!layerHost.current?.contains(event.target as Node)) setSettings(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSettings(false)
        layerButton.current?.focus()
      }
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', escape)
    }
  }, [settings])
  // Units are pixels per degree of spherical Mercator coordinates.
  const fitScale = Math.min(size.height / 0.47, size.width / 0.48)
  const scale = fitScale * camera.zoom
  const cx = size.width / 2,
    cy = size.height / 2
  const centerY = mercatorLat(camera.lat)
  const project = (lon: number, lat: number): Point => [
    cx + (lon - camera.lon) * scale,
    cy + (centerY - mercatorLat(lat)) * scale,
  ]
  const changeZoom = useCallback(
    (factor: number, pivot?: Point) => {
      setCamera((old) => {
        const next = clamp(old.zoom * factor, 0.35, 9)
        const delta = 1 / (fitScale * old.zoom) - 1 / (fitScale * next)
        return {
          lon: old.lon + (pivot ? pivot[0] - cx : 0) * delta,
          lat: latitudeOf(mercatorLat(old.lat) - (pivot ? pivot[1] - cy : 0) * delta),
          zoom: next,
        }
      })
    },
    [cx, cy, fitScale],
  )
  useEffect(() => {
    const el = canvas.current
    if (!el) return
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      const box = el.getBoundingClientRect()
      changeZoom(Math.exp(-clamp(e.deltaY, -120, 120) * 0.002), [
        e.clientX - box.left,
        e.clientY - box.top,
      ])
    }
    el.addEventListener('wheel', wheel, { passive: false })
    return () => el.removeEventListener('wheel', wheel)
  }, [changeZoom])
  const selectedFacility = facilities.find((f) => f.id === selectedId)
  const lastSelected = useRef(selectedId)
  useEffect(() => {
    if (lastSelected.current === selectedId) return
    lastSelected.current = selectedId
    if (!selectedFacility) return
    const { longitude, latitude } = selectedFacility
    if (
      Math.abs(longitude - camera.lon) * scale > cx - 48 ||
      Math.abs(mercatorLat(latitude) - centerY) * scale > cy - 40
    ) {
      setCamera({ ...camera, lon: longitude, lat: latitude })
    }
  }, [selectedId, selectedFacility, camera, centerY, cx, cy, scale])
  const changeExtent = (scope: typeof extent) => {
    setExtent(scope)
    // In portrait the regional viewport also fits the western/eastern outliers.
    setCamera(
      scope === 'city'
        ? cityCamera
        : {
            ...regionCamera,
            zoom: Math.min(
              regionCamera.zoom,
              size.width / (fitScale * 0.68),
              size.height / (fitScale * 0.9),
            ),
          },
    )
  }
  const allowed = useMemo(() => (visibleIds ? new Set(visibleIds) : null), [visibleIds])
  const visible = facilities.filter((f) => !allowed || allowed.has(f.id))
  const points = new Map(facilities.map((f) => [f.id, project(f.longitude, f.latitude)]))
  const selectedPoint =
    selectedFacility && (!allowed || allowed.has(selectedId)) ? points.get(selectedId) : undefined
  const baseOrigin = localPoint(camera.lon, camera.lat)
  const sbScale = scale / 2048
  const kmPerPixel = (111.32 * Math.cos((camera.lat * Math.PI) / 180)) / scale
  const scaleKm = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50].find((v) => v / kmPerPixel >= 35) ?? 50
  const transferNodes = transfers.flatMap((t) => {
    const a = points.get(t.from),
      b = points.get(t.to)
    if (!a || !b || t.from === t.to || (t.recent ? !layer.trails : !layer.transfers)) return []
    if (allowed && !allowed.has(t.from) && !allowed.has(t.to)) return []
    const c = curve(a, b)
    const d = 'M' + a.join(',') + 'Q' + c.join(',') + ' ' + b.join(',')
    const [x, y] = position(a, c, b, clamp(t.progress, 0, 1))
    const title = (t.recent ? 'Recent arrival' : 'In transit') + ' · ' + t.id
    const direction =
      (Math.atan2(
        (1 - t.progress) * (c[1] - a[1]) + t.progress * (b[1] - c[1]),
        (1 - t.progress) * (c[0] - a[0]) + t.progress * (b[0] - c[0]),
      ) *
        180) /
      Math.PI
    const action = onTransferSelect
      ? {
          role: 'button',
          tabIndex: 0,
          'aria-label': title,
          onClick: () => onTransferSelect(t.id),
          onKeyDown: (event: ReactKeyboardEvent<SVGElement>) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onTransferSelect(t.id)
            }
          },
        }
      : {}
    const track = (
      <g key={t.id} className={t.recent ? 'geo-trail' : 'geo-trip'} data-transfer={t.id}>
        <title>{title}</title>
        <path d={d} className="geo-arc" />
        {onTransferSelect && (
          <path
            d={d}
            fill="none"
            stroke="transparent"
            strokeWidth="14"
            className="geo-trip-hit"
            {...action}
            tabIndex={t.recent ? 0 : -1}
            aria-hidden={!t.recent}
          />
        )}
      </g>
    )
    // The token is painted after campus markers so the moving episode stays selectable at either endpoint.
    const traveler = !t.recent && (
      <g
        key={t.id}
        data-token={t.id}
        className="geo-traveler"
        transform={'translate(' + x + ' ' + y + ')'}
        {...action}
      >
        <title>{title}</title>
        <circle r="8" fill="white" opacity=".75" />
        {Math.hypot(b[0] - a[0], b[1] - a[1]) > 50 && (
          <path
            d="M8 -2.4 L11.5 0 8 2.4"
            fill="none"
            stroke="#a34421"
            strokeWidth="1.3"
            transform={'rotate(' + direction + ')'}
          />
        )}
        <rect
          x="-4.25"
          y="-4.25"
          width="8.5"
          height="8.5"
          rx="1"
          fill="#343c3b"
          stroke="white"
          strokeWidth="1.4"
          transform="rotate(45)"
        />
      </g>
    )
    return [{ track, traveler }]
  })
  const refLines =
    layer.referrals &&
    referrals
      .filter((r) => (r.from === selectedId || r.to === selectedId) && r.from !== r.to)
      .map((r, i) => {
        const a = points.get(r.from),
          b = points.get(r.to)
        if (!a || !b || (allowed && !allowed.has(r.from) && !allowed.has(r.to))) return null
        return (
          <path
            key={r.from + r.to + i}
            d={'M' + a.join(',') + 'L' + b.join(',')}
            className="geo-referral"
          />
        )
      })
  const hoveredFacility = hovered !== selectedId ? visible.find((f) => f.id === hovered) : undefined
  const hoverPoint = hoveredFacility ? points.get(hoveredFacility.id) : undefined
  const inView = (p: Point) => p[0] >= 0 && p[1] >= 0 && p[0] <= size.width && p[1] <= size.height
  const compact = size.width < 540
  const tagW = compact ? 145 : 178,
    tagH = compact ? 56 : 63
  const showTag = selectedFacility && selectedPoint && layer.facilities && inView(selectedPoint)
  const leftTag = !!selectedPoint && selectedPoint[0] > tagW + 50
  const tagX = selectedPoint
    ? clamp(selectedPoint[0] + (leftTag ? -tagW - 49 : 47), 14, size.width - tagW - 14)
    : 0
  const tagY = selectedPoint ? clamp(selectedPoint[1] + 32, 49, size.height - tagH - 28) : 0
  const tagPort: Point = [leftTag ? tagX + tagW : tagX, tagY + 13]
  type Box = { x: number; y: number; w: number; h: number }
  const occupied: Box[] = [
    { x: size.width - 128, y: 0, w: 128, h: 108 },
    { x: 0, y: size.height - 25, w: size.width, h: 25 },
  ]
  if (showTag)
    occupied.push(
      { x: tagX - 4, y: tagY - 4, w: tagW + 8, h: tagH + 8 },
      { x: selectedPoint[0] - 22, y: selectedPoint[1] - 22, w: 44, h: 44 },
    )
  const collides = (b: Box) =>
    occupied.some((o) => b.x < o.x + o.w && b.x + b.w > o.x && b.y < o.y + o.h && b.y + b.h > o.y)
  const mapLabels =
    layer.labels &&
    labels.flatMap((l) => {
      const p = project(l.lon, l.lat)
      if (!inView(p) || (l.kind === 'place' && (camera.zoom < 0.85 || scale < 860))) return []
      const face = l.kind === 'borough' ? (compact ? 10 : 13) : l.kind === 'water' ? 12 : 10
      const length = l.text.length * (face * 0.56 + (l.kind === 'borough' ? 2 : 0.4))
      const angle = ((l.angle || 0) * Math.PI) / 180
      const w = Math.abs(Math.cos(angle)) * length + Math.abs(Math.sin(angle)) * face
      const h = Math.abs(Math.sin(angle)) * length + Math.abs(Math.cos(angle)) * face
      const box = { x: p[0] - w / 2 - 2, y: p[1] - h / 2 - 3, w: w + 4, h: h + 6 }
      if (
        box.x < 14 ||
        box.x + box.w > size.width - 14 ||
        box.y < 10 ||
        box.y + box.h > size.height - 10 ||
        collides(box)
      )
        return []
      occupied.push(box)
      return [
        <text
          key={l.text}
          className={'geo-label-' + l.kind}
          textAnchor="middle"
          dominantBaseline="central"
          transform={`translate(${p.join(' ')}) rotate(${l.angle ?? 0})`}
        >
          {l.text}
        </text>,
      ]
    })
  const campusCodes =
    layer.facilities &&
    layer.labels &&
    scale > 980 &&
    visible.flatMap((f) => {
      if (!f.code || f.id === selectedId) return []
      const p = points.get(f.id)!
      if (!inView(p) || p[0] > size.width - 70 || p[1] < 15 || p[1] > size.height - 35) return []
      const box = { x: p[0] + 8, y: p[1] - 18, w: 31, h: 15 }
      if (
        collides(box) ||
        visible.some((n) => {
          const q = points.get(n.id)!
          return n.id !== f.id && Math.hypot(p[0] - q[0], p[1] - q[1]) < 49
        })
      )
        return []
      occupied.push(box)
      return [
        <g key={f.id} transform={`translate(${p.join(' ')})`}>
          <path d="M5 -3l5 -6h4" />
          <text x="16" y="-7">
            {f.code}
          </text>
        </g>,
      ]
    })

  return (
    <div ref={host} className="geo-map" data-renderer={gl ? 'maplibre' : 'svg'}>
      <GeoBase camera={camera} pixelScale={scale} {...size} onReady={setGl} />
      <svg
        className="geo-stage"
        ref={canvas}
        width="100%"
        height="100%"
        viewBox={'0 0 ' + size.width + ' ' + size.height}
        role="group"
        aria-label="Regional campus map. Use arrow keys to pan, plus and minus to zoom, and Home to reset."
        tabIndex={0}
        onPointerDown={(e) => {
          if (e.button !== 0 || (e.target as Element).closest('[role=button]')) return
          dragging.current = { x: e.clientX, y: e.clientY, camera }
          e.currentTarget.setPointerCapture(e.pointerId)
        }}
        onPointerMove={(e) => {
          if (!dragging.current) return
          const start = dragging.current
          setCamera({
            ...start.camera,
            lon: clamp(start.camera.lon - (e.clientX - start.x) / scale, -75, -72.8),
            lat: clamp(
              latitudeOf(mercatorLat(start.camera.lat) + (e.clientY - start.y) / scale),
              40.1,
              41.5,
            ),
          })
        }}
        onPointerUp={() => {
          dragging.current = null
        }}
        onPointerCancel={() => {
          dragging.current = null
        }}
        onDoubleClick={(e) => {
          if (!(e.target as Element).closest('[role=button]')) changeZoom(1.5)
        }}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return
          const move: Record<string, Point> = {
            ArrowLeft: [-80, 0],
            ArrowRight: [80, 0],
            ArrowUp: [0, 60],
            ArrowDown: [0, -60],
          }
          if (move[e.key]) {
            e.preventDefault()
            setCamera({
              ...camera,
              lon: clamp(camera.lon + move[e.key][0] / scale, -75, -72.8),
              lat: clamp(latitudeOf(centerY + move[e.key][1] / scale), 40.1, 41.5),
            })
          } else if (['+', '=', '-', 'Home'].includes(e.key)) {
            e.preventDefault()
            if (e.key === 'Home') changeExtent('city')
            else changeZoom(e.key === '-' ? 1 / 1.4 : 1.4)
          }
        }}
      >
        {!gl && (
          <g aria-hidden="true">
            <rect width="100%" height="100%" fill={palette.water} />
            <g
              transform={
                'translate(' +
                (cx - baseOrigin[0] * sbScale) +
                ' ' +
                (cy - baseOrigin[1] * sbScale) +
                ') scale(' +
                sbScale +
                ')'
              }
            >
              <BasemapPaths id={id} />
            </g>
          </g>
        )}
        <Graticule
          width={size.width}
          height={size.height}
          longitude={camera.lon}
          latitude={camera.lat}
          scale={scale}
        />
        <g aria-hidden="true" className="geo-labels">
          {mapLabels}
        </g>
        <g aria-hidden="true" className="geo-site-codes">
          {campusCodes}
        </g>
        {refLines}
        {transferNodes.map((node) => node.track)}
        {layer.facilities &&
          visible.map((f) => {
            const p = points.get(f.id) as Point
            if (!inView(p)) return null
            const selected = f.id === selectedId
            return (
              <g
                key={f.id}
                className={'geo-node' + (selected ? ' is-selected' : '')}
                transform={'translate(' + p.join(' ') + ')'}
                tabIndex={0}
                role="button"
                aria-pressed={selected}
                aria-label={'Select ' + f.name}
                onClick={() => onSelect(f.id)}
                onPointerEnter={() => setHovered(f.id)}
                onPointerLeave={() => setHovered('')}
                onFocus={() => setHovered(f.id)}
                onBlur={() => setHovered('')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onSelect(f.id)
                  }
                }}
              >
                <circle r="10" fill="transparent" />
                {selected ? (
                  <>
                    <circle r="24" className="geo-halo" />
                    <path d="M-32 0h6 M26 0h6 M0 -32v6 M0 26v6" className="geo-sights" />
                    {selectedPool && selectedPool.capacity > 0 && (
                      <g transform="rotate(-90)" aria-hidden="true">
                        {(
                          [
                            [selectedPool.occupied, '#3d4343', 0],
                            [selectedPool.reserved, '#e1672d', selectedPool.occupied],
                            [
                              selectedPool.turnaround,
                              '#999b98',
                              selectedPool.occupied + selectedPool.reserved,
                            ],
                            [
                              selectedPool.free,
                              '#d7dcd9',
                              selectedPool.occupied +
                                selectedPool.reserved +
                                selectedPool.turnaround,
                            ],
                          ] as const
                        ).map(
                          ([count, color, offset]) =>
                            count > 0 && (
                              <circle
                                key={color}
                                r="13"
                                fill="none"
                                stroke={color}
                                strokeWidth="2.5"
                                pathLength={selectedPool.capacity}
                                strokeDasharray={count + ' ' + (selectedPool.capacity - count)}
                                strokeDashoffset={-offset}
                              />
                            ),
                        )}
                      </g>
                    )}
                    <path
                      d="M-23 -12v-11h11 M12 -23h11v11 M23 12v11h-11 M-12 23h-11v-11"
                      className="geo-bracket"
                    />
                    <rect
                      x="-6"
                      y="-6"
                      width="12"
                      height="12"
                      fill="#d95725"
                      stroke="white"
                      strokeWidth="1.5"
                    />
                    <path d="M-3 0h6 M0 -3v6" stroke="white" strokeWidth="1.4" />
                  </>
                ) : (
                  <>
                    <circle className="geo-node-shell" r="5" />
                    <path d="M-2.2 0h4.4 M0 -2.2v4.4" stroke="white" strokeWidth="1.15" />
                  </>
                )}
              </g>
            )
          })}
        {showTag && (
          <path
            className="geo-leader"
            d={`M${selectedPoint[0] + (leftTag ? -23 : 23)} ${selectedPoint[1] + 16} L${tagPort[0] + (leftTag ? 12 : -12)} ${tagPort[1]} H${tagPort[0]}`}
          />
        )}
        {transferNodes.map((node) => node.traveler)}
      </svg>
      {showTag && (
        <div
          aria-hidden="true"
          className="geo-nameplate"
          style={{ left: tagX, top: tagY, width: tagW }}
        >
          <div className="geo-tag-head">
            <i />
            {selectedFacility.code ?? 'SITE'}
            <span>/</span>SELECTED CAMPUS
          </div>
          <strong>
            {selectedFacility.id === 'nyc_bellevue' ? 'Bellevue Hospital' : selectedFacility.name}
          </strong>
          <div className="geo-tag-coords">
            {selectedFacility.latitude.toFixed(4)}° N<span> / </span>
            {Math.abs(selectedFacility.longitude).toFixed(4)}° W
          </div>
        </div>
      )}
      {layer.facilities && hoverPoint && hoveredFacility && inView(hoverPoint) && (
        <div
          className="geo-hover-tag"
          aria-hidden="true"
          style={{
            left: clamp(hoverPoint[0] + 9, 5, size.width - 150),
            top: clamp(hoverPoint[1] - 28, 8, size.height - 34),
          }}
        >
          {hoveredFacility.name}
        </div>
      )}
      <div className="geo-extent" aria-label="Map extent">
        {(['city', 'region'] as const).map((scope) => (
          <button key={scope} aria-pressed={extent === scope} onClick={() => changeExtent(scope)}>
            {scope === 'city' ? 'City' : 'Region'}
          </button>
        ))}
      </div>
      {!layers && (
        <div className="geo-layers" ref={layerHost}>
          <button
            className="geo-tool geo-layer-trigger"
            ref={layerButton}
            title="Map layers"
            aria-expanded={settings}
            aria-controls={id + '-layers'}
            onClick={() => setSettings(!settings)}
          >
            <Layers2 size={14} strokeWidth={1.7} />
            <span>Layers</span>
          </button>
          {settings && (
            <div className="geo-layer-menu" id={id + '-layers'} aria-label="Map layers">
              {Object.entries(layerLabels).map(([k, labelName]) => {
                const key = k as keyof MapLayers
                return (
                  <button
                    key={k}
                    role="switch"
                    aria-checked={!!layer[key]}
                    onClick={() => setLocalLayers((old) => ({ ...old, [k]: !old[key] }))}
                  >
                    <span className="geo-check">{layer[key] && <Check size={12} />}</span>
                    {labelName}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
      <div className="geo-north" aria-label="North is up">
        <b>N</b>
        <svg width="12" height="22" viewBox="0 0 12 22" aria-hidden="true">
          <path d="M6 1 L11 19 6 15 1 19Z" fill="#f9f9f1" stroke="currentColor" />
          <path d="M6 1 L6 15 1 19Z" fill="currentColor" />
        </svg>
      </div>
      <div className="geo-nav">
        <button
          title="Zoom in"
          aria-label="Zoom in"
          disabled={camera.zoom >= 9}
          onClick={() => changeZoom(1.4)}
        >
          <Plus size={16} />
        </button>
        <button
          title="Zoom out"
          aria-label="Zoom out"
          disabled={camera.zoom <= 0.35}
          onClick={() => changeZoom(1 / 1.4)}
        >
          <Minus size={16} />
        </button>
        <button
          title="Reset map view"
          aria-label="Reset map view"
          onClick={() => changeExtent('city')}
        >
          <Crosshair size={15} />
        </button>
      </div>
      <div className="geo-scale" aria-label={'Map scale ' + scaleKm + ' kilometers'}>
        <span style={{ width: scaleKm / kmPerPixel }} />
        {scaleKm} km
      </div>
      <small className="geo-credit">Census · NYC DCP · GSHHG · {gl ? 'MapLibre' : 'SVG'}</small>
    </div>
  )
}
