import { mercatorLat } from './mercator'
export { mercatorLat, latitudeOf } from './mercator'
import type { FeatureCollection, MultiPolygon, Polygon, Feature, MultiLineString } from 'geojson'
import landText from '../../docs/research/REGIONAL_GEOGRAPHY.geojson?raw'
import context from './regional-context.json?raw'
import waterText from './tidal-water.json?raw'
export const regionBounds = { west: -74.53, south: 40.39, east: -73.43, north: 41.19 }

export const land: FeatureCollection<Polygon | MultiPolygon> = JSON.parse(landText)
// The handoff stops at county boundaries. Add adjacent land to preserve the coastline.
land.features.unshift({ type: 'Feature', properties: {}, geometry: JSON.parse(context) })
export const shoreline: {
  type: 'FeatureCollection'
  features: [Feature<MultiPolygon>, Feature<MultiLineString>]
} = JSON.parse(waterText)
export const tidalWater = shoreline.features[0]
export const tidalShore = shoreline.features[1]
export type Point = [number, number]
export const localPoint = (lon: number, lat: number): Point => [
  (lon + 74) * 2048,
  (mercatorLat(40.75) - mercatorLat(lat)) * 2048,
]
const path = (ring: number[][]) =>
  ring
    .map(([lon, lat], index) => {
      const [x, y] = localPoint(lon, lat)
      return (index === 0 ? 'M' : 'L') + x.toFixed(2) + ',' + y.toFixed(2)
    })
    .join('')

export const landPath = land.features
  .map((f) => {
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
    return polys.map((poly) => poly.map((ring) => path(ring) + 'Z').join('')).join('')
  })
  .join('')

export const waterPath = tidalWater.geometry.coordinates
  .map((poly) => poly.map((ring) => path(ring) + 'Z').join(''))
  .join('')
export const shorePath = tidalShore.geometry.coordinates.map(path).join('')

export type Camera = { lon: number; lat: number; zoom: number }
export const cityCamera: Camera = { lon: -73.999, lat: 40.747, zoom: 1.44 }
export const regionCamera: Camera = { lon: -73.966, lat: 40.783, zoom: 0.55 }
export const palette = {
  water: '#dde7e9',
  land: '#e5e6e3',
  shoreline: '#b0b4b2',
  tracts: '#aeb2b0',
  tractLight: '#f2f3f1',
}
const boroughs: [string, number, number, number?][] = [
  ['MANHATTAN', -73.97, 40.794, -64],
  ['BROOKLYN', -73.92, 40.659],
  ['QUEENS', -73.82, 40.704],
  ['THE BRONX', -73.866, 40.857],
  ['STATEN ISLAND', -74.14, 40.588],
  ['NEW JERSEY', -74.16, 40.775],
  ['WESTCHESTER', -73.84, 41.068],
  ['LONG ISLAND', -73.575, 40.732],
]
const water: [string, number, number, number?][] = [
  ['Upper Bay', -74.051, 40.646, -16],
  ['Hudson River', -74.013, 40.754, -67],
  ['East River', -73.923, 40.786, -17],
  ['Jamaica Bay', -73.831, 40.605],
  ['Raritan Bay', -74.144, 40.47],
  ['Long Island Sound', -73.713, 40.89, -18],
  ['Lower Bay', -74.044, 40.532],
]
const places: [string, number, number][] = [
  ['Jersey City', -74.063, 40.719],
  ['Newark', -74.169, 40.735],
  ['Bayonne', -74.111, 40.669],
  ['Yonkers', -73.896, 40.943],
  ['New Rochelle', -73.786, 40.916],
  ['Hoboken', -74.035, 40.747],
  ['Flushing', -73.822, 40.768],
  ['Forest Hills', -73.842, 40.719],
  ['Bay Ridge', -74.033, 40.624],
  ['Coney Island', -73.988, 40.572],
  ['Fort Lee', -73.978, 40.854],
  ['White Plains', -73.76, 41.023],
  ['Park Slope', -73.981, 40.67],
  ['Williamsburg', -73.96, 40.713],
  ['Astoria', -73.923, 40.768],
  ['South Ozone Park', -73.822, 40.674],
  ['Flatbush', -73.955, 40.648],
  ['Bensonhurst', -74.002, 40.604],
  ['East Harlem', -73.936, 40.797],
  ['Elizabeth', -74.21, 40.663],
  ['Hackensack', -74.043, 40.884],
  ['Bloomfield', -74.189, 40.807],
  ['Paterson', -74.173, 40.918],
]
export const labels = [
  ...boroughs.map(([text, lon, lat, angle]) => ({ text, lon, lat, angle, kind: 'borough' })),
  ...water.map(([text, lon, lat, angle]) => ({ text, lon, lat, angle, kind: 'water' })),
  ...places.map(([text, lon, lat]) => ({ text, lon, lat, angle: 0, kind: 'place' })),
]
