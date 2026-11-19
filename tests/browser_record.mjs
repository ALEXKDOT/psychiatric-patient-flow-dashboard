// Record the browser compositor's real frame timestamps. Requires ffmpeg on PATH.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { parseArgs } from 'node:util'
import { expect } from '@playwright/test'
import { launch, localPage, ready, sizes } from './browser_capture.mjs'

const { values } = parseArgs({
  options: {
    url: { type: 'string', default: 'http://127.0.0.1:4173' },
    out: { type: 'string', default: 'docs/screenshots/bellevue-queens-walkthrough.webm' },
  },
})

const browser = await launch()
const folder = await mkdtemp(path.join(tmpdir(), 'atlas-screencast-'))
try {
  const { page, context, errors, external } = await localPage(
    browser,
    values.url,
    sizes.desktop,
    'no-preference',
  )
  await ready(page, values.url)
  await expect(page.locator('.geo-map')).toHaveAttribute('data-renderer', 'maplibre', {
    timeout: 30000,
  })
  const pin = page.getByRole('button', { name: 'Select Bellevue Hospital', exact: true })
  await pin.focus()
  const cdp = await context.newCDPSession(page)
  const frames = []
  const writes = []
  const frame = ({ data, metadata, sessionId }) => {
    const name = String(frames.length).padStart(5, '0') + '.jpg'
    frames.push({ name, timestamp: metadata.timestamp })
    writes.push(writeFile(path.join(folder, name), Buffer.from(data, 'base64')))
    void cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
  }
  cdp.on('Page.screencastFrame', frame)
  await cdp.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 86,
    maxWidth: 1440,
    maxHeight: 900,
    everyNthFrame: 1,
  })
  const started = performance.now()
  await page.waitForTimeout(450)
  await pin.press('Enter')
  await page.locator('.campus-scene').waitFor({ state: 'visible' })
  await page
    .getByRole('button', { name: /Watch featured transfer/i })
    .first()
    .click()
  const inspector = page.getByRole('complementary', { name: 'Selected transfer inspector' })
  for (const phase of ['preparation', 'transit', 'handoff', 'inpatient']) {
    await expect(inspector).toHaveAttribute('data-phase', phase, { timeout: 30000 })
    console.log(phase, ((performance.now() - started) / 1000).toFixed(2) + 's')
  }
  await page.waitForTimeout(650)
  await page.getByRole('button', { name: 'Back to previous view' }).first().click()
  await page.waitForTimeout(700)
  await cdp.send('Page.stopScreencast')
  cdp.off('Page.screencastFrame', frame)
  await Promise.all(writes)
  await cdp.detach()
  const timeline = []
  for (let index = 0; index < frames.length; index++) {
    const current = frames[index]
    const next = frames[index + 1]
    if (next && next.timestamp <= current.timestamp) continue
    timeline.push("file '" + current.name + "'")
    if (next) timeline.push('duration ' + (next.timestamp - current.timestamp).toFixed(6))
  }
  assert.ok(timeline.length > 30, 'Expected a running compositor stream')
  await writeFile(path.join(folder, 'frames.txt'), timeline.join('\n'))
  await mkdir(path.dirname(values.out), { recursive: true })
  // FFmpeg reads the actual presentation intervals, including any dropped or
  // repeated screen frames. No fake browser clock or accelerated video is used.
  execFileSync('ffmpeg', [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    path.join(folder, 'frames.txt'),
    '-fps_mode',
    'vfr',
    '-c:v',
    'libvpx-vp9',
    '-b:v',
    '0',
    '-crf',
    '33',
    '-deadline',
    'realtime',
    '-cpu-used',
    '6',
    '-threads',
    '3',
    '-row-mt',
    '1',
    '-pix_fmt',
    'yuv420p',
    values.out,
  ])
  const report = JSON.parse(
    execFileSync(
      'ffprobe',
      [
        '-v',
        'quiet',
        '-show_entries',
        'stream=width,height,codec_name:format=duration,size',
        '-of',
        'json',
        values.out,
      ],
      { encoding: 'utf8' },
    ),
  )
  console.log(
    JSON.stringify({ file: values.out, capturedFrames: frames.length, ...report }, null, 2),
  )
  assert.deepEqual(external, [])
  assert.deepEqual(errors, [])
} finally {
  await browser.close()
  await rm(folder, { recursive: true, force: true })
}
