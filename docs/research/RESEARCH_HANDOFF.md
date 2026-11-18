# Research Handoff: Psychiatric Patient-Flow Observatory

**Prepared November 18, 2026.** Read this first, then use RESEARCH_DOSSIER.md and the accompanying tables to create the product and engineering specification. This is a research packet; no application, simulation engine or repository was built.

## 1. Recommended product

Build a **geographic observatory of verified psychiatric campuses and services, with an explicitly synthetic adult ED-to-inpatient placement simulation**. Its main visual is an interactive hospital network, supported by a selected-campus/service inspector, placement queue, event feed, compact trends and replay controls.

Use the supplied shipping-dashboard image for compositional direction: dominant pale geography; one strong selection; thin routes; sparse accent color; a restrained control rail; dense lower instruments. Translate those relationships into healthcare operations. Moving tokens represent synthetic episodes after departure. Pending referrals are requests, not traveling patients. Do not reproduce maritime labels, a target risk score, tiny unreadable type or third-party artwork.

**Initial pathway:** adults with an already-made inpatient disposition, modeled ages 18–64, seeking general acute psychiatric care. The age band is a simulation choice. Published adult, child, adolescent, geriatric and specialty service facts remain distinct. Do not infer numeric admission limits from the word Adult.

**Geography:**23 campuses:22 in NYC plus NYP Westchester Behavioral Health in White Plains. This is a curated demonstration network, not the complete regional inventory. All 23 have sourced coordinates. Eighteen selected campuses can generate synthetic ED demand; five are receive-only by model choice. Exact lists and source evidence are in the dossier. Zucker Hillside is in Queens, within NYC.

## 2. Source-of-truth files

| File | Read it for |
|---|---|
| FACILITY_SEED.csv | One physical map node per campus;23 stable IDs; addresses; coordinates and source records; organizational/regulatory identities |
| PROGRAM_SEED.csv |35 exact OMH rows:23 inpatient and 12 CPEP; composite program IDs; raw addresses; populations; certification context |
| SERVICE_SEED.csv |46 provider-described service/unit profiles; precise age wording where available; unknown mappings; announced and planning-document status |
| SOURCE_REGISTRY.csv |89 audit records with ordinary URLs, dates, tested requests, downloaded versus merely opened evidence, gaps and reuse terms |
| FEATURE_DATA_MATRIX.csv |57 display/feature decisions classified as verified, derived/modeled, synthetic, or unavailable/deferred |
| REGIONAL_GEOGRAPHY.geojson |Bundled small geographic fallback;18 county/equivalent features for NYC and regional context |
| GEOGRAPHY_README.md |Source/version/CRS conversion, exact county list, attribution and limitations |
| RESEARCH_DOSSIER.md |Workflow, metric definitions, source conflicts, model rules, evidence and detailed build implications |

The CSVs use UTF-8, headers and standard quoting. UNKNOWN means not established; NOT_APPLICABLE is separate. Neither is zero. Import IDs, codes and postal codes as strings. Source-ID lists use semicolons.

Campus IDs are internal, stable and independent of branding. OMH program keys combine facility_code and program_code because program_code alone repeats. DOH IDs are a different namespace. The 22 DOH campus correspondences are manual site matches, not proven program-to-license equivalence; Zucker's DOH match remains unknown.

FACILITY_SEED.primary_inpatient_population_tags applies only to the primary inpatient program, not every service at that campus. Use PROGRAM_SEED and SERVICE_SEED for age/service filtering. Program and provider-profile rows must not each become separate bed pools. Unknown exact unit-to-certificate links remain unknown.

## 3. Non-negotiable data boundaries

- Keep public facts, derived geography, simulation configuration, episodes, referrals, reservations and events in separate structures. Do not insert invented bed counts or demand into the facility table.
- Keep a persistent label: **Public facility information · Simulated operations.** Carry scenario/config/source versions into exports and screenshots.
- Every queue, wait, referral, acceptance, reservation, slot state, transfer and scenario outcome is synthetic or calculated from synthetic events.
- Do not infer actual transfer edges from proximity, organizational membership or a receiving service's existence.
- No live psychiatric availability was established. The public DOH daily capacity feed reports adult acute-care/ICU totals without the necessary psychiatric service/compatibility detail.
- No actual patient data, ambulance telemetry, hospital credentials or paid map service is needed for the initial version.
- Exclude individual risk prediction, clinical placement ranking, admission-law automation, real bed booking, ambulance dispatch and treatment/discharge recommendations.

The source audit found meaningful conflicts: Bellevue unit counts, Lincoln bed counts, RUMC pediatric bed counts, Metropolitan population granularity, Cornell CPEP age scope, and an unconfirmed Westchester adolescent-unit opening. Do not silently select a convenient value. Capacities are intentionally unknown in the verified tables.

## 4. Operational model to specify

Minimum lifecycle: inpatient disposition → readiness → placement search → referral review → one committed reservation → transport preparation → ED departure → receiving arrival → unit admission → discharge → slot turnaround/readiness.

Clinical assessment occurs before the core simulator starts. Do not display full ED LOS unless a later mode explicitly adds ED-arrival data. The primary boarding proxy is **Post-disposition ED wait**, measured from disposition to physical ED departure. Placement wait starts at placement-ready and ends at successful commitment. Referral response time requires an actual receiving response; resolution time can end in cancellation or timeout. Keep travel, mobilization and receiving handoff separate.

Each episode is one person in one physical state. It can have several referral records. Three requests do not create three patients or three journeys. A winning acceptance/reservation must be atomic. Cancel the other requests as placed elsewhere; late responses cannot reserve another slot.

Reservation is not occupancy. Preserve the reservation through external travel and receiving handoff, then convert it to occupancy at unit admission. Discharge produces a turnaround state before free capacity returns. Internal admissions produce no intercampus arc or transfer count.

Capacity reduction retires free slots first, then the next resources completing release/turnaround until the target is reached. Honor existing occupants/reservations and show pending closure. Never delete episodes, create negative availability or hide overbooking by clamping counters.

## 5. Proposed numerical defaults

These are recommended research assumptions to adopt or revise explicitly in the specification. They are not observed hospital parameters or validated simulation results.

| Parameter | Starting choice |
|---|---|
| Receivers and hypothetical capacity |23 enabled adult-pathway pools ×24 slots =552 synthetic slots |
| Inpatient LOS |Assumed lognormal: LOS_days = exp(ln(11) +0.9005166×Z), Z standard normal |
| Empirical anchor |NYC DOHMH reports 2023 mean 16.5 days and median 11 for NYC residents 18+ hospitalized in NYC acute-care hospitals |
| Baseline arrivals |0.90×baseline capacity/16.5 per day, about 30.1/day; fixed across capacity scenarios |
| Origin allocation |Equal across 18 selected emergency-service campuses; a model choice |
| Readiness |Uniform 0–90 minutes after disposition |
| Referral search |Home pool plus up to2 seeded eligible alternatives; max 3 outstanding; no more frequent than 2-hour retry rounds |
| Review |Uniform 15–90 minutes; commitment rechecks capacity and episode state |
| External mobilization |Uniform 30–120 minutes |
| External travel |Uniform 30–90 minutes, independent of schematic arc length |
| External receiving handoff |Uniform 10–30 minutes before admission |
| Internal admission |Commitment then immediate ED departure as a simplifying assumption; Uniform 5–20 minutes of internal movement including handoff until admission; no external delays |
| Turnaround |Uniform 30–90 minutes |
| Initialization and replay |120-day empty-start warm-up, save complete snapshot, then 7-day evaluation/playback; do not truncate long LOS to force completion |

The lognormal family and tail are assumed. It matches an aggregate mean and median from a different historical age/geographic cohort; it is not a fitted NYC placement model. Other demand outside the chosen pathway is absent. “Occupancy” therefore means occupancy of the hypothetical pathway allocation, not the whole real hospital. The warm-up duration is a heuristic and still needs model diagnostics.

Provide baseline, +30% additional demand, and a capacity-change scenario. Adding 8 slots to one pool changes the 552-slot network by only 1.45%; present this as local sensitivity, not a promised surge solution. A staged 8-slot reduction is also useful. A later transport-delay scenario can isolate accepted-but-still-in-ED waiting.

Clone the full starting snapshot and retain base-arrival IDs/times. Cache readiness, LOS and transport variates by episode/process, independently of referral attempt. Key review draws by episode/destination/attempt. Demand increase adds an independent extra stream without resampling existing episodes. Compare equal base cohorts/windows; show all-arrival surge results separately.

Report unresolved cases alongside completed medians/p90. Equal follow-up makes exposure comparable but does not remove completed-only bias. If using a restricted-horizon metric, define it for the entire chosen cohort. One seed is a demonstration, not a confidence interval or a forecast.

## 6. Visual and technical recommendation

Use **MapLibre GL JS with locally bundled vector geography**. Add deck.gl only if its arcs/picking/time-indexed paths materially simplify the scene. Use a flat SVG/Canvas map and equivalent facility/queue tables as fallback. No hosted tiles, geocoder or routing API is required for the minimal experience.

Renderer licenses, geographic data, tile hosting, routing and fonts are separate decisions. MapLibre is BSD-3-Clause; deck.gl MIT; current Leaflet main BSD-2-Clause. Mapbox uses its own terms/account/token and product-specific meters. The map recommendation has not been implemented or benchmarked in this research.

Default transfer lines are **schematic connections**. They can cross water and are not road geometry. A calculated road route would need its own engine/profile/graph/coordinate provenance and still would not establish an actual ambulance journey. Do not use OSM public tiles as an offline download source. Use curated points instead of runtime Nominatim.

Bundle fonts or use system fallbacks; IBM Plex Sans/Mono are options with SIL OFL notices. Use original minimal icons. Do not copy hospital logos or art from the reference. Run the future application without external assets to verify the fallback.

Keep simulation events independent of the renderer. Movement interpolation must never increment counts. Use checkpoints for seeking, bounded visible history and selected-only referral lines to limit clutter. If transfers are sparse, use faster replay and explicitly labeled recent trails, not phantom activity.

## 7. Decisions the specification agent must resolve

1. The focal opening campus and story, city-versus-region camera behavior, and whether White Plains uses an inset.
2. MapLibre alone versus a focused deck.gl overlay, with a concrete flat-map fallback.
3. Exact state-machine fields, event ordering, cancellation semantics and authoritative ledger calculations.
4. The model configuration format, version/seed handling, evidence-informed LOS option and any changed assumptions.
5. Queue categories and capacity-ring denominator; ensure current queue ages and completed waits cannot be confused.
6. Scenario comparison cohort, fixed follow-up interval, unresolved reporting and export labeling.
7. The exact organization grouping; sponsor/agency names are evidence, not an automatic marketed-system hierarchy.
8. Offline asset packaging, source/license attribution, accessibility, reduced motion and target-device performance criteria.

Use the dossier's recommended starting decisions where there is no product reason to change them. Any departure should record its rationale and provenance class. No additional facility research is necessary merely to start specifying this bounded MVP; the unknowns should be represented honestly.

## 8. High-value acceptance requirements for the future implementation

- All 23 map nodes resolve to a seed record and source; adult/child/EOB/specialty facts remain separate.
- Every synthetic episode is counted once; referrals, reservations, in-transit episodes and admissions reconcile after every event.
- At most one reservation wins; stale responses and duplicate events have no side effects.
- Same-campus placement generates neither an intercampus arc nor an intercampus count.
- Seek/pause/reset reproduce the same scenario state without resampling randomness.
- Capacity changes preserve existing commitments; unresolved waits are visible in comparisons.
- Map, inspector, queue, trends and feed agree at the same replay time.
- Demo launches with bundled data and no map credentials; failure of WebGL has a usable fallback.
- Source versus synthetic information is legible in the UI and carried into exports.

These are requirements for Codex to implement and test later. No claim is made that they have passed in a functioning application.

## 9. Key portable sources

- DATA-001 — OMH program inventory: https://data.ny.gov/Human-Services/Local-Mental-Health-Programs/6nvr-tbv8
- DATA-002 — DOH facility geography: https://health.data.ny.gov/Health/Health-Facility-General-Information/vn5v-hh5r
- DATA-004 — Daily capacity feed, unsuitable as psychiatric availability: https://health.data.ny.gov/Health/New-York-State-Statewide-Hospital-Bed-Capacity/2dbc-sqe7
- DATA-007 — NYC LOS context, Table 2: https://www.nyc.gov/assets/doh/downloads/pdf/epi/databrief154-mental-health-hospitalization-2026.pdf
- OP-002 — Current CPEP standards: https://omh.ny.gov/omhweb/crisis/cpep-soc.pdf
- OP-009 — OMH identity/population definitions: https://omh.ny.gov/omhweb/mhpd/Definitions.html
- MAP-001 — MapLibre: https://maplibre.org/maplibre-gl-js/docs/
- MAP-018 — Census fallback source: https://www2.census.gov/geo/tiger/GENZ2025/shp/cb_2025_us_county_500k.zip

**Final feasibility verdict:** proceed with verified facility geography and service descriptions plus clearly synthetic operations. Queues, waits, referrals, acceptance, reservations, capacity utilization, movement and scenario effects are simulation displays. Live psychiatric availability, observed transfer networks, real ambulance journeys, individual risk and clinical placement recommendations remain outside the MVP.
