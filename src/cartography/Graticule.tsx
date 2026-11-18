import { memo } from 'react'
import { latitudeOf, mercatorLat } from './base'

interface Props {
  width: number
  height: number
  longitude: number
  latitude: number
  scale: number
}

function degreeLabel(value: number, axis: 'longitude' | 'latitude') {
  const minutes = Math.round(Math.abs(value) * 60)
  const degrees = Math.floor(minutes / 60)
  const direction = axis === 'latitude' ? (value < 0 ? 'S' : 'N') : value < 0 ? 'W' : 'E'
  return degrees + '°' + String(minutes % 60).padStart(2, '0') + '′' + direction
}

function ticks(min: number, max: number, step: number) {
  const result = []
  for (let i = Math.ceil(min / step); i <= Math.floor(max / step); i++) result.push(i)
  return result
}

export default memo(function Graticule({ width, height, longitude, latitude, scale }: Props) {
  const cx = width / 2,
    cy = height / 2,
    center = mercatorLat(latitude)
  // Degree-minute increments keep the projection ticks geographically meaningful at every zoom.
  const major =
    ([1, 2, 3, 6, 12, 30, 60].find((minutes) => (scale * minutes) / 60 >= 92) ?? 60) / 60
  const step = major / 5
  const xs = ticks(longitude - cx / scale, longitude + cx / scale, step)
  const ys = ticks(latitudeOf(center - cy / scale), latitudeOf(center + cy / scale), step)
  return (
    <g aria-hidden="true" className="geo-coordinates">
      {xs.map((i) => {
        const x = cx + (i * step - longitude) * scale
        const isMajor = i % 5 === 0
        return (
          <g key={'x' + i}>
            {isMajor && <path className="geo-graticule" d={`M${x} 0V${height}`} />}
            <path
              className="geo-ruler"
              d={`M${x} 0v${isMajor ? 7 : 3}M${x} ${height}v-${isMajor ? 7 : 3}`}
            />
            {isMajor && x > 98 && x < width - 140 && (
              <text x={x + 4} y={height - 7}>
                {degreeLabel(i * step, 'longitude')}
              </text>
            )}
          </g>
        )
      })}
      {ys.map((i) => {
        const y = cy + (center - mercatorLat(i * step)) * scale
        const isMajor = i % 5 === 0
        return (
          <g key={'y' + i}>
            {isMajor && <path className="geo-graticule" d={`M0 ${y}H${width}`} />}
            <path
              className="geo-ruler"
              d={`M0 ${y}h${isMajor ? 7 : 3}M${width} ${y}h-${isMajor ? 7 : 3}`}
            />
            {isMajor && y > 100 && y < height - 42 && (
              <text transform={`translate(13,${y - 3}) rotate(-90)`}>
                {degreeLabel(i * step, 'latitude')}
              </text>
            )}
          </g>
        )
      })}
      {xs
        .filter((i) => i % 5 === 0)
        .flatMap((i) =>
          ys
            .filter((j) => j % 5 === 0)
            .map((j) => {
              const x = cx + (i * step - longitude) * scale,
                y = cy + (center - mercatorLat(j * step)) * scale
              return (
                <path
                  key={i + ':' + j}
                  className="geo-register"
                  d={`M${x - 3.5} ${y}h7M${x} ${y - 3.5}v7`}
                />
              )
            }),
        )}
    </g>
  )
})
