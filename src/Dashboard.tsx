import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import {
  ArrowLeft,
  ChevronUp,
  Navigation2,
  Pause,
  Play,
  MapPin,
  Search,
  Layers,
  LocateFixed,
  ArrowRight,
  Building2,
  ChevronDown,
  CircleHelp,
  FlaskConical,
  GitCompareArrows,
  ListFilter,
  Maximize2,
  Minimize2,
} from 'lucide-react'
import { GeoMap, type NetworkView } from './GeoMap'
import { CampusScene } from './campus/CampusScene'
import { ThemeControl } from './ThemeControl'
import { TransferInspector } from './TransferInspector'
import { useReplayClock } from './ReplayContext'
import { cityCamera } from './cartography/base'
import { getRun } from './runs'
import './observatory.css'
import { Movements } from './Movements'
import { Instruments } from './Instruments'
import { Modal, clockLabel } from './ui'
import { LayerControls, initialLayers, type VisibleLayers } from './LayerControls'
import { NetworkMetrics } from './NetworkMetrics'
import { RegionLocator } from './RegionLocator'
import { CampusInspector } from './CampusInspector'
import { About } from './About'
import {
  campuses,
  campusById,
  DATA_VERSION,
  programPopulations,
  boroughs,
  filterCampuses,
  serviceTypes,
  humanize,
  type CampusFilters,
} from './data'
import { DEFAULT_SEED, MODEL_VERSION, DURATION, type PresentationFrame, type Scenario } from './sim'

const runStamp = 'SEED ' + DEFAULT_SEED + ' / ' + MODEL_VERSION + ' / DATA ' + DATA_VERSION
const searchShortcut = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘ K' : 'Ctrl K'

const networkNodes = campuses.map((c, i) => ({
  id: c.id,
  name: c.id === 'nyc_bellevue' ? 'Bellevue Hospital' : c.shortName,
  longitude: c.lon,
  latitude: c.lat,
  code: 'C' + String(i + 1).padStart(2, '0'),
}))
const allSponsors = Array.from(
  new Map(
    campuses.map((c) => [c.raw.sponsor_code_as_published, c.raw.sponsor_name_as_published]),
  ).entries(),
).sort((a, b) => a[1].localeCompare(b[1]))
export const scenarioNames: Record<Scenario, string> = {
  baseline: 'Baseline',
  surge: 'Demand +30%',
  'capacity-add': 'Capacity +8',
  'capacity-loss': 'Capacity −8',
}
type Props = {
  frame: PresentationFrame
  scenario: Scenario
  setScenario?: (s: Scenario) => void
  playback?: ReactNode
  record?: (id: string) => ReactNode
  directory?: (choose: (id: string) => void, selectedId: string) => ReactNode
  comparison?: ReactNode
}
type Scene =
  | { kind: 'network' }
  | { kind: 'travel' | 'campus'; id: string }
  | { kind: 'follow'; id: string; origin: string }
const network: Scene = { kind: 'network' }
const standardMotion = () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function Dashboard({
  frame,
  scenario,
  setScenario,
  playback,
  record,
  directory,
  comparison,
}: Props) {
  const [selected, setSelected] = useState('nyc_bellevue')
  const [panel, setPanel] = useState<
    null | 'data' | 'directory' | 'compare' | 'about' | 'filters' | 'movements' | 'layers'
  >(null)
  const [filters, setFilters] = useState<CampusFilters>({})
  const [layers, setLayers] = useState(initialLayers)
  function toggleLayer(key: keyof VisibleLayers) {
    setLayers((old) => ({ ...old, [key]: !old[key] }))
  }
  const [big, setBig] = useState(false)
  const clock = useReplayClock()
  const [scene, setScene] = useState<Scene>(network)
  const [restoreView, setRestoreView] = useState<NetworkView>()
  const [subject, setSubject] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [orbit, setOrbit] = useState(true)
  const [movementScope, setMovementScope] = useState<string | null>(null)
  const currentView = useRef<NetworkView>({ camera: cityCamera, extent: 'city' })
  const saved = useRef<{
    view: NetworkView
    selected: string
    invoker: string
    element: HTMLElement | null
  } | null>(null)
  const directoryInvoker = useRef('Search campuses')
  const backButton = useRef<HTMLButtonElement>(null)
  const updateView = useCallback((view: NetworkView) => {
    currentView.current = view
  }, [])
  const arriveCampus = useCallback((id: string) => {
    setScene((old) => (old.kind === 'travel' && old.id === id ? { kind: 'campus', id } : old))
  }, [])
  function rememberView() {
    if (saved.current) return
    const invoker = document.querySelector('dialog[open]')
      ? directoryInvoker.current
      : document.activeElement?.getAttribute('aria-label')
    saved.current = {
      view: currentView.current,
      selected,
      invoker: invoker ?? 'Search campuses',
      element: document.activeElement instanceof HTMLElement ? document.activeElement : null,
    }
  }
  function returnToNetwork(restoreFocus = true, keepPanel = false) {
    const prior = saved.current
    if (prior) {
      currentView.current = prior.view
      setSelected(prior.selected)
    }
    saved.current = null
    setRestoreView({ ...(prior?.view ?? currentView.current) })
    setScene(network)
    setSubject(null)
    if (!keepPanel) setPanel(null)
    if (restoreFocus)
      requestAnimationFrame(() => {
        const element =
          prior?.element?.isConnected && prior.element !== document.body
            ? prior.element
            : prior &&
              document.querySelector<HTMLElement>(`[aria-label="${CSS.escape(prior.invoker)}"]`)
        ;(element ?? document.querySelector<HTMLElement>('.search-launch'))?.focus({
          preventScroll: true,
        })
      })
  }
  function openDirectory(invoker: string) {
    directoryInvoker.current = invoker
    setPanel('directory')
  }
  function showMovements(scope: string | null = null) {
    setMovementScope(scope)
    setPanel('movements')
  }
  function stopGuidance() {
    if (scene.kind === 'follow' && focusedId) {
      setSelected(focusedId)
      setScene({ kind: 'campus', id: focusedId })
    } else {
      setScene(network)
    }
  }
  function inspectTrip(id: string) {
    if (scene.kind === 'follow' && scene.id !== id) stopGuidance()
    setSubject(id)
    setPanel(null)
    setSheetOpen(true)
  }
  function follow(id: string) {
    const episode = frame.episodes.find((e) => e.id === id)
    if (!episode) return
    rememberView()
    inspectTrip(id)
    setSelected(episode.origin)
    setScene({ kind: 'follow', id, origin: episode.origin })
  }
  function featured() {
    rememberView()
    setFilters({})
    setPanel(null)
    if (scenario !== 'baseline') setScenario?.('baseline')
    setSelected('nyc_bellevue')
    setSubject('EP-0190')
    setSheetOpen(true)
    setScene({ kind: 'follow', id: 'EP-0190', origin: 'nyc_bellevue' })
    clock.seek(9145)
    clock.setSpeed(360)
    clock.play()
  }
  function nextEvent() {
    if (!subject) return
    const recorded = getRun(scenario, DEFAULT_SEED)
      .at(DURATION)
      .episodes.find((e) => e.id === subject)
    if (!recorded) return
    const next = [
      recorded.ready,
      recorded.commit,
      recorded.departure,
      recorded.arrival,
      recorded.admission,
    ].find((t) => t !== null && t > frame.minute)
    if (next != null) clock.seek(next)
  }
  const inspected = subject ? frame.episodes.find((e) => e.id === subject) : undefined
  const following =
    scene.kind === 'follow' ? frame.transfers.find((t) => t.id === scene.id) : undefined
  const focusedId =
    scene.kind === 'campus'
      ? scene.id
      : scene.kind === 'follow' && !following
        ? inspected?.arrival != null
          ? inspected.destination
          : scene.origin
        : null
  const viewKind = focusedId ? 'campus' : following ? 'transfer' : 'network'
  const effectiveSelection = focusedId ?? selected
  const tripStage =
    inspected?.phase === 'transit'
      ? 'In transit'
      : inspected?.phase === 'handoff'
        ? 'Receiving handoff'
        : inspected?.phase === 'inpatient'
          ? 'Admitted to unit'
          : inspected?.phase === 'exited'
            ? 'Discharged'
            : inspected?.commit != null
              ? 'Slot reserved · at sending ED'
              : 'Placement search · at sending ED'
  const prevViewKind = useRef(viewKind)
  useEffect(() => {
    if (
      prevViewKind.current === 'network' &&
      viewKind !== 'network' &&
      !document.querySelector('dialog[open]')
    ) {
      backButton.current?.focus({ preventScroll: true })
    }
    prevViewKind.current = viewKind
  }, [viewKind])
  const stage = useRef<HTMLElement>(null)
  const mapExpand = useRef<HTMLButtonElement>(null)
  const results = filterCampuses(filters),
    ids = results.map((c) => c.id)
  const isFiltered = Object.values(filters).some(Boolean)
  const selectionVisible = ids.includes(effectiveSelection)
  const campus = campusById[effectiveSelection],
    pool = frame.pools[effectiveSelection]
  const focus = networkNodes.find((node) => node.id === effectiveSelection)!
  function select(id: string) {
    rememberView()
    setSubject(null)
    setSelected(id)
    setPanel(null)
    setScene({ kind: scene.kind === 'network' && standardMotion() ? 'travel' : 'campus', id })
  }
  function fromDirectory(id: string) {
    setBig(false)
    setFilters({})
    select(id)
  }
  function setFilter(updates: CampusFilters) {
    const next = { ...filters, ...updates }
    setFilters(next)
    const list = filterCampuses(next)
    const permitted = (id: string | null) => list.some((c) => c.id === id)
    if (
      !permitted(effectiveSelection) ||
      (inspected && !permitted(inspected.origin) && !permitted(inspected.destination))
    ) {
      returnToNetwork(false, true)
      if (list.length) setSelected(list[0].id)
    }
  }
  useEffect(() => {
    if (!big) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const background = document.querySelectorAll<HTMLElement>(
      '.console-bar,.instrument-deck,.system-foot,.skip',
    )
    background.forEach((element) => {
      element.inert = true
    })
    function key(event: KeyboardEvent) {
      if (document.querySelector('dialog[open]')) return
      if (event.key === 'Escape') {
        setBig(false)
        mapExpand.current?.focus()
      }
      if (event.key !== 'Tab' || !stage.current) return
      const controls = [
        ...stage.current.querySelectorAll<HTMLElement>(
          'button:not(:disabled),select,input,[tabindex="0"]',
        ),
      ].filter((el) => el.getClientRects().length)
      const first = controls[0],
        last = controls.at(-1)
      if (event.shiftKey && document.activeElement === first && last) {
        event.preventDefault()
        last.focus()
      }
      if (!event.shiftKey && document.activeElement === last && first) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', key)
    return () => {
      window.removeEventListener('keydown', key)
      document.body.style.overflow = previousOverflow
      background.forEach((element) => {
        element.inert = false
      })
    }
  }, [big])
  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === 'k' &&
        directory &&
        !document.querySelector('dialog[open]')
      ) {
        event.preventDefault()
        openDirectory('Search campuses')
      }
    }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
  }, [directory])
  const transfers = frame.transfers
  const related = transfers.filter(
    (t) => t.from === effectiveSelection || t.to === effectiveSelection,
  )
  return (
    <>
      <a className="skip" href="#overview">
        Skip to observatory
      </a>
      <header className="console-bar">
        <div className="brand">
          <img src="./atlas.svg" width="31" height="31" alt="" />
          <strong>Flow Atlas</strong>
        </div>
        <div className="product-label">Psychiatric operations</div>
        <nav className="workspaces" aria-label="Workspace">
          {directory && (
            <button aria-label="Campuses" onClick={() => openDirectory('Campuses')}>
              <Building2 size={14} /> Campuses
            </button>
          )}
          {comparison && (
            <button onClick={() => setPanel('compare')}>
              <GitCompareArrows size={14} /> Scenario lab
            </button>
          )}
        </nav>
        <div className="bar-tools">
          <span className="run-meta">{runStamp}</span>
          {directory && (
            <button
              className="search-launch"
              onClick={() => openDirectory('Search campuses')}
              aria-label="Search campuses"
              aria-keyshortcuts="Control+K Meta+K"
            >
              <Search size={14} />
              <span>Search campuses</span>
              <kbd aria-hidden="true">{searchShortcut}</kbd>
            </button>
          )}
          <span className="sim-badge">
            <i /> <span>Simulated replay</span>
          </span>
          <ThemeControl />
          <button
            className="help"
            aria-label="About the simulation"
            onClick={() => setPanel('about')}
          >
            <CircleHelp size={17} />
          </button>
        </div>
      </header>
      <main className="console-layout" id="overview">
        <section
          ref={stage}
          role={big ? 'dialog' : undefined}
          aria-modal={big || undefined}
          aria-label="Geographic network"
          className={'network-stage' + (big ? ' map-expanded' : '')}
        >
          <header className="stage-head">
            <div className="scene-name">
              <div className="scene-scope">
                <span />
                NEW YORK METRO <b>/</b>{' '}
                {focusedId ? 'CAMPUS FOCUS' : following ? 'TRANSFER FOLLOW' : 'NETWORK OVERVIEW'}
              </div>
              <h1>
                {focusedId
                  ? focus.name
                  : following
                    ? `${campusById[following.from].shortName} → ${campusById[following.to].shortName}`
                    : 'Patient flow observatory'}
              </h1>
            </div>
            <div className="scene-tools">
              <label className="scenario-select">
                <FlaskConical size={15} />
                {setScenario ? (
                  <select
                    aria-label="Scenario"
                    value={scenario}
                    onChange={(e) => {
                      returnToNetwork(false)
                      setScenario(e.target.value as Scenario)
                    }}
                  >
                    {Object.entries(scenarioNames).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span>Baseline</span>
                )}
                <ChevronDown size={12} />
              </label>
              <button
                className={'tool-btn filter-action' + (isFiltered ? ' is-filtered' : '')}
                onClick={() => setPanel('filters')}
                aria-label={
                  'Filters' +
                  (isFiltered ? ' · ' + Object.values(filters).filter(Boolean).length : '')
                }
              >
                <ListFilter size={15} />
                <span>Filters</span>
                {isFiltered && <b>{Object.values(filters).filter(Boolean).length}</b>}
              </button>
              <button
                className="icon-btn layer-action"
                aria-label="Map layers"
                onClick={() => setPanel('layers')}
              >
                <Layers size={15} />
              </button>
              <button
                className="icon-btn"
                ref={mapExpand}
                aria-label={big ? 'Exit expanded map' : 'Expand map'}
                onClick={() => setBig(!big)}
              >
                {big ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>
            </div>
          </header>
          <div className="geo-board" data-view={viewKind}>
            <div className="metric-overlay">
              <NetworkMetrics frame={frame} />
            </div>
            <div className="map-canvas">
              <GeoMap
                suspended={Boolean(focusedId)}
                restoreView={restoreView}
                initialView={saved.current?.view ?? currentView.current}
                following={following}
                onViewChange={updateView}
                travelTo={scene.kind === 'travel' ? scene.id : null}
                onTravelEnd={arriveCampus}
                onSources={() => setPanel('about')}
                onStopFollowing={stopGuidance}
                facilities={networkNodes}
                layers={layers}
                selectedPool={selectionVisible ? pool : undefined}
                selectedId={selectionVisible ? effectiveSelection : ''}
                onSelect={select}
                onTransferSelect={inspectTrip}
                transfers={
                  focusedId
                    ? []
                    : [...transfers, ...frame.recentTransfers.map((t) => ({ ...t, recent: true }))]
                }
                referrals={
                  focusedId
                    ? []
                    : frame.referrals
                        .filter(
                          (r) =>
                            r.status === 'pending' && (r.from === selected || r.to === selected),
                        )
                        .map((r) => ({ from: r.from, to: r.to }))
                }
                visibleIds={ids}
              />

              {focusedId && (
                <CampusScene
                  key={focusedId}
                  campus={campusById[focusedId]}
                  transfers={frame.transfers}
                  onInspectTransfer={inspectTrip}
                  onManualCamera={scene.kind === 'follow' ? stopGuidance : undefined}
                  orbitEnabled={orbit}
                  onOrbitChange={setOrbit}
                />
              )}

              {saved.current && (
                <button
                  ref={backButton}
                  className="view-back"
                  aria-label="Back to previous view"
                  onClick={() => returnToNetwork()}
                >
                  <ArrowLeft size={15} /> Back to network
                </button>
              )}
              {focusedId && (
                <div className="focus-locator">
                  <RegionLocator selectedId={focusedId} />
                </div>
              )}
              {subject && inspected && (
                <div className="journey-status">
                  <span>{subject}</span>
                  <i />
                  <strong>{tripStage}</strong>
                  {viewKind === 'transfer' && <small>Schematic connection</small>}
                  {inspected.phase === 'handoff' && <small>Destination slot held</small>}
                </div>
              )}
              {viewKind === 'network' && !transfers.length && (
                <div className="quiet-map">
                  <b>No transfers in transit</b>
                  {frame.events[0] && (
                    <span>
                      Last event · {clockLabel(frame.events[0].time)} · {frame.events[0].label}
                    </span>
                  )}
                </div>
              )}

              {!ids.length && (
                <div className="map-empty">
                  No matching campuses <button onClick={() => setFilters({})}>Clear filters</button>
                </div>
              )}
            </div>
          </div>
          <div className="transport-strip">
            {playback}
            <button
              className="motion-pause"
              onClick={() => {
                clock.pause()
                setOrbit(false)
              }}
              aria-label="Pause motion"
              title="Pause replay and orbit"
            >
              <Pause size={14} />
              <span>Pause motion</span>
            </button>
            <button className="watch-feature" onClick={featured}>
              <Play size={13} fill="currentColor" />
              {frame.minute === DURATION || (subject === 'EP-0190' && inspected?.admission != null)
                ? 'Replay featured transfer'
                : 'Watch featured transfer'}
              {scenario !== 'baseline' && <small> · Baseline</small>}
            </button>
          </div>
          <div className="mobile-run-meta">{runStamp}</div>
        </section>
        <div className="instrument-deck">
          <section
            className={'subject-panel' + (sheetOpen ? ' open' : '')}
            aria-label="Map subject"
          >
            <button
              className="subject-toggle"
              aria-label={sheetOpen ? 'Hide subject details' : 'Show subject details'}
              aria-expanded={sheetOpen}
              onClick={() => setSheetOpen(!sheetOpen)}
            >
              <span>{subject ? `Transfer · ${subject}` : focus.name}</span>
              <ChevronUp size={16} />
            </button>
            <div className="subject-content">
              {subject ? (
                <TransferInspector
                  frame={frame}
                  episodeId={subject}
                  following={scene.kind === 'follow'}
                  onFollow={() => follow(subject)}
                  onExit={() => (scene.kind === 'follow' ? returnToNetwork() : setSubject(null))}
                  onStopFollowing={stopGuidance}
                  onSeek={clock.seek}
                  onNextEvent={nextEvent}
                  onInspectOrigin={select}
                  onInspectDestination={select}
                />
              ) : (
                <>
                  <CampusInspector
                    campus={campus}
                    focus={focus}
                    pool={pool}
                    openReferrals={
                      frame.referrals.filter(
                        (r) => r.status === 'pending' && r.from === effectiveSelection,
                      ).length
                    }
                    relatedCount={related.length}
                    selectionVisible={selectionVisible}
                    onRecord={record ? () => setPanel('data') : undefined}
                    onMovements={() => showMovements(effectiveSelection)}
                  />

                  {selectionVisible && (
                    <div className="subject-links">
                      {!focusedId && (
                        <button onClick={() => select(effectiveSelection)}>
                          <MapPin size={13} /> Explore campus
                        </button>
                      )}
                      {related.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => follow(t.id)}
                          aria-label={'Follow transfer ' + t.id}
                        >
                          <Navigation2 size={13} /> Follow transfer <small>{t.id}</small>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
          <Instruments
            frame={frame}
            selectedId={effectiveSelection}
            visibleIds={isFiltered ? ids : undefined}
            onSelect={select}
          />
        </div>
      </main>
      <footer className="system-foot">
        <span>
          <i />
          Public facility information · Simulated operations
        </span>
        <span className="region-readout">
          <LocateFixed size={12} />
          {ids.length} of {campuses.length} campuses
        </span>
        <span>{runStamp}</span>
      </footer>
      {panel && (
        <Modal
          title={
            {
              about: 'About Flow Atlas',
              layers: 'Map layers',
              data: 'Campus record',
              directory: 'Campus directory',
              filters: 'Network filters',
              compare: 'Scenario lab',
              movements: 'Schematic transfers',
            }[panel]
          }
          wide={panel === 'compare' || panel === 'directory' || panel === 'data'}
          onClose={() => setPanel(null)}
        >
          {panel === 'directory' && directory?.(fromDirectory, selected)}
          {panel === 'data' && record?.(effectiveSelection)}
          {panel === 'compare' && comparison}
          {panel === 'about' && <About />}
          {panel === 'layers' && (
            <LayerControls
              layers={layers}
              onToggle={toggleLayer}
              onMovements={() => showMovements()}
              activeCount={transfers.length}
            />
          )}
          {panel === 'filters' && (
            <>
              <h2>Filter campuses</h2>
              <p>Filters narrow the map and lists. Summary metrics cover all 23 campuses.</p>
              <div className="filter-form">
                <label>
                  Search
                  <input
                    placeholder="Name, address or service"
                    type="search"
                    value={filters.query ?? ''}
                    onChange={(e) => setFilter({ query: e.target.value })}
                  />
                </label>
                <label>
                  Borough or county
                  <select
                    value={filters.borough ?? ''}
                    onChange={(e) => setFilter({ borough: e.target.value })}
                  >
                    <option value="">All areas</option>
                    {boroughs.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Published service
                  <select
                    value={filters.service ?? ''}
                    onChange={(e) => setFilter({ service: e.target.value })}
                  >
                    <option value="">All services</option>
                    {serviceTypes.map((v) => (
                      <option key={v} value={v}>
                        {humanize(v)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Program population
                  <select
                    value={filters.population ?? ''}
                    onChange={(e) => setFilter({ population: e.target.value })}
                  >
                    <option value="">All program populations</option>
                    {programPopulations.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Published sponsor
                  <select
                    value={filters.sponsor ?? ''}
                    onChange={(e) => setFilter({ sponsor: e.target.value })}
                  >
                    <option value="">All sponsors</option>
                    {allSponsors.map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="filter-foot">
                <button className="tool-btn" onClick={() => setFilters({})}>
                  Clear filters
                </button>
                <button className="dark-btn" onClick={() => setPanel(null)}>
                  Show {ids.length} campuses <ArrowRight size={14} />
                </button>
              </div>
            </>
          )}
          {panel === 'movements' && (
            <Movements frame={frame} scope={movementScope} onInspect={inspectTrip} />
          )}
        </Modal>
      )}
    </>
  )
}
