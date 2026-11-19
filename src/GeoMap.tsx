import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { Map as GLMap } from 'maplibre-gl'
import roadLabels from './cartography/roadLabels.json'
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
  latitudeOf,
  localPoint,
  mercatorLat,
  palette,
  regionBounds,
} from './cartography/base'
import type { Camera, Point } from './cartography/base'
import { useAtlasTheme } from './ThemeControl'
import { campusTargets } from './cartography/campusPacks'
import { curve, position, fitConnection } from './transferPath'
import { TransferToken } from './TransferToken'
import './map.css'

export type NetworkView = { camera: Camera; extent: 'city' | 'region' }

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
  startMinute: number
  endMinute: number
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
  suspended?: boolean
  restoreView?: NetworkView
  initialView?: NetworkView
  onViewChange?: (view: NetworkView) => void
  travelTo?: string | null
  onTravelEnd?: (id: string) => void
  following?: MapTransfer
  onStopFollowing?: () => void
  onSources?: () => void

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

const BasemapPaths = memo(function BasemapPaths({ id }: { id: string }) {
  const theme = useAtlasTheme()
  const upperLeft = localPoint(regionBounds.west, regionBounds.north)
  const lowerRight = localPoint(regionBounds.east, regionBounds.south)
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
      </defs>
      <use href={'#' + id + '-land'} fill={theme === 'dark' ? '#313a39' : palette.land} />

      <image
        href={import.meta.env.BASE_URL + 'geography/regional-' + theme + '.webp'}
        x={upperLeft[0]}
        y={upperLeft[1]}
        width={lowerRight[0] - upperLeft[0]}
        height={lowerRight[1] - upperLeft[1]}
        preserveAspectRatio="none"
      />
      <use href={'#' + id + '-land'} fill="none" stroke={palette.shoreline} strokeWidth=".45" />
      <path d={waterPath} fill={theme === 'dark' ? '#202b30' : palette.water} fillRule="evenodd" />
      <path
        d={shorePath}
        fill="none"
        stroke={theme === 'dark' ? '#475558' : '#f8faf7'}
        strokeWidth="2.8"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={shorePath}
        fill="none"
        stroke={theme === 'dark' ? '#798783' : '#899997'}
        strokeWidth=".75"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  )
})

export const GeoMap = memo(
  function GeoMap({
    suspended = false,
    restoreView,
    facilities,
    selectedId,
    onSelect,
    transfers,
    visibleIds,
    referrals = [],
    layers,
    selectedPool,
    onTransferSelect,
    initialView,
    onViewChange,
    travelTo,
    onTravelEnd,
    following,
    onStopFollowing,
    onSources,
  }: Props) {
    const id = useId().replace(/:/g, '')
    const theme = useAtlasTheme()
    const glInstance = useRef<GLMap | null>(null)
    const setInstance = useCallback((map: GLMap | null) => {
      glInstance.current = map
    }, [])
    const host = useRef<HTMLDivElement>(null)
    const canvas = useRef<SVGSVGElement>(null)
    const pointers = useRef(new Map<number, Point>())
    const gesture = useRef<{ midpoint: Point; distance: number; camera: Camera } | null>(null)
    const flightGroup = useRef<SVGGElement>(null)
    const flightRef = useRef<Camera | null>(null)
    const [viewport, setSize] = useState({ width: 800, height: 480 })
    const [manualCamera, setCamera] = useState<Camera>(initialView?.camera ?? cityCamera)
    const [extent, setExtent] = useState<'city' | 'region'>(initialView?.extent ?? 'city')
    const [nativeReady, setGl] = useState(false)
    const nativeActive = !suspended && !travelTo
    const gl = nativeActive && nativeReady
    const [settings, setSettings] = useState(false)
    const [localLayers, setLocalLayers] = useState(allLayers)
    const [hovered, setHovered] = useState('')
    const layer = { ...localLayers, ...layers }
    const layerHost = useRef<HTMLDivElement>(null)
    const layerButton = useRef<HTMLButtonElement>(null)

    useEffect(() => {
      if (!host.current || suspended) return
      const observer = new ResizeObserver(([entry]) =>
        setSize({
          width: Math.max(1, entry.contentRect.width),
          height: Math.max(1, entry.contentRect.height),
        }),
      )
      observer.observe(host.current)
      return () => observer.disconnect()
    }, [suspended])
    useEffect(() => {
      if (!settings || suspended) return
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
    }, [settings, suspended])
    const appliedRestore = useRef<NetworkView | undefined>(undefined)
    useLayoutEffect(() => {
      if (suspended) return
      if (restoreView && restoreView !== appliedRestore.current) {
        appliedRestore.current = restoreView
        setCamera(restoreView.camera)
        setExtent(restoreView.extent)
        onViewChange?.(restoreView)
        return
      }
      if (!following && !travelTo) onViewChange?.({ camera: manualCamera, extent })
    }, [suspended, restoreView, manualCamera, extent, following, travelTo, onViewChange])

    const manualRef = useRef(manualCamera)
    manualRef.current = manualCamera
    useEffect(() => {
      if (!travelTo || suspended) {
        flightRef.current = null
        flightGroup.current?.removeAttribute('transform')
        return
      }
      const target = facilities.find((f) => f.id === travelTo)
      if (!target) return
      const [targetLon, targetLat] = campusTargets[target.id].focus_lonlat
      const baseCamera = manualRef.current
      const start = flightRef.current ?? baseCamera
      const startTime = performance.now()
      let frameId = 0
      let settled = false
      const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
      function settle() {
        if (settled) return
        settled = true
        cancelAnimationFrame(frameId)
        onTravelEnd?.(target!.id)
      }
      function stopForPreference() {
        if (preference.matches) settle()
      }
      function step(now: number) {
        const t = Math.min(1, (now - startTime) / 1050)
        const u = t * t * (3 - 2 * t)
        const next = {
          lon: start.lon + (targetLon - start.lon) * u,
          lat: start.lat + (targetLat - start.lat) * u,
          zoom: start.zoom * Math.pow(12 / start.zoom, u),
        }
        flightRef.current = next
        const k = next.zoom / baseCamera.zoom
        const scale = Math.min(viewport.height / 0.47, viewport.width / 0.48) * next.zoom
        const x = (viewport.width / 2) * (1 - k) + (baseCamera.lon - next.lon) * scale
        const y =
          (viewport.height / 2) * (1 - k) +
          (mercatorLat(next.lat) - mercatorLat(baseCamera.lat)) * scale
        flightGroup.current?.setAttribute('transform', `translate(${x} ${y}) scale(${k})`)
        if (t < 1) frameId = requestAnimationFrame(step)
        else settle()
      }
      preference.addEventListener('change', stopForPreference)
      if (preference.matches) settle()
      else frameId = requestAnimationFrame(step)
      return () => {
        preference.removeEventListener('change', stopForPreference)
        cancelAnimationFrame(frameId)
      }
    }, [travelTo, onTravelEnd, facilities, suspended, viewport.width, viewport.height])

    const size = viewport
    const fitScale = Math.min(size.height / 0.47, size.width / 0.48)
    const cx = size.width / 2,
      cy = size.height / 2
    const followControlInset = size.width <= 600 ? 56 : 0
    let camera = manualCamera
    const origin = following && facilities.find((f) => f.id === following.from)
    const destination = following && facilities.find((f) => f.id === following.to)
    if (origin && destination) {
      const fit = fitConnection(
        [origin.longitude, -mercatorLat(origin.latitude)],
        [destination.longitude, -mercatorLat(destination.latitude)],
        size.width,
        size.height,
        followControlInset,
      )
      camera = {
        lon: fit.center[0],
        lat: latitudeOf(-fit.center[1]),
        zoom: clamp(fit.scale / fitScale, 0.35, 9),
      }
    }
    const followId = following?.id
    const { lon, lat, zoom } = camera
    // Leaving Follow explicitly keeps its last fitted pose. The parent retains a
    // separate return view for the Back action.
    useLayoutEffect(() => {
      if (followId) setCamera({ lon, lat, zoom })
    }, [followId, lon, lat, zoom])
    const scale = fitScale * camera.zoom
    const centerY = mercatorLat(camera.lat)
    const glMap = gl && glInstance.current
    // MapLibre supplies the native pixel projection. Before an external camera
    // command commits, use the requested level Mercator projection for that frame.
    const nativeCenter = glMap && glMap.getCenter()
    const nativeAligned =
      glMap &&
      nativeCenter &&
      Math.abs(nativeCenter.lng - camera.lon) < 1e-8 &&
      Math.abs(nativeCenter.lat - camera.lat) < 1e-8 &&
      Math.abs(glMap.getZoom() - Math.log2((scale * 360) / 512)) < 1e-7
    const project = (lon: number, lat: number): Point => {
      if (nativeAligned && glMap) {
        const point = glMap.project([lon, lat])
        return [point.x, point.y]
      }
      return [cx + (lon - camera.lon) * scale, cy + (centerY - mercatorLat(lat)) * scale]
    }
    const interrupt = () => {
      if (following || travelTo) {
        setCamera((travelTo && flightRef.current) || camera)
        onStopFollowing?.()
      }
    }
    const interruptRef = useRef(interrupt)
    interruptRef.current = interrupt
    const activeCamera = useRef(camera)
    activeCamera.current = camera
    const nativeMove = (lon: number, lat: number, px: number) => {
      interruptRef.current()
      const next = { lon, lat, zoom: px / fitScale }
      setCamera(next)
    }
    const changeZoom = useCallback(
      (factor: number, pivot?: Point) => {
        interruptRef.current()
        const old = activeCamera.current
        setCamera(() => {
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
      if (!el || gl || suspended) return
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
    }, [changeZoom, gl, suspended])
    const selectedFacility = facilities.find((f) => f.id === selectedId)
    function pointerGeometry() {
      const [a, b] = Array.from(pointers.current.values())
      if (!a) return null
      if (!b) return { midpoint: a, distance: 0 }
      return {
        midpoint: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] as Point,
        distance: Math.hypot(b[0] - a[0], b[1] - a[1]),
      }
    }
    function endPointer(pointerId: number) {
      pointers.current.delete(pointerId)
      const shape = pointerGeometry()
      gesture.current = shape ? { ...shape, camera: activeCamera.current } : null
    }
    const changeExtent = (scope: typeof extent) => {
      interrupt()
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
    const nativeLayer = (
      <GeoBase
        active={nativeActive}
        camera={camera}
        pixelScale={scale}
        {...size}
        onReady={setGl}
        onInstance={setInstance}
        onNativeMove={nativeMove}
        onInterrupt={interrupt}
      />
    )
    if (suspended)
      return (
        <div ref={host} className="regional-map-cache" hidden inert aria-hidden="true">
          <div className="geo-world">{nativeLayer}</div>
        </div>
      )
    const visible = facilities.filter((f) => !allowed || allowed.has(f.id))
    const points = new Map(facilities.map((f) => [f.id, project(f.longitude, f.latitude)]))
    const selectedPoint =
      selectedFacility && (!allowed || allowed.has(selectedId)) ? points.get(selectedId) : undefined
    const baseOrigin = localPoint(camera.lon, camera.lat)
    const sbScale = scale / 2048
    const kmPerPixel = (111.32 * Math.cos((camera.lat * Math.PI) / 180)) / scale
    const scaleKm = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50].find((v) => v / kmPerPixel >= 35) ?? 50
    const transferNodes = transfers.flatMap((t) => {
      if (following && (t.id !== following.id || t.recent)) return []
      const a = points.get(t.from),
        b = points.get(t.to)
      if (!a || !b || t.from === t.to || (t.recent ? !layer.trails : !layer.transfers)) return []
      if (allowed && !allowed.has(t.from) && !allowed.has(t.to)) return []
      const c = curve(a, b)
      const d = 'M' + a.join(',') + 'Q' + c.join(',') + ' ' + b.join(',')
      const title = (t.recent ? 'Recent arrival' : 'In transit') + ' · ' + t.id
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
          <path
            d={d}
            className="geo-arc"
            style={
              t.recent ? undefined : { strokeWidth: 1.15, strokeDasharray: '3 3', opacity: 0.66 }
            }
          />
          {onTransferSelect && (
            <path
              d={d}
              fill="none"
              stroke="transparent"
              strokeWidth="14"
              pointerEvents="stroke"
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
        <TransferToken key={t.id} trip={t} a={a} b={b} c={c} onSelect={onTransferSelect} />
      )
      return [{ track, traveler }]
    })
    const refLines =
      !following &&
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
    const hoveredFacility =
      hovered !== selectedId ? visible.find((f) => f.id === hovered) : undefined
    const hoverPoint = hoveredFacility ? points.get(hoveredFacility.id) : undefined
    const inView = (p: Point) => p[0] >= 0 && p[1] >= 0 && p[0] <= size.width && p[1] <= size.height
    const compact = size.width < 540
    const tagW = compact ? 145 : 178,
      tagH = compact ? 56 : 63
    const showTag =
      !following &&
      !travelTo &&
      selectedFacility &&
      selectedPoint &&
      layer.facilities &&
      inView(selectedPoint)
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
    // Road labels use sampled center vertices of named Census primary roads in the bundled layer.
    const mapLabels =
      layer.labels &&
      [...labels, ...roadLabels.map((l) => ({ ...l, kind: 'road' }))].flatMap((l) => {
        const p = project(l.lon, l.lat)
        if (
          !inView(p) ||
          (l.kind === 'road' && scale < 1350) ||
          (l.kind === 'place' && (camera.zoom < 0.85 || scale < 860))
        )
          return []
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
            className={'geo-label-' + (l.kind === 'road' ? 'place geo-road-name' : l.kind)}
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
        if (!f.code || f.id === selectedId || f.id === following?.from || f.id === following?.to)
          return []
        const p = points.get(f.id)!
        if (!inView(p) || p[0] > size.width - 70 || p[1] < 15 || p[1] > size.height - 35) return []
        const width = f.name.length * 5.5 + 14
        const box = { x: p[0] + 8, y: p[1] - 18, w: width, h: 15 }
        if (
          box.x + box.w > size.width - 12 ||
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
              {f.name}
            </text>
          </g>,
        ]
      })

    return (
      <div
        ref={host}
        className={'geo-map' + (following ? ' following-map' : '')}
        data-renderer={gl ? 'maplibre' : 'svg'}
        data-camera={[camera.lon, camera.lat, camera.zoom].join(',')}
      >
        <div className="geo-world" style={{ position: 'absolute', inset: 0 }}>
          {nativeLayer}
          <svg
            className="geo-stage"
            ref={canvas}
            style={{ pointerEvents: gl ? 'none' : 'auto' }}
            width="100%"
            height="100%"
            viewBox={'0 0 ' + size.width + ' ' + size.height}
            role="group"
            aria-label="Regional campus map. Use arrow keys to pan, plus and minus to zoom, and Home to reset."
            tabIndex={0}
            onPointerDown={(e) => {
              if (gl || e.button !== 0 || (e.target as Element).closest('[role=button]')) return
              const rect = e.currentTarget.getBoundingClientRect()
              pointers.current.set(e.pointerId, [e.clientX - rect.left, e.clientY - rect.top])
              const shape = pointerGeometry()
              if (shape) gesture.current = { ...shape, camera }
              e.currentTarget.setPointerCapture(e.pointerId)
            }}
            onPointerMove={(e) => {
              const start = gesture.current
              if (!start || !pointers.current.has(e.pointerId)) return
              const rect = e.currentTarget.getBoundingClientRect()
              pointers.current.set(e.pointerId, [e.clientX - rect.left, e.clientY - rect.top])
              const shape = pointerGeometry()
              if (!shape) return
              const [px, py] = shape.midpoint
              if (
                Math.hypot(px - start.midpoint[0], py - start.midpoint[1]) < 2 &&
                Math.abs(start.distance - shape.distance) < 2
              )
                return
              interrupt()
              const ratio = start.distance > 0 ? shape.distance / start.distance : 1
              const zoom = clamp(start.camera.zoom * ratio, 0.35, 9)
              const oldScale = fitScale * start.camera.zoom,
                nextScale = fitScale * zoom
              setCamera({
                zoom,
                lon: clamp(
                  start.camera.lon + (start.midpoint[0] - cx) / oldScale - (px - cx) / nextScale,
                  -75,
                  -72.8,
                ),
                lat: clamp(
                  latitudeOf(
                    mercatorLat(start.camera.lat) -
                      (start.midpoint[1] - cy) / oldScale +
                      (py - cy) / nextScale,
                  ),
                  40.1,
                  41.5,
                ),
              })
            }}
            onPointerUp={(e) => endPointer(e.pointerId)}
            onPointerCancel={(e) => endPointer(e.pointerId)}
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
                interrupt()
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
            <g ref={flightGroup}>
              {!gl && (
                <g aria-hidden="true">
                  <rect
                    width="100%"
                    height="100%"
                    fill={theme === 'dark' ? '#202b30' : palette.water}
                  />
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
                      pointerEvents="all"
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
                                      strokeDasharray={
                                        count + ' ' + (selectedPool.capacity - count)
                                      }
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
              {following &&
                origin &&
                destination &&
                layer.labels &&
                (() => {
                  const a = points.get(origin.id)!,
                    b = points.get(destination.id)!
                  const middle = position(a, curve(a, b), b, 0.5)
                  const ink = theme === 'dark' ? '#f2f2e8' : '#303933'
                  const halo = theme === 'dark' ? '#303735' : '#f5f5ed'
                  return (
                    <g
                      pointerEvents="none"
                      aria-hidden="true"
                      fontSize="12"
                      fontWeight="550"
                      fill={ink}
                      stroke={halo}
                      strokeWidth="3.3"
                      paintOrder="stroke"
                      strokeLinejoin="round"
                    >
                      {[
                        { campus: origin, point: a },
                        { campus: destination, point: b },
                      ].map(({ campus, point: [x, y] }) => {
                        return (
                          <text
                            key={campus.id}
                            x={clamp(
                              x,
                              8 + campus.name.length * 3.1,
                              size.width - followControlInset - 8 - campus.name.length * 3.1,
                            )}
                            y={y + 32}
                            textAnchor="middle"
                          >
                            {campus.name}
                          </text>
                        )
                      })}
                      <text
                        x={middle[0]}
                        y={middle[1] - 14}
                        textAnchor="middle"
                        fontWeight="400"
                        fontSize="11"
                      >
                        Schematic connection
                      </text>
                    </g>
                  )
                })()}
              {transferNodes.map((node) => node.traveler)}
            </g>
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
                {selectedFacility.id === 'nyc_bellevue'
                  ? 'Bellevue Hospital'
                  : selectedFacility.name}
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
        </div>
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
        <small className="geo-credit">
          {gl ? 'MapLibre' : '2D map'} · Census · GSHHG · Mapzen{' '}
          {onSources && (
            <button type="button" aria-label="Map sources" onClick={onSources}>
              Sources
            </button>
          )}
        </small>
      </div>
    )
  },
  (previous, next) =>
    Boolean(previous.suspended && next.suspended && previous.restoreView === next.restoreView),
)
