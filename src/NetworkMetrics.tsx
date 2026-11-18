import type { Frame } from './sim'
import './metrics.css'

interface TraceSample {
  minute: number
  value: number
}

// Hourly samples plus the current clock. A partial first day occupies only the
// elapsed part of the 24-hour scale, so it never looks like a full-day trace.
function SignalTrace({ samples }: { samples: TraceSample[] }) {
  if (!samples.length) return null
  const end = samples[samples.length - 1].minute
  const ceiling = Math.max(1, ...samples.map((sample) => sample.value))
  const points = samples.map(({ minute, value }) => ({
    x: 1 + 40 * (1 - (end - minute) / 1440),
    y: 18 - (15 * value) / ceiling,
  }))
  const last = points[points.length - 1]
  const path = points.map(({ x, y }, i) => (i === 0 ? `M${x} ${y}` : `H${x}V${y}`)).join(' ')
  return (
    <svg className="telemetry-trace" viewBox="0 0 44 21" aria-hidden="true">
      <path d="M0 18.5H43" className="telemetry-datum" />
      <path d={path} className="telemetry-signal" />
      <circle cx={last.x} cy={last.y} r="1.6" className="telemetry-now" />
    </svg>
  )
}

export function NetworkMetrics({ frame }: { frame: Frame }) {
  const { metrics, trends } = frame
  const samples = trends.filter((t) => t.minute >= frame.minute - 1440)
  const occupancy = Math.round((100 * metrics.occupied) / metrics.capacity)
  const cards = [
    {
      label: 'ED queue',
      value: metrics.queue,
      unit: 'episodes',
      detail:
        'Unique episodes currently in the sending ED, from disposition to physical departure.',
      samples: samples.map((t) => ({ minute: t.minute, value: t.queue })),
    },
    {
      label: 'Referrals',
      value: metrics.openReferrals,
      unit: 'open requests',
      detail: 'Pending modeled requests. One episode can have up to three outstanding referrals.',
      samples: samples.map((t) => ({
        minute: t.minute,
        value: frame.referrals.filter(
          (r) => r.sent <= t.minute && (r.resolved === null || r.resolved > t.minute),
        ).length,
      })),
    },
    {
      label: 'In transit',
      value: metrics.inTransit,
      unit: 'transfers',
      detail: 'Intercampus journeys after ED departure and before receiving arrival.',
      samples: samples.map((t) => ({ minute: t.minute, value: t.inTransit })),
    },
    {
      label: 'Occupancy',
      value: occupancy,
      suffix: '%',
      unit: `${metrics.occupied} / ${metrics.capacity} slots`,
      detail: 'Occupied hypothetical pathway slots divided by currently active pathway capacity.',
    },
  ]
  return (
    <section className="network-telemetry" aria-label="Network-wide simulation metrics">
      <dl>
        {cards.map((card) => (
          <div className="telemetry-cell" key={card.label} title={card.detail}>
            <dt>{card.label}</dt>
            <dd>
              <div className="telemetry-readout">
                <strong>
                  {card.value}
                  {card.suffix && <small>{card.suffix}</small>}
                </strong>
                {card.samples ? (
                  <SignalTrace samples={card.samples} />
                ) : (
                  <span className="telemetry-meter" aria-hidden="true">
                    <i style={{ width: `${(100 * metrics.occupied) / metrics.capacity}%` }} />
                  </span>
                )}
              </div>
              <span className="telemetry-unit">{card.unit}</span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
