// Verify the visible basemap at regional, city and neighborhood scale without outside tiles.
import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { expect } from '@playwright/test'
import { launch, localPage, ready, sizes } from './browser_capture.mjs'

const url = process.env.DEMO_URL || 'http://127.0.0.1:4277/'
const out = process.env.CAPTURE_DIR || 'docs/screenshots'
await mkdir(out, { recursive: true })
const browser = await launch()
try {
  for (const mode of ['maplibre', 'svg']) {
    const { page, context, errors, external } = await localPage(browser, url, sizes.desktop)
    await ready(page, mode === 'svg' ? url + '?map=svg' : url)
    const base = page.locator('.geo-map')
    await expect(base).toHaveAttribute('data-renderer', mode)
    const stage = base.locator('.geo-stage')
    async function verifyDetail(level) {
      const tiles = stage.locator('[data-detail-level="' + level + '"] image')
      await expect(tiles.first()).toBeAttached()
      const files = await tiles.evaluateAll((nodes) => nodes.map((n) => n.getAttribute('href')))
      await page.evaluate(async (files) => {
        await Promise.all(
          files.map(async (url) => {
            const image = new Image()
            image.src = url
            await image.decode()
            if (!image.naturalWidth) throw Error(url)
          }),
        )
      }, files)
      return files
    }
    {
      await verifyDetail('city')
      await base.getByRole('button', { name: 'Region', exact: true }).click()
      await verifyDetail('region')
      await base.getByRole('button', { name: 'City', exact: true }).click()
    }
    await stage.focus()
    for (let i = 0; i < 5; i++) await stage.press('+')
    for (let i = 0; i < 4; i++) await stage.press('ArrowRight')
    for (let i = 0; i < 4; i++) await stage.press('ArrowUp')
    await page.getByRole('heading', { level: 1 }).click()
    const close = await verifyDetail('street')
    const midtown = close.find((tile) => tile.includes('12-1206-1539-light'))
    assert.ok(midtown, 'the Midtown street tile must be in the viewport')
    // Sample the shipped image. An empty or flat replacement would still return HTTP 200.
    const painted = await page.evaluate(async (url) => {
      const image = new Image()
      image.src = url
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 256
      const ctx = canvas.getContext('2d')
      ctx.drawImage(image, 0, 0, 256, 256)
      const data = ctx.getImageData(0, 0, 256, 256).data
      let count = 0
      for (let i = 3; i < data.length; i += 4) if (data[i] > 110) count++
      return count
    }, midtown)
    assert.ok(
      painted > 12000 && painted < 64000,
      'tile contains both mapped features and open terrain',
    )
    await expect(stage.getByText('Central Park', { exact: true })).toBeVisible()
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: out + '/network-streets-' + mode + '.png' })
    await page.getByRole('button', { name: 'Dark theme', exact: true }).click()
    const dark = await verifyDetail('street')
    assert.notDeepEqual(dark, close)
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: out + '/network-dark-' + mode + '.png' })
    await base.getByRole('button', { name: 'City', exact: true }).click()
    await verifyDetail('city')
    await page.getByRole('button', { name: 'Dark theme', exact: true }).click()
    await verifyDetail('city')
    await page.waitForLoadState('networkidle')
    if (mode === 'maplibre') await page.screenshot({ path: out + '/network-city.png' })
    assert.deepEqual(errors, [])
    assert.deepEqual(external, [])
    console.log(
      mode,
      close.length,
      'decoded neighborhood tiles, regional and city extents verified',
    )
    await context.close()
  }
} finally {
  await browser.close()
}
