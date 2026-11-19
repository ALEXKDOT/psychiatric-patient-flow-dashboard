import { ArrowUpRight, Crosshair } from 'lucide-react'
import type { Campus } from './data'
import type { Pool } from './sim'
import './inspector.css'

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

const slotStates = [
  ['occupied', 'Occupied'],
  ['reserved', 'Reserved'],
  ['turnaround', 'Turnaround'],
  ['free', 'Free'],
] as const

const two = (count: number) => String(count).padStart(2, '0')

function SlotAllocation({ pool }: { pool: Pool }) {
  return (
    <section className="dossier-allocation" aria-label="Simulated pathway capacity">
      <div className="dossier-section-title">
        <h3>Psychiatric beds</h3>
        <span>Simulated</span>
      </div>
      <div className="dossier-denominator">
        <strong>
          {pool.capacity === 0 && (pool.adult === null || pool.cap === null) ? (
            '—'
          ) : (
            <>
              {pool.occupied}
              <span> / {pool.capacity}</span>
            </>
          )}
        </strong>
        <span>
          {pool.adult === null || pool.cap === null
            ? 'occupied · partial campus data'
            : 'occupied in replay'}
        </span>
      </div>
      <div className="dossier-raster" aria-hidden="true">
        {slotStates.map(
          ([state]) =>
            pool[state] > 0 && (
              <i
                key={state}
                className={'dossier-slot is-' + state}
                style={{ flexGrow: pool[state] }}
              />
            ),
        )}
      </div>
      <dl className="dossier-legend">
        {(['adult', 'cap'] as const).map((group) => (
          <div key={group}>
            <dt>{group === 'adult' ? 'Adult psych free' : 'CAP free'}</dt>
            <dd>{pool[group]?.free ?? 'Unknown'}</dd>
          </div>
        ))}
        {slotStates.map(([state, label]) => (
          <div key={state}>
            <dt>
              <i className={'dossier-slot is-' + state} aria-hidden="true" />
              {label}
            </dt>
            <dd>{two(pool[state])}</dd>
          </div>
        ))}
      </dl>
      <p className="dossier-location">Live psychiatric vacancies unknown.</p>
      {pool.pendingClosure > 0 && (
        <p className="dossier-closure">
          {pool.pendingClosure} {pool.pendingClosure === 1 ? 'closure' : 'closures'} pending ·
          target {pool.target} slots
        </p>
      )}
    </section>
  )
}

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
  return (
    <aside className="inspector campus-dossier" aria-label="Selected campus inspector">
      <div className="dossier-heading">
        <span>
          <Crosshair size={13} strokeWidth={1.6} aria-hidden="true" />
          Selected campus
        </span>
        {selectionVisible && <b>{focus.code}</b>}
      </div>
      {selectionVisible ? (
        <>
          <div className="dossier-body">
            <section className="dossier-identity">
              <h2>{focus.name}</h2>
              <p className="dossier-location">
                {campus.borough} · {campus.raw.address_line1}
              </p>
              <p className="dossier-services">
                Inpatient{campus.programs.some((p) => /cpep/i.test(p.program_type)) && ' / CPEP'}
              </p>
            </section>
            <SlotAllocation pool={pool} />
            <div className="dossier-activity">
              <dl>
                <div>
                  <dt>{campus.isOrigin ? 'ED boarders' : 'ED boarders · receive-only'}</dt>
                  <dd>{two(pool.queue)}</dd>
                </div>
                <div>
                  <dt>Outgoing open referrals</dt>
                  <dd>{two(openReferrals)}</dd>
                </div>
              </dl>
              <button className="dossier-transfers" type="button" onClick={onMovements}>
                <span>
                  Active transfers <ArrowUpRight size={11} aria-hidden="true" />
                </span>
                <b>{two(relatedCount)}</b>
              </button>
            </div>
          </div>
          {onRecord && (
            <button className="dossier-record" type="button" onClick={onRecord}>
              View campus record <ArrowUpRight size={14} aria-hidden="true" />
            </button>
          )}
        </>
      ) : (
        <p className="dossier-empty">No campuses match these filters.</p>
      )}
    </aside>
  )
}
