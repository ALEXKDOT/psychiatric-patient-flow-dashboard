import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { Frame } from './sim'
import { campusById } from './data'
import './instruments.css'

export interface QueueRow {
  id: string
  originId: string
  campus: string
  disposition: number
  stage: string
  referrals: number
}
export interface FeedRow {
  type: string
  id: string
  minute: number
  title: string
  campus: string
  campusId?: string
  episodeId?: string
  relatedCampus?: string
}
export interface TrendPoint {
  minute: number
  waiting: number
  occupied?: number
  inTransit?: number
}
export interface InstrumentView {
  queue: QueueRow[]
  events: FeedRow[]
  trend: TrendPoint[]
  frame?: Frame
  minute: number
}
type Selection = {
  onSelect: (id: string) => void
  selectedId?: string
  visibleIds?: string[]
}
type Panel = 'queue' | 'trend' | 'events'
const titles: Record<Panel, string> = {
  queue: 'Placement queue',
  trend: 'Queue volume',
  events: 'Event log',
}
const resourceEvents = new Set(['capacity', 'retire', 'unavailable'])
const symbol = {
  queue: 'M3 4h12M3 8h9M3 12h6',
  trend: 'M2 12h3V8h4v2h3V4h4',
  events: 'M2 4h3m2 0h9M2 8h3m2 0h9M2 12h3m2 0h9',
  expand: 'M5 11l7-7M6 4h6v6',
  close: 'M4 4l9 9M13 4l-9 9',
}
function Icon({ type }: { type: keyof typeof symbol }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 18 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      aria-hidden="true"
    >
      <path d={symbol[type]} />
    </svg>
  )
}
const digits = (n: number) => String(n).padStart(2, '0')
function clock(minute: number) {
  const dayMinute = ((Math.floor(minute) % 1440) + 1440) % 1440
  return digits(Math.floor(dayMinute / 60)) + ':' + digits(dayMinute % 60)
}
function fullTime(minute: number) {
  return (
    (minute < 0
      ? 'Warm-up ' + Math.floor(minute / 1440) + 'd'
      : 'Day ' + (1 + Math.floor(minute / 1440))) +
    ' · ' +
    clock(minute)
  )
}
function duration(minutes: number) {
  const value = Math.floor(minutes)
  if (value < 60) return value + 'm'
  return Math.floor(value / 60) + 'h ' + digits(value % 60) + 'm'
}

function InstrumentHeader({
  kind,
  count,
  onExpand,
  children,
}: {
  kind: Panel
  count?: number
  onExpand: () => void
  children?: ReactNode
}) {
  return (
    <header className="ins-header">
      <div className="ins-title">
        <Icon type={kind} />
        <h2>{titles[kind]}</h2>
        {count !== undefined && <span className="ins-count">{digits(count)}</span>}
      </div>
      <div className="ins-header-tools">
        {children}
        <button
          type="button"
          className="ins-expand"
          aria-label={'Expand ' + titles[kind].toLowerCase()}
          title={'Expand ' + titles[kind].toLowerCase()}
          onClick={onExpand}
        >
          <Icon type="expand" />
        </button>
      </div>
    </header>
  )
}

function QueueTable({
  rows,
  minute,
  select,
  expanded = false,
  selectedId,
  onEpisode,
}: {
  rows: QueueRow[]
  minute: number
  select: (id: string) => void
  expanded?: boolean
  selectedId?: string
  onEpisode?: (id: string) => void
}) {
  return (
    <table className={'ins-queue-table' + (expanded ? ' ins-table-full' : '')}>
      <thead>
        <tr>
          <th>Episode</th>
          <th>Origin campus</th>
          {expanded && (
            <>
              <th>Stage</th>
              <th>Open referrals</th>
            </>
          )}
          <th>ED wait</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.id} data-selected={selectedId === row.originId || undefined}>
            <td>
              <button
                type="button"
                title={onEpisode ? 'Episode history' : 'Inspect ' + row.campus}
                aria-label={
                  onEpisode
                    ? 'Episode history for ' + row.id
                    : 'Inspect ' + row.campus + ', origin of ' + row.id
                }
                onClick={() => (onEpisode ? onEpisode(row.id) : select(row.originId))}
              >
                {row.id}
              </button>
            </td>
            <td title={row.campus}>
              {expanded ? (
                <button onClick={() => select(row.originId)} type="button">
                  {row.campus}
                </button>
              ) : (
                row.campus
              )}
            </td>
            {expanded && (
              <>
                <td>{row.stage}</td>
                <td>{row.referrals}</td>
              </>
            )}
            <td>{duration(minute - row.disposition)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function EventList({
  rows,
  select,
  expanded = false,
  onEpisode,
}: {
  rows: FeedRow[]
  select: (id: string) => void
  expanded?: boolean
  onEpisode?: (id: string) => void
}) {
  return (
    <ol className={'ins-event-list' + (expanded ? ' ins-list-full' : '')}>
      {rows.map((row) => (
        <li key={row.id}>
          <time title={fullTime(row.minute)}>
            {expanded ? fullTime(row.minute) : clock(row.minute)}
          </time>
          <i className="ins-event-point" aria-hidden="true" />
          <div className="ins-event-copy">
            <strong>{row.title}</strong>
            {row.campusId ? (
              <button
                type="button"
                title={'Inspect ' + row.campus}
                onClick={() => select(row.campusId!)}
              >
                {row.campus}
              </button>
            ) : (
              <span>{row.campus}</span>
            )}
            {expanded && row.relatedCampus && <span>Other campus · {row.relatedCampus}</span>}
            {expanded && row.episodeId && onEpisode && (
              <button
                type="button"
                className="ins-event-episode"
                aria-label={'View episode history for ' + row.episodeId}
                onClick={() => onEpisode(row.episodeId!)}
              >
                {row.episodeId} <Icon type="expand" />
              </button>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}

function Trend({ points, total }: { points: TrendPoint[]; total: number }) {
  const first = points[0]
  const last = points.at(-1)
  if (!first || !last)
    return <p className="ins-empty">Queue history starts with the first sample.</p>
  const maxValue = Math.max(2, Math.ceil(Math.max(...points.map((p) => p.waiting)) / 2) * 2)
  const x = (m: number) => 2 + 292 * ((m - first.minute) / Math.max(1, last.minute - first.minute))
  const y = (n: number) => 57 - (n / maxValue) * 52
  const line = points
    .map((p, i) =>
      i === 0 ? 'M' + x(p.minute) + ',' + y(p.waiting) : 'H' + x(p.minute) + 'V' + y(p.waiting),
    )
    .join(' ')
  return (
    <div className="ins-trend">
      <div className="ins-current">
        <strong>{total}</strong>
        <span>in sending EDs</span>
        <span className="ins-window">{duration(last.minute - first.minute)} window</span>
      </div>
      <div className="ins-plot">
        <div aria-hidden="true" className="ins-y-axis">
          <span>{maxValue}</span>
          <span>{maxValue / 2}</span>
          <span>0</span>
        </div>
        <svg
          viewBox="0 0 300 62"
          preserveAspectRatio="none"
          role="img"
          aria-label={
            'Network ED queue from ' +
            fullTime(first.minute) +
            ' to ' +
            fullTime(last.minute) +
            '. Currently ' +
            total +
            ' episodes.'
          }
        >
          {[5, 31, 57].map((yValue) => (
            <line key={yValue} x1="0" x2="300" y1={yValue} y2={yValue} className="ins-grid-line" />
          ))}
          <path d={line + 'V57H2Z'} className="ins-chart-fill" />
          <path d={line} className="ins-chart-line" />
          <circle cx={x(last.minute)} cy={y(last.waiting)} r="2.8" className="ins-chart-dot" />
        </svg>
      </div>
      <div className="ins-x-axis" aria-hidden="true">
        <span>{clock(first.minute)}</span>
        <span>{clock((first.minute + last.minute) / 2)}</span>
        <span>{clock(last.minute)}</span>
      </div>
    </div>
  )
}

function PanelDialog({
  title,
  children,
  onClose,
}: {
  title: string
  children: ReactNode
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = ref.current
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    element?.showModal()
    return () => {
      element?.close()
      if (opener?.isConnected) opener.focus({ preventScroll: true })
    }
  }, [])
  return (
    <dialog
      className="ins-dialog"
      ref={ref}
      aria-labelledby="ins-dialog-title"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="ins-dialog-inner">
        <div className="ins-dialog-heading">
          <h2 id="ins-dialog-title">{title}</h2>
          <button
            className="ins-expand"
            onClick={onClose}
            type="button"
            aria-label="Close instrument"
          >
            <Icon type="close" />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  )
}

export function InstrumentPanels({
  queue,
  events,
  trend,
  minute,
  frame,
  onSelect,
  selectedId,
  visibleIds,
}: InstrumentView & Selection) {
  const [panel, setPanel] = useState<Panel | null>(null)
  const [episodeId, setEpisodeId] = useState<string | null>(null)
  const [selectedOnly, setSelectedOnly] = useState(false)
  const [alertsOnly, setAlertsOnly] = useState(false)
  const [scope, setScope] = useState<'all' | 'selected'>('all')
  const ids = visibleIds && new Set(visibleIds)
  const visibleQueue = queue
    .filter((row) => !ids || ids.has(row.originId))
    .sort((a, b) => a.disposition - b.disposition || a.id.localeCompare(b.id))
  const scopedQueue = selectedOnly
    ? visibleQueue.filter((row) => row.originId === selectedId)
    : visibleQueue
  const visibleEvents = events.filter((e) => !ids || !e.campusId || ids.has(e.campusId))
  const scopedEvents = visibleEvents.filter(
    (e) =>
      (scope !== 'selected' || e.campusId === selectedId) &&
      (!alertsOnly || resourceEvents.has(e.type)),
  )
  const plot = trend.filter((p) => p.minute >= minute - 1440 && p.minute <= minute)
  if (plot.at(-1)?.minute !== minute) plot.push({ minute, waiting: queue.length })
  const select = (id: string) => {
    setPanel(null)
    onSelect(id)
  }
  const open = (which: Panel) => {
    setEpisodeId(null)
    setScope('all')
    setAlertsOnly(false)
    setPanel(which)
  }
  const selectedEpisode = frame?.episodes?.find((ep) => ep.id === episodeId)
  return (
    <section className="instruments" aria-label="Simulation instruments">
      <article className="ins-panel ins-queue">
        <InstrumentHeader kind="queue" count={scopedQueue.length} onExpand={() => open('queue')}>
          <select
            className="ins-scope"
            aria-label="Queue origin scope"
            value={selectedOnly ? 'selected' : 'all'}
            onChange={(e) => setSelectedOnly(e.target.value === 'selected')}
          >
            <option value="all">{ids ? 'Visible origins' : 'All origins'}</option>
            <option value="selected" disabled={!selectedId}>
              Selected origin
            </option>
          </select>
        </InstrumentHeader>
        <QueueTable
          rows={scopedQueue.slice(0, 4)}
          minute={minute}
          selectedId={selectedId}
          select={select}
        />
        {!scopedQueue.length && (
          <p className="ins-empty">
            No episodes waiting at {selectedOnly ? 'the selected origin' : 'visible campuses'}.
          </p>
        )}
        <div className="ins-foot">
          {scopedQueue.reduce((n, r) => n + r.referrals, 0)} open referrals <span>·</span>{' '}
          {scopedQueue.length} unique episodes
          {selectedOnly ? ' at selected origin' : ids ? ' at visible origins' : ''}
        </div>
      </article>
      <article className="ins-panel ins-trend-panel">
        <InstrumentHeader kind="trend" onExpand={() => open('trend')} />
        <Trend points={plot} total={queue.length} />
        <div className="ins-foot">
          <i className="ins-key-line" />
          Network-wide <span>·</span> Unique episodes{' '}
          <button type="button" className="ins-metrics-button" onClick={() => open('trend')}>
            Wait metrics <Icon type="expand" />
          </button>
        </div>
      </article>
      <article className="ins-panel ins-feed">
        <InstrumentHeader kind="events" onExpand={() => open('events')}>
          {ids && <span className="ins-scope-tag">Visible campuses</span>}
        </InstrumentHeader>
        {visibleEvents.length ? (
          <EventList rows={visibleEvents.slice(0, 3)} select={select} />
        ) : (
          <p className="ins-empty">No matching events through {fullTime(minute)}.</p>
        )}
      </article>
      {panel && (
        <PanelDialog title={titles[panel]} onClose={() => setPanel(null)}>
          <p className="ins-context">Simulated operations · {fullTime(minute)}</p>
          {panel === 'queue' && (
            <>
              <p>
                Unique episodes still in the sending ED. Elapsed wait starts at inpatient
                disposition and ends at physical ED departure.
              </p>
              <label className="ins-choice">
                <input
                  type="checkbox"
                  checked={selectedOnly}
                  disabled={!selectedId}
                  onChange={(e) => setSelectedOnly(e.target.checked)}
                />
                Selected origin campus only
              </label>
              <p>
                {scopedQueue.length} ongoing episodes ·{' '}
                {scopedQueue.reduce((n, r) => n + r.referrals, 0)} open referrals
              </p>
              {scopedQueue.length ? (
                <div className="ins-scroll">
                  <QueueTable
                    expanded
                    rows={scopedQueue}
                    minute={minute}
                    select={select}
                    selectedId={selectedId}
                    onEpisode={frame ? setEpisodeId : undefined}
                  />
                </div>
              ) : (
                <p>No episodes waiting at these origins.</p>
              )}
              {frame && selectedEpisode && <EpisodeHistory frame={frame} id={selectedEpisode.id} />}
            </>
          )}
          {panel === 'events' && (
            <>
              <label className="ins-choice">
                <input
                  type="checkbox"
                  checked={scope === 'selected'}
                  disabled={!selectedId}
                  onChange={(e) => {
                    setEpisodeId(null)
                    setScope(e.target.checked ? 'selected' : 'all')
                  }}
                />
                Selected event campus only
              </label>
              <label className="ins-choice">
                <input
                  type="checkbox"
                  checked={alertsOnly}
                  onChange={(e) => {
                    setEpisodeId(null)
                    setAlertsOnly(e.target.checked)
                  }}
                />
                Resource alerts only
              </label>
              <p>
                {scopedEvents.length} recent events through the replay clock
                {ids ? ' at visible campuses' : ''}, newest first.
              </p>
              {frame && selectedEpisode && <EpisodeHistory frame={frame} id={selectedEpisode.id} />}
              {scopedEvents.length ? (
                <EventList
                  rows={scopedEvents}
                  expanded
                  select={select}
                  onEpisode={frame ? setEpisodeId : undefined}
                />
              ) : (
                <p>
                  {alertsOnly
                    ? 'No capacity changes, slot retirements, or unavailable-slot responses in the recent feed for this scope.'
                    : 'No events in the recent feed for this scope.'}
                </p>
              )}
            </>
          )}
          {panel === 'trend' && (
            <>
              <p>
                Network-wide snapshots of the post-disposition ED queue during the most recent day
                of replay.
              </p>
              <Trend points={plot} total={queue.length} />
              {frame && <TimingTable frame={frame} />}
              <details>
                <summary>View sampled values</summary>
                <div className="ins-scroll">
                  <table className="ins-data">
                    <thead>
                      <tr>
                        <th>Model time</th>
                        <th>ED queue</th>
                        <th>Occupied slots</th>
                        <th>In transit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plot.map((p) => (
                        <tr key={p.minute}>
                          <td>{fullTime(p.minute)}</td>
                          <td>{p.waiting}</td>
                          <td>{p.occupied ?? '—'}</td>
                          <td>{p.inTransit ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </>
          )}
        </PanelDialog>
      )}
    </section>
  )
}

const phaseName: Record<string, string> = {
  readiness: 'Awaiting readiness',
  search: 'Placement search',
  preparation: 'Awaiting departure',
  internal: 'Internal movement',
  transit: 'In transit',
  handoff: 'Receiving handoff',
  inpatient: 'Inpatient',
  exited: 'Discharged',
}
const campusName = (id: string) => campusById[id]?.shortName ?? id

export function Instruments({ frame, ...selection }: { frame: Frame } & Selection) {
  const pending = new Map<string, number>()
  for (const request of frame.referrals) {
    if (request.status === 'pending')
      pending.set(request.episodeId, (pending.get(request.episodeId) ?? 0) + 1)
  }
  const queue = frame.queue.map((ep) => ({
    id: ep.id,
    originId: ep.origin,
    campus: campusName(ep.origin),
    disposition: ep.disposition,
    stage: phaseName[ep.phase] ?? ep.phase,
    referrals: pending.get(ep.id) ?? 0,
  }))
  const events = frame.events.map((event, i) => ({
    type: event.type,
    id: [event.type, event.time, event.episodeId, i].join('/'),
    minute: event.time,
    title: event.label,
    campus: event.campusId ? campusName(event.campusId) : 'Network',
    campusId: event.campusId || undefined,
    episodeId: event.episodeId || undefined,
    relatedCampus: event.otherId ? campusName(event.otherId) : undefined,
  }))
  const trend = frame.trends.map((p) => ({
    minute: p.minute,
    waiting: p.queue,
    occupied: p.occupied,
    inTransit: p.inTransit,
  }))
  return (
    <InstrumentPanels
      {...selection}
      frame={frame}
      queue={queue}
      events={events}
      trend={trend}
      minute={frame.minute}
    />
  )
}

function EpisodeHistory({ frame, id }: { frame: Frame; id: string }) {
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    heading.current?.focus()
  }, [id])
  const episode = frame.episodes.find((ep) => ep.id === id)
  if (!episode) return null
  const referrals = frame.referrals.filter((r) => r.episodeId === id)
  const physicalLocation = {
    readiness: campusName(episode.origin) + ' · sending ED',
    search: campusName(episode.origin) + ' · sending ED',
    preparation: campusName(episode.origin) + ' · sending ED',
    transit: 'Between campuses',
    internal: 'Moving within ' + campusName(episode.origin),
    handoff: (episode.destination && campusName(episode.destination)) + ' · receiving handoff',
    inpatient: (episode.destination && campusName(episode.destination)) + ' · inpatient unit',
    exited: 'Discharged',
  }[episode.phase]
  return (
    <section className="ins-breakdown" aria-label="Episode history">
      <h3 ref={heading} tabIndex={-1}>
        {id}
      </h3>
      <p>Adult general inpatient pathway · {phaseName[episode.phase]}</p>
      <dl>
        <div>
          <dt>Physical location</dt>
          <dd>{physicalLocation}</dd>
        </div>
        <div>
          <dt>Committed destination</dt>
          <dd>{episode.destination ? campusName(episode.destination) : 'Unassigned'}</dd>
        </div>
      </dl>
      <dl>
        {(
          [
            ['Disposition', episode.disposition],
            ['Placement ready', episode.ready],
            ['Reserved', episode.commit],
            ['ED departure', episode.departure],
            ['Receiving arrival', episode.arrival],
            ['Unit admission', episode.admission],
            ['Discharge', episode.discharge],
          ] as const
        ).map(([name, time]) => (
          <div key={name}>
            <dt>{name}</dt>
            <dd>{time === null ? 'Pending' : fullTime(time)}</dd>
          </div>
        ))}
      </dl>
      <h4>Referral requests</h4>
      {episode.stream === 'warmup' && (
        <p>This episode entered before Day 1. Its placement history carries into the replay.</p>
      )}
      {referrals.length ? (
        <div className="ins-scroll">
          <table className="ins-data">
            <thead>
              <tr>
                <th>Receiving campus</th>
                <th>Submitted</th>
                <th>Outcome</th>
                <th>Resolved</th>
              </tr>
            </thead>
            <tbody>
              {referrals.map((r) => (
                <tr key={r.id}>
                  <td>{campusName(r.to)}</td>
                  <td>{fullTime(r.sent)}</td>
                  <td>
                    {
                      {
                        accepted: 'Reserved',
                        cancelled: 'Placed elsewhere',
                        pending: 'In review',
                        unavailable: 'No modeled slot',
                      }[r.status]
                    }
                  </td>
                  <td>{r.resolved === null ? 'Pending' : fullTime(r.resolved)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>No referral has been submitted.</p>
      )}
    </section>
  )
}

function TimingTable({ frame }: { frame: Frame }) {
  // Each clock starts with its own eligible cohort, including entries still at risk.
  const arrivals = frame.episodes.filter((p) => p.disposition >= 0)
  const requests = frame.referrals.filter((r) => r.sent >= 0)
  const ready = arrivals.filter((p) => p.ready !== null)
  const assignedExternal = arrivals.filter((p) => p.commit !== null && p.origin !== p.destination)
  const arrivedExternal = assignedExternal.filter((p) => p.arrival !== null)
  const responses = requests.filter((r) => r.status !== 'cancelled')
  const times = [
    {
      label: 'Disposition → ED departure',
      elapsed: arrivals.map((e) => (e.departure === null ? null : e.departure - e.disposition)),
    },
    {
      label: 'Ready → reservation',
      elapsed: ready.map((e) => (e.commit === null ? null : e.commit - e.ready!)),
    },
    {
      label: 'Referral → receiving response',
      elapsed: responses.map((r) => (r.resolved === null ? null : r.resolved - r.sent)),
    },
    {
      label: 'Referral → resolution',
      elapsed: requests.map((r) => (r.resolved === null ? null : r.resolved - r.sent)),
    },
    {
      label: 'Reservation → external departure',
      elapsed: assignedExternal.map((e) => (e.departure === null ? null : e.departure - e.commit!)),
    },
    {
      label: 'External arrival → unit admission',
      elapsed: arrivedExternal.map((e) => (e.admission === null ? null : e.admission - e.arrival!)),
    },
  ]
  const externalCount = frame.episodes.filter(
    (e) => e.departure !== null && e.departure >= 0 && e.origin !== e.destination,
  ).length
  function quantile(sorted: number[], fraction: number) {
    if (!sorted.length) return '—'
    const ix = (sorted.length - 1) * fraction
    return (
      Math.round(
        sorted[Math.floor(ix)] + (ix % 1) * (sorted[Math.ceil(ix)] - sorted[Math.floor(ix)]),
      ) + 'm'
    )
  }
  return (
    <section className="ins-breakdown">
      <h3>Wait and throughput</h3>
      <p>
        Waits include episodes with a disposition since Day 1 and requests submitted since Day 1.
        Median and p90 use completed intervals. Ongoing intervals are counted separately.
      </p>
      <div className="ins-scroll">
        <table className="ins-data">
          <thead>
            <tr>
              <th>Interval</th>
              <th>Median</th>
              <th>p90</th>
              <th>Completed</th>
              <th>Ongoing</th>
            </tr>
          </thead>
          <tbody>
            {times.map((row) => {
              const complete = row.elapsed
                .filter((n): n is number => n !== null)
                .sort((a, b) => a - b)
              return (
                <tr key={row.label}>
                  <td>{row.label}</td>
                  <td>{quantile(complete, 0.5)}</td>
                  <td>{quantile(complete, 0.9)}</td>
                  <td>{complete.length}</td>
                  <td>{row.elapsed.length - complete.length}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p>
        {requests.length - responses.length} requests canceled after another placement. These
        contribute to resolution time only.
      </p>
      <p>
        Since Day 1, {frame.metrics.admissions} unit admissions and {frame.metrics.departures} ED
        departures, including {externalCount} intercampus departures.
      </p>
    </section>
  )
}
