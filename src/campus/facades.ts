import type { FeatureCollection, MultiPolygon, Position } from 'geojson'
import type { CampusPack } from '../cartography/campusPacks'
import { metersAt, ringsOf } from './geometry'

export type Facades = FeatureCollection<
  MultiPolygon,
  {
    bottom: number
    top: number
    selected: boolean
    kind: 'glass' | 'cornice'
  }
>

// Fixed metre spacing keeps the illustrative glazing attached to the walls at every camera angle.
// Each level shares one multi-polygon rather than one feature per window.
export function campusFacades(pack: CampusPack): Facades {
  const features: Facades['features'] = []
  const [lon, lat] = pack.target.focus_lonlat
  const [mx, my] = metersAt(lat)
  const nearby = pack.buildings.features
    .flatMap((building) => {
      const h = building.properties.display_height_m
      if (!h || h < 4) return []
      const rings = ringsOf(building.geometry)
      const distance = Math.min(
        ...rings.map((ring) =>
          ring.reduce(
            (min, p) => Math.min(min, Math.hypot((p[0] - lon) * mx, (p[1] - lat) * my)),
            Infinity,
          ),
        ),
      )
      const selected = building.properties.is_target
      return selected || distance < 270 ? [{ h, rings, selected, distance }] : []
    })
    .sort((a, b) => Number(b.selected) - Number(a.selected) || a.distance - b.distance)

  let remaining = 18000
  for (const { h, rings, selected } of nearby) {
    if (remaining < 1) break
    const levels = Math.min(75, Math.max(1, Math.round(h / 3.7)))
    const storey = h / levels
    const panes: Position[][][] = []
    const trim: Position[][][] = []
    for (const ring of rings) {
      for (let i = 1; i < ring.length; i++) {
        const a = ring[i - 1],
          b = ring[i]
        const dx = (b[0] - a[0]) * mx,
          dy = (b[1] - a[1]) * my
        const length = Math.hypot(dx, dy)
        if (length < 3) continue
        const strip = (start: number, end: number, halfWidth: number) => {
          const point = (at: number, side: number): Position => [
            a[0] + (dx * at - (dy * side * halfWidth) / length) / mx,
            a[1] + (dy * at + (dx * side * halfWidth) / length) / my,
          ]
          const first = point(start, 1)
          return [[first, point(end, 1), point(end, -1), point(start, -1), first]]
        }
        trim.push(strip(0, 1, 0.38))
        const bays = Math.max(1, Math.floor(length / (selected ? 3.9 : 4.7)))
        for (let j = 0; j < bays; j++) panes.push(strip((j + 0.14) / bays, (j + 0.86) / bays, 0.52))
      }
    }
    if (!panes.length || (!selected && panes.length * levels > remaining)) continue
    for (let level = 0; level < levels; level++) {
      features.push({
        type: 'Feature',
        properties: {
          bottom: storey * (level + 0.24),
          top: storey * (level + 0.8),
          selected,
          kind: 'glass',
        },
        geometry: { type: 'MultiPolygon', coordinates: panes },
      })
    }
    features.push({
      type: 'Feature',
      properties: { bottom: h - 0.65, top: h + 0.1, selected, kind: 'cornice' },
      geometry: { type: 'MultiPolygon', coordinates: trim },
    })
    remaining -= panes.length * levels
  }
  return { type: 'FeatureCollection', features }
}
