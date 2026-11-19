import { ChevronRight } from 'lucide-react'
import { campusTargets } from './cartography/campusPacks'

export function ExteriorEvidence({ campusId }: { campusId: string }) {
  const t = campusTargets[campusId]
  const county = t.publisher_feature_key === 'Westchester Buildings objectid'
  const shapeUrl = county
    ? 'https://giswww.westchestergov.com/arcgis/rest/services/DataHub_BasemapPlanimetrics/MapServer/5'
    : 'https://data.cityofnewyork.us/City-Government/Building-Footprints/5zhs-2jue'
  return (
    <details className="ev-item">
      <summary>
        <span>
          <strong>Mapped exterior</strong>
          <small>{t.target_label}</small>
        </span>
        <ChevronRight size={16} aria-hidden="true" />
      </summary>
      <dl>
        <div className="ev-fact">
          <dt>Geometry source</dt>
          <dd>
            <a href={shapeUrl} target="_blank" rel="noreferrer">
              {county ? 'Westchester County GIS' : 'NYC Office of Technology and Innovation'}
            </a>{' '}
            · {t.publisher_feature_key} {t.feature_id}
          </dd>
        </div>
        {t.bin && (
          <div className="ev-fact">
            <dt>Building identifiers</dt>
            <dd>
              BIN {t.bin} · BBL {t.bbl} · OTI ID {t.doitt_id}
            </dd>
          </div>
        )}
        <div className="ev-fact">
          <dt>Exterior identification</dt>
          <dd>
            <a href={t.evidence_url} target="_blank" rel="noreferrer">
              {t.evidence_type}
            </a>
            . {t.note}
          </dd>
        </div>
        <div className="ev-fact">
          <dt>Window and trim detail</dt>
          <dd>
            Illustrative pattern generated from wall length and height. No surveyed façade is on
            file.
          </dd>
        </div>
        <div className="ev-fact">
          <dt>Footprint record height</dt>
          <dd>{t.recorded_height_m == null ? 'Unknown' : t.recorded_height_m + ' m'}</dd>
        </div>
        <div className="ev-fact">
          <dt>Approximate display height</dt>
          <dd>
            {t.display_height_m == null ? 'Unknown' : t.display_height_m + ' m'}.{' '}
            {t.display_height_basis}
            {t.height_evidence_url && (
              <>
                {' '}
                <a href={t.height_evidence_url} target="_blank" rel="noreferrer">
                  Height records
                </a>
              </>
            )}
          </dd>
        </div>
        {campusId === 'nyc_queens' && (
          <div className="ev-fact">
            <dt>Height comparison</dt>
            <dd>
              The footprint reports a 103 ft roof height. Nine DOB records report a 96 ft existing
              building height. The map uses the footprint estimate.{' '}
              <a
                href="https://data.cityofnewyork.us/resource/w9ak-ipjd.json?bin=4442433&amp;%24select=job_filing_number,existing_height"
                target="_blank"
                rel="noreferrer"
              >
                DOB filings
              </a>
            </dd>
          </div>
        )}
        <div className="ev-fact">
          <dt>Map location</dt>
          <dd>
            The campus view focuses on a point inside this exterior polygon. The regional campus
            marker retains the published OMH program coordinates. Transfer endpoints represent
            simulated events.
          </dd>
        </div>
      </dl>
    </details>
  )
}
