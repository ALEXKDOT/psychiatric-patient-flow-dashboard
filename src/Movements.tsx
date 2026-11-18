import { ArrowRight } from 'lucide-react'
import { campusById } from './data'
import type { Frame, Transfer } from './sim'
import { clockLabel } from './ui'

export function Movements({
  frame,
  chosenTrip,
  scope,
}: {
  frame: Frame
  chosenTrip: string | null
  scope: string | null
}) {
  const visible = (t: Transfer) =>
    (!scope || t.from === scope || t.to === scope) && (!chosenTrip || t.id === chosenTrip)
  const active = frame.transfers.filter(visible),
    recent = frame.recentTransfers.filter(visible)
  function row(t: Transfer, completed: boolean) {
    const ep = frame.episodes.find((e) => e.id === t.id)!
    const elapsed = (ep.arrival ?? frame.minute) - ep.departure!
    return (
      <article className="journey-row" key={t.id}>
        <div className="sect-line">
          <span className="eyebrow">{t.id}</span>
          <span className="tag">{completed ? 'Arrived' : 'In transit'}</span>
        </div>
        <p className="endpoints">
          {campusById[t.from].shortName}
          <ArrowRight size={16} aria-label="to" />
          {campusById[t.to].shortName}
        </p>
        <span>
          Departed {clockLabel(ep.departure!)} ·{' '}
          {completed ? 'Arrived ' + clockLabel(ep.arrival!) : elapsed + ' min elapsed'}
        </span>
        <div className="journey-progress">
          <i style={{ width: t.progress * 100 + '%' }} />
        </div>
        <span>
          {completed
            ? elapsed + ' min modeled travel'
            : 'Destination slot reserved · ' +
              Math.round(t.progress * 100) +
              '% of modeled travel time'}
        </span>
      </article>
    )
  }
  return (
    <>
      <h2>Intercampus transfers</h2>
      <p>
        {scope ? campusById[scope].shortName : 'Network-wide'} · {clockLabel(frame.minute)}. The
        lines connect simulated departure and arrival campuses.
      </p>
      {!!active.length && active.map((t) => row(t, false))}
      {!active.length && !chosenTrip && <p>No episodes in transit at this time.</p>}
      {(!chosenTrip || recent.length > 0) && <h3>Recent arrivals · last 2 hours</h3>}
      {recent.map((t) => row(t, true))}
      {!recent.length && !chosenTrip && <p>No recent intercampus arrivals.</p>}
      {chosenTrip && !active.length && !recent.length && (
        <p>This episode falls outside the displayed movement window.</p>
      )}
    </>
  )
}
