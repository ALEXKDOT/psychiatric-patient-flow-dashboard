import terrainAttribution from '../docs/attribution/terrain.md?url'
import westchesterNotes from '../docs/attribution/campuses/westchester.md?url'
import shorelineGeometry from './cartography/tidal-water.json?url'
import shorelineLicense from './cartography/licenses/GSHHG-COPYING.LESSER.txt?url'
import incorporatedTerms from './cartography/licenses/GSHHG-COPYING.txt?url'
import { campusCapacity, publishedBedSubtotal } from './capacity'

export function About() {
  const adult = publishedBedSubtotal('adult_beds')
  const cap = publishedBedSubtotal('cap_beds')
  const sites = Object.keys(campusCapacity).length
  return (
    <>
      <h2>Flow Atlas</h2>
      <p>
        Explore 23 publicly documented psychiatric campuses and a synthetic adult and
        child/adolescent inpatient placement pathway in New York City and Westchester.
      </p>
      <h3>Published psychiatric bed capacity</h3>
      <p>
        On July 1, 2026, the mapped campuses with known allocations accounted for{' '}
        <strong>{adult.beds.toLocaleString('en-US')} adult inpatient psychiatric beds</strong> (
        {adult.campuses} of {sites} campuses) and {cap.beds} child/adolescent beds ({cap.campuses}{' '}
        of {sites} campuses). The region includes White Plains. Allen and Columbia share a hospital
        report with an unresolved adult split.
      </p>
      <p>
        Psychiatric capacity includes specialty units. The number staffed, vacant and accepting
        general ED transfers today is unknown. Each campus record identifies its reporting row.{' '}
        <a href={campusCapacity.nyc_bellevue.source_url} target="_blank" rel="noreferrer">
          NYS OMH Table 5
        </a>
      </p>
      <h3>Reading the observatory</h3>
      <p>
        Campus locations and service descriptions come from the research snapshot dated November 18,
        2026. Each campus record includes its sources. Real psychiatric availability is unknown.
      </p>
      <p>
        Available beds, ED boarders and movements come from a seven-day simulation. CAP means child
        and adolescent psychiatry. The campus record lists published capacities and their sources.
        Each request belongs to one episode, and a simulated transfer begins at ED departure.
        Connections show endpoints only.
      </p>
      <details className="method">
        <summary>Model assumptions and data sources</summary>
        <p>
          Seed 42 begins with 120 simulated days of warm-up. Adult and CAP beds are modeled
          separately using published psychiatric counts. The replay treats beds within each age
          group as interchangeable. Actual specialty restrictions and staffing are unknown. About 30
          synthetic episodes arrive per day across 18 modeled ED origins. Approximately 15% use CAP
          beds. The model counts simulated patients only and has no live census or staffing feed.
        </p>
        <p>
          NYC DOHMH reported a median inpatient stay of 11 days and a mean of 16.5 days for NYC
          residents aged 18+ hospitalized in NYC acute-care hospitals in 2023. The demo assumes a
          lognormal stay with those values. Applying this stay distribution to both simulated age
          groups is a modeling choice.{' '}
          <a
            href="https://www.nyc.gov/assets/doh/downloads/pdf/epi/databrief154-mental-health-hospitalization-2026.pdf"
            target="_blank"
            rel="noreferrer"
          >
            DOHMH data brief, table 2
          </a>
        </p>
        <p>
          Days and times are relative to the simulation. Speed 360× advances six simulated minutes
          per second. Reset returns to the common start. The target button seeks to a sample
          transfer.
        </p>
        <p>
          Regional geography uses U.S. Census Bureau boundaries and TIGERweb major roads, NYC
          Department of City Planning borough shorelines, and GSHHG shorelines by Paul Wessel and
          Walter H. F. Smith. The water mask adapts GSHHG under LGPL 3.0 or later.{' '}
          <a href={shorelineGeometry} download="tidal-water.geojson">
            Download shoreline geometry
          </a>
          {' · '}
          <a href={shorelineLicense} target="_blank" rel="noreferrer">
            Shoreline license
          </a>
          {' · '}
          <a href={incorporatedTerms} target="_blank" rel="noreferrer">
            Incorporated GPL terms
          </a>
        </p>
        <p>
          The main map uses local TIGER/Line streets, park boundaries and inland water. The closest
          scale adds NYC Open Data building footprints and the mapped White Plains campus. Smaller
          buildings are omitted at this scale.{' '}
          <a
            href="https://www.census.gov/geographies/mapping-files/time-series/geo/tiger-line-file.html"
            target="_blank"
            rel="noreferrer"
          >
            Census TIGER/Line
          </a>
          {' · '}
          <a href="https://data.cityofnewyork.us/d/5zhs-2jue" target="_blank" rel="noreferrer">
            NYC building footprints
          </a>
        </p>
        <p>
          Ground elevation and hillshade use local Mapzen Terrain Tiles. United States 3DEP
          (formerly NED) and global GMTED2010 and SRTM terrain data courtesy of the U.S. Geological
          Survey.{' '}
          <a href={terrainAttribution} target="_blank" rel="noreferrer">
            Terrain source credits
          </a>
        </p>
        <p>
          New York City campus exteriors and streets come from NYC Open Data. Published roof heights
          and any documented alternatives appear in each campus record.{' '}
          <a href="https://data.cityofnewyork.us/d/5zhs-2jue" target="_blank" rel="noreferrer">
            Building footprints
          </a>
          {' · '}
          <a href="https://data.cityofnewyork.us/d/inkn-q76z" target="_blank" rel="noreferrer">
            Street centerlines
          </a>
        </p>
        <p>
          White Plains buildings and street geometry are provided by Westchester County GIS for
          general information. The county disclaims survey, engineering and site-specific accuracy.{' '}
          <a href={westchesterNotes} target="_blank" rel="noreferrer">
            County source, height basis and terms
          </a>
        </p>
      </details>
    </>
  )
}
