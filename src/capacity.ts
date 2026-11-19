import rows from './campus-capacity.json'

type CampusBedRecord = (typeof rows)[number]

export function indexPsychiatricBeds(records: CampusBedRecord[]) {
  const index: Record<string, CampusBedRecord> = {}
  for (const row of records) {
    if (row.bed_scope !== 'psychiatric_inpatient' || Object.hasOwn(index, row.campus_id)) {
      throw new Error('Invalid psychiatric bed scope or duplicate campus: ' + row.campus_id)
    }
    for (const count of [row.adult_beds, row.cap_beds, row.total_beds]) {
      if (count !== null && (!Number.isSafeInteger(count) || count < 0)) {
        throw new Error('Invalid psychiatric bed count: ' + row.campus_id)
      }
    }
    if (
      row.adult_beds !== null &&
      row.cap_beds !== null &&
      row.adult_beds + row.cap_beds !== row.total_beds
    ) {
      throw new Error('Age-specific psychiatric beds do not reconcile: ' + row.campus_id)
    }
    index[row.campus_id] = row
  }
  return index
}

export const campusCapacity = indexPsychiatricBeds(rows)

export function publishedBedSubtotal(field: 'adult_beds' | 'cap_beds') {
  const observed = Object.values(campusCapacity).flatMap((row) =>
    row[field] === null ? [] : [row[field]],
  )
  return { beds: observed.reduce((sum, count) => sum + count, 0), campuses: observed.length }
}
