import '../campus-travel.css'
import { useContext, useEffect, useRef, type RefObject } from 'react'
import type { Map as GLMap, Marker } from 'maplibre-gl'
import { ReplayContext } from '../ReplayContext'
import type { MotionSegment } from '../sim'
import type { CampusPack } from '../cartography/campusPacks'
import { journeyCoordinates, localTraveler } from './journey'
const featureNamespace = 'http://www.w3.org/2000/svg'

// A native geographic marker is also the hit target. Its trail is projected on
// every camera render, including rotation, using the same geographic curve.
export function useCampusTravelers(
  mapRef: RefObject<GLMap | null>,
  ready: boolean,
  pack: CampusPack,
  segments: MotionSegment[] = [],
  onInspect?: (id: string) => void
) {
  const clock = useContext(ReplayContext)
  const latest = useRef({ segments, onInspect })
  latest.current = { segments, onInspect }
  const campus = pack.target.campus_id
  const key = segments
    .filter((s) => s.from === campus || s.to === campus)
    .map((s) => [s.id, s.startMinute, s.endMinute].join(':'))
    .join('/')
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map || !clock || !key) return
    let disposed = false
    let cleanup: (() => void) | undefined
    void import('maplibre-gl').then((gl) => {
      if (disposed) return
      const layer = document.createElementNS(featureNamespace, 'svg')
      layer.setAttribute('class', 'campus-trail-overlay')
      layer.setAttribute('aria-hidden', 'true')
      map.getCanvasContainer().appendChild(layer)
      const items = latest.current.segments
        .filter((s) => s.from === campus || s.to === campus)
        .map((s) => {
          const coord = journeyCoordinates(s)
          const path = document.createElementNS(featureNamespace, 'path')
          path.dataset.campusPrefix = s.id
          layer.appendChild(path)
          const button = document.createElement('button')
          button.type = 'button'
          button.className = 'campus-traveler-hit'
          button.dataset.campusHit = s.id
          button.setAttribute('aria-label', 'Inspect simulated transfer ' + s.id)
          button.title = s.id + ' · Schematic connection'
          button.onclick = () => latest.current.onInspect?.(s.id)
          const marker: Marker = new gl.Marker({
            element: button,
            anchor: 'center',
            subpixelPositioning: true,
          })
            .setLngLat(coord(0))
            .addTo(map)
          return { s, coord, path, button, marker }
        })
      let minute = clock.readMinute()
      function draw() {
        const { width, height } = map!.getCanvas().getBoundingClientRect()
        for (const { s, coord, path, button, marker } of items) {
          const view = localTraveler(
            s,
            minute,
            coord,
            (ll) => {
              const p = map!.project(ll)
              return [p.x, p.y]
            },
            width,
            height
          )
          button.hidden = !view
          path.style.display = view ? '' : 'none'
          if (!view) continue
          marker.setLngLat(view.coordinate)
          path.setAttribute('d', view.path)
          button.dataset.longitude = String(view.coordinate[0])
          button.dataset.latitude = String(view.coordinate[1])
        }
      }
      const off = clock.subscribeFrame((t) => {
        minute = t
        draw()
      })
      map.on('render', draw)
      cleanup = () => {
        off()
        map.off('render', draw)
        items.forEach(({ marker }) => marker.remove())
        layer.remove()
      }
    })
    return () => {
      disposed = true
      cleanup?.()
    }
  }, [clock, mapRef, ready, campus, key])
}
