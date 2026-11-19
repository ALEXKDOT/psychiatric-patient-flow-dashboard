// The selection, event and camera checks use the same controls as a visitor.
import assert from 'node:assert/strict'
import { readFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { pathToFileURL } from 'node:url'
import { expect } from '@playwright/test'
import { launch, localPage, ready, sizes } from './browser_capture.mjs'

const targets = JSON.parse(
  await readFile(new URL('../src/cartography/campus/targets.json', import.meta.url)),
)
const fixture = JSON.parse(
  await readFile(new URL('./fixtures/bellevue-queens.json', import.meta.url)),
)
const targetById = Object.fromEntries(targets.map((t) => [t.campus_id, t]))
const subject = (page) => page.getByRole('complementary', { name: 'Selected transfer inspector' })
const slider = (page) => page.getByRole('slider', { name: 'Replay minute' })
const back = (page) => page.getByRole('button', { name: 'Back to previous view' }).first()

export async function openFromDirectory(page, id) {
  await page.keyboard.press('Control+k')
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('searchbox').fill(id)
  const options = dialog.getByRole('list', { name: 'Facility results' }).getByRole('button')
  // This is the only registry key that's also a prefix of other campus IDs.
  if (id === 'nyc_mount_sinai')
    return options.filter({ hasText: 'Mount Sinai Hospital' }).press('Enter')
  await expect(options).toHaveCount(1)
  await options.press('Enter')
}

export async function campusReady(page, id, renderer) {
  const campus = page.locator('.campus-scene')
  await expect(campus).toHaveAttribute('data-campus-id', id, { timeout: 15000 })
  await expect(campus).toHaveAttribute('data-feature-id', String(targetById[id].feature_id))
  await expect(campus).toHaveAttribute('data-renderer', renderer, { timeout: 30000 })
  await expect(
    campus.locator('.campus-street-label:visible').filter({ hasText: /\S/ }).first(),
  ).toBeVisible({ timeout: 10000 })
  if (renderer === 'maplibre') {
    await expect(campus.locator('.campus-gl')).toHaveAttribute('data-target-visible', 'true')
  }
  return campus
}

async function desktopCampusMotion(page) {
  const pin = page.getByRole('button', { name: 'Select Bellevue Hospital', exact: true })
  const cameraBefore = await page.locator('.geo-map').getAttribute('data-camera')
  await pin.focus()
  await page.keyboard.press('Enter')
  const campus = await campusReady(page, 'nyc_bellevue', 'maplibre')
  const gl = campus.locator('.campus-gl')
  await expect(campus).toHaveAttribute('data-orbit', 'running', { timeout: 5000 })
  const camera = () =>
    gl.evaluate((el) => [el.dataset.bearing, el.dataset.anchorX, el.dataset.anchorY].map(Number))
  const a = await camera()
  await page.waitForTimeout(5000)
  const b = await camera()
  const rotation = Math.abs(((b[0] - a[0] + 540) % 360) - 180)
  const drift = Math.hypot(b[1] - a[1], b[2] - a[2])
  console.log('5-second orbit', { rotation, drift, anchor: b.slice(1) })
  assert.ok(rotation >= 4 && rotation <= 12, 'Unexpected five-second orbit angle ' + rotation)
  assert.ok(drift <= 8, 'Focus anchor drift ' + drift)
  const area = await gl.boundingBox()
  const x = area.x + area.width * 0.55,
    y = area.y + area.height * 0.5
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + 55, y + 12, { steps: 6 })
  await page.mouse.up()
  await expect(campus).toHaveAttribute('data-orbit', 'paused')
  const paused = await camera()
  await campus.getByRole('button', { name: /Resume orbit/ }).click()
  const resumed = await camera()
  assert.ok(
    Math.abs(((resumed[0] - paused[0] + 540) % 360) - 180) < 3,
    'Resume jumped to a different bearing',
  )
  await page.getByRole('button', { name: 'Play replay', exact: true }).click()
  await page.getByRole('button', { name: 'Pause motion', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Play replay', exact: true })).toBeVisible()
  await expect(campus).toHaveAttribute('data-orbit', 'paused')
  await back(page).press('Enter')
  await expect(pin).toBeFocused()
  await expect(page.locator('.geo-map')).toHaveAttribute('data-camera', cameraBefore)
}

async function sampleNetwork(page, expected) {
  const metrics = page.getByRole('region', { name: 'Network-wide simulation metrics' })
  const cells = metrics.locator('.telemetry-cell')
  for (const [label, value] of [
    ['ED queue', expected.queue],
    ['Referrals', expected.openReferrals],
    ['In transit', expected.inTransit],
  ]) {
    await expect(
      cells.filter({ has: page.getByText(label, { exact: true }) }).locator('strong'),
    ).toHaveText(String(value))
  }
  await expect(metrics).toContainText(expected.occupied + ' / ' + expected.capacity + ' slots')
}

async function fixtureWalk(page) {
  await page
    .getByRole('button', { name: /Watch featured transfer/i })
    .first()
    .click()
  await page.getByRole('button', { name: 'Pause replay', exact: true }).click()
  const inspector = subject(page)
  await expect(inspector).toHaveAttribute('data-episode-id', 'EP-0190')
  for (const f of fixture.frames) {
    await slider(page).fill(String(f.minute))
    await sampleNetwork(page, f.network)
    await expect(inspector).toHaveAttribute('data-phase', f.phase ?? 'unobserved')
    if (f.phase === null) {
      await expect(inspector).toContainText('no recorded disposition')
      await expect(inspector.getByTestId('trip-pool-reserved')).toHaveCount(0)
      await expect(page.locator('[data-token="EP-0190"]')).toHaveCount(0)
      continue
    }
    if (f.minute < fixture.episode.commit) {
      await expect(inspector.getByTestId('trip-open-referrals')).toHaveText(
        String(f.ownOpenReferrals),
      )
      await expect(inspector.getByTestId('trip-pool-reserved')).toHaveCount(0)
      await expect(inspector.getByRole('button', { name: 'Inspect destination' })).toHaveCount(0)
    } else {
      await expect(inspector.getByTestId('trip-pool-reserved')).toHaveText(
        String(f.destinationPool.reserved),
      )
      await expect(inspector.getByTestId('trip-pool-occupied')).toHaveText(
        String(f.destinationPool.occupied),
      )
      await expect(inspector.getByTestId('trip-pool-capacity')).toHaveText(
        String(f.destinationPool.capacity),
      )
    }
    const token = page.locator('[data-token="EP-0190"]')
    if (f.activeTransfer && (await page.locator('.geo-map:visible').count())) {
      await expect(token).toHaveCount(1)
      await expect(token).toBeVisible()
      await expect(
        inspector.getByRole('progressbar', { name: 'Modeled travel progress' }),
      ).toBeVisible()
    } else if (!f.activeTransfer) {
      await expect(token).toHaveCount(0)
    }
  }
  // Reverse across both boundaries: a previously admitted episode must travel again.
  await slider(page).fill('9362')
  await expect(inspector).toHaveAttribute('data-phase', 'handoff')
  await slider(page).fill('9320')
  await expect(inspector).toHaveAttribute('data-phase', 'transit')
  await slider(page).fill('9278')
  await expect(inspector).toHaveAttribute('data-phase', 'preparation')
  await slider(page).fill('9387')
  await expect(inspector).toHaveAttribute('data-phase', 'inpatient')
  await back(page).click()
}

async function tiltedTravelerProjection(page) {
  await slider(page).fill('9280')
  await openFromDirectory(page, 'nyc_bellevue')
  const campus = await campusReady(page, 'nyc_bellevue', 'maplibre')
  const hit = campus.locator('[data-campus-hit="EP-0190"]')
  await campus.getByRole('button', { name: 'Rotate right' }).click()
  for (let z = 0; z < 4 && !(await hit.isVisible()); z++) {
    await campus.getByRole('button', { name: 'Zoom out', exact: true }).click()
    await page.waitForTimeout(150)
  }
  await expect(hit).toBeVisible()
  const result = await campus.evaluate((el) => {
    const button = el.querySelector('[data-campus-hit="EP-0190"]')
    const path = el.querySelector('[data-campus-prefix="EP-0190"]')
    const gl = el.querySelector('.campus-gl').dataset
    const rect = button.getBoundingClientRect()
    const x = rect.x + rect.width / 2,
      y = rect.y + rect.height / 2
    const end = path.getPointAtLength(path.getTotalLength()).matrixTransform(path.getScreenCTM())
    const pointer = document.elementFromPoint(x, y)
    return {
      pitch: Number(gl.pitch),
      bearing: Number(gl.bearing),
      zoom: Number(gl.zoom),
      x,
      y,
      error: Math.hypot(end.x - x, end.y - y),
      hit: pointer === button || button.contains(pointer),
    }
  })
  console.log('Tilted and rotated native traveler projection', result)
  assert.ok(result.pitch >= 30 && Math.abs(result.bearing) > 2)
  assert.ok(
    result.error <= 4,
    'Token center and trail endpoint are ' + result.error + ' CSS pixels apart',
  )
  assert.equal(result.hit, true, 'Token center is not a live hit target')
  await hit.click()
  await expect(subject(page)).toHaveAttribute('data-episode-id', 'EP-0190')
  await back(page).click()
}

async function verifyFlatTraveler(page) {
  await slider(page).fill('9280')
  await openFromDirectory(page, 'nyc_bellevue')
  const campus = await campusReady(page, 'nyc_bellevue', 'svg')
  const hit = campus.locator('[data-campus-hit="EP-0190"]')
  // The initial phone mount gets its actual CSS size through ResizeObserver.
  // Establish a stable visible pose before comparing two SVG coordinate spaces.
  const nextPaint = () =>
    page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    )
  await nextPaint()
  for (let n = 0; n < 4 && !(await hit.isVisible()); n++) {
    await campus.getByRole('button', { name: 'Zoom out', exact: true }).click()
    await nextPaint()
  }
  await expect(hit).toBeVisible()
  const path = campus.locator('[data-campus-prefix="EP-0190"]')
  await expect(path).toBeVisible()
  await expect
    .poll(
      async () => {
        const read = () =>
          campus.evaluate((el) => {
            const t = el.querySelector('[data-campus-hit="EP-0190"]'),
              p = el.querySelector('[data-campus-prefix="EP-0190"]')
            if (
              !t ||
              !p ||
              !t.getClientRects().length ||
              !p.getClientRects().length ||
              !p.getTotalLength()
            )
              return null
            return [
              el.clientWidth,
              el.clientHeight,
              t.getAttribute('transform'),
              p.getAttribute('d'),
            ].join('/')
          })
        const first = await read()
        await nextPaint()
        return first !== null && first === (await read())
      },
      { timeout: 5000 },
    )
    .toBe(true)
  const result = await campus.evaluate((el) => {
    const token = el.querySelector('[data-campus-hit="EP-0190"]')
    const path = el.querySelector('[data-campus-prefix="EP-0190"]')
    const pixel = new DOMPoint(0, 0).matrixTransform(token.getScreenCTM())
    const end = path.getPointAtLength(path.getTotalLength()).matrixTransform(path.getScreenCTM())
    return {
      markerTransform: token.getAttribute('transform'),
      pathEnd: [end.x, end.y],
      tokenCenter: [pixel.x, pixel.y],
      visible: !!token.getClientRects().length && !!path.getClientRects().length,

      error: Math.hypot(end.x - pixel.x, end.y - pixel.y),
      lon: Number(token.dataset.longitude),
      lat: Number(token.dataset.latitude),
    }
  })
  console.log('Flat traveler center and trail', result)
  assert.ok(result.error <= 4, 'Flat traveler and path are ' + result.error + ' CSS pixels apart')
  await hit.press('Enter')
  await expect(subject(page)).toHaveAttribute('data-phase', 'transit')
  await slider(page).fill('9362')
  await expect(hit).toHaveCount(0)
  await back(page).click()
}

async function movementAndScenarioEdges(page) {
  const cursor = slider(page)
  const replay = page.getByRole('region', { name: 'Simulation playback' })
  const chooseSpeed = replay.getByRole('combobox', { name: 'Playback speed' })
  const play = replay.getByRole('button', { name: 'Play replay', exact: true })
  const pause = replay.getByRole('button', { name: 'Pause replay', exact: true })
  await cursor.fill('9320')
  const token = page.locator('[data-token="EP-0190"]')
  await chooseSpeed.selectOption('1')
  await play.click()
  await token.press('Enter')
  await expect(pause).toBeVisible()
  const panel = subject(page)
  const progress = panel.getByRole('progressbar', { name: 'Modeled travel progress' })
  const read = () => progress.evaluate((m) => m.value)
  const before = await read()
  await page.waitForTimeout(1100)
  const after = await read()
  assert.ok(
    after > before && after - before < 0.2,
    'Expected 1× motion within a single model minute',
  )
  await expect(cursor).toHaveValue('9320')
  await chooseSpeed.selectOption('360')
  await panel.getByRole('button', { name: 'Follow transfer', exact: true }).click()
  await expect(page.locator('[data-view="transfer"]')).toBeVisible()
  await expect.poll(read).toBeGreaterThan(after)
  await pause.click()
  const held = await read()
  await page.waitForTimeout(200)
  assert.equal(await read(), held)
  // Headless Chromium keeps same-context tabs visible. Exercise the browser
  // visibility adapter with explicit visibilitychange events and real elapsed time.
  const visibility = (hidden) =>
    page.evaluate((hidden) => {
      Object.defineProperty(document, 'hidden', { value: hidden, configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
    }, hidden)
  await replay.getByRole('button', { name: 'Play replay' }).click()
  await visibility(true)
  const beforeFreeze = Number(await cursor.inputValue())
  await page.waitForTimeout(1500)
  await expect(cursor).toHaveValue(String(beforeFreeze))
  await visibility(false)
  const resumed = Number(await cursor.inputValue())
  assert.ok(resumed - beforeFreeze < 3, 'Replay jumped across the hidden interval')
  await expect.poll(async () => Number(await cursor.inputValue())).toBeGreaterThan(resumed)
  await replay.getByRole('button', { name: 'Pause replay' }).click()
  await page.evaluate(() => {
    delete document.hidden
  })
  const stage = page.locator('.geo-stage')
  const region = await stage.boundingBox()
  const x = region.x + region.width * 0.61,
    y = region.y + region.height * 0.57
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + 58, y - 15, { steps: 6 })
  await page.mouse.up()
  await expect(panel.getByRole('button', { name: 'Follow transfer', exact: true })).toBeVisible()
  await expect(panel).toHaveAttribute('data-episode-id', 'EP-0190')
  await panel.getByRole('button', { name: 'Follow transfer', exact: true }).click()
  await panel.getByRole('button', { name: 'Stop following', exact: true }).click()
  await expect(panel.getByRole('button', { name: 'Follow transfer', exact: true })).toBeVisible()
  await back(page).click()
  await cursor.fill('9133')
  await expect(page.getByText('No transfers in transit', { exact: true })).toBeVisible()
  await expect(page.locator('[data-token]')).toHaveCount(0)
  await cursor.fill('10080')
  await expect(page.getByRole('button', { name: 'Replay from Day 1' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Replay featured transfer/ })).toBeVisible()
  await cursor.fill('9320')
  const scenario = page.getByRole('combobox', { name: 'Scenario', exact: true })
  for (const id of ['surge', 'capacity-add', 'capacity-loss']) {
    await scenario.selectOption(id)
    await expect(cursor).toHaveValue('9320')
    await expect(panel).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: /Watch featured transfer.*Baseline/i }),
    ).toBeVisible()
  }
  await page.getByRole('button', { name: /Watch featured transfer.*Baseline/i }).click()
  await expect(scenario).toHaveValue('baseline')
  await expect(subject(page)).toHaveAttribute('data-episode-id', 'EP-0190')
  await pause.click()
}

async function inspectAppearance(page, dir, stage, sizeName, renderer) {
  const shot = (name) =>
    page.screenshot({
      path: path.join(dir, stage + '-' + sizeName + '-' + name + '.png'),
      animations: 'disabled',
    })
  const theme = page.getByRole('button', { name: 'Dark theme', exact: true })
  if (sizeName === 'desktop' && renderer === 'maplibre') {
    await theme.click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await shot('network-dark')
    await theme.click()
  }
  if (renderer === 'svg') {
    await openFromDirectory(page, 'nyc_bellevue')
    await campusReady(page, 'nyc_bellevue', 'svg')
    await shot('flat-bellevue')
    return
  }
  for (const id of ['nyc_bellevue', 'nyc_queens']) {
    if (id === 'nyc_bellevue')
      await page.getByRole('button', { name: 'Select Bellevue Hospital', exact: true }).click()
    else await openFromDirectory(page, id)
    await campusReady(page, id, renderer)
    await page.waitForTimeout(550)
    await shot(id.slice(4) + '-light')
    if (sizeName === 'desktop') {
      await theme.click()
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
      await page.waitForTimeout(300)
      await shot(id.slice(4) + '-dark')
      await theme.click()
    }
    await back(page).click()
  }
  if (stage !== 'pilot') {
    await page
      .getByRole('button', { name: /Watch featured transfer/i })
      .first()
      .click()
    await page.getByRole('button', { name: 'Pause replay', exact: true }).click()
    await slider(page).fill('9320')
    await expect(page.locator('[data-view="transfer"]')).toBeVisible()
    await expect(subject(page)).toHaveAttribute('data-phase', 'transit')
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(650)
    if (sizeName === 'mobile') {
      const label = page
        .locator('.geo-stage text')
        .filter({ hasText: /^Queens Hospital$/ })
        .last()
      const [name, controls] = await Promise.all([
        label.boundingBox(),
        page.locator('.geo-nav').boundingBox(),
      ])
      assert.ok(
        name &&
          controls &&
          (name.x + name.width <= controls.x ||
            name.y + name.height <= controls.y ||
            name.y >= controls.y + controls.height),
        'Destination label overlaps phone navigation: ' + JSON.stringify({ name, controls }),
      )
      console.log('Phone follow label and navigation bounds', { name, controls })
    }
    await shot('transfer-follow')
    await slider(page).fill('9362')
    await campusReady(page, 'nyc_queens', 'maplibre')
    await expect(subject(page)).toHaveAttribute('data-phase', 'handoff')
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForTimeout(260)
    await shot('queens-handoff')
  }
}

async function checkpoint(url, stage, out, size) {
  await mkdir(out, { recursive: true })
  const renderer = new URL(url).searchParams.get('map') === 'svg' ? 'svg' : 'maplibre'
  const browser = await launch()
  try {
    for (const key of size ? [size] : renderer === 'svg' ? ['desktop'] : ['desktop', 'mobile']) {
      const { context, page, errors, external } = await localPage(browser, url, sizes[key])
      await ready(page, url)
      await expect(page.locator('.geo-map')).toHaveAttribute('data-renderer', renderer, {
        timeout: 30000,
      })
      await inspectAppearance(page, out, stage, key, renderer)
      assert.deepEqual(errors, [])
      assert.deepEqual(external, [])
      await context.close()
    }
  } finally {
    await browser.close()
  }
}

async function functional(url, flat = false) {
  const browser = await launch(flat)
  try {
    const { context, page, errors, external } = await localPage(
      browser,
      url,
      flat ? sizes.mobile : sizes.desktop,
      flat ? 'reduce' : 'no-preference',
    )
    await ready(page, url)
    const renderer = flat ? 'svg' : 'maplibre'
    await expect(page.locator('.geo-map')).toHaveAttribute('data-renderer', renderer, {
      timeout: 30000,
    })
    if (!flat) {
      await page.keyboard.press('Tab')
      await expect(page.locator('.skip')).toBeFocused()
      assert.ok(
        await page.locator('.skip').evaluate((el) => getComputedStyle(el).outlineStyle !== 'none'),
      )
      const first = Number(await slider(page).inputValue())
      await expect.poll(async () => Number(await slider(page).inputValue())).toBeGreaterThan(first)
      await page.getByRole('button', { name: 'Pause replay' }).click()
      await desktopCampusMotion(page)
    } else {
      await expect(page.getByRole('button', { name: 'Play replay' })).toBeVisible()
      await expect(slider(page)).toHaveValue('9320')
      await page.getByRole('button', { name: 'Select Bellevue Hospital', exact: true }).tap()
      await campusReady(page, 'nyc_bellevue', renderer)
      await page.getByRole('button', { name: 'Show subject details' }).tap()
      await page.getByRole('button', { name: 'Follow transfer EP-0190' }).tap()
      await expect(page.locator('[data-view="transfer"]')).toBeVisible()
      await expect(subject(page)).toHaveAttribute('data-phase', 'transit')
      const playOnPhone = page.getByRole('button', { name: 'Play replay', exact: true })
      await playOnPhone.tap()
      await page.getByRole('button', { name: 'Pause replay', exact: true }).tap()
      await page.getByRole('button', { name: 'Hide subject details' }).tap()
      await expect(page.getByRole('button', { name: 'Play replay' })).toBeVisible()
      await back(page).tap()
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      await openFromDirectory(page, 'nyc_harlem')
      const campus = await campusReady(page, 'nyc_harlem', renderer)
      await expect(campus).toHaveAttribute('data-orbit', 'paused')
      await back(page).click()
    }
    await fixtureWalk(page)
    if (flat) await verifyFlatTraveler(page)
    if (!flat) {
      await tiltedTravelerProjection(page)
      await movementAndScenarioEdges(page)
    }
    assert.deepEqual(errors, [])
    assert.deepEqual(external, [])
    await context.close()
  } finally {
    await browser.close()
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { values } = parseArgs({
    options: {
      url: { type: 'string', default: 'http://127.0.0.1:4173' },
      out: { type: 'string', default: 'docs/screenshots' },
      stage: { type: 'string' },
      size: { type: 'string' },
      flat: { type: 'boolean' },
    },
  })
  if (values.size) assert.ok(['desktop', 'mobile'].includes(values.size))
  if (values.stage) await checkpoint(values.url, values.stage, values.out, values.size)
  else await functional(values.url, values.flat)
}
