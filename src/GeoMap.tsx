import { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import { Check, Crosshair, Layers2, Minus, Plus } from 'lucide-react'
import GeoBase from './cartography/GeoBase'
import {
  cityCamera,
  regionCamera,
  labels,
  landPath,
  tractsPath,
  latitudeOf,
  localPoint,
  mercatorLat,
  palette,
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
      <use href={'#' + id + '-land'} fill={palette.land} stroke="#c4d5d6" strokeWidth="7" />
      <use href={'#' + id + '-land'} fill={palette.land} stroke="#e8eeee" strokeWidth="3.5" />
      <use href={'#' + id + '-tract'} stroke={palette.tractLight} strokeWidth="2.4" />
      <use href={'#' + id + '-tract'} stroke={palette.tracts} strokeWidth=".6" />
      <use href={'#' + id + '-land'} fill="none" stroke={palette.shoreline} strokeWidth="1" />
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
  const callout =
    hovered && hovered !== selectedId
      ? visible.find((f) => f.id === hovered)
      : selectedPoint && selectedFacility
  const callPoint = callout ? points.get(callout.id) : undefined
  const name = callout?.id === 'nyc_bellevue' ? 'Bellevue Hospital' : callout?.name
  const inView = (p: Point) => p[0] >= 0 && p[1] >= 0 && p[0] <= size.width && p[1] <= size.height

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
        <g aria-hidden="true" className="geo-coordinates">
          {Array.from({ length: 10 }, (_, i) => {
            const lon = Math.floor((camera.lon - cx / scale) * 10) / 10 + (i + 1) * 0.1
            const x = project(lon, camera.lat)[0]
            return (
              <g key={lon}>
                <path d={'M' + x + ',0v5 M' + x + ',' + size.height + 'v-5'} />
                {x > 155 &&
                  x < size.width - 110 &&
                  (scale >= 900 || Math.round(lon * 10) % 2 === 0) && (
                    <text x={x + 3} y="11">
                      {Math.abs(lon).toFixed(1)}°W
                    </text>
                  )}
              </g>
            )
          })}
        </g>
        {layer.labels && (
          <g aria-hidden="true" className="geo-labels">
            {labels.map((l) => {
              const p = project(l.lon, l.lat)
              if (!inView(p) || ((camera.zoom < 0.65 || scale < 780) && l.kind === 'place'))
                return null
              const selectedDistance =
                selectedPoint &&
                Math.abs(p[0] - selectedPoint[0]) < 100 &&
                Math.abs(p[1] - selectedPoint[1]) < 18
              if (selectedDistance && l.kind === 'place') return null
              return (
                <text
                  key={l.text}
                  className={'geo-label-' + l.kind}
                  textAnchor="middle"
                  transform={'translate(' + p.join(' ') + ') rotate(' + (l.angle ?? 0) + ')'}
                >
                  {l.text}
                </text>
              )
            })}
          </g>
        )}
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
                    <circle r="17" className="geo-halo" />
                    {selectedPool && selectedPool.capacity > 0 && (
                      <g transform="rotate(-90)" aria-hidden="true">
                        {(
                          [
                            [selectedPool.occupied, '#43594e', 0],
                            [selectedPool.reserved, '#d67542', selectedPool.occupied],
                            [
                              selectedPool.turnaround,
                              '#a49b8b',
                              selectedPool.occupied + selectedPool.reserved,
                            ],
                            [
                              selectedPool.free,
                              '#d3d9cd',
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
                                r="11"
                                fill="none"
                                stroke={color}
                                strokeWidth="2"
                                pathLength={selectedPool.capacity}
                                strokeDasharray={count + ' ' + (selectedPool.capacity - count)}
                                strokeDashoffset={-offset}
                              />
                            ),
                        )}
                      </g>
                    )}
                    <path
                      d="M-17 -9v-8h8 M9 -17h8v8 M17 9v8h-8 M-9 17h-8v-8"
                      className="geo-bracket"
                    />
                    <circle r="7.3" fill="#da5b28" stroke="white" strokeWidth="1.9" />
                    <circle r="2.2" fill="white" />
                  </>
                ) : (
                  <>
                    <circle className="geo-node-shell" r="4.55" />
                    <circle r="1.55" fill="#fbfcf6" />
                  </>
                )}
              </g>
            )
          })}
        {transferNodes.map((node) => node.traveler)}
      </svg>
      {layer.facilities && callPoint && name && inView(callPoint) && (
        <div
          aria-hidden="true"
          className={'geo-tag' + (callout?.id === selectedId ? ' is-active' : '')}
          style={{
            left: clamp(callPoint[0] + 17, 5, size.width - Math.min(172, size.width * 0.4) - 8),
            top: clamp(callPoint[1] - 30, 6, size.height - 44),
          }}
        >
          <span>{name}</span>
        </div>
      )}
      <div className="geo-extent" aria-label="Map extent">
        {(['city', 'region'] as const).map((scope) => (
          <button key={scope} aria-pressed={extent === scope} onClick={() => changeExtent(scope)}>
            {scope === 'city' ? 'City' : 'Region'}
          </button>
        ))}
      </div>
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
                  disabled={layers?.[key] !== undefined}
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
      <small className="geo-credit">U.S. Census Bureau · {gl ? 'MapLibre' : 'SVG'}</small>
    </div>
  )
}
