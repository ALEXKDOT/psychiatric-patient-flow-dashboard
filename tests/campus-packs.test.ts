import { strict as assert } from 'node:assert'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import {
  CAMPUS_CACHE_LIMIT,
  campusCacheSize,
  campusTargets,
  loadCampusPack,
} from '../src/cartography/campusPacks'

test('selected neighborhood uses exactly two local requests, checks identity, retains both height fields, and reuses parsed geometry', async (ctx) => {
  const requests: string[] = []
  let fixtureId = 'nyc_queens'
  ctx.mock.method(globalThis, 'fetch', async (input: string) => {
    const path = new URL(input, 'https://example.test/app/')
    const layer = path.pathname.split('/').at(-1)!
    requests.push(path.pathname)
    const bytes = await readFile(
      new URL('../public/campuses/' + fixtureId + '/' + layer, import.meta.url),
    )
    return new Response(bytes)
  })
  const signal = new AbortController().signal
  await assert.rejects(loadCampusPack('nyc_bellevue', signal), /exactly one footprint|identity/)
  fixtureId = 'nyc_bellevue'
  const pack = await loadCampusPack('nyc_bellevue', signal)
  const focus = pack.buildings.features.filter((f) => f.properties.is_target)
  assert.equal(focus.length, 1)
  assert.equal(focus[0].properties.bin, '1091053')
  assert.equal(focus[0].properties.height_m, 28.956)
  assert.equal(focus[0].properties.display_height_m, 80.4672)
  assert.deepEqual(requests.slice(-2), [
    '/app/campuses/nyc_bellevue/buildings.geojson',
    '/app/campuses/nyc_bellevue/streets.geojson',
  ])
  assert.ok(
    pack.buildings.features.every(
      (f) => f.properties.is_target || f.properties.display_height_m === f.properties.height_m,
    ),
  )
  assert.strictEqual(await loadCampusPack('nyc_bellevue', signal), pack)
  assert.equal(requests.length, 4)
  fixtureId = 'nyc_queens'
  const queens = await loadCampusPack('nyc_queens', signal)
  const target = queens.buildings.features.find((f) => f.properties.is_target)!
  assert.equal(String(target.properties.objectid), String(campusTargets.nyc_queens.feature_id))
  assert.equal(target.properties.display_height_m, 31.394)
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(loadCampusPack('nyc_queens', controller.signal), { name: 'AbortError' })
  assert.equal(requests.length, 6)
})

test('all 23 registry records resolve within their own neighborhood with a three-entry parsed cache', async (ctx) => {
  const fetched: string[] = []
  ctx.mock.method(globalThis, 'fetch', async (input: string) => {
    const path = new URL(input, 'http://local/').pathname.replace(/^\//, '')
    assert.match(path, /^campuses\/[a-z_]+\/(buildings|streets)\.geojson$/)
    fetched.push(path)
    return new Response(await readFile(new URL('../public/' + path, import.meta.url)))
  })
  const signal = new AbortController().signal
  let flat = 0
  let buildings = 0
  let streets = 0
  const visited = Object.keys(campusTargets)
  for (const id of visited) {
    const pack = await loadCampusPack(id, signal)
    assert.ok(campusCacheSize() <= CAMPUS_CACHE_LIMIT)
    buildings += pack.buildings.features.length
    streets += pack.streets.features.length
    const selected = pack.buildings.features.filter((f) => f.properties.is_target)
    assert.equal(selected.length, 1)
    assert.equal(String(selected[0].properties.objectid), String(pack.target.feature_id))
    for (const f of pack.buildings.features) {
      if (f.properties.height_m == null) {
        assert.equal(f.properties.display_height_m, null)
        flat++
      }
      if (!f.properties.is_target)
        assert.equal(f.properties.display_height_m, f.properties.height_m)
    }
    if (id === 'ny_nyp_westchester_bh') {
      assert.equal(
        pack.streets.features.filter(
          (f) =>
            f.properties.full_street_name == null &&
            f.properties.full_street_name_as_published === ' ',
        ).length,
        58,
      )
      assert.equal(pack.target.feature_id, 274916)
      assert.deepEqual(pack.target.network_marker, [-73.75835, 41.02954])
      assert.deepEqual(pack.target.focus_lonlat, [-73.7538926, 41.0275733])
      assert.equal(selected[0].properties.display_height_m, 13.716)
    }
  }
  assert.equal(buildings, 42131)
  assert.equal(streets, 7982)
  assert.equal(flat, 26)
  // Revisit all 23 from newest to oldest: the first three reuse parsed layers.
  // Every earlier neighborhood must be fetched from storage again.
  const index = fetched.length
  for (const id of visited.reverse()) await loadCampusPack(id, signal)
  assert.equal(fetched.length - index, (visited.length - 3) * 2)
})

test('a delayed campus response that finishes after abort does not replace or cache a stale scene', async (ctx) => {
  const controller = new AbortController()
  let abortOnResponse = false
  let requests = 0
  ctx.mock.method(globalThis, 'fetch', async (input: string) => {
    requests++
    const path = new URL(input, 'http://local/').pathname
    const bytes = await readFile(new URL('../public' + path, import.meta.url))
    if (abortOnResponse) controller.abort()
    return new Response(bytes)
  })
  for (const id of ['nyc_bellevue', 'nyc_harlem', 'nyc_queens'])
    await loadCampusPack(id, new AbortController().signal)
  abortOnResponse = true
  requests = 0
  await assert.rejects(loadCampusPack('nyc_montefiore_moses', controller.signal), {
    name: 'AbortError',
  })
  abortOnResponse = false
  await loadCampusPack('nyc_montefiore_moses', new AbortController().signal)
  assert.equal(requests, 4)
})
