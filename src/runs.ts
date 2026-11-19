import { campusCapacity } from './capacity'
import { campuses } from './data'
import { buildRun, type Run, type Scenario } from './sim'
const cache = new Map<string, Run>()
const inputs = campuses.map((c) => ({
  id: c.id,
  origin: c.isOrigin,
  adult: campusCapacity[c.id].adult_beds,
  cap: campusCapacity[c.id].cap_beds,
}))
export function getRun(scenario: Scenario, seed: number): Run {
  const key = seed + '|' + scenario
  let run = cache.get(key)
  if (!run) {
    run = buildRun(inputs, scenario, seed, 'nyc_bellevue')
    cache.set(key, run)
  }
  return run
}
