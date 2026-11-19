import { useEffect, useRef } from 'react'
import { ArrowRight, ArrowUpRight, Crosshair, Navigation2, X } from 'lucide-react'
import { campusById } from './data'
import { useReplayClock } from './ReplayContext'
import type { Episode, PresentationFrame, Referral, MotionSegment } from './sim'
import { clockLabel } from './ui'
import './transfer-inspector.css'

type Props = {
  frame: PresentationFrame
  episodeId: string
  following: boolean
  onFollow: () => void
  onExit: () => void
  onStopFollowing?: () => void
  onSeek?: (minute: number) => void
  onNextEvent?: () => void
  onInspectOrigin?: (id: string) => void
  onInspectDestination: (id: string) => void
}

const phaseLabel: Record<Episode['phase'], string> = {
  readiness: 'Preparing referral',
  search: 'Placement search',
  preparation: 'Awaiting ED departure',
  transit: 'In transit',
  handoff: 'Receiving handoff',
  inpatient: 'Admitted to unit',
  exited: 'Discharged',
  internal: 'Internal movement',
}
const campusName = (id: string) => campusById[id]?.shortName ?? id
const recordedTime = (time: number) =>
  time < 0 ? `Warm-up · ${Math.abs(time)} min before D1` : clockLabel(time)

function TravelProgress({ trip, elapsed }: { trip: MotionSegment; elapsed: number }) {
  const clock = useReplayClock()
  const meter = useRef<HTMLProgressElement>(null)
  const text = useRef<HTMLSpanElement>(null)
  const initial = Math.floor(trip.progress * 100)
  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    function paint(minute: number) {
      // The frame owns the phase. Repainting is limited to this active interval.
      if (!meter.current || !text.current || minute < trip.startMinute || minute >= trip.endMinute)
        return
      const fraction = motion.matches
        ? (Math.floor(minute) - trip.startMinute) / (trip.endMinute - trip.startMinute)
        : (minute - trip.startMinute) / (trip.endMinute - trip.startMinute)
      const percent = fraction * 100
      meter.current.value = percent
      const label = Math.floor(percent) + '%'
      if (text.current.textContent !== label) text.current.textContent = label
    }
    const unsubscribe = clock.subscribeFrame(paint)
    const repaint = () => paint(clock.readMinute())
    motion.addEventListener('change', repaint)
    return () => {
      unsubscribe()
      motion.removeEventListener('change', repaint)
    }
  }, [clock, trip.startMinute, trip.endMinute])
  return (
    <div className="trip-travel">
      <div>
        <span>Modeled travel</span>
        <span ref={text}>{initial}%</span>
      </div>
      <progress
        aria-label="Modeled travel progress"
        data-testid="trip-progress"
        ref={meter}
        max={100}
        value={trip.progress * 100}
      />
      <small>{elapsed} min elapsed · Schematic connection</small>
    </div>
  )
}

const statusText: Record<Referral['status'], string> = {
  accepted: 'Reserved',
  pending: 'In review',
  unavailable: 'No modeled slot',
  cancelled: 'Closed · placed elsewhere',
}

function EpisodeHistory({
  episode,
  referrals,
  onSeek,
  onNextEvent,
}: {
  episode: Episode
  referrals: Referral[]
  onSeek?: (minute: number) => void
  onNextEvent?: () => void
}) {
  const clock = useReplayClock()
  const observations = [
    ['Inpatient disposition', episode.disposition],
    ['Placement ready', episode.ready],
    ['Reservation committed', episode.commit],
    ['ED departure', episode.departure],
    [
      episode.origin === episode.destination ? 'Internal arrival' : 'Receiving arrival · handoff',
      episode.arrival,
    ],
    ['Unit admission', episode.admission],
    ['Discharge', episode.discharge],
  ] as const
  return (
    <details className="trip-history">
      <summary>Episode history</summary>
      {onNextEvent && (
        <button type="button" className="trip-step" onClick={onNextEvent}>
          Next episode event <ArrowRight size={12} aria-hidden="true" />
        </button>
      )}
      <ol>
        {observations.map(([label, time]) => (
          <li key={label}>
            <span>{label}</span>
            {time === null ? (
              <span className="trip-pending">Pending</span>
            ) : time < 0 ? (
              <span>{recordedTime(time)}</span>
            ) : (
              <button
                type="button"
                title={'Pause at ' + label}
                aria-label={'Seek to ' + label + ', ' + clockLabel(time)}
                onClick={() => (onSeek ?? clock.seek)(time)}
              >
                {clockLabel(time)}
              </button>
            )}
          </li>
        ))}
      </ol>
      {referrals.length > 0 && (
        <div className="trip-requests">
          <h3>Referral requests</h3>
          {referrals.map((r) => (
            <p key={r.id}>
              <span>{campusName(r.to)}</span>
              <span>{statusText[r.status]}</span>
            </p>
          ))}
        </div>
      )}
    </details>
  )
}

function currentObservation(ep: Episode): [string, number | null] {
  switch (ep.phase) {
    case 'readiness':
      return ['Inpatient disposition', ep.disposition]
    case 'search':
      return ['Placement ready', ep.ready]
    case 'preparation':
      return ['Slot reserved', ep.commit]
    case 'transit':
    case 'internal':
      return ['Departed ED', ep.departure]
    case 'handoff':
      return ['Arrived at campus', ep.arrival]
    case 'inpatient':
      return ['Admitted to unit', ep.admission]
    case 'exited':
      return ['Discharged', ep.discharge]
  }
}

export function TransferInspector({
  frame,
  episodeId,
  following,
  onFollow,
  onStopFollowing,
  onExit,
  onInspectDestination,
  onInspectOrigin = onInspectDestination,
  onNextEvent,
  onSeek,
}: Props) {
  const ep = frame.episodes.find((e) => e.id === episodeId)
  const trip = frame.transfers.find((t) => t.id === episodeId)
  const pool = ep?.destination ? frame.pools[ep.destination] : null
  const requests = frame.referrals.filter((r) => r.episodeId === episodeId)
  const held = ep?.commit != null && ep.admission === null
  const [observation, at] = ep ? currentObservation(ep) : ['', null]
  return (
    <aside
      className="trip-inspector"
      aria-label="Selected transfer inspector"
      data-episode-id={episodeId}
      data-phase={ep?.phase ?? 'unobserved'}
    >
      <header className="trip-strap">
        <span>
          <Navigation2 size={13} strokeWidth={1.6} aria-hidden="true" />
          {following ? 'Following transfer' : 'Selected transfer'}
        </span>
        <button aria-label="Exit transfer" type="button" onClick={onExit} title="Exit transfer">
          <X size={15} aria-hidden="true" />
        </button>
      </header>
      <div className="trip-identity">
        <h2>{episodeId}</h2>
        <span>Simulated episode</span>
      </div>
      {ep ? (
        <>
          <div className="trip-status">
            <strong data-testid="trip-stage">{phaseLabel[ep.phase]}</strong>
            <small>{ep.ageGroup === 'adult' ? 'Adult placement' : 'Child/adolescent placement'}</small>
            {at != null && (
              <small>
                {observation} · {recordedTime(at)}
              </small>
            )}
          </div>
          <dl className="trip-route">
            <div>
              <dt>Origin</dt>
              <dd>
                <button
                  type="button"
                  aria-label={'Inspect origin, ' + campusName(ep.origin)}
                  onClick={() => onInspectOrigin(ep.origin)}
                >
                  {campusName(ep.origin)} <ArrowUpRight size={11} />
                </button>
              </dd>
            </div>
            <div>
              <dt>Destination</dt>
              <dd>
                {ep.destination ? (
                  <button
                    type="button"
                    aria-label={'Inspect destination, ' + campusName(ep.destination)}
                    onClick={() => onInspectDestination(ep.destination!)}
                  >
                    {campusName(ep.destination)} <ArrowUpRight size={11} />
                  </button>
                ) : (
                  'Destination unknown'
                )}
              </dd>
            </div>
          </dl>
          {trip && ep.departure !== null && (
            <TravelProgress trip={trip} elapsed={Math.floor(frame.minute - ep.departure)} />
          )}
          {ep.arrival !== null && ep.departure !== null && ep.origin !== ep.destination && (
            <p className="trip-elapsed">
              {ep.arrival - ep.departure} min modeled travel · Arrived {recordedTime(ep.arrival)}
            </p>
          )}
          <dl className="trip-facts">
            {ep.commit === null ? (
              <div>
                <dt>Open referrals</dt>
                <dd data-testid="trip-open-referrals">
                  {requests.filter((r) => r.status === 'pending').length}
                </dd>
              </div>
            ) : (
              <div>
                <dt>Episode slot</dt>
                <dd>{held ? 'Reserved' : ep.phase === 'inpatient' ? 'Occupied' : 'Released'}</dd>
              </div>
            )}
            {pool && (
              <div>
                <dt>Simulated psychiatric beds · all ages</dt>
                <dd>
                  <span data-testid="trip-pool-reserved">{pool.reserved}</span> reserved ·{' '}
                  <span data-testid="trip-pool-occupied">{pool.occupied}</span>/
                  <span data-testid="trip-pool-capacity">{pool.capacity}</span> occupied
                </dd>
              </div>
            )}
          </dl>
          {following ? (
            <button type="button" className="trip-follow" onClick={onStopFollowing ?? onExit}>
              <Crosshair size={13} />
              Stop following
            </button>
          ) : (
            trip && (
              <button type="button" className="trip-follow" onClick={onFollow}>
                Follow transfer <ArrowRight size={14} />
              </button>
            )
          )}
          <EpisodeHistory
            episode={ep}
            referrals={requests}
            onSeek={onSeek}
            onNextEvent={onNextEvent}
          />
        </>
      ) : (
        <p className="trip-unobserved">
          This episode has no recorded disposition at the current replay time.
        </p>
      )}
    </aside>
  )
}
