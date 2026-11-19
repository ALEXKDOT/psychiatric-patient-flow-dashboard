import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { Map as GLMap } from 'maplibre-gl'
import type { CampusPack } from '../cartography/campusPacks'
import { registerTerrainProtocol } from '../cartography/terrain'
import { campusStyle } from './style'
import { neighborhoodWindow } from './window'
import { useCampusTravelers } from './activeTransfers'
import type { MotionSegment } from '../sim'
import {
  initialCamera,
  metersAt,
  pixelsPerMeter,
  placeLabels,
  streetLabels,
  type CampusPose,
  type Coordinate,
} from './geometry'

export interface SceneControls {
  zoom: (by: number) => void
  reset: () => void
  rotate: (by: number) => void
}
export interface RenderProps {
  pack: CampusPack
  dark: boolean
  initialPose?: CampusPose
  controls: RefObject<SceneControls | null>
  onPose: (p: CampusPose) => void
  interrupt: () => void
  transfers?: MotionSegment[]
  onInspectTransfer?: (id: string) => void
}
const poseOf = (map: GLMap): CampusPose => ({
  center: map.getCenter().toArray() as Coordinate,
  zoom: map.getZoom(),
  pitch: map.getPitch(),
  bearing: map.getBearing(),
})
const SVG = 'http://www.w3.org/2000/svg'
export function CampusGL(
  props: RenderProps & { orbit: boolean; onFallback: () => void; onReady: () => void },
) {
  const outer = useRef<HTMLDivElement>(null)
  const host = useRef<HTMLDivElement>(null)
  const labels = useRef<SVGSVGElement>(null)
  const ruler = useRef<HTMLDivElement>(null)
  const current = useRef(props)
  current.current = props
  const mapRef = useRef<GLMap | null>(null)
  const manualGesture = useRef(false)
  const [ready, setReady] = useState(false)
  const software = useRef(false),
    nativeRatio = useRef(1)
  const windowRef = useRef<ReturnType<typeof neighborhoodWindow> | null>(null)
  const styleTheme = useRef(props.dark)
  const { pack, controls } = props
  useCampusTravelers(mapRef, ready, pack, props.transfers, props.onInspectTransfer)
  useEffect(() => {
    let disposed = false
    let map: GLMap | undefined
    const el = host.current!,
      panel = outer.current!,
      layer = labels.current!
    const names = streetLabels(pack)
    const nodes = Array.from({ length: 11 }, () => {
      const text = document.createElementNS(SVG, 'text')
      text.setAttribute('class', 'campus-street-label')
      layer.appendChild(text)
      return text
    })
    function onInput(e?: Event) {
      if (
        e?.type === 'keydown' &&
        !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '-', '='].includes(
          (e as KeyboardEvent).key,
        )
      )
        return
      // The native handler cancels its predecessor. Calling map.stop() here also
      // resets the drag/zoom that just began, truncating the user's gesture.
      manualGesture.current = true
      current.current.interrupt()
    }
    const inputEvents = ['wheel', 'keydown']
    inputEvents.forEach((key) =>
      el.addEventListener(key, onInput, { capture: true, passive: true }),
    )
    let width = el.clientWidth
    let height = el.clientHeight
    const resize = new ResizeObserver(([entry]) => {
      width = entry.contentRect.width
      height = entry.contentRect.height
      map?.resize()
    })
    resize.observe(el)
    async function mount() {
      try {
        const gl = await import('maplibre-gl')
        if (disposed) return
        registerTerrainProtocol(gl)
        const w = el.clientWidth,
          h = el.clientHeight
        const pose = current.current.initialPose ?? initialCamera(pack, w, h)
        const [lon, lat] = pack.target.focus_lonlat,
          [mx, my] = metersAt(lat)
        map = new gl.Map({
          container: el,
          style: { version: 8, sources: {}, layers: [] },
          ...pose,
          attributionControl: false,
          renderWorldCopies: false,
          maxPitch: 65,
          minZoom: 15.1,
          maxZoom: 19.3,
          maxBounds: [
            [lon - 900 / mx, lat - 900 / my],
            [lon + 900 / mx, lat + 900 / my],
          ],
          pixelRatio: devicePixelRatio,
          canvasContextAttributes: { antialias: false },
          fadeDuration: 0,
          trackResize: false,
        })
        mapRef.current = map
        const windowed = neighborhoodWindow(pack, map)
        windowRef.current = windowed
        map.setStyle(campusStyle(windowed.pack(), current.current.dark), { diff: false })
        styleTheme.current = current.current.dark
        panel.dataset.scopedBuildings = String(windowed.pack().buildings.features.length)
        panel.dataset.packedBuildings = String(pack.buildings.features.length)
        const ctx = map.getCanvas().getContext('webgl2')
        const info = ctx?.getExtension('WEBGL_debug_renderer_info')
        software.current = Boolean(
          ctx &&
          info &&
          /swiftshader|llvmpipe|software rasterizer/i.test(
            String(ctx.getParameter(info.UNMASKED_RENDERER_WEBGL)),
          ),
        )
        nativeRatio.current = map.getPixelRatio()
        panel.dataset.gpu = software.current ? 'software' : 'native'
        map.on('dragstart', () => onInput())
        for (const event of ['rotatestart', 'pitchstart', 'zoomstart'] as const)
          map.on(event, (e) => {
            if (e.originalEvent) onInput()
          })
        map
          .getCanvas()
          .setAttribute(
            'aria-label',
            'Campus map. Arrow keys pan. Shift and arrow keys rotate or tilt. Plus and minus zoom.',
          )
        map.on('webglcontextlost', () => {
          if (!disposed) current.current.onFallback()
        })
        map.on('error', (e) => {
          const sourceId = 'sourceId' in e ? e.sourceId : undefined
          if (disposed || sourceId === 'dem' || sourceId === 'water') return
          current.current.onFallback()
        })
        controls.current = {
          zoom: (by) => {
            onInput()
            map?.jumpTo({ zoom: map.getZoom() + by })
          },
          reset: () => {
            onInput()
            map?.jumpTo(initialCamera(pack, el.clientWidth, el.clientHeight))
          },
          rotate: (by) => {
            onInput()
            map?.jumpTo({ bearing: map.getBearing() + by })
          },
        }
        const project = (p: Coordinate): Coordinate => {
          const loc = map!.project(p)
          return [loc.x, loc.y]
        }
        let lastLabels = -Infinity
        let oldLayout = {
          lon: Infinity,
          lat: Infinity,
          zoom: Infinity,
          bearing: Infinity,
          width: 0,
          height: 0,
        }
        let visibleNames: typeof names = []
        let lastScaleWidth = 0
        let lastScaleMeters = 0
        let announcedReady = false
        function report(field: string, value: string) {
          if (panel.dataset[field] !== value) panel.dataset[field] = value
        }
        map.on('render', () => {
          const now = performance.now()
          if (disposed || !map || (announcedReady && now - lastLabels < 80)) return
          lastLabels = now
          const [x, y] = project(pack.target.focus_lonlat)
          // A missing DEM tile can keep MapLibre's global load event pending.
          // The campus is ready as soon as its own source has actually drawn.
          if (!announcedReady && map.getLayer('massing') && map.isSourceLoaded('buildings')) {
            const visible = map
              .queryRenderedFeatures({ layers: ['plans', 'massing'] })
              .some((feature) => feature.properties.is_target)
            const outside = x < 0 || x > width || y < 0 || y > height
            if (visible || outside) {
              announcedReady = true
              panel.dataset.targetVisible = String(visible)
              panel.dataset.sourceCount = String(Object.keys(map.getStyle().sources).length)
              current.current.onReady()
              setReady(true)
            }
          }
          const bearing = map.getBearing(),
            zoom = map.getZoom(),
            center = map.getCenter()
          report('bearing', String(bearing))
          report('pitch', String(map.getPitch()))
          report('zoom', String(zoom))
          report('anchorX', x.toFixed(2))
          report('anchorY', y.toFixed(2))
          const old = oldLayout
          if (
            Math.abs(bearing - old.bearing) > 2 ||
            Math.abs(zoom - old.zoom) > 0.08 ||
            Math.abs(center.lat - old.lat) + Math.abs(center.lng - old.lon) > 0.00015 ||
            old.width !== width ||
            old.height !== height
          ) {
            windowed.sync()
            const placed = placeLabels(names, project, width, height, (px, py) => {
              if (!map?.getLayer('massing')) return false
              return map.queryRenderedFeatures([px, py], { layers: ['massing'] }).length > 0
            })
            visibleNames = placed
            oldLayout = { lon: center.lng, lat: center.lat, zoom, bearing, width, height }
          }
          nodes.forEach((node, i) => {
            const mark = visibleNames[i]
            node.style.display = mark ? '' : 'none'
            if (!mark) return
            const [tx, ty] = project(mark.center)
            const [ax, ay] = project(mark.a),
              [bx, by] = project(mark.b)
            let rotation = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI
            if (rotation > 90) rotation -= 180
            if (rotation < -90) rotation += 180
            if (node.textContent !== mark.name) node.textContent = mark.name
            node.setAttribute(
              'transform',
              `translate(${tx.toFixed(1)} ${ty.toFixed(1)}) rotate(${rotation.toFixed(1)})`,
            )
          })
          const ppm = pixelsPerMeter(zoom, center.lat)
          const m = [5, 10, 20, 50, 100, 200, 500].find((n) => n * ppm >= 35) ?? 500
          const scaleWidth = Math.round(m * ppm)
          if (ruler.current && (scaleWidth !== lastScaleWidth || m !== lastScaleMeters)) {
            lastScaleWidth = scaleWidth
            lastScaleMeters = m
            ruler.current.textContent = m + ' m'
            ruler.current.style.setProperty('--ruler-width', scaleWidth + 'px')
          }
        })
        map.on('load', () => {
          oldLayout.width = 0
        })
        map.on('moveend', () => {
          lastLabels = -Infinity
          if (!disposed && map) current.current.onPose(poseOf(map))
        })
      } catch {
        if (!disposed) current.current.onFallback()
      }
    }
    void mount()
    return () => {
      disposed = true
      resize.disconnect()
      inputEvents.forEach((key) => el.removeEventListener(key, onInput, true))
      if (map) current.current.onPose(poseOf(map))
      controls.current = null
      map?.remove()
      mapRef.current = null
      nodes.forEach((n) => n.remove())
    }
  }, [pack, controls])
  useEffect(() => {
    const m = mapRef.current
    if (ready && m && styleTheme.current !== props.dark) {
      styleTheme.current = props.dark
      m.setStyle(campusStyle(windowRef.current?.pack() ?? pack, props.dark), { diff: true })
    }
  }, [pack, ready, props.dark])
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map || !props.orbit) return
    manualGesture.current = false
    let running = true,
      timeout: number
    // Full-resolution controls and labels remain separate. Software rasterization
    // uses a smaller drawing buffer in motion; a parked camera regains full detail.
    if (software.current) map.setPixelRatio(Math.min(nativeRatio.current, 0.52))
    const orbit = () => {
      if (!running || document.hidden) return
      const duration = 90000
      // Native transform interpolates rotation around the actual target, so roof and streets share one camera.
      map.rotateTo(map.getBearing() + 135, { duration, easing: (t) => t, essential: true })
      timeout = window.setTimeout(orbit, duration + 10)
    }
    const start = () => {
      window.clearTimeout(timeout)
      map.stop()
      if (document.hidden) return
      const focus = pack.target.focus_lonlat
      if (
        Math.abs(map.getCenter().lng - focus[0]) + Math.abs(map.getCenter().lat - focus[1]) >
        1e-5
      ) {
        map.easeTo({ center: focus, duration: 450 })
      }
      timeout = window.setTimeout(orbit, 600)
    }
    start()
    document.addEventListener('visibilitychange', start)
    return () => {
      running = false
      window.clearTimeout(timeout)
      document.removeEventListener('visibilitychange', start)
      if (mapRef.current) {
        if (!manualGesture.current) map.stop()
        if (software.current) map.setPixelRatio(nativeRatio.current)
      }
    }
  }, [pack, ready, props.orbit])
  return (
    <div className="campus-gl" ref={outer} data-native-theme="">
      <div className="campus-gl-canvas" ref={host} />
      <svg
        className="campus-label-overlay"
        ref={labels}
        width="100%"
        height="100%"
        aria-hidden="true"
      />
      <div className="campus-scale" ref={ruler} />
    </div>
  )
}
