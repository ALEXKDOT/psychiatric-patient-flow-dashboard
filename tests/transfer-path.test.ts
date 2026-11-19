import { strict as assert } from 'node:assert'
import test from 'node:test'
import { curve, position, prefixPath, fitConnection } from '../src/transferPath'

test('partial schematic path ends at the traveler and has exactly the original curvature', () => {
  const a: [number, number] = [12, -2],
    b: [number, number] = [60, 110],
    c = curve(a, b)
  for (const t of [0, 0.00002, 0.492, 0.9999, 1]) {
    const path = prefixPath(a, c, b, t)
    const [x, y, qx, qy, tx, ty] = path.match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/g)!.map(Number)
    assert.deepEqual([tx, ty], position(a, c, b, t))
    const halfway = position([x, y], [qx, qy], [tx, ty], 0.5)
    assert.ok(
      Math.hypot(
        halfway[0] - position(a, c, b, t * 0.5)[0],
        halfway[1] - position(a, c, b, t * 0.5)[1],
      ) < 1e-8,
    )
  }
})

test('endpoint fit encloses both endpoints and the curve on narrow and landscape maps', () => {
  for (const [width, height] of [
    [300, 260],
    [1100, 590],
  ]) {
    const a: [number, number] = [-73.97639, -44.68454],
      b: [number, number] = [-73.804, -44.66]
    const rightInset = width <= 600 ? 56 : 0
    const { center, scale } = fitConnection(a, b, width, height, rightInset)
    for (const t of [0, 0.125, 0.5, 0.75, 1]) {
      const [x, y] = position(a, curve(a, b), b, t)
      assert.ok(Math.abs(x - center[0]) * scale <= width * 0.42)
      assert.ok(width / 2 + (x - center[0]) * scale < width - rightInset)
      assert.ok(Math.abs(y - center[1]) * scale <= height * 0.39)
    }
  }
})
