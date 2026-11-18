import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Activity,
  ArrowUpRight,
  ArrowRight,
  Building2,
  ChevronDown,
  CircleHelp,
  FlaskConical,
  GitCompareArrows,
  ListFilter,
  Map as MapIcon,
  Maximize2,
  Minimize2,
} from 'lucide-react'
import { GeoMap } from './GeoMap'
import { Movements } from './Movements'
import { Instruments } from './Instruments'
import { Modal } from './ui'
import { NetworkMetrics } from './NetworkMetrics'
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
import type { Frame, Scenario } from './sim'

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
    null | 'data' | 'directory' | 'compare' | 'about' | 'filters' | 'movements'
  >(null)
  const [filters, setFilters] = useState<CampusFilters>({})
  const [big, setBig] = useState(false)
  const [chosenTrip, setChosenTrip] = useState<string | null>(null)
  const [movementScope, setMovementScope] = useState<string | null>(null)
  function showMovements(id: string | null = null, scope: string | null = null) {
    setChosenTrip(id)
    setMovementScope(scope)
    onInspect?.()
    setPanel('movements')
  }
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
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('dialog[open]')) {
        setBig(false)
        mapExpand.current?.focus()
      }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [big])
  const transfers = frame.transfers
  const related = transfers.filter((t) => t.from === selected || t.to === selected)
  return (
    <>
      <a className="skip" href="#overview">
        Skip to observatory
      </a>
      <header className="mast">
        <div className="mast-inner">
          <div className="brand">
            <img src="/atlas.svg" alt="" width="34" height="34" />
            <strong>Flow Atlas</strong>
          </div>
          <nav aria-label="Workspace">
            <button
              className="nav-active"
              onClick={() => {
                setPanel(null)
                document.getElementById('overview')?.scrollIntoView()
              }}
            >
              <Activity />
              Observatory
            </button>
            {directory && (
              <button onClick={() => setPanel('directory')}>
                <Building2 />
                Campuses
              </button>
            )}
            {comparison && (
              <button onClick={() => setPanel('compare')}>
                <GitCompareArrows />
                Scenario lab
              </button>
            )}
          </nav>
          <div className="mast-end">
            <span className="status-lamp" />
            <span className="mast-status">Simulated operations</span>
            <span className="mast-mobile">Simulation</span>{' '}
            <button
              onClick={() => setPanel('about')}
              className="help"
              aria-label="About the simulation"
            >
              <CircleHelp size={17} />
            </button>
          </div>
        </div>
      </header>
      <main className="page" id="overview">
        <div className="intro">
          <div>
            <div className="eyebrow region">
              <span />
              NEW YORK REGION / ADULT PSYCHIATRY
            </div>
            <h1>Patient flow observatory</h1>
            <p>
              Public facility information <span aria-hidden="true">·</span> Simulated operations
            </p>
          </div>
          <div className="scenario-block">
            <div className="scenario-select">
              <FlaskConical size={18} />
              <div>
                <span className="eyebrow">Scenario</span>
                {setScenario ? (
                  <select
                    aria-label="Scenario"
                    value={scenario}
                    onChange={(e) => setScenario(e.target.value as Scenario)}
                  >
                    {Object.entries(scenarioNames).map(([key, v]) => (
                      <option key={key} value={key}>
                        {v}
                      </option>
                    ))}
                  </select>
                ) : (
                  <strong>Baseline</strong>
                )}
              </div>
              {setScenario && <ChevronDown size={14} />}
            </div>
            <span className="provenance-top">Seed 42 · FLOW-1.0 · 2026-11-18</span>
          </div>
        </div>
        <NetworkMetrics frame={frame} />
        <div className="workbench">
          <section
            aria-label="Geographic network"
            className={'map-panel panel' + (big ? ' map-expanded' : '')}
          >
            <header className="map-title">
              <div>
                <MapIcon size={18} />
                <h2>Campus network</h2>
                <span className="counter">
                  {isFiltered ? ids.length + ' / ' : ''}
                  {campuses.length} sites
                </span>
              </div>
              <div>
                <button
                  className={'tool-btn' + (isFiltered ? ' is-filtered' : '')}
                  onClick={() => setPanel('filters')}
                >
                  <ListFilter size={15} />
                  Filters{isFiltered ? ' · ' + Object.values(filters).filter(Boolean).length : ''}
                </button>
                <button
                  className="icon-btn"
                  ref={mapExpand}
                  onClick={() => setBig(!big)}
                  aria-label={big ? 'Exit expanded map' : 'Expand map'}
                >
                  {big ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                </button>
              </div>
            </header>
            <div className="map-canvas">
              <GeoMap
                facilities={networkNodes}
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
            <div className="legend">
              <span>
                <i className="campus-dot" />
                Campus
              </span>
              <span>
                <i className="selected-dot" />
                Selected
              </span>
              <button onClick={() => showMovements()}>
                <i className="route-line" />
                Schematic transfer <ArrowUpRight size={11} />
              </button>
              <span className="trail-key">
                <i />
                Recent · 2h
              </span>
              <span className="ref-key">
                <i />
                Referral
              </span>
            </div>
            {playback}
          </section>
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
        </div>
        <Instruments
          frame={frame}
          selectedId={selected}
          visibleIds={isFiltered ? ids : undefined}
          onSelect={select}
        />
        <footer>
          <span>
            <i />
            Public facility information · Simulated operations
          </span>
          <span>
            {scenarioNames[scenario]} / SEED 42 / MODEL 1.0 / DATA {DATA_VERSION}
          </span>
        </footer>
      </main>
      {panel && (
        <Modal
          title={
            {
              about: 'About Flow Atlas',
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
