import { test } from 'node:test'
import assert from 'node:assert/strict'
import { campuses } from '../src/data'
import { campusCapacity, indexPsychiatricBeds, publishedBedSubtotal } from '../src/capacity'
import { getRun } from '../src/runs'

test('all published ages, zeros and unresolved site allocations retain their meaning', () => {
  assert.deepEqual(Object.keys(campusCapacity).sort(), campuses.map((c) => c.id).sort())
  const rows = Object.values(campusCapacity)
  assert.equal(
    rows.reduce((sum, r) => sum + (r.adult_beds ?? 0), 0),
    1879,
  )
  assert.equal(
    rows.reduce((sum, r) => sum + r.cap_beds, 0),
    230,
  )
  assert.deepEqual(
    rows
      .filter((r) => r.adult_beds === null)
      .map((r) => r.campus_id)
      .sort(),
    ['nyc_nyp_allen', 'nyc_nyp_columbia'],
  )
  for (const r of rows) {
    assert.ok(r.source_urls.length && r.source_url.startsWith('https://'))
    if (r.adult_beds !== null) assert.equal(r.total_beds, r.adult_beds + r.cap_beds)
  }
})

test('census scope is inpatient psychiatry and campus subtotals count each allocation once', () => {
  const bellevue = campusCapacity.nyc_bellevue
  assert.equal(bellevue.adult_beds, 271)
  assert.equal(bellevue.cap_beds, 45)
  assert.equal(bellevue.total_beds, 316)
  assert.equal(bellevue.as_of, '2026-07-01')
  assert.deepEqual(publishedBedSubtotal('adult_beds'), { beds: 1879, campuses: 21 })
  assert.deepEqual(publishedBedSubtotal('cap_beds'), { beds: 230, campuses: 23 })
  assert.throws(() => indexPsychiatricBeds([{ ...bellevue, bed_scope: 'all_hospital_beds' }]))
  assert.throws(() => indexPsychiatricBeds([bellevue, bellevue]))
  assert.throws(() => indexPsychiatricBeds([{ ...bellevue, total_beds: 800 }]))
})

test('adult and CAP beds, reservations and ED boarders reconcile at each campus across seeks and interventions', () => {
  for (const scenario of ['baseline', 'surge', 'capacity-add', 'capacity-loss'] as const) {
    const r = getRun(scenario, 42)
    for (const t of [0, 9320, r.duration, 200, 9320]) {
      const f = r.at(t)
      let free = 0
      for (const p of Object.values(f.pools)) {
        assert.equal(
          p.queue,
          f.episodes.filter((e) => e.origin === p.id && e.departure === null).length,
        )
        for (const age of ['adult', 'cap'] as const) {
          const b = p[age],
            published = campusCapacity[p.id][age === 'adult' ? 'adult_beds' : 'cap_beds']
          const assigned = f.episodes.filter((e) => e.ageGroup === age && e.destination === p.id)
          if (published === null) {
            assert.equal(b, null)
            assert.equal(assigned.length, 0)
            continue
          }
          assert.ok(b)
          const delta =
            p.id === 'nyc_bellevue' && age === 'adult'
              ? scenario === 'capacity-add'
                ? 8
                : scenario === 'capacity-loss'
                  ? -8
                  : 0
              : 0
          assert.equal(b.target, published + delta)
          assert.equal(b.capacity, b.free + b.reserved + b.occupied + b.turnaround)
          assert.equal(b.occupied, assigned.filter((e) => e.phase === 'inpatient').length)
          assert.equal(b.reserved, assigned.filter((e) => e.admission === null).length)
          assert.ok(b.free >= 0)
          free += b.free
        }
        assert.equal(p.free, (p.adult?.free ?? 0) + (p.cap?.free ?? 0))
      }
      assert.equal(f.metrics.free, free)
      assert.ok(f.episodes.some((e) => e.ageGroup === 'cap' && e.admission !== null))
    }
  }
})
