import type { Point } from './cartography/base'

// Schematic quadratic connection in projected coordinates. Both the network and the
// following camera use this curve for the same episode.
export function curve(a: Point, b: Point): Point {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  return [(a[0] + b[0]) / 2 + dy * 0.19, (a[1] + b[1]) / 2 - dx * 0.19]
}

export function position(a: Point, c: Point, b: Point, t: number): Point {
  const w = 1 - t
  return [
    w * w * a[0] + 2 * w * t * c[0] + t * t * b[0],
    w * w * a[1] + 2 * w * t * c[1] + t * t * b[1],
  ]
}

export function tokenTransform(a: Point, c: Point, b: Point, t: number) {
  const [x, y] = position(a, c, b, t)
  const angle = Math.atan2(
    (1 - t) * (c[1] - a[1]) + t * (b[1] - c[1]),
    (1 - t) * (c[0] - a[0]) + t * (b[0] - c[0]),
  )
  return `translate(${x} ${y}) rotate(${(angle * 180) / Math.PI})`
}

// De Casteljau's first sub-curve retains the exact tangent and endpoint of the
// original curve. Path length is not proportional to the model-time parameter.
export function prefixPath(a: Point, c: Point, b: Point, t: number) {
  const q: Point = [a[0] + (c[0] - a[0]) * t, a[1] + (c[1] - a[1]) * t]
  return `M${a.join(' ')}Q${q.join(' ')} ${position(a, c, b, t).join(' ')}`
}

// Coordinates here are unscaled north-up Mercator (y increases southward).
// The bounding box of both anchors and their control point encloses the curve.
export function fitConnection(a: Point, b: Point, width: number, height: number, rightInset = 0) {
  const c = curve(a, b)
  const xs = [a[0], c[0], b[0]],
    ys = [a[1], c[1], b[1]]
  const west = Math.min(...xs),
    east = Math.max(...xs),
    north = Math.min(...ys),
    south = Math.max(...ys)
  const scale = Math.min(
    ((width - rightInset) * 0.76) / Math.max(0.014, east - west),
    (height * 0.64) / Math.max(0.014, south - north),
  )
  const center: Point = [(east + west) / 2 + rightInset / (2 * scale), (south + north) / 2]
  return { center, scale }
}
