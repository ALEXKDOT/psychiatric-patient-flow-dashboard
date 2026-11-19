// Deterministic synthetic pathway model. All times are minutes relative to the evaluation window.
export const MODEL_VERSION = 'FLOW-1.0'
export const DEFAULT_SEED = 42
export const DURATION = 7 * 1440
const WARMUP = 120 * 1440

export type Scenario = 'baseline' | 'surge' | 'capacity-add' | 'capacity-loss'
export type Phase =
  | 'readiness'
  | 'search'
  | 'preparation'
  | 'internal'
  | 'transit'
  | 'handoff'
  | 'inpatient'
  | 'exited'
export type CampusInput = { id: string; origin: boolean }
type Stream = 'warmup' | 'base' | 'extra'
export interface Episode {
  id: string
  origin: string
  destination: string | null
  phase: Phase
  stream: Stream
  disposition: number
  ready: number | null
  commit: number | null
  departure: number | null
  arrival: number | null
  admission: number | null
  discharge: number | null
}
export interface Referral {
  id: string
  episodeId: string
  from: string
  to: string
  sent: number
  resolved: number | null
  status: 'pending' | 'accepted' | 'unavailable' | 'cancelled'
}
export interface Pool {
  id: string
  free: number
  occupied: number
  turnaround: number
  reserved: number
  capacity: number
  target: number
  pendingClosure: number
  queue: number
}
export interface SimEvent {
  time: number
  type: string
  episodeId: string
  campusId: string
  otherId?: string
  label: string
}
export interface Transfer {
  id: string
  from: string
  to: string
  progress: number
}
export interface MotionSegment extends Transfer {
  startMinute: number
  endMinute: number
}
export interface Metrics {
  queue: number
  openReferrals: number
  inTransit: number
  occupied: number
  reserved: number
  free: number
  turnaround: number
  capacity: number
  departures: number
  admissions: number
  medianWait: number | null
  p90Wait: number | null
}
export interface Trend {
  minute: number
  queue: number
  occupied: number
  inTransit: number
}
export interface Frame {
  minute: number
  queue: Episode[]
  episodes: Episode[]
  pools: Record<string, Pool>
  referrals: Referral[]
  events: SimEvent[]
  transfers: Transfer[]
  recentTransfers: Transfer[]
  metrics: Metrics
  trends: Trend[]
}
export interface Comparison {
  arrivals: number
  completed: number
  unresolved: number
  placed: number
  medianWait: number | null
  p90Wait: number | null
  queueHours: number
  medianPlacement: number | null
  p90Placement: number | null
}
export interface PresentationFrame extends Frame {
  transfers: MotionSegment[]
  recentTransfers: MotionSegment[]
}
export interface Run {
  scenario: Scenario
  seed: number
  focusId: string
  duration: number
  openingMinute: number
  presentationAt(minute: number): PresentationFrame
  at(minute: number): Frame
  compare(minute?: number, cohort?: 'base' | 'all'): Comparison
}

// A process-specific key keeps draws stable when other patients or referral rounds change.
function random(key: string) {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619)
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b)
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296 + 0.5 / 4294967296
}

type ActionKind =
  | 'release'
  | 'discharge'
  | 'admit'
  | 'arrive'
  | 'depart'
  | 'dispose'
  | 'search'
  | 'review'
const priority: Record<ActionKind, number> = {
  release: 0,
  discharge: 1,
  admit: 2,
  arrive: 3,
  depart: 4,
  dispose: 5,
  search: 6,
  review: 7,
}
interface Action {
  time: number
  kind: ActionKind
  id: string
  to?: string
  round?: number
  stream?: Stream
}
function order(a: Action, b: Action) {
  return (
    a.time - b.time ||
    priority[a.kind] - priority[b.kind] ||
    a.id.localeCompare(b.id) ||
    (a.to ?? '').localeCompare(b.to ?? '')
  )
}
// The scheduler stores the soonest action at the end for constant-time removal.
function schedule(s: World, action: Action) {
  let lo = 0,
    hi = s.pending.length
  while (lo < hi) {
    const mid = (lo + hi) >>> 1
    if (order(s.pending[mid], action) > 0) lo = mid + 1
    else hi = mid
  }
  s.pending.splice(lo, 0, action)
}
interface Person extends Episode {
  refs: Referral[]
  round: number
  released: boolean
}
interface World {
  people: Record<string, Person>
  pools: Record<string, Pool>
  pending: Action[]
}
type PoolStamp = { time: number; pool: Pool }
interface History {
  events: SimEvent[]
  pools: Record<string, PoolStamp[]>
}
function arriveStream(
  s: World,
  seed: number,
  stream: Stream,
  start: number,
  end: number,
  perDay: number
) {
  let clock = start
  for (let i = 1; ; i++) {
    // Homogeneous Poisson process, accumulated at continuous precision, rounded down to minutes.
    clock += (-Math.log(random(seed + '|' + stream + '|gap|' + i)) * 1440) / perDay
    if (clock >= end) break
    const prefix = stream === 'base' ? 'EP' : stream === 'extra' ? 'EX' : 'WU'
    schedule(s, {
      time: Math.floor(clock),
      id: prefix + '-' + String(i).padStart(4, '0'),
      kind: 'dispose',
      stream,
    })
  }
}
function execute(
  s: World,
  seed: number,
  campuses: CampusInput[],
  horizon: number,
  history?: History
) {
  const origins = campuses.filter((c) => c.origin)
  const ids = campuses.map((c) => c.id)
  while (s.pending.length && s.pending[s.pending.length - 1].time <= horizon) {
    const a = s.pending.pop()!
    const { time, id } = a
    const draw = (key: string) => random(seed + '|' + id + '|' + key)
    const duration = (key: string, min: number, max: number) =>
      min + Math.floor(draw(key) * (max - min + 1))
    const later = (kind: ActionKind, lag: number, options: Partial<Action> = {}) =>
      schedule(s, { time: time + lag, kind, id, ...options })
    const emit = (type: string, campusId: string, label: string, otherId?: string) =>
      history?.events.push({ time, type, episodeId: id, campusId, label, otherId })
    const record = (p: Pool) => history?.pools[p.id].push({ time, pool: { ...p } })
    if (a.kind === 'dispose') {
      if (s.people[id]) continue
      const origin = origins[Math.floor(draw('origin') * origins.length)].id
      s.people[id] = {
        id,
        origin,
        destination: null,
        phase: 'readiness',
        stream: a.stream!,
        disposition: time,
        ready: null,
        commit: null,
        departure: null,
        arrival: null,
        admission: null,
        discharge: null,
        refs: [],
        round: 0,
        released: false,
      }
      emit('disposition', origin, 'Inpatient disposition')
      later('search', duration('ready', 0, 90))
      continue
    }
    const ep = s.people[id]
    if (!ep) continue
    if (a.kind === 'search') {
      if (ep.commit !== null || ep.round !== (a.round ?? 0)) continue
      ep.ready ??= time
      ep.round++
      ep.phase = 'search'
      const choices = ids.filter((i) => i !== ep.origin)
      const targets = [ep.origin]
      while (targets.length < Math.min(3, ids.length)) {
        const pick = Math.floor(draw('choice|' + ep.round + '|' + targets.length) * choices.length)
        targets.push(choices.splice(pick, 1)[0])
      }
      emit(
        'search',
        ep.origin,
        ep.round === 1 ? 'Placement search opened' : 'Placement search renewed'
      )
      for (const to of targets) {
        ep.refs.push({
          id: id + '-R' + ep.round + '-' + to,
          episodeId: id,
          from: ep.origin,
          to,
          sent: time,
          resolved: null,
          status: 'pending',
        })
        emit('referral', ep.origin, 'Referral submitted', to)
        later('review', duration('review|' + to + '|' + ep.round, 15, 90), { to, round: ep.round })
      }
      continue
    }
    if (a.kind === 'review') {
      if (ep.commit !== null || a.round !== ep.round) continue
      const request = ep.refs.find((r) => r.to === a.to && r.status === 'pending')
      if (!request) continue
      const p = s.pools[request.to]
      request.resolved = time
      if (!p.free) {
        request.status = 'unavailable'
        emit('unavailable', p.id, 'No modeled slot available', ep.origin)
        if (ep.refs.every((r) => r.status !== 'pending')) later('search', 120, { round: ep.round })
        continue
      }
      // One atomic winning request: recheck patient and slot, then cancel all rivals.
      request.status = 'accepted'
      for (const r of ep.refs)
        if (r.status === 'pending') {
          r.status = 'cancelled'
          r.resolved = time
          emit('cancel', r.to, 'Referral closed · placed elsewhere', ep.origin)
        }
      ep.destination = p.id
      ep.commit = time
      ep.phase = 'preparation'
      p.free--
      p.reserved++
      record(p)
      emit('reserve', p.id, 'Slot reserved', ep.origin)
      later('depart', ep.origin === p.id ? 0 : duration('mobilize', 30, 120))
      continue
    }
    if (!ep.destination) continue
    const p = s.pools[ep.destination]
    switch (a.kind) {
      case 'depart':
        if (ep.phase !== 'preparation') break
        ep.departure = time
        if (p.id === ep.origin) {
          ep.phase = 'internal'
          emit('internal', p.id, 'Internal movement started')
          later('admit', duration('internal', 5, 20))
        } else {
          ep.phase = 'transit'
          emit('depart', ep.origin, 'Transfer departed', p.id)
          later('arrive', duration('travel', 30, 90))
        }
        break
      case 'arrive':
        if (ep.phase !== 'transit') break
        ep.arrival = time
        ep.phase = 'handoff'
        emit('arrive', p.id, 'Transfer arrived', ep.origin)
        later('admit', duration('handoff', 10, 30))
        break
      case 'admit': {
        if (ep.phase !== 'handoff' && ep.phase !== 'internal') break
        ep.arrival ??= time
        ep.admission = time
        ep.phase = 'inpatient'
        p.reserved--
        p.occupied++
        record(p)
        emit('admit', p.id, 'Unit admission')
        const z = Math.sqrt(-2 * Math.log(draw('los-a'))) * Math.cos(2 * Math.PI * draw('los-b'))
        later('discharge', Math.max(1, Math.round(1440 * 11 * Math.exp(0.9005166 * z))))
        break
      }
      case 'discharge':
        if (ep.phase !== 'inpatient') break
        ep.discharge = time
        ep.phase = 'exited'
        p.occupied--
        p.turnaround++
        record(p)
        emit('discharge', p.id, 'Discharge · turnaround started')
        later('release', duration('turnaround', 30, 90))
        break
      case 'release':
        if (ep.phase !== 'exited' || ep.released) break
        ep.released = true
        p.turnaround--
        if (p.pendingClosure > 0) {
          p.capacity--
          p.pendingClosure--
          emit('retire', p.id, 'Slot retired after turnaround')
        } else {
          p.free++
          emit('release', p.id, 'Slot ready')
        }
        record(p)
        if (!history) delete s.people[id]
        break
    }
  }
}
const warmCache = new Map<string, World>()
function startState(campuses: CampusInput[], seed: number, rate: number) {
  const key = JSON.stringify([seed, campuses])
  let warm = warmCache.get(key)
  if (!warm) {
    const pools = Object.fromEntries(
      campuses.map((c) => [
        c.id,
        {
          id: c.id,
          free: 24,
          occupied: 0,
          reserved: 0,
          turnaround: 0,
          capacity: 24,
          target: 24,
          pendingClosure: 0,
          queue: 0,
        },
      ])
    )
    warm = { people: {}, pools, pending: [] }
    arriveStream(warm, seed, 'warmup', -WARMUP, 0, rate)
    execute(warm, seed, campuses, -1)
    if (warmCache.size >= 2) warmCache.delete(warmCache.keys().next().value!)
    warmCache.set(key, warm)
  }
  return structuredClone(warm)
}
function occurred(time: number | null, at: number) {
  return time !== null && time <= at
}
function phase(ep: Episode, t: number): Phase {
  if (occurred(ep.discharge, t)) return 'exited'
  if (occurred(ep.admission, t)) return 'inpatient'
  if (occurred(ep.arrival, t)) return 'handoff'
  if (occurred(ep.departure, t)) return ep.origin === ep.destination ? 'internal' : 'transit'
  if (occurred(ep.commit, t)) return 'preparation'
  if (occurred(ep.ready, t)) return 'search'
  return 'readiness'
}
function viewEpisode(e: Episode, t: number): Episode {
  const known = (v: number | null) => (occurred(v, t) ? v : null)
  return {
    id: e.id,
    origin: e.origin,
    destination: occurred(e.commit, t) ? e.destination : null,
    stream: e.stream,
    phase: phase(e, t),
    disposition: e.disposition,
    ready: known(e.ready),
    commit: known(e.commit),
    departure: known(e.departure),
    arrival: known(e.arrival),
    admission: known(e.admission),
    discharge: known(e.discharge),
  }
}
function percentile(values: number[], p: number) {
  if (!values.length) return null
  const sorted = values.slice().sort((a, b) => a - b)
  const index = (sorted.length - 1) * p
  return (
    sorted[Math.floor(index)] + (index % 1) * (sorted[Math.ceil(index)] - sorted[Math.floor(index)])
  )
}
// Upper bound lookup over ordered immutable per-pool checkpoints and event ledger.
function through<T extends { time: number }>(list: T[], t: number) {
  let lo = 0,
    hi = list.length
  while (lo < hi) {
    const mid = (lo + hi) >>> 1
    if (list[mid].time <= t) lo = mid + 1
    else hi = mid
  }
  return lo
}

export function buildRun(
  campuses: CampusInput[],
  scenario: Scenario = 'baseline',
  seed = DEFAULT_SEED,
  focusId = campuses[0]?.id
): Run {
  if (
    !Number.isFinite(seed) ||
    !campuses.some((c) => c.origin) ||
    !campuses.some((c) => c.id === focusId) ||
    new Set(campuses.map((c) => c.id)).size !== campuses.length
  )
    throw new Error('Invalid synthetic network configuration')
  const rate = (0.9 * campuses.length * 24) / 16.5
  const world = startState(campuses, seed, rate)
  const focus = world.pools[focusId]
  if (scenario === 'capacity-add') {
    focus.capacity += 8
    focus.free += 8
    focus.target += 8
  } else if (scenario === 'capacity-loss') {
    const retire = Math.min(8, focus.free)
    focus.capacity -= retire
    focus.free -= retire
    focus.target -= 8
    focus.pendingClosure = 8 - retire
  }
  const history: History = {
    events: [],
    pools: Object.fromEntries(
      Object.values(world.pools).map((p) => [p.id, [{ time: 0, pool: { ...p } }]])
    ),
  }
  if (scenario.startsWith('capacity-'))
    history.events.push({
      time: 0,
      type: 'capacity',
      episodeId: '',
      campusId: focusId,
      label:
        scenario === 'capacity-add'
          ? 'Eight pathway slots added'
          : 'Eight pathway closures requested',
    })
  arriveStream(world, seed, 'base', 0, DURATION, rate)
  if (scenario === 'surge') arriveStream(world, seed, 'extra', 0, DURATION, rate * 0.3)
  // Resolve a 90-minute lookahead for interpolation of journeys crossing the evaluation endpoint.
  // No future events enter a projection or cohort calculation.
  execute(world, seed, campuses, DURATION + 90, history)
  const people = Object.values(world.people).sort(
    (a, b) => a.disposition - b.disposition || a.id.localeCompare(b.id)
  )
  const refs = people
    .flatMap((e) => e.refs)
    .sort((a, b) => a.sent - b.sent || a.id.localeCompare(b.id))
  const bound = (t: number) => Math.max(0, Math.min(DURATION, Number.isFinite(t) ? t : 0))
  function trend(t: number): Trend {
    let queue = 0,
      occupied = 0,
      inTransit = 0
    for (const e of people) {
      if (e.disposition > t) break
      const state = phase(e, t)
      if (state === 'inpatient') occupied++
      if (state === 'transit') inTransit++
      if (state === 'preparation' || state === 'search' || state === 'readiness') queue++
    }
    return { minute: t, queue, occupied, inTransit }
  }
  const trends: Trend[] = []
  for (let hour = 0; hour <= DURATION; hour += 60) trends.push(trend(hour))
  function presentationAt(minute: number): PresentationFrame {
    const t = bound(minute)
    const episodes: Episode[] = [],
      queue: Episode[] = [],
      transfers: MotionSegment[] = [],
      recentTransfers: MotionSegment[] = []
    const pools: Record<string, Pool> = {}
    const metrics: Metrics = {
      queue: 0,
      openReferrals: 0,
      inTransit: 0,
      occupied: 0,
      reserved: 0,
      free: 0,
      turnaround: 0,
      capacity: 0,
      departures: 0,
      admissions: 0,
      medianWait: null,
      p90Wait: null,
    }
    for (const [key, stamps] of Object.entries(history.pools)) {
      const p = { ...stamps[through(stamps, t) - 1].pool }
      pools[key] = p
      for (const k of ['occupied', 'reserved', 'free', 'turnaround', 'capacity'] as const)
        metrics[k] += p[k]
    }
    const waits: number[] = []
    for (const e of people) {
      if (e.disposition > t) break
      const v = viewEpisode(e, t)
      episodes.push(v)
      if (v.departure === null) {
        queue.push(v)
        pools[e.origin].queue++
      }
      if (v.departure !== null && v.departure >= 0) {
        metrics.departures++
        waits.push(v.departure - v.disposition)
      }
      if (v.admission !== null && v.admission >= 0) metrics.admissions++
      if (e.origin === e.destination || !e.destination || v.departure === null) continue
      if (v.phase === 'transit')
        transfers.push({
          id: e.id,
          from: e.origin,
          to: e.destination,
          startMinute: v.departure,
          endMinute: e.arrival!,
          progress: (t - v.departure) / (e.arrival! - v.departure),
        })
      else if (v.arrival !== null && v.arrival >= t - 120)
        recentTransfers.push({
          id: e.id,
          from: e.origin,
          to: e.destination,
          progress: 1,
          startMinute: v.departure,
          endMinute: v.arrival,
        })
    }
    const referrals: Referral[] = []
    for (const r of refs) {
      if (r.sent > t) break
      const opened = !occurred(r.resolved, t)
      referrals.push(opened ? { ...r, status: 'pending', resolved: null } : { ...r })
      if (opened) metrics.openReferrals++
    }
    metrics.queue = queue.length
    metrics.inTransit = transfers.length
    metrics.medianWait = percentile(waits, 0.5)
    metrics.p90Wait = percentile(waits, 0.9)
    const end = through(history.events, t)
    const hour = Math.floor(t / 60)
    const recentTrends = trends.slice(Math.max(0, hour - 24), hour + 1)
    if (t !== hour * 60)
      recentTrends.push({
        minute: t,
        queue: metrics.queue,
        occupied: metrics.occupied,
        inTransit: metrics.inTransit,
      })
    return {
      minute: t,
      episodes,
      queue,
      pools,
      metrics,
      referrals,
      transfers,
      recentTransfers,
      events: history.events.slice(Math.max(0, end - 300), end).reverse(),
      trends: recentTrends,
    }
  }
  function compare(minute = DURATION, cohort: 'base' | 'all' = 'base'): Comparison {
    const t = bound(minute)
    const entrants = people.filter(
      (e) => e.disposition >= 0 && e.disposition <= t && (cohort === 'all' || e.stream === 'base')
    )
    const waits: number[] = [],
      placement: number[] = []
    let queueMinutes = 0
    for (const e of entrants) {
      queueMinutes += Math.min(t, e.departure ?? t) - e.disposition
      if (occurred(e.departure, t)) waits.push(e.departure! - e.disposition)
      if (occurred(e.commit, t)) placement.push(e.commit! - e.ready!)
    }
    return {
      arrivals: entrants.length,
      completed: waits.length,
      unresolved: entrants.length - waits.length,
      placed: placement.length,
      medianWait: percentile(waits, 0.5),
      p90Wait: percentile(waits, 0.9),
      queueHours: queueMinutes / 60,
      medianPlacement: percentile(placement, 0.5),
      p90Placement: percentile(placement, 0.9),
    }
  }
  // Open on an observed travel interval. Prefer one connected to the focal campus with an ED queue.
  const trips = people.filter(
    (e) =>
      e.departure !== null &&
      e.arrival !== null &&
      e.destination !== e.origin &&
      e.departure >= 360 &&
      e.arrival < DURATION
  )
  const score = (e: Person) => {
    const t = Math.floor((e.departure! + e.arrival!) / 2)
    const q = people.filter((p) => p.disposition <= t && !occurred(p.departure, t)).length
    const inFlight = people.filter(
      (p) => p.destination !== p.origin && occurred(p.departure, t) && !occurred(p.arrival, t)
    ).length
    return (
      (e.origin === focusId || e.destination === focusId ? 100 : 0) +
      Math.min(3, q) * 4 +
      Math.min(3, inFlight)
    )
  }
  let openingMinute = 0,
    best = -1
  for (const e of trips) {
    const s = score(e)
    if (s > best) {
      best = s
      openingMinute = Math.floor((e.departure! + e.arrival!) / 2)
    }
  }
  // The canonical export contract stays stable. Presentation adds only the
  // interpolation window of a journey whose departure has already occurred.
  function at(minute: number): Frame {
    const frame = presentationAt(minute)
    const canonical = ({ id, from, to, progress }: MotionSegment): Transfer => ({
      id,
      from,
      to,
      progress,
    })
    return {
      ...frame,
      transfers: frame.transfers.map(canonical),
      recentTransfers: frame.recentTransfers.map(canonical),
    }
  }
  return { scenario, seed, focusId, duration: DURATION, openingMinute, at, presentationAt, compare }
}
