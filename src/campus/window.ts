import type { Map as GLMap, GeoJSONSource } from 'maplibre-gl'
import type { CampusPack } from '../cartography/campusPacks'
import { metersAt } from './geometry'

type Box = [number, number, number, number]
type Geometry =
  | CampusPack['buildings']['features'][number]['geometry']
  | CampusPack['streets']['features'][number]['geometry']
function bounds(geometry: Geometry): Box {
  const rect: Box = [Infinity, Infinity, -Infinity, -Infinity]
  const lines =
    geometry.type === 'MultiPolygon'
      ? geometry.coordinates.flat()
      : geometry.type === 'LineString'
        ? [geometry.coordinates]
        : geometry.coordinates
  for (const line of lines)
    for (const p of line) {
      rect[0] = Math.min(rect[0], p[0])
      rect[1] = Math.min(rect[1], p[1])
      rect[2] = Math.max(rect[2], p[0])
      rect[3] = Math.max(rect[3], p[1])
    }
  return rect
}
const indexes = new WeakMap<CampusPack, { buildings: Box[]; streets: Box[] }>()
const overlaps = (a: Box, b: Box) => a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1]
export function neighborhoodWindow(pack: CampusPack, map: GLMap) {
  let index = indexes.get(pack)
  if (!index) {
    index = {
      buildings: pack.buildings.features.map((f) => bounds(f.geometry)),
      streets: pack.streets.features.map((f) => bounds(f.geometry)),
    }
    indexes.set(pack, index)
  }
  const boundsIndex = index
  let buffered: Box = [0, 0, 0, 0]
  let current = pack
  const [mx, my] = metersAt(pack.target.focus_lonlat[1])
  function update() {
    const view = map.getBounds()
    const box: Box = [view.getWest(), view.getSouth(), view.getEast(), view.getNorth()]
    if (
      box[0] >= buffered[0] &&
      box[1] >= buffered[1] &&
      box[2] <= buffered[2] &&
      box[3] <= buffered[3]
    )
      return false
    // The native bounds include the pitched horizon. Keep an extra block of real
    // structures for elevated façades and smooth rotation between window updates.
    const margin = 125
    buffered = [
      box[0] - margin / mx,
      box[1] - margin / my,
      box[2] + margin / mx,
      box[3] + margin / my,
    ]
    current = {
      ...pack,
      buildings: {
        ...pack.buildings,
        features: pack.buildings.features.filter(
          (f, i) => f.properties.is_target || overlaps(boundsIndex.buildings[i], buffered),
        ),
      },
      streets: {
        ...pack.streets,
        features: pack.streets.features.filter((_, i) =>
          overlaps(boundsIndex.streets[i], buffered),
        ),
      },
    }
    return true
  }
  update()
  return {
    pack: () => current,
    sync() {
      if (!update()) return
      map.getSource<GeoJSONSource>('buildings')?.setData(current.buildings)
      map.getSource<GeoJSONSource>('streets')?.setData(current.streets)
    },
  }
}
