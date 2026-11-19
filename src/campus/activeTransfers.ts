import '../campus-travel.css'
import { useContext, useEffect, useRef, type RefObject } from 'react'
import type { Map as GLMap } from 'maplibre-gl'
import { ReplayContext } from '../ReplayContext'
import type { MotionSegment } from '../sim'
import type { CampusPack } from '../cartography/campusPacks'
import { journeyCoordinates, localTraveler } from './journey'
const featureNamespace = 'http://www.w3.org/2000/svg'

// Position the button and trail in the same projected canvas frame during camera movement.
export function useCampusTravelers(
  mapRef: RefObject<GLMap | null>,
  ready: boolean,
  pack: CampusPack,
  segments: MotionSegment[] = [],
  onInspect?: (id: string) => void,
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
    if (!ready || !mapRef.current || !clock || !key) return
    const map = mapRef.current
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
        map.getCanvasContainer().appendChild(button)
        return { s, coord, path, button }
      })
    let minute = clock.readMinute()
    function draw() {
      const { width, height } = map.getCanvas().getBoundingClientRect()
      for (const { s, coord, path, button } of items) {
        const view = localTraveler(
          s,
          minute,
          coord,
          (ll) => {
            const p = map.project(ll)
            return [p.x, p.y]
          },
          width,
          height,
        )
        button.hidden = !view
        path.style.display = view ? '' : 'none'
        if (!view) continue
        button.style.transform =
          'translate(' + view.pixel[0] + 'px,' + view.pixel[1] + 'px) translate(-50%, -50%)'
        path.setAttribute('d', view.path)
        button.dataset.longitude = String(view.coordinate[0])
        button.dataset.latitude = String(view.coordinate[1])
      }
    }
    const off = clock.subscribeFrame((t) => {
      minute = t
      draw()
    })
    draw()
    map.on('render', draw)
    return () => {
      off()
      map.off('render', draw)
      items.forEach(({ button }) => button.remove())
      layer.remove()
    }
  }, [clock, mapRef, ready, campus, key])
}
