import test from 'node:test'
import assert from 'node:assert/strict'
import { campusTargets } from '../src/cartography/campusPacks'
import { journeyCoordinates, localTraveler } from '../src/campus/journey'
import { getRun } from '../src/runs'
import { localProject, type Coordinate } from '../src/campus/geometry'

test('the featured traveler uses the same geographic point and trail end under flat and tilted projection', () => {
  const run = getRun('baseline', 42)
  const segment = run.presentationAt(9279).transfers.find((s) => s.id === 'EP-0190')!
  const origin = campusTargets[segment.from].network_marker
  const coordinates = journeyCoordinates(segment)
  const project = (p: Coordinate): Coordinate => {
    const [x, y] = localProject(p, origin)
    return [x + 400, y + 250]
  }
  const rotate = (p: Coordinate): Coordinate => {
    const [x, y] = localProject(p, origin)
    return [400 + x * 0.7 - y * 0.6, 250 + y * 0.45 + x * 0.3]
  }
  for (const minute of [9279, 9279.5, 9280]) {
    const flat = localTraveler(segment, minute, coordinates, project, 800, 500)!
    const pitched = localTraveler(segment, minute, coordinates, rotate, 800, 500)!
    assert.deepEqual(flat.coordinate, pitched.coordinate)
    for (const pose of [flat, pitched]) {
      const endpoint = pose.path.split('L').at(-1)!.replace('M', '').trim().split(' ').map(Number)
      assert.ok(Math.hypot(pose.pixel[0] - endpoint[0], pose.pixel[1] - endpoint[1]) < 0.002)
    }
  }
  assert.equal(localTraveler(segment, 9320, coordinates, project, 800, 500), null)
  assert.equal(localTraveler(segment, segment.endMinute, coordinates, rotate, 800, 500), null)
})
