// A local, single-run measurement. Playback must already be running for sampleFrames().
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
