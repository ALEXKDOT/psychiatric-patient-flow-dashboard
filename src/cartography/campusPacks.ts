import type { FeatureCollection, LineString, MultiLineString, MultiPolygon, Polygon } from 'geojson'
import registry from './campus/targets.json'

export interface CampusTarget {
  campus_id: string
  display_name: string
  target_label: string
  network_marker: [number, number]
  focus_lonlat: [number, number]
  publisher_feature_key: string
  feature_id: number
  doitt_id: string | null
  bin: string | null
  bbl: string | null
  recorded_height_m: number | null
  display_height_m: number | null
  display_height_basis: string
  height_evidence_url?: string
  evidence_type: string
  evidence_url: string
  note: string
}

interface BuildingRecord {
  objectid: string | number
  height_m: number | null
  name?: string | null
  bin?: string | null
  doitt_id?: string | null
  base_bbl?: string | null
  height_roof?: string | null
  feature_code?: string
  photo_date?: string
  [key: string]: unknown
}
export interface BuildingProps extends BuildingRecord {
  is_target: boolean
  display_height_m: number | null
}
export interface StreetProps {
  objectid: string | number
  full_street_name: string | null
  [key: string]: unknown
}
export interface CampusPack {
  target: CampusTarget
  buildings: FeatureCollection<Polygon | MultiPolygon, BuildingProps>
  streets: FeatureCollection<LineString | MultiLineString, StreetProps>
}

export const campusTargets: Record<string, CampusTarget> = Object.fromEntries(
  (registry as CampusTarget[]).map((t) => [t.campus_id, t]),
)
export const CAMPUS_CACHE_LIMIT = 3
const cache = new Map<string, CampusPack>()
export function campusCacheSize() {
  return cache.size
}

export async function loadCampusPack(id: string, signal: AbortSignal): Promise<CampusPack> {
  signal.throwIfAborted()
  const target = campusTargets[id]
  if (!Object.hasOwn(campusTargets, id)) throw new Error('Unknown campus')
  const cached = cache.get(id)
  if (cached) {
    cache.delete(id)
    cache.set(id, cached)
    return cached
  }
  const path = (import.meta.env?.BASE_URL ?? './') + 'campuses/' + encodeURIComponent(id) + '/'
  async function read<T>(name: string): Promise<T> {
    const response = await fetch(path + name + '.geojson', { signal })
    if (!response.ok) throw new Error('Campus layer unavailable: ' + name)
    const layer = await response.json()
    if (
      layer.type !== 'FeatureCollection' ||
      !Array.isArray(layer.features) ||
      !layer.features.length
    )
      throw new Error('Invalid campus layer: ' + name)
    return layer
  }
  const [raw, streets] = await Promise.all([
    read<FeatureCollection<Polygon | MultiPolygon, BuildingRecord>>('buildings'),
    read<CampusPack['streets']>('streets'),
  ])
  signal.throwIfAborted()
  let matches = 0
  const buildings: CampusPack['buildings'] = {
    type: 'FeatureCollection',
    features: raw.features.map((f) => {
      const p = f.properties
      const isTarget = Number(p.objectid) === target.feature_id
      const cityRecord = target.publisher_feature_key === 'NYC BUILDING objectid'
      if (isTarget) {
        matches++
        if (
          p.height_m !== target.recorded_height_m ||
          (cityRecord &&
            (String(p.bin) !== target.bin ||
              String(p.doitt_id) !== target.doitt_id ||
              String(p.base_bbl) !== target.bbl))
        ) {
          throw new Error('Campus exterior identity does not match its source record')
        }
      }
      const height = isTarget ? target.display_height_m : p.height_m
      return {
        ...f,
        properties: {
          ...p,
          is_target: isTarget,
          display_height_m: typeof height === 'number' && height > 0 ? height : null,
        },
      }
    }),
  }
  if (matches !== 1) throw new Error('Campus target must identify exactly one footprint')
  // Some county road segments publish only a space. Leave these lines visible without a label.
  for (const feature of streets.features) {
    const name = feature.properties.full_street_name
    if (typeof name === 'string' && !name.trim()) {
      feature.properties.full_street_name_as_published = name
      feature.properties.full_street_name = null
    }
  }
  const pack: CampusPack = { target, buildings, streets }
  cache.set(id, pack)
  if (cache.size > CAMPUS_CACHE_LIMIT) cache.delete(cache.keys().next().value!)
  return pack
}
