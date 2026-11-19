import snapshot from './data.generated.json'

export const DATA_VERSION = '2026-11-18'
export type FacilityRecord = (typeof snapshot.facilities)[number]
export type Program = (typeof snapshot.programs)[number]
export type Service = (typeof snapshot.services)[number]
export type Source = (typeof snapshot.sources)[number]
export interface Campus {
  id: string
  name: string
  shortName: string
  borough: string
  lat: number
  lon: number
  isOrigin: boolean
  programs: Program[]
  services: Service[]
  raw: FacilityRecord
}

// Scenario roles from section 6.1 of the dossier. These are simulated sending roles.
const receiveOnly = new Set([
  'nyc_nyp_allen',
  'nyc_zucker_hillside',
  'ny_nyp_westchester_bh',
  'nyc_siuh_princes_bay',
  'nyc_mount_sinai_bhc',
])
const labels: Record<string, string> = {
  nyc_bellevue: 'Bellevue',
  nyc_harlem: 'Harlem',
  nyc_metropolitan: 'Metropolitan',
  nyc_kings_county: 'Kings County',
  nyc_woodhull: 'Woodhull',
  nyc_south_brooklyn: 'South Brooklyn Health',
  nyc_elmhurst: 'Elmhurst',
  nyc_queens: 'Queens Hospital',
  nyc_jacobi: 'Jacobi',
  nyc_north_central_bronx: 'North Central Bronx',
  nyc_lincoln: 'Lincoln',
  nyc_mount_sinai: 'Mount Sinai Hospital',
  nyc_mount_sinai_bhc: 'Mount Sinai BHC',
  nyc_mount_sinai_morningside: 'Mount Sinai Morningside',
  nyc_mount_sinai_west: 'Mount Sinai West',
  nyc_nyp_weill_cornell: 'NYP Weill Cornell',
  nyc_nyp_columbia: 'NYP Columbia',
  nyc_nyp_allen: 'NYP Allen',
  ny_nyp_westchester_bh: 'NYP Westchester',
  nyc_rumc: 'Richmond University',
  nyc_siuh_princes_bay: 'SIUH Prince’s Bay',
  nyc_zucker_hillside: 'Zucker Hillside',
  nyc_montefiore_moses: 'Montefiore Moses',
}
export const campuses: Campus[] = snapshot.facilities.map((raw) => ({
  id: raw.campus_id,
  name: raw.official_display_name,
  shortName: labels[raw.campus_id] ?? raw.official_display_name,
  borough: raw.borough === 'NOT_APPLICABLE' ? raw.physical_county : raw.borough,
  lat: Number(raw.latitude),
  lon: Number(raw.longitude),
  isOrigin: !receiveOnly.has(raw.campus_id),
  programs: snapshot.programs.filter((p) => p.campus_id === raw.campus_id),
  services: snapshot.services.filter((s) => s.campus_id === raw.campus_id),
  raw,
}))
export const campusById: Record<string, Campus> = Object.fromEntries(campuses.map((c) => [c.id, c]))
export const sourceById: Record<string, Source> = Object.fromEntries(
  snapshot.sources.map((s) => [s.source_id, s]),
)
export const boroughs = Array.from(new Set(campuses.map((c) => c.borough))).sort()
export const programPopulations = Array.from(
  new Set(snapshot.programs.flatMap((p) => p.populations_served_as_published.split(' '))),
).sort()
export const serviceTypes = Array.from(new Set(snapshot.services.map((s) => s.service_type))).sort()
export function displayValue(raw: string) {
  if (raw === 'UNKNOWN' || raw === '') return 'Unknown'
  if (raw === 'NOT_APPLICABLE') return 'Not applicable'
  return raw
}
export function humanize(value: string) {
  const label = value.replaceAll('_', ' ')
  return label.charAt(0).toUpperCase() + label.slice(1)
}
export interface CampusFilters {
  query?: string
  borough?: string
  service?: string
  sponsor?: string
  population?: string
}
// Filter published service profiles and program types. Neither filter implies eligibility.
export function filterCampuses({
  query = '',
  borough,
  service,
  sponsor,
  population,
}: CampusFilters = {}) {
  const text = query.trim().toLocaleLowerCase()
  return campuses.filter((campus) => {
    if (borough && campus.borough !== borough) return false
    if (
      population &&
      !campus.programs.some((p) =>
        p.populations_served_as_published.split(' ').includes(population),
      )
    )
      return false
    if (sponsor && campus.raw.sponsor_code_as_published !== sponsor) return false
    if (
      service &&
      !campus.services.some((s) => s.service_type === service) &&
      !campus.programs.some((p) => p.program_type === service)
    )
      return false
    if (!text) return true
    return [
      campus.name,
      campus.shortName,
      campus.borough,
      campus.id,
      campus.raw.regulatory_facility_name,
      campus.raw.city,
      campus.raw.postal_code,
      campus.raw.address_line1,
      campus.raw.agency_name_as_published,
      ...campus.services.map((s) => s.service_name),
      ...campus.programs.map((p) => p.program_name_as_published),
    ].some((value) => value.toLocaleLowerCase().includes(text))
  })
}
