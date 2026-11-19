// Exercise late local asset failures, a graphics context loss, and stale selections.
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { parseArgs } from 'node:util'
import { expect } from '@playwright/test'
import { launch, localPage, ready, sizes } from './browser_capture.mjs'
import { campusReady, openFromDirectory } from './browser_journey.mjs'

const { values } = parseArgs({
  options: { url: { type: 'string', default: 'http://127.0.0.1:4173' } },
})
const { url } = values
const targets = JSON.parse(
  await readFile(new URL('../src/cartography/campus/targets.json', import.meta.url)),
)
const browser = await launch()
try {
  const { context, page, errors, external } = await localPage(browser, url, sizes.desktop)
  const failures = []
  const requests = new Set()
  page.on('response', (response) => {
    if (response.status() >= 400) failures.push(response.url())
    requests.add(new URL(response.url()).pathname)
  })
  await ready(page, url)
  await expect(page.locator('.geo-map')).toHaveAttribute('data-renderer', 'maplibre', {
    timeout: 30000,
  })
  const back = page.getByRole('button', { name: 'Back to previous view' }).first()
  let fail = true
  await page.route('**/campuses/nyc_elmhurst/streets.geojson', (route) =>
    fail ? route.fulfill({ status: 503, body: 'Intentionally unavailable' }) : route.fallback(),
  )
  await openFromDirectory(page, 'nyc_elmhurst')
  const retry = page.getByRole('button', { name: /retry/i })
  await expect(retry).toBeVisible()
  await expect(back).toBeVisible()
  fail = false
  await retry.click()
  await campusReady(page, 'nyc_elmhurst', 'maplibre')
  await back.click()
  // Start a slow load for a previously uncached campus, then replace it twice.
  let release
  const held = new Promise((resolve) => {
    release = resolve
  })
  let signalHeld
  const pending = new Promise((resolve) => {
    signalHeld = resolve
  })
  await page.route('**/campuses/nyc_bellevue/buildings.geojson', async (route) => {
    signalHeld()
    await held
    await route.fallback().catch(() => {})
  })
  await openFromDirectory(page, 'nyc_bellevue')
  await pending
  await openFromDirectory(page, 'nyc_harlem')
  await openFromDirectory(page, 'nyc_queens')
  release()
  await campusReady(page, 'nyc_queens', 'maplibre')
  await page.waitForTimeout(350)
  await expect(page.locator('.campus-scene')).toHaveAttribute('data-campus-id', 'nyc_queens')
  await back.click()
  const cdp = await context.newCDPSession(page)
  await cdp.send('Performance.enable')
  const memory = async () => {
    await cdp.send('HeapProfiler.collectGarbage')
    const { metrics } = await cdp.send('Performance.getMetrics')
    const values = Object.fromEntries(metrics.map((m) => [m.name, m.value]))
    return {
      heap: Math.round(values.JSHeapUsedSize),
      nodes: values.Nodes,
      documents: values.Documents,
      canvases: await page.locator('canvas').count(),
      visibleCanvases: await page.locator('canvas:visible').count(),
    }
  }
  const memoryMeasurements = []
  const sourceCounts = new Set()
  const cacheSizes = new Set()
  for (const [index, item] of targets.entries()) {
    await openFromDirectory(page, item.campus_id)
    await campusReady(page, item.campus_id, 'maplibre')
    const raw = page.locator('.campus-scene')
    await expect(raw).toHaveAttribute('data-feature-id', String(item.feature_id))
    const cacheSize = Number(await raw.getAttribute('data-cached-packs'))
    const gl = raw.locator('.campus-gl')
    await expect(gl).toHaveAttribute('data-source-count', /^[1-9]\d*$/)
    sourceCounts.add(Number(await gl.getAttribute('data-source-count')))
    cacheSizes.add(cacheSize)
    assert.ok(cacheSize >= 1 && cacheSize <= 3, 'Parsed campus cache exceeded 3')
    if ([2, 9, 19, 22].includes(index))
      memoryMeasurements.push({ selections: index + 1, ...(await memory()) })
  }
  for (const sample of memoryMeasurements) {
    assert.equal(sample.visibleCanvases, 1)
    assert.ok(sample.canvases <= 2, 'Retained more than the regional and active campus canvases')
  }
  assert.equal(
    sourceCounts.size,
    1,
    'Native source count changed across campuses: ' + [...sourceCounts],
  )
  console.log('Native sources and cached packs across all selections', {
    sources: [...sourceCounts],
    cacheSizes: [...cacheSizes],
  })
  console.log(
    'All registry feature IDs matched. Main-frame heap after forced GC:',
    memoryMeasurements,
  )
  // Dispatch an actual GPU context loss, rather than a synthetic DOM event.
  const lost = await page.locator('.campus-gl canvas').evaluate((canvas) => {
    const gl = canvas.getContext('webgl2')
    const ext = gl?.getExtension('WEBGL_lose_context')
    ext?.loseContext()
    return Boolean(ext)
  })
  assert.equal(lost, true)
  await campusReady(page, targets.at(-1).campus_id, 'svg')
  await back.click()
  assert.ok(
    [...requests].some((r) => r.includes('/geography/terrain/')),
    'No local DEM loaded',
  )
  assert.ok(
    [...requests].some((r) => r.endsWith('.woff2')),
    'No local font loaded',
  )
  const prefix = new URL(url).pathname.replace(/\/?$/, '/')
  for (const pathname of requests)
    assert.ok(pathname.startsWith(prefix), 'Escaped project prefix: ' + pathname)
  assert.equal(failures.length, 1, JSON.stringify(failures))
  assert.deepEqual(external, [])
  assert.deepEqual(errors, [])
  console.log(
    'Pack failure and retry, delayed selection, all targets, context loss, and project subpath verified.',
  )
  await context.close()
  const cold = await localPage(browser, url, sizes.desktop)
  let rejectedTiles = 0
  await cold.page.route('**/geography/terrain/**/*', (route) => {
    rejectedTiles++
    return route.abort('failed')
  })
  await ready(cold.page, url)
  await openFromDirectory(cold.page, 'nyc_bellevue')
  await campusReady(cold.page, 'nyc_bellevue', 'maplibre')
  assert.ok(rejectedTiles > 0, 'Optional relief interruption was not exercised')
  await cold.page.getByRole('button', { name: 'Back to previous view' }).click()
  await expect(cold.page.locator('[data-view="network"]')).toBeVisible()
  assert.deepEqual(cold.errors, [])
  assert.deepEqual(cold.external, [])
  console.log('Optional terrain outage left selected roof, street names and Back available', {
    rejectedTiles,
  })
  await cold.context.close()
  // Playwright context routing disables caching. Re-enter without interception
  // so CDP can reveal the server's real conditional-response status codes.
  const warm = await localPage(browser, url, sizes.desktop, 'reduce', { cache: true })
  await ready(warm.page, url)
  const network = await warm.context.newCDPSession(warm.page)
  await network.send('Network.enable')
  const ids = new Map()
  const reused = []
  network.on('Network.requestWillBeSent', (e) => ids.set(e.requestId, e.request.url))
  network.on('Network.responseReceivedExtraInfo', (e) => {
    if (e.statusCode === 304) reused.push(e.requestId)
  })
  await warm.page.reload({ waitUntil: 'networkidle' })
  const categories = reused.map((id) => ids.get(id)).filter(Boolean)
  const fonts = categories.filter((address) => address.includes('.woff2')).length
  assert.ok(fonts >= 1, 'Expected at least one conditional font response on same-origin reload')
  assert.deepEqual(warm.errors, [])
  assert.deepEqual(warm.external, [])
  console.log('HTTP 304 body reuse on warm reload', { responses: categories.length, fonts })
  await warm.context.close()
} finally {
  await browser.close()
}
