// Use the same Chromium and local-origin network policy for screenshots and interactive tests.
import { chromium } from '@playwright/test'
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'
import assert from 'node:assert/strict'

export const sizes = {
  desktop: { width: 1440, height: 900 },
  wide: { width: 1920, height: 1080 },
  mobile: { width: 390, height: 844 },
}

export function launch(noWebGL = false) {
  const binary =
    process.env.CHROMIUM_BIN || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined)
  const args = ['--disable-dev-shm-usage', '--enable-unsafe-swiftshader']
  if (noWebGL) args.push('--disable-webgl')
  return chromium.launch({ executablePath: binary, args })
}

export async function localPage(browser, url, viewport, reducedMotion = 'reduce') {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    locale: 'en-US',
    timezoneId: 'America/New_York',
    reducedMotion,
    serviceWorkers: 'block',
  })
  const external = []
  const errors = []
  await context.route('**/*', (route) => {
    const target = new URL(route.request().url())
    if (['https:', 'http:'].includes(target.protocol) && target.origin !== new URL(url).origin) {
      external.push(target.href)
      return route.abort()
    }
    return route.continue()
  })
  const page = await context.newPage()
  page.on('pageerror', (error) => errors.push(String(error)))
  return { context, page, external, errors }
}

export async function ready(page, url) {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
  await page
    .getByRole('heading', { level: 1, name: 'Patient flow observatory' })
    .waitFor({ timeout: 30000 })
  await page.locator('.geo-map').waitFor({ timeout: 30000 })
  await page.evaluate(() => document.fonts.ready)
}

export async function capture(url, out, prefix, comparison = false) {
  await mkdir(out, { recursive: true })
  const browser = await launch()
  try {
    for (const [name, size] of Object.entries(sizes)) {
      const { context, page, external, errors } = await localPage(browser, url, size)
      await ready(page, url)
      const supportsGL = await page.evaluate(() => {
        const gl = document.createElement('canvas').getContext('webgl2')
        gl?.getExtension('WEBGL_lose_context')?.loseContext()
        return Boolean(gl)
      })
      if (supportsGL && new URL(url).searchParams.get('map') !== 'svg') {
        await page.locator('.geo-map[data-renderer="maplibre"]').waitFor({ timeout: 30000 })
      }
      const renderer = await page.locator('.geo-map').getAttribute('data-renderer')
      const filename = path.join(out, `${prefix}-${name}.png`)
      await page.screenshot({ path: filename, animations: 'disabled' })
      const layout = await page.evaluate(() => {
        const map = document.querySelector('.geo-map').getBoundingClientRect()
        const visibleHeight = Math.max(0, Math.min(innerHeight, map.bottom) - Math.max(0, map.top))
        const visibleWidth = Math.max(0, Math.min(innerWidth, map.right) - Math.max(0, map.left))
        return {
          viewportWidth: innerWidth,
          pageWidth: document.documentElement.scrollWidth,
          mapTop: Math.round(map.top),
          mapWidth: Math.round(map.width),
          mapHeight: Math.round(map.height),
          mapViewportPercent: +(
            (100 * visibleHeight * visibleWidth) /
            (innerHeight * innerWidth)
          ).toFixed(1),
        }
      })
      console.log(
        JSON.stringify({
          file: filename,
          size,
          renderer,
          browser: browser.version(),
          layout,
          errors,
          external,
        }),
      )
      if (comparison && name === 'desktop') {
        await page.getByRole('button', { name: 'Scenario lab', exact: true }).click()
        await page
          .getByRole('dialog')
          .getByRole('heading', { name: 'Scenario comparison' })
          .waitFor()
        const filename = path.join(out, 'scenario-lab.png')
        await page.screenshot({ path: filename, animations: 'disabled' })
        console.log(JSON.stringify({ file: filename, size, browser: browser.version() }))
      }
      assert.deepEqual(errors, [])
      assert.deepEqual(external, [])
      assert.ok(layout.pageWidth <= layout.viewportWidth, JSON.stringify(layout))
      await context.close()
    }
  } finally {
    await browser.close()
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { values } = parseArgs({
    options: {
      url: { type: 'string', default: 'http://127.0.0.1:5173' },
      out: { type: 'string', default: 'docs/screenshots' },
      prefix: { type: 'string', default: 'observatory' },
      comparison: { type: 'boolean', default: false },
    },
  })
  await capture(values.url, values.out, values.prefix, values.comparison)
}
