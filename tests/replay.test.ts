import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { createReplayClock, type ReplayDriver } from '../src/replay'
import { getRun } from '../src/runs'

function controlledClock(minute = 10, duration = 20) {
  let time = 0
  let nextHandle = 0
  const callbacks = new Map<number, () => void>()
  const driver: ReplayDriver = {
    now: () => time,
    request: (cb) => {
      callbacks.set(++nextHandle, cb)
      return nextHandle
    },
    cancel: (id) => {
      callbacks.delete(id)
    },
  }
  const clock = createReplayClock({ minute, duration, speed: 60, driver })
  function advance(ms: number) {
    time += ms
    const batch = Array.from(callbacks.values())
    callbacks.clear()
    for (const callback of batch) callback()
  }
  return { clock, advance, callbacks }
}

test('the display reads fractional ledger time while the React snapshot publishes changes only at minute boundaries', () => {
  const { clock, advance } = controlledClock()
  const updates: number[] = [],
    paints: number[] = []
  clock.subscribe(() => updates.push(clock.getSnapshot().minute))
  clock.subscribeFrame((minute) => paints.push(minute))
  clock.play()
  advance(250)
  advance(250)
  assert.equal(clock.readMinute(), 10.5)
  assert.equal(paints.at(-1), 10.5)
  assert.deepEqual(updates, [10])
  advance(600)
  assert.equal(clock.getSnapshot().minute, 11)
  assert.deepEqual(updates, [10, 11])
})

test('interruptions keep fractional progress across speed changes, pause, visibility, seeks, reset and horizon', () => {
  const { clock, advance, callbacks } = controlledClock()
  clock.play()
  advance(350)
  clock.setSpeed(360)
  advance(100)
  assert.ok(Math.abs(clock.readMinute() - 10.95) < 1e-9)
  clock.setVisible(false)
  const hiddenMinute = clock.readMinute()
  advance(10000)
  assert.equal(clock.readMinute(), hiddenMinute)
  assert.equal(callbacks.size, 0)
  clock.setVisible(true)
  advance(100)
  assert.ok(Math.abs(clock.readMinute() - 11.55) < 1e-9)
  clock.pause()
  const paused = clock.readMinute()
  advance(10000)
  assert.equal(clock.readMinute(), paused)
  clock.seek(0)
  assert.equal(clock.getSnapshot().minute, 0)
  clock.seek(19)
  clock.play()
  advance(600)
  assert.equal(clock.getSnapshot().minute, 20)
  assert.equal(clock.getSnapshot().playing, false)
  assert.equal(callbacks.size, 0)
  clock.play()
  assert.equal(clock.readMinute(), 0)
})

test('the baseline opening selection interpolates EP-0190 from ledger times and disappears at receiving arrival', () => {
  const run = getRun('baseline', 42)
  const { clock, advance } = controlledClock(run.openingMinute, run.duration)
  const opening = run.presentationAt(clock.readMinute()).transfers.find((e) => e.id === 'EP-0190')!
  assert.ok(opening)
  clock.setSpeed(1)
  clock.play()
  advance(600)
  const t = clock.readMinute()
  const movement = run.at(t).transfers.find((e) => e.id === opening.id)!
  assert.equal(
    (t - opening.startMinute) / (opening.endMinute - opening.startMinute),
    movement.progress
  )
  clock.seek(opening.endMinute)
  const arrived = run.at(clock.readMinute())
  assert.ok(!arrived.transfers.some((e) => e.id === opening.id))
  assert.equal(arrived.episodes.find((e) => e.id === opening.id)?.phase, 'handoff')
})

test('every featured fixture observation and adjacent boundary is reproduced by the canonical simulation', async () => {
  const { readFile } = await import('node:fs/promises')
  const fixture = JSON.parse(
    await readFile(new URL('./fixtures/bellevue-queens.json', import.meta.url), 'utf8')
  )
  const run = getRun('baseline', 42)
  assert.equal(run.openingMinute, fixture.openingMinute)
  assert.deepEqual(
    run.at(run.openingMinute).transfers.map((t) => t.id),
    fixture.openingTransferIds
  )
  const id = fixture.episode.id
  assert.deepEqual(
    run.at(run.duration).episodes.find((e) => e.id === id),
    fixture.episode
  )
  for (const expected of fixture.frames) {
    const f = run.at(expected.minute)
    const q = f.pools.nyc_queens
    const record = {
      minute: f.minute,
      phase: f.episodes.find((e) => e.id === id)?.phase ?? null,
      episodeQueued: f.queue.some((e) => e.id === id),
      activeTransfer: f.transfers.find((e) => e.id === id) ?? null,
      recentArrival: f.recentTransfers.some((e) => e.id === id),
      ownOpenReferrals: f.referrals.filter((r) => r.episodeId === id && r.status === 'pending')
        .length,
      destinationPool: {
        reserved: q.reserved,
        occupied: q.occupied,
        free: q.free,
        turnaround: q.turnaround,
        capacity: q.capacity,
      },
      network: f.metrics,
    }
    assert.deepEqual(record, expected)
  }
})

test('a single high-speed clock update can cross departure, arrival and admission without reviving an earlier transfer', () => {
  const run = getRun('baseline', 42)
  const { clock, advance } = controlledClock(9145, run.duration)
  clock.setSpeed(1440)
  clock.play()
  advance(11000)
  const f = run.at(clock.getSnapshot().minute)
  assert.equal(f.minute, 9409)
  assert.equal(f.episodes.find((e) => e.id === 'EP-0190')?.phase, 'inpatient')
  assert.equal(
    f.transfers.some((tr) => tr.id === 'EP-0190'),
    false
  )
  clock.seek(9133)
  assert.ok(!run.at(clock.getSnapshot().minute).transfers.some(t => t.id === 'EP-0190'))
})

test('preferring reduced motion pauses an existing replay and explicit play paints only whole-minute steps', () => {
  const { clock, advance } = controlledClock()
  const paints: number[] = []
  clock.subscribeFrame((t) => paints.push(t))
  clock.play()
  advance(250)
  clock.setReducedMotion(true)
  assert.equal(clock.getSnapshot().playing, false)
  clock.play()
  paints.length = 0
  advance(500)
  assert.deepEqual(paints, [])
  advance(500)
  assert.deepEqual(paints, [11])
  clock.setReducedMotion(false)
  clock.pause()
  advance(5000)
  assert.equal(clock.getSnapshot().playing, false)
})
