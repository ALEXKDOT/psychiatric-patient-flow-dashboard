import { ArrowUpRight } from 'lucide-react'
import type { Campus } from './data'
import type { Pool } from './sim'

export function CampusOperations({
  campus,
  pool,
  referrals,
  transfers,
  onRecord,
}: {
  campus: Campus
  pool: Pool
  onRecord?: () => void
  referrals: number
  transfers: number
}) {
  return (
    <section className="campus-operations" aria-label={campus.shortName + ' campus operations'}>
      <header>
        <span>Psychiatric replay</span>
        <h2>
          {onRecord ? (
            <button
              type="button"
              onClick={onRecord}
              aria-label={'View published capacity for ' + campus.shortName}
            >
              {campus.shortName} <ArrowUpRight size={12} aria-hidden="true" />
            </button>
          ) : (
            campus.shortName
          )}
        </h2>
        <small>Live vacancies unknown</small>
      </header>
      <dl>
        {(['adult', 'cap'] as const).map((group) => {
          const beds = pool[group]
          return (
            <div key={group}>
              <dt>{group === 'adult' ? 'Adult psych beds free' : 'CAP beds free'}</dt>
              <dd>{beds?.free ?? '—'}</dd>
              <small>{beds ? 'of ' + beds.capacity + ' simulated' : 'Campus count unknown'}</small>
            </div>
          )
        })}
        <div>
          <dt>ED boarders</dt>
          <dd>{pool.queue}</dd>
          <small>{campus.isOrigin ? 'Awaiting departure' : 'Receive-only in replay'}</small>
        </div>
        <div>
          <dt>Open referrals</dt>
          <dd>{referrals}</dd>
          <small>Outgoing</small>
        </div>
        <div>
          <dt>Active transfers</dt>
          <dd>{transfers}</dd>
          <small>In or out</small>
        </div>
      </dl>
    </section>
  )
}
