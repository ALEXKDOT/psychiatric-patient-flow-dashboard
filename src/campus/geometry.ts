import type { FeatureCollection, Polygon, Position } from 'geojson'
import type { CampusPack } from '../cartography/campusPacks'

export type Coordinate = [number, number]
export interface CampusPose {
  center: Coordinate
  zoom: number
  pitch: number
  bearing: number
}
export interface RoadLabel {
  name: string
  a: Coordinate
  b: Coordinate
  center: Coordinate
}
export function metersAt(lat: number): Coordinate {
  return [111320 * Math.cos((lat * Math.PI) / 180), 111320]
}
export const pixelsPerMeter = (zoom: number, lat: number) =>
  (512 * 2 ** zoom) / (40075016.686 * Math.cos((lat * Math.PI) / 180))
export function targetOf(pack: CampusPack) {
  return pack.buildings.features.find((f) => f.properties.is_target)!
}
export function ringsOf(
  geometry: CampusPack['buildings']['features'][number]['geometry'],
): Position[][] {
  return geometry.type === 'Polygon' ? geometry.coordinates : geometry.coordinates.flat()
}
export function initialCamera(pack: CampusPack, width: number, height: number): CampusPose {
  const center = pack.target.focus_lonlat
  const [mx, my] = metersAt(center[1])
  const coordinates = ringsOf(targetOf(pack).geometry).flat()
  const xs = coordinates.map((p) => p[0]),
    ys = coordinates.map((p) => p[1])
  const span = Math.max(
    (Math.max(...xs) - Math.min(...xs)) * mx,
    (Math.max(...ys) - Math.min(...ys)) * my,
    85,
  )
  const pixels = Math.min(width * 0.34, height * 0.39, 255)
  const zoom = Math.max(
    15.3,
    Math.min(17.45, Math.log2(pixels / (span * pixelsPerMeter(0, center[1])))),
  )
  return { center, zoom, pitch: 47, bearing: pack.target.campus_id === 'nyc_queens' ? 24 : -26 }
}
export const asCoordinate = (p: Position): Coordinate => [p[0], p[1]]
export function localProject(point: Position, center: Coordinate): Coordinate {
  const [mx, my] = metersAt(center[1])
  return [(point[0] - center[0]) * mx, (center[1] - point[1]) * my]
}
export function streetLabels(pack: CampusPack): RoadLabel[] {
  const focus = pack.target.focus_lonlat
  const candidates: (RoadLabel & { distance: number })[] = []
  for (const f of pack.streets.features) {
    const name = f.properties.full_street_name
    if (!name) continue
    const lines =
      f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.coordinates
    for (const line of lines) {
      const a = asCoordinate(line[0]),
        b = asCoordinate(line[line.length - 1])
      const center: Coordinate = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
      const [x, y] = localProject(center, focus),
        d = localProject(a, b)
      if (Math.hypot(...d) < 18) continue
      candidates.push({
        name: name.toLowerCase().replace(/\b[a-z]/g, (l) => l.toUpperCase()),
        a,
        b,
        center,
        distance: Math.hypot(x, y),
      })
    }
  }
  return candidates.sort((a, b) => a.distance - b.distance).slice(0, 450)
}
export function placeLabels(
  candidates: RoadLabel[],
  project: (p: Coordinate) => Coordinate,
  width: number,
  height: number,
  isOccluded?: (x: number, y: number) => boolean,
) {
  const settled: (RoadLabel & { x: number; y: number; angle: number; half: number })[] = []
  const seen = new Set<string>()
  for (const c of candidates) {
    if (seen.has(c.name)) continue
    const [x, y] = project(c.center)
    const half = c.name.length * 3 + 6
    if (x < half + 8 || y < 48 || x > width - half - 12 || y > height - 60) continue
    if (Math.abs(x - width * 0.5) < width * 0.085 && Math.abs(y - height * 0.5) < height * 0.15)
      continue
    if (settled.some((l) => Math.abs(l.x - x) < l.half + half + 15 && Math.abs(l.y - y) < 52))
      continue
    if (isOccluded?.(x, y)) continue
    const [ax, ay] = project(c.a),
      [bx, by] = project(c.b)
    let angle = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI
    if (angle > 90) angle -= 180
    if (angle < -90) angle += 180
    settled.push({ ...c, x, y, angle, half })
    seen.add(c.name)
    if (settled.length >= (width < 600 ? 5 : 11)) break
  }
  return settled
}
export function roofRim(pack: CampusPack): FeatureCollection<Polygon> {
  const target = targetOf(pack),
    [mx, my] = metersAt(pack.target.focus_lonlat[1])
  const features: FeatureCollection<Polygon>['features'] = []
  if (!pack.target.display_height_m) return { type: 'FeatureCollection', features }
  // A narrow geographic strip along each surveyed roof edge keeps its outline attached during orbit.
  for (const ring of ringsOf(target.geometry))
    for (let j = 1; j < ring.length; j++) {
      const a = ring[j - 1],
        b = ring[j],
        dx = (b[0] - a[0]) * mx,
        dy = (b[1] - a[1]) * my,
        len = Math.hypot(dx, dy)
      if (len < 0.05) continue
      const ox = ((-dy / len) * 0.38) / mx,
        oy = ((dx / len) * 0.38) / my
      const line = [
        [a[0] + ox, a[1] + oy],
        [b[0] + ox, b[1] + oy],
        [b[0] - ox, b[1] - oy],
        [a[0] - ox, a[1] - oy],
        [a[0] + ox, a[1] + oy],
      ]
      features.push({
        type: 'Feature',
        properties: {},
        geometry: { type: 'Polygon', coordinates: [line] },
      })
    }
  return { type: 'FeatureCollection', features }
}
export function pathOf(lines: Position[][], center: Coordinate, close: boolean) {
  return lines
    .map(
      (line) =>
        line
          .map((p, i) => {
            const [x, y] = localProject(p, center)
            return (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1)
          })
          .join('') + (close ? 'Z' : ''),
    )
    .join('')
}
