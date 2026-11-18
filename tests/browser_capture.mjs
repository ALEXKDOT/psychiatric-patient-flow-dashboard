// Use the same Chromium and local-origin network policy for screenshots and interactive tests.
import { chromium } from '@playwright/test'
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { parseArgs } from 'node:util'
import assert from 'node:assert/strict'

export const sizes = { desktop: { width: 1440, height: 900 }, mobile: { width: 390, height: 844 } }

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

export async function capture(url, out, prefix) {
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
      const widths = await page.evaluate(() => ({
        page: document.documentElement.scrollWidth,
        viewport: innerWidth,
      }))
      console.log(
        JSON.stringify({
          file: filename,
          size,
          renderer,
          browser: browser.version(),
          widths,
          errors,
          external,
        }),
      )
      assert.deepEqual(errors, [])
      assert.deepEqual(external, [])
      assert.ok(widths.page <= widths.viewport, JSON.stringify(widths))
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
    },
  })
  await capture(values.url, values.out, values.prefix)
}
