import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { DATA_VERSION } from './data'
import { getRun } from './runs'
import { DURATION, MODEL_VERSION, type Scenario } from './sim'
import './comparison.css'

type Intervention = Exclude<Scenario, 'baseline'>
type Cohort = 'base' | 'all'

const scenarios: Record<Intervention, { label: string; description: string }> = {
  surge: {
    label: 'Demand +30%',
    description:
      'An independent arrival stream adds 30% to the baseline demand rate. Original arrivals keep their IDs and disposition times.',
  },
  'capacity-add': {
    label: 'Capacity +8',
    description:
      'Bellevue receives eight additional simulated pathway slots. Each campus starts with 24 slots in the baseline allocation.',
  },
  'capacity-loss': {
    label: 'Capacity −8',
    description:
      'Bellevue retires eight simulated pathway slots. Free slots close first, and remaining closures wait for turnaround.',
  },
}

function summaries(scenario: Scenario, seed: number) {
  const run = getRun(scenario, seed)
  return { base: run.compare(run.duration, 'base'), all: run.compare(run.duration, 'all') }
}

type Summary = ReturnType<typeof summaries>['base']
type Metric = {
  name: string
  value: (summary: Summary) => number | null
  unit: string
  digits?: number
}

const measures: Metric[] = [
  { name: 'Arrivals', value: (s) => s.arrivals, unit: 'episodes' },
  { name: 'Departed ED', value: (s) => s.completed, unit: 'episodes' },
  { name: 'Awaiting departure', value: (s) => s.unresolved, unit: 'episodes' },
  {
    name: 'Unresolved share',
    value: (s) => (s.arrivals ? (100 * s.unresolved) / s.arrivals : null),
    unit: '%',
    digits: 1,
  },
  { name: 'Median ED wait', value: (s) => s.medianWait, unit: 'min', digits: 1 },
  { name: 'P90 ED wait', value: (s) => s.p90Wait, unit: 'min', digits: 1 },
  { name: 'Total ED waiting burden', value: (s) => s.queueHours, unit: 'patient-hours', digits: 1 },
  { name: 'Placements committed', value: (s) => s.placed, unit: 'episodes' },
  { name: 'Median placement wait', value: (s) => s.medianPlacement, unit: 'min', digits: 1 },
  { name: 'P90 placement wait', value: (s) => s.p90Placement, unit: 'min', digits: 1 },
]

function format(value: number | null, digits = 0) {
  return value == null
    ? '—'
    : value.toLocaleString('en-US', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      })
}

function difference(left: number | null, right: number | null, digits = 0) {
  if (left == null || right == null) return '—'
  const change = Number((right - left).toFixed(digits))
  return (change > 0 ? '+' : change < 0 ? '−' : '') + format(Math.abs(change), digits)
}

export function Comparison({ seed, currentScenario }: { seed: number; currentScenario: Scenario }) {
  const [intervention, setIntervention] = useState<Intervention>(
    currentScenario === 'baseline' ? 'surge' : currentScenario,
  )
  const [cohort, setCohort] = useState<Cohort>('base')
  const baseline = useMemo(() => summaries('baseline', seed), [seed])
  const branch = useMemo(() => summaries(intervention, seed), [intervention, seed])
  const baselineResult = baseline[cohort]
  const branchResult = branch[cohort]

  function download() {
    const output = {
      title: 'Psychiatric patient-flow observatory · scenario comparison',
      designation: 'Public facility information · Simulated operations',
      provenance:
        'All outcomes and interventions are synthetic. Public campus identities and geography come from the research package.',
      sourceVersion: DATA_VERSION,
      configVersion: MODEL_VERSION,
      seed,
      window: {
        startMinute: 0,
        endMinute: DURATION,
        durationDays: DURATION / 1440,
        warmupDays: 120,
        unit: 'scenario-relative minutes',
      },
      reference: 'baseline',
      intervention,
      interventionDescription: scenarios[intervention].description,
      capacityInterventionCampus: intervention === 'surge' ? null : 'nyc_bellevue',
      displayedCohort: cohort,
      cohortDefinitions: {
        base: 'Matched evaluation arrivals from the shared baseline demand stream.',
        all: 'All evaluation arrivals, including the additional stream in the demand scenario. Excludes warm-up entrants.',
      },
      definitions: {
        arrivals: 'Unique disposition episodes entering the cohort during the evaluation window.',
        completed: 'Episodes physically departed the sending ED by evaluation end.',
        unresolved: 'Episodes still in the sending ED at evaluation end.',
        placed: 'Episodes with a committed reservation by evaluation end.',
        medianWait: 'Median disposition-to-ED-departure minutes among completed episodes.',
        p90Wait: '90th percentile disposition-to-ED-departure minutes among completed episodes.',
        queueHours:
          'Total cohort patient-hours from disposition to ED departure or evaluation end, whichever occurs first.',
        medianPlacement: 'Median readiness-to-commitment minutes among placed episodes.',
        p90Placement: '90th percentile readiness-to-commitment minutes among placed episodes.',
      },
      interpretation:
        'Each matched arrival has the same follow-up in both runs, ending at day 7. Later arrivals have shorter observation. Unresolved episodes contribute to burden. A single seed illustrates this model only.',
      results: { baseline, [intervention]: branch },
    }
    const blob = new Blob([JSON.stringify(output, null, 2) + '\n'], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const downloadLink = document.createElement('a')
    downloadLink.href = url
    downloadLink.download = `simulated-flow-${seed}-baseline-vs-${intervention}.json`
    document.body.append(downloadLink)
    downloadLink.click()
    downloadLink.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 2000)
  }

  return (
    <section className="comparison" aria-labelledby="comparison-title">
      <header className="cmp-header">
        <div>
          <h2 id="comparison-title">Scenario comparison</h2>
          <p>Seven simulated days across all campuses, starting from one shared snapshot.</p>
        </div>
        <button type="button" className="cmp-export" onClick={download}>
          <Download size={16} aria-hidden="true" />
          Export JSON
        </button>
      </header>
      <div className="cmp-options">
        <label>
          Compare baseline with
          <select
            value={intervention}
            onChange={(event) => setIntervention(event.target.value as Intervention)}
          >
            {Object.entries(scenarios).map(([id, info]) => (
              <option key={id} value={id}>
                {info.label}
              </option>
            ))}
          </select>
        </label>
        <div>
          <span className="cmp-label">Arrival cohort</span>
          <div className="cmp-switch" role="group" aria-label="Arrival cohort">
            <button
              type="button"
              aria-pressed={cohort === 'base'}
              onClick={() => setCohort('base')}
            >
              Matched base
            </button>
            <button type="button" aria-pressed={cohort === 'all'} onClick={() => setCohort('all')}>
              All arrivals
            </button>
          </div>
        </div>
      </div>
      <p className="cmp-intervention">{scenarios[intervention].description}</p>
      <div className="cmp-table-scroll" role="region" aria-label="Comparison outcomes" tabIndex={0}>
        <table>
          <caption>
            {cohort === 'base' ? 'Matched base arrivals' : 'All evaluation arrivals'} · End of day 7
          </caption>
          <thead>
            <tr>
              <th scope="col">Measure</th>
              <th scope="col">Baseline</th>
              <th scope="col">{scenarios[intervention].label}</th>
              <th scope="col">Change</th>
            </tr>
          </thead>
          <tbody>
            {measures.map((metric) => {
              const left = metric.value(baselineResult)
              const right = metric.value(branchResult)
              return (
                <tr key={metric.name}>
                  <th scope="row">
                    {metric.name}
                    <small>{metric.unit}</small>
                  </th>
                  <td>{format(left, metric.digits)}</td>
                  <td>{format(right, metric.digits)}</td>
                  <td>
                    {difference(left, right, metric.digits)}
                    {metric.unit === '%' && left != null && right != null && ' pp'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <details className="cmp-method">
        <summary>How to read these results</summary>
        <p>
          Each matched arrival has the same time to the end of day 7 across both runs. The
          all-arrival cohort includes the extra demand stream when enabled. Both cohorts exclude
          arrivals during the 120-day warm-up.
        </p>
        <p>
          ED wait runs from disposition to physical departure. Its median and P90 use departed
          episodes. Placement wait runs from readiness to commitment and uses committed placements.
          P90 is the 90th percentile. A dash indicates an empty denominator.
        </p>
        <p>
          Waiting burden adds every cohort member’s time in the ED through departure or the end of
          day 7. Unresolved cases contribute their elapsed time. Completed-only waits can understate
          the longest waits. Changes use the unrounded values. A single seed illustrates one
          synthetic network history.
        </p>
      </details>
      <footer className="cmp-foot">
        <span>Simulated operations · Single seed {seed}</span>
        <span>
          {MODEL_VERSION} · Sources {DATA_VERSION}
        </span>
      </footer>
    </section>
  )
}
