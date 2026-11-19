import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createServer, type ViteDevServer } from 'vite'
import { getRun } from '../src/runs'
import { createReplayClock } from '../src/replay'
import fixture from './fixtures/bellevue-queens.json'

let server: ViteDevServer
let render: (minute: number) => string
before(async () => {
  // Render the actual dock with its CSS/TSX transformed the same way as the app.
  server = await createServer({
    configFile: false,
    server: { middlewareMode: true, watch: null, hmr: false },
    esbuild: { jsx: 'automatic' },
    optimizeDeps: { noDiscovery: true },
  })
  const { TransferInspector } = (await server.ssrLoadModule(
    '/src/TransferInspector.tsx',
  )) as typeof import('../src/TransferInspector')
  const { ReplayContext } = (await server.ssrLoadModule(
    '/src/ReplayContext.tsx',
  )) as typeof import('../src/ReplayContext')
  const run = getRun('baseline', fixture.seed)
  const clock = createReplayClock({ minute: 0, duration: run.duration, speed: 360 })
  const noop = () => {}
  render = (minute) =>
    renderToStaticMarkup(
      createElement(
        ReplayContext.Provider,
        { value: clock },
        createElement(TransferInspector, {
          frame: run.presentationAt(minute),
          episodeId: fixture.episode.id,
          following: false,
          onExit: noop,
          onFollow: noop,
          onInspectDestination: noop,
        }),
      ),
    )
})
after(async () => {
  await server?.close()
})

test('transfer inspector masks uncommitted destination and renders episode and pool observations at each fixture boundary', () => {
  for (const frame of fixture.frames) {
    const html = render(frame.minute)
    assert.ok(
      html.includes('data-phase="' + (frame.phase ?? 'unobserved') + '"'),
      'phase at ' + frame.minute,
    )
    assert.equal(
      html.includes('Modeled travel progress'),
      Boolean(frame.activeTransfer),
      'journey at ' + frame.minute,
    )
    if (frame.minute < fixture.episode.commit) {
      assert.ok(!html.includes('Inspect destination,'))
      assert.ok(!html.includes('trip-pool-reserved'))
      if (frame.phase) {
        assert.ok(html.includes('Destination unknown'))
        assert.ok(
          html.includes('data-testid="trip-open-referrals">' + frame.ownOpenReferrals + '</dd>'),
        )
      }
    } else {
      assert.ok(html.includes('Inspect destination, Queens Hospital'))
      for (const field of ['reserved', 'occupied', 'capacity'] as const) {
        assert.ok(
          html.includes(
            'data-testid="trip-pool-' + field + '">' + frame.destinationPool[field] + '</span>',
          ),
          'destination ' + field + ' at ' + frame.minute,
        )
      }
    }
    if (frame.phase === 'handoff') {
      assert.ok(html.includes('Receiving handoff'))
      assert.ok(html.includes('<dt>Episode slot</dt><dd>Reserved</dd>'))
    }
    if (frame.phase === 'inpatient')
      assert.ok(html.includes('<dt>Episode slot</dt><dd>Occupied</dd>'))
  }
})
