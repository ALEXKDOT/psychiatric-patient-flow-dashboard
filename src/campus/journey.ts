import { campusTargets } from '../cartography/campusPacks'
import { mercatorLat, latitudeOf } from '../cartography/mercator'
import type { MotionSegment } from '../sim'
import { curve, position } from '../transferPath'
import type { Coordinate } from './geometry'

type Project = (coordinate: Coordinate) => Coordinate
type Sample = (fraction: number) => Coordinate

export function journeyCoordinates(segment: Pick<MotionSegment, 'from' | 'to'>): Sample {
  function marker(campusId: string): Coordinate {
    const [lon, lat] = campusTargets[campusId].network_marker
    return [lon, -mercatorLat(lat)]
  }
  const source = marker(segment.from),
    destination = marker(segment.to)
  const control = curve(source, destination)
  return (t) => {
    const [lon, mercatorY] = position(source, control, destination, t)
    return [lon, latitudeOf(-mercatorY)]
  }
}

// Both local maps clip against the actual camera viewport. The tail covers
// at most the most recent 4% of an external journey and terminates at its marker.
export function localTraveler(
  segment: Pick<MotionSegment, 'from' | 'to' | 'startMinute' | 'endMinute'>,
  minute: number,
  sample: Sample,
  project: Project,
  width: number,
  height: number,
) {
  const t = (minute - segment.startMinute) / (segment.endMinute - segment.startMinute)
  if (t < 0 || t >= 1 || segment.from === segment.to) return null
  const coordinate = sample(t),
    pixel = project(coordinate)
  if (pixel[0] < -12 || pixel[0] > width + 12 || pixel[1] < -12 || pixel[1] > height + 12)
    return null
  const start = Math.max(0, t - 0.04)
  const points: string[] = []
  for (let i = 0; i <= 12; i++) {
    const [x, y] = i === 12 ? pixel : project(sample(start + ((t - start) * i) / 12))
    points.push((i ? 'L' : 'M') + x.toFixed(3) + ' ' + y.toFixed(3))
  }
  return { coordinate, pixel, path: points.join(' ') }
}
