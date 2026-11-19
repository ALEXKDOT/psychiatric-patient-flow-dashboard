import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { expect } from '@playwright/test'
import { launch, localPage, ready, sizes } from './browser_capture.mjs'
import { campusReady, openFromDirectory } from './browser_journey.mjs'
import { getRun } from '../src/runs.ts'
import { campuses } from '../src/data.ts'

const url = process.env.DEMO_URL || 'http://127.0.0.1:4277/'
const output = 'docs/screenshots'
await mkdir(output, { recursive: true })
const browser = await launch()
try {
  for (const [layout, viewport, motion] of [
    ['desktop', sizes.desktop, 'no-preference'],
    ['phone', sizes.mobile, 'reduce'],
    ['flat', sizes.desktop, 'reduce'],
  ]) {
    const address = layout === 'flat' ? url + '?map=svg' : url
    const { page, context, external, errors } = await localPage(browser, address, viewport, motion)
    await ready(page, address)
    const run = getRun('baseline', 42)
    for (const id of layout === 'flat' ? campuses.map((c) => c.id) : ['nyc_mount_sinai']) {
      await openFromDirectory(page, id)
      const campus = await campusReady(page, id, layout === 'flat' ? 'svg' : 'maplibre')
      const ops = page.locator('.campus-operations')
      await expect(ops).toBeVisible()
      await expect(ops.getByText('Live vacancies unknown')).toBeVisible()
      await expect(ops.getByText('Adult psych beds free')).toBeVisible()
      await expect(page.locator('.campus-caption')).toHaveCount(0)
      await expect(page.getByText(/CAMPUS EXTERIOR|mapped height/i)).toHaveCount(0)
      const bounds = await campus.boundingBox(),
        strip = await ops.boundingBox()
      assert.ok(strip.y >= bounds.y + bounds.height - 1)
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      const slider = page.getByRole('slider', { name: 'Replay minute' })
      const pause = page.getByRole('button', { name: 'Pause replay', exact: true })
      if (await pause.isVisible()) await pause.click()
      for (const minute of [9320, 0, 9387, 9320]) {
        await slider.fill(String(minute))
        const pool = run.at(minute).pools[id]
        const values = ops.locator('dd')
        await expect(values.nth(0)).toHaveText(String(pool.adult?.free ?? '—'))
        await expect(values.nth(1)).toHaveText(String(pool.cap?.free ?? '—'))
        await expect(values.nth(2)).toHaveText(String(pool.queue))
      }
      if (id === 'nyc_nyp_allen' || layout === 'desktop') {
        await ops.getByRole('button', { name: /View published capacity/ }).click()
        const evidence = page.getByRole('region', {
          name: 'Published inpatient psychiatric capacity',
        })
        await expect(evidence.getByText('2026-07-01')).toBeVisible()
        await expect(
          evidence
            .locator('.ev-fact')
            .filter({ hasText: 'Live psychiatric vacancies' })
            .locator('dd'),
        ).toHaveText('Unknown')
        await expect(evidence).toContainText(
          id === 'nyc_nyp_allen' ? 'Campus allocation unverified' : '46',
        )
        await expect(evidence.getByRole('link', { name: 'OMH Table 5' })).toHaveAttribute(
          'href',
          /omh-monthly-report/,
        )
        await page.keyboard.press('Escape')
      }
      if (layout !== 'flat') {
        if (layout === 'desktop') {
          await expect(campus).toHaveAttribute('data-orbit', 'running')
          const gl = campus.locator('.campus-gl')
          const bearing = await gl.getAttribute('data-bearing')
          await expect(gl).not.toHaveAttribute('data-bearing', bearing, { timeout: 10000 })
          await campus.getByRole('button', { name: /Stop orbit/ }).click()
          await expect(campus).toHaveAttribute('data-orbit', 'paused')
        }
        await page.evaluate(() => scrollTo(0, 0))
        await page.waitForTimeout(900)
        await page.screenshot({ path: output + '/operations-' + layout + '-light.png' })
        if (layout === 'desktop') {
          await page.getByRole('button', { name: 'Dark theme' }).click()
          await campus.getByRole('button', { name: 'Zoom in', exact: true }).click()
          await expect(campus.locator('.campus-gl')).toHaveAttribute('data-native-theme', 'dark')
          await page.waitForTimeout(1400)
          await page.screenshot({ path: output + '/operations-desktop-dark.png' })
        }
      }
      await page.getByRole('button', { name: 'Back to previous view' }).first().click()
      await expect(ops).toHaveCount(0)
    }
    assert.deepEqual(errors, [])
    assert.deepEqual(external, [])
    console.log(layout + ' verified')
    await context.close()
  }
} finally {
  await browser.close()
}
