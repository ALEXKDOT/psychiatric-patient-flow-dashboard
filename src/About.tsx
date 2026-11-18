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
          The geographic field combines U.S. Census Bureau boundaries and block groups, NYC
          Department of City Planning borough shorelines, and GSHHG shorelines by Paul Wessel and
          Walter H. F. Smith. The regional water mask adapts GSHHG under LGPL 3.0 or later.{' '}
          <a href={shorelineLicense} target="_blank" rel="noreferrer">
            Shoreline license
          </a>
          {' · '}
          <a href={incorporatedTerms} target="_blank" rel="noreferrer">
            Incorporated GPL terms
          </a>
        </p>
      </details>
    </>
  )
}
