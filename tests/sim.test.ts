import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { buildRun, DURATION } from '../src/sim'

const campuses = Array.from({ length: 23 }, (_, i) => ({ id: 'campus-' + i, origin: i < 18, adult: 24, cap: 0 }))
const run = () => buildRun(campuses, 'baseline', 42, campuses[0].id)

test('the same seed reproduces the state and event history through forward and backward seeks', () => {
  const a = run()
  const b = run()
  const opening = a.at(a.openingMinute)
  assert.ok(opening.transfers.length > 0)
  assert.ok(opening.queue.length > 0)
  assert.deepEqual(a.at(DURATION), b.at(DURATION))
  assert.deepEqual(a.at(0), b.at(0))
  assert.deepEqual(a.at(a.openingMinute), opening)
})

test('each reservation corresponds to one person, including travel and handoff', () => {
  const a = run()
  for (let t = 0; t <= DURATION; t += 17) {
    const f = a.at(t)
    assert.equal(f.queue.length, f.metrics.queue)
    const active = f.episodes.filter((e) =>
      ['preparation', 'transit', 'internal', 'handoff'].includes(e.phase),
    )
    assert.equal(active.length, f.metrics.reserved)
    assert.equal(f.episodes.filter((e) => e.phase === 'inpatient').length, f.metrics.occupied)
    assert.equal(new Set(f.episodes.map((e) => e.id)).size, f.episodes.length)
    assert.equal(f.transfers.length, f.metrics.inTransit)
    for (const tr of f.transfers) {
      assert.notEqual(tr.from, tr.to)
      assert.ok(tr.progress >= 0 && tr.progress < 1)
    }
    for (const p of Object.values(f.pools)) {
      assert.equal(p.capacity, p.free + p.occupied + p.turnaround + p.reserved)
      assert.ok(Math.min(p.free, p.occupied, p.turnaround, p.reserved) >= 0)
      assert.equal(p.reserved, active.filter((e) => e.destination === p.id).length)
    }
    const pending = f.referrals.filter((r) => r.status === 'pending')
    assert.equal(f.metrics.openReferrals, pending.length)
    for (const r of pending)
      assert.ok(f.queue.some((e) => e.id === r.episodeId && e.phase === 'search'))
  }
})

test('surge adds a distinct stream and all scenarios preserve matched base arrivals and initial occupants', () => {
  const baseline = run()
  const baselineEpisodes = baseline.at(DURATION).episodes
  for (const scenario of ['surge', 'capacity-add', 'capacity-loss'] as const) {
    const branch = buildRun(campuses, scenario, 42, campuses[0].id)
    const baseIDs = (episodes: typeof baselineEpisodes) =>
      episodes
        .filter((e) => e.stream === 'base')
        .map((e) => [e.id, e.disposition, e.ready, e.origin])
    assert.deepEqual(baseIDs(branch.at(DURATION).episodes), baseIDs(baselineEpisodes))
    const first = branch.at(0)
    assert.equal(first.metrics.occupied, baseline.at(0).metrics.occupied)
    const final = branch.at(DURATION)
    const comp = branch.compare()
    assert.equal(comp.arrivals, comp.completed + comp.unresolved)
    assert.equal(comp.arrivals, baseline.compare().arrivals)
    if (scenario === 'surge') assert.ok(branch.compare(DURATION, 'all').arrivals > comp.arrivals)
    if (scenario === 'capacity-add') assert.equal(final.metrics.capacity, 560)
    if (scenario === 'capacity-loss') {
      const pool = first.pools[campuses[0].id]
      assert.equal(pool.capacity - pool.target, pool.pendingClosure)
      assert.equal(pool.target, 16)
      assert.ok(final.pools[pool.id].pendingClosure <= pool.pendingClosure)
    }
  }
})

test('external departure starts exactly one journey; arrival ends travel but keeps the slot held until unit admission', () => {
  const a = run()
  const trip = a
    .at(DURATION)
    .episodes.find(
      (e) => e.stream === 'base' && e.destination !== e.origin && e.admission !== null,
    )!
  const find = (t: number) => a.at(t).episodes.find((e) => e.id === trip.id)!
  assert.equal(find(trip.commit!).phase, 'preparation')
  assert.ok(a.at(trip.commit!).queue.some((e) => e.id === trip.id))
  assert.equal(
    a.at(trip.departure! - 1).transfers.some((e) => e.id === trip.id),
    false,
  )
  assert.equal(find(trip.departure!).phase, 'transit')
  assert.equal(
    a.at(trip.departure!).queue.some((e) => e.id === trip.id),
    false,
  )
  assert.equal(a.at(trip.departure!).transfers.filter((e) => e.id === trip.id).length, 1)
  assert.equal(
    a.at(trip.arrival!).transfers.some((e) => e.id === trip.id),
    false,
  )
  assert.equal(find(trip.arrival!).phase, 'handoff')
  assert.equal(find(trip.admission!).phase, 'inpatient')
  for (const t of [trip.commit!, trip.departure!, trip.arrival!, trip.admission!]) {
    const f = a.at(t)
    const epReservations = f.episodes.filter(
      (e) => e.destination === trip.destination && e.commit !== null && e.admission === null,
    )
    assert.equal(f.pools[trip.destination!].reserved, epReservations.length)
  }
  const internal = a
    .at(DURATION)
    .episodes.find(
      (e) => e.stream === 'base' && e.destination === e.origin && e.admission !== null,
    )!
  assert.equal(internal.commit, internal.departure)
  assert.equal(internal.arrival, internal.admission)
  const moving = a.at(internal.departure!)
  assert.equal(moving.episodes.find((e) => e.id === internal.id)!.phase, 'internal')
  assert.equal(
    moving.transfers.some((e) => e.id === internal.id),
    false,
  )
})

test('three unresolved referrals are one ED placement episode and a single response cancels rivals', () => {
  const a = run()
  const close = a.at(DURATION)
  const ep = close.episodes.find((e) => {
    if (e.stream !== 'base' || e.commit === null) return false
    const req = close.referrals.filter((r) => r.episodeId === e.id)
    return req.length === 3 && req.filter((r) => r.status === 'cancelled').length === 2
  })!
  const opened = a.at(ep.ready!)
  assert.equal(
    opened.referrals.filter((r) => r.episodeId === ep.id && r.status === 'pending').length,
    3,
  )
  assert.equal(opened.queue.filter((e) => e.id === ep.id).length, 1)
  const committed = a.at(ep.commit!).referrals.filter((r) => r.episodeId === ep.id)
  assert.deepEqual(committed.map((r) => r.status).sort(), ['accepted', 'cancelled', 'cancelled'])
  assert.equal(new Set(committed.map((r) => r.resolved)).size, 1)
  assert.equal(
    close.referrals.filter((r) => r.episodeId === ep.id && r.status === 'accepted').length,
    1,
  )
  assert.equal(opened.episodes.find((e) => e.id === ep.id)!.destination, null)
})

test('draining a saturated pool retires only free or turned-around slots and preserves its original people', () => {
  const base = run().at(0)
  const focus = Object.values(base.pools).sort((a, b) => b.occupied - a.occupied)[0]
  const loss = buildRun(campuses, 'capacity-loss', 42, focus.id)
  const first = loss.at(0)
  assert.ok(first.pools[focus.id].pendingClosure > 0)
  assert.deepEqual(first.episodes, base.episodes)
  const last = loss.at(DURATION)
  const reductions = first.pools[focus.id].capacity - last.pools[focus.id].capacity
  assert.ok(reductions > 0)
  let retired = 0,
    previous = first.pools[focus.id]
  for (let t = 60; t <= DURATION; t += 60) {
    const f = loss.at(t),
      pool = f.pools[focus.id]
    retired += f.events.filter(
      (e) => e.time > t - 60 && e.type === 'retire' && e.campusId === focus.id,
    ).length
    assert.ok(pool.pendingClosure <= previous.pendingClosure)
    assert.equal(pool.capacity - pool.target, pool.pendingClosure)
    assert.equal(pool.capacity, pool.occupied + pool.reserved + pool.free + pool.turnaround)
    assert.equal(pool.capacity, first.pools[focus.id].capacity - retired)
    if (pool.pendingClosure) assert.equal(pool.free, 0)
    previous = pool
  }
  assert.equal(retired, reductions)
})

test('comparison exposes unresolved wait time and excludes warm-up entrants', () => {
  const a = run()
  for (const t of [0, 1080, 4250, DURATION]) {
    const cohort = a.at(t).episodes.filter((e) => e.stream === 'base')
    const summary = a.compare(t)
    const elapsed = cohort.reduce((sum, e) => sum + (e.departure ?? t) - e.disposition, 0)
    assert.equal(summary.queueHours, elapsed / 60)
    assert.equal(summary.unresolved, cohort.filter((e) => e.departure === null).length)
    assert.equal(summary.arrivals, cohort.length)
    assert.equal(summary.placed, cohort.filter((e) => e.commit !== null).length)
    if (cohort.length === 0) assert.equal(summary.medianWait, null)
  }
})

test('carry-in episodes keep the referral that established their reservation or admission', () => {
  const start = run().at(0)
  const committed = start.episodes.filter((e) => e.stream === 'warmup' && e.commit !== null)
  assert.ok(committed.length > 0)
  const winners = start.referrals.filter((r) => r.status === 'accepted')
  for (const episode of committed) {
    const matches = winners.filter(
      (r) => r.episodeId === episode.id && r.to === episode.destination,
    )
    assert.equal(matches.length, 1, episode.id)
    assert.equal(matches[0].resolved, episode.commit)
  }
})
