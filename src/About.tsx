import terrainAttribution from '../docs/attribution/terrain.md?url'
import westchesterNotes from '../docs/attribution/campuses/westchester.md?url'
import shorelineGeometry from './cartography/tidal-water.json?url'
import shorelineLicense from './cartography/licenses/GSHHG-COPYING.LESSER.txt?url'
import incorporatedTerms from './cartography/licenses/GSHHG-COPYING.txt?url'

export function About() {
  return (
    <>
      <h2>Flow Atlas</h2>
      <p>
        Explore 23 publicly documented psychiatric campuses and a synthetic adult inpatient
        placement pathway in New York City and Westchester.
      </p>
      <h3>Reading the observatory</h3>
      <p>
        Campus locations and service descriptions come from the research snapshot dated November 18,
        2026. Each campus record includes its sources. Real psychiatric availability is unknown.
      </p>
      <p>
        Queue, capacity and movements come from an undated seven-day simulation for ages 18–64. Each
        request belongs to one episode, and a simulated transfer begins at ED departure. Connections
        show endpoints only.
      </p>
      <details className="method">
        <summary>Model assumptions and data sources</summary>
        <p>
          Seed 42 begins with 120 simulated days of warm-up. Each of 23 campuses has one pool of 24
          synthetic slots. Dispositions arrive at a fixed average rate of 0.90 × 552 / 16.5, about
          30 per day, spread equally across 18 modeled origins.
        </p>
        <p>
          NYC DOHMH reported a median inpatient stay of 11 days and a mean of 16.5 days for NYC
          residents aged 18+ hospitalized in NYC acute-care hospitals in 2023. The demo assumes a
          lognormal stay with those values. Its age range, campus sample and distribution are
          modeling choices.{' '}
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
