import { memo } from 'react'
import { campuses } from './data'
import landUrl from './cartography/locator-land.svg'
import './locator.css'

// The packaged locator plate shares this local equirectangular projection.
const latScale = 84 / (41.09 - 40.43)
const lonScale = latScale * Math.cos((40.75 * Math.PI) / 180)
const x = (lon: number) => (lon + 74.74) * lonScale
const y = (lat: number) => (41.09 - lat) * latScale
const nodes = campuses.map((c) => ({ ...c, x: x(c.lon), y: y(c.lat) }))
const meridians = [-74.5, -74, -73.5, -73]
const parallels = [40.5, 40.75, 41]

export const RegionLocator = memo(function RegionLocator({
  selectedId,
}: {
  selectedId: string | null
}) {
  const selected = nodes.find((node) => node.id === selectedId)
  const whitePlains = nodes.find((node) => node.id === 'ny_nyp_westchester_bh')!
  const title = `Regional locator showing ${nodes.length} campuses in New York City and White Plains.${
    selected ? ' Selected campus: ' + selected.shortName + ', ' + selected.borough + '.' : ''
  }`

  return (
    <section className="region-locator" aria-labelledby="locator-heading">
      <h2 id="locator-heading">Regional locator</h2>
      <svg className="locator-plate" viewBox="0 0 200 84" role="img" aria-label={title}>
        <image href={landUrl} width="200" height="84" />
        <g className="locator-grid" aria-hidden="true">
          {meridians.map((lon) => (
            <line key={lon} x1={x(lon)} x2={x(lon)} y1="0" y2="84" />
          ))}
          {parallels.map((lat) => (
            <line key={lat} x1="0" x2="200" y1={y(lat)} y2={y(lat)} />
          ))}
        </g>
        <g className="locator-coords" aria-hidden="true">
          <text x="2" y={y(41) - 2}>
            41°N
          </text>
          <text x={x(-74) + 2} y="81">
            74°W
          </text>
        </g>
        <g className="locator-nodes" aria-hidden="true">
          {nodes.map((node) => (
            <circle key={node.id} cx={node.x} cy={node.y} r="1.45" />
          ))}
        </g>
        <g className="locator-places" aria-hidden="true">
          <text x={whitePlains.x + 6} y={whitePlains.y + 2.5}>
            White Plains
          </text>
          <text x={x(-74.27)} y={y(40.7)} textAnchor="end">
            NYC
          </text>
        </g>
        {selected && (
          <g transform={`translate(${selected.x} ${selected.y})`} aria-hidden="true">
            <circle r="4.1" fill="none" stroke="#b3451a" strokeWidth=".75" />
            <circle r="2.6" fill="#bb4b19" stroke="#fff" strokeWidth=".8" />
          </g>
        )}
      </svg>
    </section>
  )
})
