// Sample the browser scheduler while the specified map interaction is active.
export async function observeMapReady(page) {
  await page.addInitScript(() => {
    const observer = new MutationObserver(() => {
      if (document.querySelector('.geo-map[data-renderer="maplibre"]')) {
        performance.mark('maplibre-ready')
        observer.disconnect()
      }
    })
    observer.observe(document, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['data-renderer'],
    })
  })
}

export async function initialNavigation(page) {
  return page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0]
    const paint = performance.getEntriesByName('first-contentful-paint')[0]
    const resources = performance.getEntriesByType('resource')
    return {
      domContentLoadedMs: Math.round(nav.domContentLoadedEventEnd),
      loadMs: Math.round(nav.loadEventEnd),
      localMapReadyMs: Math.round(performance.getEntriesByName('maplibre-ready')[0].startTime),
      firstContentfulPaintMs: paint ? Math.round(paint.startTime) : null,
      encodedResourceBytes: resources.reduce(
        (total, entry) => total + entry.encodedBodySize,
        nav.encodedBodySize,
      ),
    }
  })
}

export async function sampleFrames(page, durationMs = 4000) {
  return page.evaluate(
    (duration) =>
      new Promise((resolve) => {
        const deltas = []
        const longTasks = []
        const observer = new PerformanceObserver((list) =>
          longTasks.push(...list.getEntries().map((e) => e.duration)),
        )
        observer.observe({ type: 'longtask' })
        requestAnimationFrame((start) => {
          let last = start
          function frame(time) {
            deltas.push(time - last)
            last = time
            if (time - start < duration) {
              requestAnimationFrame(frame)
            } else {
              observer.disconnect()
              const ordered = [...deltas].sort((a, b) => a - b)
              resolve({
                elapsedMs: Math.round(time - start),
                frames: deltas.length,
                averageFps: +((1000 * deltas.length) / (time - start)).toFixed(1),
                medianFrameIntervalMs: +ordered[Math.ceil(ordered.length * 0.5) - 1].toFixed(1),
                p95FrameIntervalMs: +ordered[Math.ceil(ordered.length * 0.95) - 1].toFixed(1),
                longestFrameIntervalMs: +ordered.at(-1).toFixed(1),
                mainThreadLongTasks: longTasks.length,
              })
            }
          }
          requestAnimationFrame(frame)
        })
      }),
    durationMs,
  )
}

async function measure(url) {
  const { launch, localPage, ready, sizes } = await import('./browser_capture.mjs')
  const { campusReady } = await import('./browser_journey.mjs')
  const { expect } = await import('@playwright/test')
  const assert = (await import('node:assert/strict')).default
  const browser = await launch()
  try {
    for (let trial = 1; trial <= 3; trial++) {
      const { context, page, external, errors } = await localPage(
        browser,
        url,
        sizes.desktop,
        'no-preference',
        { cache: true },
      )
      await observeMapReady(page)
      await ready(page, url)
      await expect(page.locator('.geo-map')).toHaveAttribute('data-renderer', 'maplibre', {
        timeout: 30000,
      })
      const environment = await page.evaluate(() => {
        const gl = document.querySelector('.geo-map canvas').getContext('webgl2')
        const info = gl.getExtension('WEBGL_debug_renderer_info')
        return {
          dpr: devicePixelRatio,
          viewport: [innerWidth, innerHeight],
          logicalProcessors: navigator.hardwareConcurrency,
          renderer: info
            ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL)
            : gl.getParameter(gl.RENDERER),
        }
      })
      const navigation = await initialNavigation(page)
      const network = await sampleFrames(page, 4000)
      await page.getByRole('button', { name: 'Pause replay' }).click()
      const tap = page.getByRole('button', { name: 'Select Bellevue Hospital', exact: true })
      const view = async () => {
        const since = performance.now()
        await tap.click()
        const scene = await campusReady(page, 'nyc_bellevue', 'maplibre')
        await expect(scene).toHaveAttribute('data-orbit', 'running', { timeout: 10000 })
        return Math.round(performance.now() - since)
      }
      const coldSelectionMs = await view()
      const firstCampus = await page.evaluate(() =>
        performance
          .getEntriesByType('resource')
          .filter((r) => r.name.includes('/campuses/'))
          .map((r) => ({
            path: new URL(r.name).pathname,
            encoded: r.encodedBodySize,
            transfer: r.transferSize,
          })),
      )
      await page.getByRole('button', { name: 'Back to previous view' }).first().click()
      const warmSelectionMs = await view()
      const orbit = await sampleFrames(page, 10000)
      await page.getByRole('button', { name: 'Back to previous view' }).first().click()
      await page.getByRole('button', { name: 'Seek to sample transfer' }).click()
      await page.locator('[data-token="EP-0190"]').click()
      await page.getByRole('button', { name: 'Follow transfer', exact: true }).click()
      await page.getByRole('button', { name: 'Play replay', exact: true }).click()
      const follow = await sampleFrames(page, 4000)
      await page.reload({ waitUntil: 'networkidle' })
      const warm = await page.evaluate(() => {
        const resources = performance.getEntriesByType('resource')
        return {
          cachedResources: resources.filter((r) => r.transferSize === 0 && r.encodedBodySize > 0)
            .length,
          total: resources.length,
          transferred: resources.reduce((a, r) => a + r.transferSize, 0),
        }
      })
      assert.deepEqual(external, [])
      assert.deepEqual(errors, [])
      console.log(
        JSON.stringify({
          trial,
          browser: browser.version(),
          environment,
          navigation,
          network,
          coldSelectionMs,
          firstCampus,
          warmSelectionMs,
          orbit,
          follow,
          warm,
        }),
      )
      await context.close()
    }
  } finally {
    await browser.close()
  }
}

if (
  process.argv[1] &&
  import.meta.url === (await import('node:url')).pathToFileURL(process.argv[1]).href
) {
  const { values } = (await import('node:util')).parseArgs({
    options: { url: { type: 'string', default: 'http://127.0.0.1:4173' } },
  })
  await measure(values.url)
}
