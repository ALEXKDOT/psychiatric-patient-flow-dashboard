import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Radar,
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
import { GeoMap } from './GeoMap'
import { Movements } from './Movements'
import { Instruments } from './Instruments'
import { Modal } from './ui'
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
import { DEFAULT_SEED, MODEL_VERSION, type Frame, type Scenario } from './sim'

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
  frame: Frame
  scenario: Scenario
  setScenario?: (s: Scenario) => void
  playback?: ReactNode
  record?: (id: string) => ReactNode
  directory?: (choose: (id: string) => void, selectedId: string) => ReactNode
  comparison?: ReactNode
  onInspect?: () => void
}
export function Dashboard({
  frame,
  scenario,
  setScenario,
  playback,
  record,
  directory,
  comparison,
  onInspect,
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
  const [chosenTrip, setChosenTrip] = useState<string | null>(null)
  const [movementScope, setMovementScope] = useState<string | null>(null)
  function showMovements(id: string | null = null, scope: string | null = null) {
    setChosenTrip(id)
    setMovementScope(scope)
    onInspect?.()
    setPanel('movements')
  }
  const stage = useRef<HTMLElement>(null)
  const mapExpand = useRef<HTMLButtonElement>(null)
  const results = filterCampuses(filters),
    ids = results.map((c) => c.id)
  const isFiltered = Object.values(filters).some(Boolean)
  const selectionVisible = ids.includes(selected)
  const campus = campusById[selected],
    pool = frame.pools[selected]
  const focus = networkNodes.find((node) => node.id === selected)!
  function select(id: string) {
    setSelected(id)
    setPanel(null)
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
    if (list.length && !list.some((c) => c.id === selected)) setSelected(list[0].id)
  }
  useEffect(() => {
    if (!big) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const background = document.querySelectorAll<HTMLElement>(
      '.console-bar,.control-rail,.instruments,.system-foot,.skip',
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
        setPanel('directory')
      }
    }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
  }, [directory])
  const transfers = frame.transfers
  const related = transfers.filter((t) => t.from === selected || t.to === selected)
  return (
    <>
      <a className="skip" href="#overview">
        Skip to observatory
      </a>
      <header className="console-bar">
        <div className="brand">
          <img src="/atlas.svg" width="31" height="31" alt="" />
          <strong>Flow Atlas</strong>
        </div>
        <div className="product-label">Psychiatric operations</div>
        <div className="bar-tools">
          <span className="run-meta">{runStamp}</span>
          {directory && (
            <button
              className="search-launch"
              onClick={() => setPanel('directory')}
              aria-label="Search campuses"
              aria-keyshortcuts="Control+K Meta+K"
            >
              <Search size={14} />
              <span>Search campuses</span>
              <kbd aria-hidden="true">{searchShortcut}</kbd>
            </button>
          )}
          <span className="sim-badge">
            <i /> <span>Simulated operations</span>
          </span>
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
        <div className="control-rail">
          <nav className="rail-nav" aria-label="Workspace">
            <h2 className="rail-caption">Workspace</h2>
            <button
              className="nav-current"
              aria-current="page"
              onClick={() => {
                setPanel(null)
                document.getElementById('overview')?.scrollIntoView()
              }}
            >
              <Radar />
              Observatory
            </button>
            {directory && (
              <button onClick={() => setPanel('directory')} aria-label="Campuses">
                <Building2 />
                Campuses <small>{campuses.length}</small>
              </button>
            )}
            {comparison && (
              <button onClick={() => setPanel('compare')}>
                <GitCompareArrows />
                Scenario lab
              </button>
            )}
          </nav>
          <div className="rail-layers">
            <LayerControls
              layers={layers}
              onToggle={toggleLayer}
              onMovements={() => showMovements()}
              activeCount={transfers.length}
            />
          </div>
          <CampusInspector
            campus={campus}
            focus={focus}
            pool={pool}
            openReferrals={
              frame.referrals.filter((r) => r.status === 'pending' && r.from === selected).length
            }
            relatedCount={related.length}
            selectionVisible={selectionVisible}
            onRecord={record ? () => setPanel('data') : undefined}
            onMovements={() => showMovements(null, selected)}
          />

          <RegionLocator selectedId={selectionVisible ? selected : null} />
          <div className="rail-foot">
            <span>Source snapshot</span>
            <time dateTime={DATA_VERSION}>{DATA_VERSION}</time>
          </div>
        </div>
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
                NEW YORK METRO <b>/</b> ADULT PSYCHIATRY
              </div>
              <h1>Patient flow observatory</h1>
            </div>
            <div className="scene-tools">
              <label className="scenario-select">
                <FlaskConical size={15} />
                {setScenario ? (
                  <select
                    aria-label="Scenario"
                    value={scenario}
                    onChange={(e) => setScenario(e.target.value as Scenario)}
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
          <div className="geo-board">
            <div className="metric-overlay">
              <NetworkMetrics frame={frame} />
            </div>
            <div className="map-canvas">
              <GeoMap
                facilities={networkNodes}
                layers={layers}
                selectedPool={selectionVisible ? pool : undefined}
                selectedId={selectionVisible ? selected : ''}
                onSelect={select}
                onTransferSelect={(id) => showMovements(id)}
                transfers={[
                  ...transfers,
                  ...frame.recentTransfers.map((t) => ({ ...t, recent: true })),
                ]}
                referrals={frame.referrals
                  .filter(
                    (r) => r.status === 'pending' && (r.from === selected || r.to === selected),
                  )
                  .map((r) => ({ from: r.from, to: r.to }))}
                visibleIds={ids}
              />

              {!ids.length && (
                <div className="map-empty">
                  No matching campuses <button onClick={() => setFilters({})}>Clear filters</button>
                </div>
              )}
            </div>
          </div>
          {playback}
          <div className="mobile-run-meta">{runStamp}</div>
        </section>
        <Instruments
          frame={frame}
          selectedId={selected}
          visibleIds={isFiltered ? ids : undefined}
          onSelect={select}
        />
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
          {panel === 'data' && record?.(selected)}
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
            <Movements frame={frame} chosenTrip={chosenTrip} scope={movementScope} />
          )}
        </Modal>
      )}
    </>
  )
}
