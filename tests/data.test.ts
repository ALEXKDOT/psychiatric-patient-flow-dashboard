import assert from 'node:assert/strict'
import test from 'node:test'
import { campuses, campusById, displayValue, filterCampuses, sourceById } from '../src/data'

test('the research snapshot keeps campuses, registry programs, profiles, and model roles separate', () => {
  assert.equal(campuses.length, 23)
  assert.equal(campuses.filter((c) => c.isOrigin).length, 18)
  const programs = campuses.flatMap((c) => c.programs)
  const services = campuses.flatMap((c) => c.services)
  assert.equal(programs.length, 35)
  assert.equal(services.length, 46)
  assert.equal(new Set(programs.map((p) => p.omh_program_key)).size, 35)
  for (const row of [...programs, ...services]) {
    assert.equal(row.published_capacity, 'UNKNOWN')
    for (const id of row.source_ids.split(';')) assert.ok(sourceById[id].url)
  }
  assert.equal(campusById.nyc_jacobi.raw.sponsor_code_as_published, '049099')
})

test('provider profile and program filters preserve differing source scopes', () => {
  const childInpatient = filterCampuses({ service: 'child_inpatient' })
  assert.ok(childInpatient.some((c) => c.id === 'nyc_bellevue'))
  assert.ok(!childInpatient.some((c) => c.id === 'nyc_metropolitan'))
  assert.ok(filterCampuses({ population: 'Children' }).some((c) => c.id === 'nyc_metropolitan'))
  assert.ok(
    filterCampuses({ service: 'child_adolescent_outpatient' }).some(
      (c) => c.id === 'nyc_metropolitan',
    ),
  )
  assert.ok(
    filterCampuses({ service: 'CPEP Crisis Intervention', query: 'cornell' }).some(
      (c) => c.id === 'nyc_nyp_weill_cornell',
    ),
  )
})

test('regional display preserves geography and unknown status from the source', () => {
  assert.equal(campusById.nyc_zucker_hillside.borough, 'Queens')
  const [whitePlains] = filterCampuses({ query: 'white plains', borough: 'Westchester' })
  assert.equal(whitePlains.id, 'ny_nyp_westchester_bh')
  assert.equal(whitePlains.raw.borough, 'NOT_APPLICABLE')
  assert.ok(
    whitePlains.services.some(
      (s) => s.operating_status_evidence === 'announced_opening_unconfirmed',
    ),
  )
  assert.equal(displayValue(campusById.nyc_zucker_hillside.raw.doh_facility_id), 'Unknown')
  assert.equal(displayValue(whitePlains.raw.borough), 'Not applicable')
})
