import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowUpRight, BookOpen, Check, ChevronRight, MapPin, Search, X } from 'lucide-react'
import {
  boroughs,
  campuses,
  displayValue,
  filterCampuses,
  humanize,
  programPopulations,
  serviceTypes,
  sourceById,
  type Campus,
  type CampusFilters,
  type Program,
  type Service,
} from './data'
import './evidence.css'

function SourceLinks({ ids }: { ids: string }) {
  return (
    <span className="ev-citations">
      {ids.split(';').map((id) => {
        const source = sourceById[id]
        if (!source || !/^https?:\/\//.test(source.url)) return <span key={id}>{id}</span>
        return (
          <a
            href={source.url}
            target="_blank"
            rel="noreferrer"
            key={id}
            title={source.publisher + ' · ' + source.title}
            aria-label={id + ', ' + source.title + ' (opens in a new tab)'}
          >
            {id}
            <ArrowUpRight size={11} />
          </a>
        )
      })}
    </span>
  )
}
function Fact({ label, children, ids }: { label: string; children: ReactNode; ids?: string }) {
  return (
    <div className="ev-fact">
      <dt>{label}</dt>
      <dd>
        {children}
        {ids && (
          <>
            {' '}
            <SourceLinks ids={ids} />
          </>
        )}
      </dd>
    </div>
  )
}

function ProgramDetails({ p }: { p: Program }) {
  return (
    <details className="ev-item">
      <summary>
        <span>
          <strong>{p.program_name_as_published}</strong>
          <small>
            {p.omh_program_key} · {p.program_type}
          </small>
        </span>
        <ChevronRight size={16} />
      </summary>
      <dl>
        <Fact label="Published populations" ids={p.source_ids}>
          {p.populations_served_as_published}
        </Fact>
        <Fact label="Numeric age range">
          {displayValue(p.age_min_published)} to {displayValue(p.age_max_published)}
        </Fact>
        <Fact label="Program address">
          {[p.address1_as_published, p.address2_as_published, p.city, p.state, p.postal_code]
            .filter((t) => t && t !== 'UNKNOWN')
            .join(', ')}
        </Fact>
        <Fact label="Certificate number">{displayValue(p.exact_operating_certificate_number)}</Fact>
        <Fact label="Published capacity">{displayValue(p.published_capacity)}</Fact>
        <Fact label="Source row date">{p.row_created_date_time.split('T')[0]}</Fact>
        <Fact label="Scope">{p.notes}</Fact>
      </dl>
    </details>
  )
}
const evidenceStatus: Record<string, string> = {
  published_current_page: 'Listed on provider page',
  announced_opening_unconfirmed: 'Announced · opening unconfirmed',
  documented_in_FY2027_staffing_plan_current_operation_not_independently_verified:
    'Planning document · operation unconfirmed',
}
function ServiceDetails({ s }: { s: Service }) {
  const status =
    evidenceStatus[s.operating_status_evidence] ?? humanize(s.operating_status_evidence)
  return (
    <details className="ev-item">
      <summary>
        <span>
          <strong>{s.service_name}</strong>
          <small>
            {s.published_age_text} · {status}
          </small>
        </span>
        <ChevronRight size={16} />
      </summary>
      <dl>
        <Fact label="Evidence" ids={s.source_ids}>
          {status}
        </Fact>
        <Fact label="Service type">{humanize(s.service_type)}</Fact>
        <Fact label="Published age wording">{displayValue(s.published_age_text)}</Fact>
        <Fact label="Minimum / maximum age">
          {displayValue(s.age_min_published)} / {displayValue(s.age_max_published)}
        </Fact>
        <Fact label="Program link">
          {displayValue(s.linked_program_id)}. {s.program_link_status}
        </Fact>
        <Fact label="Published capacity">{displayValue(s.published_capacity)}</Fact>
        <Fact label="Scope">{s.notes}</Fact>
      </dl>
    </details>
  )
}

export function EvidenceRecord({ campus }: { campus: Campus }) {
  const r = campus.raw
  const sources = Array.from(
    new Set(
      [r, ...campus.services, ...campus.programs].flatMap((row) => row.source_ids.split(';')),
    ),
  )
  return (
    <article className="ev-record">
      <div className="ev-header">
        <span className="ev-kicker">
          <BookOpen size={14} /> Public facility record
        </span>
        <h2>{campus.name}</h2>
        <p>
          <MapPin size={14} />
          {r.address_line1}
          {r.address_line2 !== 'UNKNOWN' &&
            r.address_line2 !== 'NOT_APPLICABLE' &&
            ', ' + r.address_line2}
          , {r.city}, {r.state} {r.postal_code}
        </p>
      </div>
      <dl className="ev-summary">
        <Fact label="Geographic assignment" ids="MAP-014;MAP-018">
          {campus.borough} · {r.physical_county} County
        </Fact>
        <Fact label="Campus marker" ids={r.coordinate_source_id}>
          {r.latitude}, {r.longitude} · OMH record {r.coordinate_source_record}.{' '}
          {r.coordinate_accuracy}
        </Fact>
        <Fact label="Regulatory name" ids="DATA-001">
          {r.regulatory_facility_name}
        </Fact>
        <Fact label="Registry IDs" ids="DATA-001;DATA-002">
          OMH {r.omh_facility_code} · DOH {displayValue(r.doh_facility_id)}
        </Fact>
        <Fact label="DOH site correspondence">{r.doh_crosswalk_status}</Fact>
        <Fact label="Published sponsor" ids="DATA-001">
          {r.sponsor_name_as_published} ({r.sponsor_code_as_published})
        </Fact>
        <Fact label="Real bed availability">Unknown</Fact>
      </dl>
      <p className="ev-note">{r.notes}</p>
      <section>
        <h3>
          Program registry <span>{campus.programs.length}</span>
        </h3>
        {campus.programs.map((p) => (
          <ProgramDetails key={p.program_id} p={p} />
        ))}
      </section>
      <section>
        <h3>
          Provider service profiles <span>{campus.services.length}</span>
        </h3>
        {campus.services.length === 0 && (
          <p className="ev-note">
            This research snapshot has no separate provider profile for this campus. Its OMH program
            records appear above.
          </p>
        )}
        {campus.services.map((s) => (
          <ServiceDetails key={s.service_id} s={s} />
        ))}
      </section>
      <details className="ev-sources">
        <summary>Sources and dates ({sources.length})</summary>
        {sources.map((id) => {
          const source = sourceById[id]
          return (
            <div key={id}>
              <strong>{source.title}</strong> <SourceLinks ids={id} />
              <p>{source.publisher}</p>
              <small>
                Vintage · {displayValue(source.data_vintage)}
                <br />
                Updated · {displayValue(source.last_updated)}
                <br />
                Accessed · {source.access_date}
              </small>
            </div>
          )
        })}
      </details>
    </article>
  )
}

interface DirectoryProps {
  selectedId: string
  onSelect: (campusId: string) => void
  filters?: CampusFilters
  onFiltersChange?: (filters: CampusFilters) => void
}
const sponsorOptions = [
  ...new Map(
    campuses.map((c) => [c.raw.sponsor_code_as_published, c.raw.sponsor_name_as_published]),
  ).entries(),
].sort((a, b) => a[1].localeCompare(b[1]))

export function EvidenceDirectory({
  selectedId,
  onSelect,
  filters,
  onFiltersChange,
}: DirectoryProps) {
  const search = useRef<HTMLInputElement>(null)
  useEffect(() => {
    // The enclosing native dialog opens in its mount effect.
    const frame = requestAnimationFrame(() => search.current?.focus({ preventScroll: true }))
    return () => cancelAnimationFrame(frame)
  }, [])
  const [local, setLocal] = useState<CampusFilters>({})
  const current = filters ?? local
  const update = (next: CampusFilters) => {
    setLocal(next)
    onFiltersChange?.(next)
  }
  const results = filterCampuses(current)
  const active = Object.values(current).some(Boolean)
  return (
    <section className="ev-directory">
      <div className="ev-controls">
        <div className="ev-query">
          <Search size={17} />
          <input
            ref={search}
            type="text"
            role="searchbox"
            enterKeyHint="search"
            value={current.query ?? ''}
            aria-label="Search campus directory"
            placeholder="Campus, area, or service"
            onChange={(e) => update({ ...current, query: e.target.value })}
          />
        </div>
        <div className="ev-filters">
          <label>
            Area
            <select
              value={current.borough ?? ''}
              onChange={(e) => update({ ...current, borough: e.target.value })}
            >
              <option value="">All areas</option>
              {boroughs.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>
          </label>
          <label>
            Published service
            <select
              value={current.service ?? ''}
              onChange={(e) => update({ ...current, service: e.target.value })}
            >
              <option value="">All services</option>
              <optgroup label="OMH programs">
                {[...new Set(campuses.flatMap((c) => c.programs.map((p) => p.program_type)))]
                  .sort()
                  .map((p) => (
                    <option key={p}>{p}</option>
                  ))}
              </optgroup>
              <optgroup label="Provider profiles">
                {serviceTypes.map((s) => (
                  <option value={s} key={s}>
                    {humanize(s)}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>
          <label>
            OMH program population
            <select
              value={current.population ?? ''}
              onChange={(e) => update({ ...current, population: e.target.value })}
            >
              <option value="">All populations</option>
              {programPopulations.map((tag) => (
                <option key={tag}>{tag}</option>
              ))}
            </select>
          </label>
          <label>
            Published sponsor
            <select
              value={current.sponsor ?? ''}
              onChange={(e) => update({ ...current, sponsor: e.target.value })}
            >
              <option value="">All sponsors</option>
              {sponsorOptions.map(([id, name]) => (
                <option value={id} key={id}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className="ev-results">
        <div className="ev-result-count">
          <span aria-live="polite">
            {results.length} of {campuses.length} campuses
          </span>
          {active && (
            <button type="button" onClick={() => update({})}>
              <X size={12} />
              Clear filters
            </button>
          )}
        </div>
        <div className="ev-columnheads" aria-hidden="true">
          <span>Campus / address</span>
          <span>Area</span>
        </div>
        <ul aria-label="Facility results">
          {results.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                aria-current={c.id === selectedId || undefined}
                onClick={() => onSelect(c.id)}
              >
                <span>
                  <strong>{c.shortName}</strong>
                  <small>{c.raw.address_line1}</small>
                </span>
                <span className="ev-area">{c.borough}</span>
                {c.id === selectedId ? (
                  <Check size={16} aria-label="Selected" />
                ) : (
                  <ChevronRight size={16} />
                )}
              </button>
            </li>
          ))}
        </ul>
        {!results.length && <p className="ev-note">No campus matches these filters.</p>}
      </div>
    </section>
  )
}
