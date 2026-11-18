// Run against the production preview started in another terminal. See docs/VERIFICATION.md.
import { expect } from '@playwright/test'
import { launch, localPage, ready, sizes } from './browser_capture.mjs'
import { sampleFrames, initialNavigation, observeMapReady } from './browser_perf.mjs'
import { parseArgs } from 'node:util'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const { values } = parseArgs({
  options: {
    url: { type: 'string', default: 'http://127.0.0.1:4173' },
    operations: { type: 'boolean', default: false },
  },
})

async function verifyInstruments(page) {
  const open = page.getByRole('button', { name: 'Expand placement queue', exact: true })
  await open.click()
  let panel = page.getByRole('dialog')
  await expect(panel).toBeVisible()
  const counts = await panel.getByText(/\d+ ongoing episodes · \d+ open referrals/).innerText()
  const [episodes, referrals] = counts.match(/\d+/g).map(Number)
  const rows = panel.locator('.ins-queue-table tbody tr')
  assert.equal(await rows.count(), episodes)
  const openReferrals = (await rows.locator('td:nth-child(4)').allTextContents()).reduce(
    (n, value) => n + Number(value),
    0,
  )
  assert.equal(referrals, openReferrals)
  const episode = rows.first().getByRole('button', { name: /^Episode history for / })
  const episodeId = await episode.innerText()
  await episode.click()
  const history = panel.getByRole('region', { name: 'Episode history' })
  await expect(history.getByRole('heading', { name: episodeId })).toBeVisible()
  await expect(history.getByText('Physical location', { exact: true })).toBeVisible()
  await panel.getByRole('checkbox', { name: 'Selected origin campus only' }).check()
  assert.ok((await rows.count()) <= episodes)
  await page.keyboard.press('Escape')
  await expect(panel).toHaveCount(0)
  await expect(open).toBeFocused()
  await page.getByRole('button', { name: 'Expand queue volume' }).click()
  panel = page.getByRole('dialog')
  await panel.getByText('View sampled values').click()
  const samples = panel.locator('details tbody tr')
  expect(await samples.count()).toBeGreaterThan(0)
  assert.equal(Number(await samples.last().locator('td:nth-child(2)').innerText()), episodes)
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Expand event log' }).click()
  await page.getByRole('checkbox', { name: 'Selected event campus only' }).check()
  await page.keyboard.press('Escape')
  console.log(
    'Queue counts, referral reconciliation, network trend, event filters, keyboard dismissal and focus return passed.',
  )
}

async function verifyFiltersAndDirectory(page) {
  const metrics = page.getByRole('region', { name: 'Network-wide simulation metrics' })
  const networkText = await metrics.innerText()
  const inspector = page.getByRole('complementary', { name: 'Selected campus inspector' })
  await page.getByRole('button', { name: /^Filters/ }).click()
  let panel = page.getByRole('dialog')
  await panel.getByLabel('Borough or county').selectOption('Westchester')
  await panel.getByRole('button', { name: /Show 1 campus/ }).click()
  await expect(inspector.getByRole('heading', { name: /Westchester/ })).toBeVisible()
  assert.equal(await metrics.innerText(), networkText)
  await page.getByRole('button', { name: /^Filters/ }).click()
  panel = page.getByRole('dialog')
  await panel.getByRole('searchbox').fill('no-such-facility')
  await panel.getByRole('button', { name: /Show 0 campus/ }).click()
  await expect(inspector.getByText('No campuses match these filters.')).toBeVisible()
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click()
  await expect(inspector.getByRole('heading', { name: /Westchester/ })).toBeVisible()

  await page.getByRole('button', { name: 'Campuses', exact: true }).click()
  panel = page.getByRole('dialog')
  const search = panel.getByRole('searchbox')
  await expect(panel.getByText('23 of 23 campuses')).toBeVisible()
  await search.fill('elmhurst')
  await expect(panel.getByText('1 of 23 campuses')).toBeVisible()
  await panel.getByRole('button', { name: /Elmhurst/ }).click()
  await expect(inspector.getByRole('heading', { name: 'Elmhurst', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'View campus record' }).click()
  panel = page.getByRole('dialog')
  await expect(panel.getByText('Real bed availability')).toBeVisible()
  await expect(panel.getByText('Unknown', { exact: true }).first()).toBeVisible()
  await panel.getByText('Sources and dates', { exact: false }).click()
  assert.ok(await panel.getByRole('link', { name: /DATA-001/ }).count())
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Schematic transfer', exact: false }).click()
  const heading = page.getByRole('dialog').getByRole('heading', { name: 'Intercampus transfers' })
  await expect(heading).toBeVisible()
  await page.keyboard.press('Escape')
  console.log(
    'Filters, empty result recovery, network-wide metrics, directory search, record citations and transfer text alternative passed.',
  )
}

async function verifyMap(page) {
  const map = page.locator('.geo-map')
  const inspector = page.getByRole('complementary', { name: 'Selected campus inspector' })
  await map.getByRole('button', { name: 'Region', exact: true }).click()
  await expect(map.locator('.geo-node')).toHaveCount(23)
  const elmhurst = map.getByRole('button', { name: 'Select Elmhurst', exact: true })
  await elmhurst.focus()
  await page.keyboard.press('Enter')
  await expect(inspector.getByRole('heading', { name: 'Elmhurst', exact: true })).toBeVisible()
  await expect(elmhurst).toHaveAttribute('aria-pressed', 'true')
  const trip = map.getByRole('button', { name: /^In transit · / }).first()
  const episodeId = (await trip.getAttribute('aria-label')).split(' · ')[1]
  await trip.focus()
  await page.keyboard.press('Enter')
  const details = page.getByRole('dialog')
  await expect(details.getByText(episodeId, { exact: true })).toBeVisible()
  await expect(details.getByText(/Destination slot reserved/)).toBeVisible()
  await page.keyboard.press('Escape')
  const before = await elmhurst.getAttribute('transform')
  await map.getByRole('button', { name: 'Zoom in', exact: true }).click()
  await expect(elmhurst).not.toHaveAttribute('transform', before)
  const stage = map.getByRole('group')
  await stage.focus()
  const zoomed = await elmhurst.getAttribute('transform')
  await page.keyboard.press('ArrowRight')
  await expect(elmhurst).not.toHaveAttribute('transform', zoomed)
  await page.keyboard.press('Home')
  await expect(map.getByRole('button', { name: 'City', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )

  const layers = map.getByRole('button', { name: 'Layers', exact: true })
  await layers.click()
  const campuses = map.getByRole('switch', { name: 'Campuses', exact: true })
  await campuses.click()
  await expect(map.locator('.geo-node')).toHaveCount(0)
  await campuses.click()
  expect(await map.locator('.geo-node').count()).toBeGreaterThan(0)
  const movements = map.getByRole('switch', { name: 'In transit', exact: true })
  const trips = await map.locator('.geo-trip').count()
  await movements.click()
  await expect(map.locator('.geo-trip')).toHaveCount(0)
  await movements.click()
  await expect(map.locator('.geo-trip')).toHaveCount(trips)
  await page.keyboard.press('Escape')
  await expect(layers).toBeFocused()
  await page.getByRole('button', { name: 'Expand map', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Exit expanded map' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Expand map', exact: true })).toBeFocused()
}

async function verifyPlayback(page) {
  const shell = page.getByRole('region', { name: 'Simulation playback' })
  const slider = shell.getByRole('slider', { name: 'Replay minute' })
  const metrics = page.getByRole('region', { name: 'Network-wide simulation metrics' })
  const opening = await slider.inputValue()
  const initial = await metrics.innerText()
  const initialTransfers = await page.locator('.geo-trip').count()
  assert.ok(initialTransfers > 0)
  await shell.getByRole('button', { name: 'Reset to Day 1' }).click()
  await expect(slider).toHaveValue('0')
  const zero = await metrics.innerText()
  await slider.fill('3024')
  await expect(slider).toHaveValue('3024')
  await slider.focus()
  await page.keyboard.press('ArrowLeft')
  await expect(slider).toHaveValue('3023')
  await shell.getByRole('button', { name: 'Reset to Day 1' }).click()
  assert.equal(await metrics.innerText(), zero)
  await shell.getByRole('button', { name: 'Seek to sample transfer' }).click()
  await expect(slider).toHaveValue(opening)
  assert.equal(await metrics.innerText(), initial)
  assert.equal(await page.locator('.geo-trip').count(), initialTransfers)

  await shell.getByLabel('Playback speed').selectOption('1440')
  await shell.getByRole('button', { name: 'Play replay' }).click()
  const frames = await sampleFrames(page, 4000)
  await shell.getByRole('button', { name: 'Pause replay' }).click()
  const paused = await slider.inputValue()
  assert.ok(Number(paused) > Number(opening))
  // Let the former playback interval elapse twice to catch an unpaused clock.
  await page.waitForTimeout(400)
  await expect(slider).toHaveValue(paused)
  console.log('Four-second playback sample', { viewport: page.viewportSize(), ...frames })
  const scenarios = page.getByRole('combobox', { name: 'Scenario', exact: true })
  await scenarios.selectOption('capacity-add')
  await expect(metrics).toContainText('/ 560 slots')
  await expect(slider).toHaveValue(paused)
  await scenarios.selectOption('baseline')
  await shell.getByRole('button', { name: 'Seek to sample transfer' }).click()
  assert.equal(await metrics.innerText(), initial)
  console.log(
    'Replay sampled, paused, reset, stepped backward and sought forward. Baseline state restored after local +8-slot intervention.',
  )
}

async function verifyComparison(page) {
  await page.getByRole('button', { name: 'Scenario lab', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'Scenario comparison' })).toBeVisible()
  await dialog.getByLabel('Compare baseline with').selectOption('surge')
  await dialog.getByRole('button', { name: 'All arrivals' }).click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'Export JSON' }).click(),
  ])
  const output = JSON.parse(await readFile(await download.path(), 'utf8'))
  assert.equal(output.displayedCohort, 'all')
  assert.equal(output.reference, 'baseline')
  assert.equal(output.intervention, 'surge')
  assert.equal(output.designation, 'Public facility information · Simulated operations')
  assert.ok(output.sourceVersion && output.configVersion && Number.isInteger(output.seed))
  assert.equal(output.results.baseline.base.arrivals, output.results.surge.base.arrivals)
  assert.ok(output.results.surge.all.arrivals > output.results.surge.base.arrivals)
  for (const branch of Object.values(output.results)) {
    for (const row of Object.values(branch))
      assert.equal(row.arrivals, row.completed + row.unresolved)
  }
  await page.keyboard.press('Escape')
  console.log(
    'Scenario comparison exported matched and all-arrival cohorts, unresolved counts, seed and provenance.',
  )
}

async function verifyFallback() {
  const browser = await launch(true)
  try {
    const { context, page, external, errors } = await localPage(browser, values.url, sizes.mobile)
    await ready(page, values.url)
    await expect(page.locator('.geo-map')).toHaveAttribute('data-renderer', 'svg')
    assert.equal(
      await page.evaluate(() => !!document.createElement('canvas').getContext('webgl2')),
      false,
    )
    await context.setOffline(true)
    await verifyMap(page)
    await verifyPlayback(page)
    assert.equal(
      await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches),
      true,
    )
    await context.setOffline(false)
    await verifyFiltersAndDirectory(page)
    if (!values.operations) await verifyComparison(page)
    const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    assert.ok(pageWidth <= sizes.mobile.width)
    assert.deepEqual(external, [])
    assert.deepEqual(errors, [])
    await context.close()
    console.log(
      '390×844 SVG fallback passed region, keyboard selection, zoom, pan, layers and expanded map with WebGL disabled.',
    )
  } finally {
    await browser.close()
  }
}

async function main() {
  const browser = await launch()
  try {
    const { context, page, external, errors } = await localPage(
      browser,
      values.url,
      sizes.desktop,
      'no-preference',
    )
    await observeMapReady(page)
    await ready(page, values.url)
    await expect(page.locator('.geo-map')).toHaveAttribute('data-renderer', 'maplibre', {
      timeout: 30000,
    })
    console.log('Navigation and map readiness', await initialNavigation(page))
    await verifyMap(page)
    await verifyInstruments(page)
    await verifyFiltersAndDirectory(page)
    await verifyPlayback(page)
    if (!values.operations) await verifyComparison(page)
    console.log('Browser', browser.version())
    assert.deepEqual(errors, [])
    assert.deepEqual(external, [])
    await context.close()
  } finally {
    await browser.close()
  }
}

await main()
await verifyFallback()
