# Facility evidence and assets

The demonstration uses the user-supplied November 18, 2026 research snapshot. The 23 campus markers cover 22 New York City campuses and one White Plains campus. This curated network models the adult inpatient pathway. It contains 35 Office of Mental Health (OMH) program entries, including 12 CPEP entries, and 46 distinct provider service profiles. A program or profile does not create another hospital, person, bed pool, or transfer. Each public record links to its original sources in the application.

| Displayed information | Provenance and interpretation |
| --- | --- |
| Campus names, addresses, program names and populations | Published facts from the supplied facility, program, and service seeds. The UI preserves legal, regulatory, and current display names. Short labels and campus IDs are editorial. Public pages establish documented offerings with the status shown. |
| Service ages, types and registry links | Each profile retains its own published wording, numeric bounds, status, source IDs and link certainty. Program population tags apply only to the referenced program. A profile with no confirmed program link stays unknown. |
| Coordinates | Sourced OMH marker-level points. Each record contains a composite source key. Morningside uses its CPEP point because its inpatient row lacks coordinates. |
| Borough / county | Derived containment cross-check using NYC Department of City Planning polygons and Census counties. Westchester is displayed as an area, with the underlying NYC borough field retained as not applicable. |
| DOH identities | 22 manual campus matches. Zucker Hillside's DOH correspondence is unknown. OMH and DOH have separate identifier namespaces. |
| Sponsor | Published sponsor name and code. Filtering on a sponsor refers to its exact published code. |
| Demand, pools, referral, transfer and operational displays | Synthetic. One hypothetical pool per campus. All counts and waits come from simulation events under a seed and scenario. Ages 18–64 and the 18 sending origins define the toy pathway. |
| Schematic movement | The endpoints are public campus points. The connection, elapsed travel time and movement are modeled. |
| Unknowns | The source strings `UNKNOWN` and `NOT_APPLICABLE` are distinct. Numeric identifiers remain strings. Published psychiatric capacity and live acceptance are unknown in this snapshot. |

The **source vintage**, **publisher update**, and **research access** dates describe different events. The record view lists them separately. All original fields remain in the CSVs. The app uses a checked-in JSON conversion, so installation and use do not fetch upstream records. To reproduce or verify that conversion with Python 3, run:

```sh
python3 scripts/import-data.py
python3 scripts/import-data.py --check
```

The validator checks table cardinalities and unique keys, source references, coordinates, child-to-campus membership, known program links and the 18 Census features. Source-specific evidence, temporal coverage, tested requests, access limitations and reuse notes are preserved in the [89-row source registry](research/SOURCE_REGISTRY.csv).

## Conflicting evidence

Bellevue's published adult unit counts differ, Lincoln has conflicting bed counts, and Richmond University's pediatric counts differ by source. None enters the slot ledger. Westchester's 2 North service is marked announced, opening unconfirmed. Northwell's FY2027 staffing-plan profiles carry their planning-document status. Metropolitan's outpatient child/adolescent profile remains distinct from its adult inpatient description. For the full conflict log and evidence boundaries, see [dossier sections 5–7](research/RESEARCH_DOSSIER.md).

## Attribution and notices

- New York State Office of Mental Health, Local Mental Health Programs, dataset `6nvr-tbv8`. Source update November 2, 2026. [DATA-001](https://data.ny.gov/Human-Services/Local-Mental-Health-Programs/6nvr-tbv8)
- New York State Department of Health, Health Facility General Information, dataset `vn5v-hh5r`. Source update October 23, 2026. The New York State Department of Health makes no representation, warranty or guarantee relating to the data or analyses derived from these data. [DATA-002](https://health.data.ny.gov/Health/Health-Facility-General-Information/vn5v-hh5r)
- New York City Department of Health and Mental Hygiene, *Psychiatric Hospitalizations Among New York City Adults, 2016 to 2023*, April 2026, table 2. The historical mean of 16.5 days and median of 11 days characterize the original adult cohort. The simulated lognormal form, age restriction and tail are assumptions. [DATA-007](https://www.nyc.gov/assets/doh/downloads/pdf/epi/databrief154-mental-health-hospitalization-2026.pdf)
- U.S. Census Bureau, Geography Division, 2025 cartographic county boundaries, 1:500,000. Eighteen supplied county geometries, transformed from NAD83 to WGS84 with six-decimal rounding, source vintage January 1, 2025. The supplied catalog lists CC0 1.0. Processing details and hashes are in the [geography README](research/GEOGRAPHY_README.md).
- U.S. Census Bureau, CitySDK 2019 New York and New Jersey Census tracts. The fine interior map lines show simplified tract outlines. Source URLs, hashes and transformations are recorded in the [local cartography notes](../src/cartography/README.md).
- New York City Department of City Planning, Borough Boundaries, polygon containment check in the source research. [MAP-014](https://data.cityofnewyork.us/City-Government/Borough-Boundaries/gthc-hcne)
- Provider profiles use public descriptions and cite the individual provider pages in each record. Source access for this packet was November 18, 2026. [Provider references and reuse notes](research/SOURCE_REGISTRY.csv)
- Locally bundled IBM Plex Sans and Mono by IBM, SIL Open Font License 1.1. UI icons use Lucide, ISC with Feather portions under MIT. MapLibre GL JS uses the BSD 3-Clause license. React uses MIT. [Bundled notices](../public/licenses/)
