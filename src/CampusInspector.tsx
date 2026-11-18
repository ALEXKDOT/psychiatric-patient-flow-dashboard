import { Crosshair, MapPin, ArrowUpRight } from 'lucide-react'
import type { Campus } from './data'
import type { Pool } from './sim'
type Props = {
  campus: Campus
  focus: { name: string; code: string }
  pool: Pool
  relatedCount: number
  openReferrals: number
  selectionVisible: boolean
  onRecord?: () => void
  onMovements: () => void
}
const two = (n: number) => String(n).padStart(2, '0')
export function CampusInspector({
  campus,
  focus,
  pool,
  relatedCount,
  openReferrals,
  selectionVisible,
  onRecord,
  onMovements,
}: Props) {
  const ringParts = pool
    ? ([
        ['Occupied', pool.occupied, '#334941'],
        ['Reserved', pool.reserved, '#d67542'],
        ['Turnaround', pool.turnaround, '#aea697'],
        ['Free', pool.free, '#dfe4d9'],
      ] as const)
    : []
  let start = 0
  const stops = ringParts
    .map(([, n, color]) => {
      const end = start + (n / Math.max(1, pool.capacity)) * 100
      const s = color + ' ' + start + '% ' + end + '%'
      start = end
      return s
    })
    .join(', ')
  return (
    <aside className="inspector panel" aria-label="Selected campus inspector">
      <div className="inspector-heading">
        <span>
          <Crosshair size={16} />
          Campus inspector
        </span>
        <span className="site-code">{focus.code}</span>
      </div>
      {selectionVisible ? (
        <>
          <div className="campus-summary">
            <div className="eyebrow orange">
              <span className="square" />
              Selected campus
            </div>
            <h2>{focus.name}</h2>
            <div className="location">
              <MapPin size={13} />
              {campus.borough} · {campus.raw.address_line1}
            </div>
            <div className="chips">
              <span>Inpatient</span>
              {campus.programs.some((p) => /cpep/i.test(p.program_type)) && <span>CPEP</span>}
            </div>
          </div>
          <section className="pool-section">
            <div className="sect-line">
              <h3>Pathway capacity</h3>
              <span className="tag">Simulated</span>
            </div>
            <div className="pool-grid">
              <div
                className="capacity-ring"
                style={{ background: stops ? 'conic-gradient(' + stops + ')' : undefined }}
              >
                <div>
                  <strong>{pool?.capacity ?? 0}</strong>
                  <small>SLOTS</small>
                </div>
              </div>
              <dl>
                {ringParts.map(([label, n, color]) => (
                  <div key={label}>
                    <dt>
                      <i style={{ background: color }} />
                      {label}
                    </dt>
                    <dd>{two(n)}</dd>
                  </div>
                ))}
              </dl>
            </div>
            {pool?.pendingClosure > 0 && (
              <p className="closure">
                {pool.pendingClosure} closures pending · target {pool.target}
              </p>
            )}
          </section>
          <div className="campus-stats">
            <div>
              <span>Waiting in ED</span>
              <b>{two(pool?.queue ?? 0)}</b>
            </div>
            <div>
              <span>Outgoing open referrals</span>
              <b>{two(openReferrals)}</b>
            </div>
            <button onClick={onMovements}>
              <span>Active transfers</span>
              <b>{two(relatedCount)}</b>
            </button>
          </div>
          {onRecord && (
            <button className="record-link" onClick={onRecord}>
              View campus record <ArrowUpRight size={16} />
            </button>
          )}
        </>
      ) : (
        <div className="campus-summary">No campuses match these filters.</div>
      )}
    </aside>
  )
}
