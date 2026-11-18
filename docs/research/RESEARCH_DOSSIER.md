# Psychiatric Patient-Flow Observatory — Research Dossier

**Research cut-off and access date:** November 18, 2026. **Recommended display time zone:** America/New_York. **Purpose:** evidence and operating concepts for a subsequent product/engineering specification. No application or simulation engine has been implemented.

## 1. Decision and feasibility

**Proceed with a public-facility observatory and an explicitly synthetic adult psychiatric-placement simulator.** The accessible evidence supports a credible geographic foundation, program/service inspector, and reproducible explanation of placement constraints. It does not support a live psychiatric bed finder or an observed NYC transfer network.

The recommended first pathway is **adult general acute psychiatric care, beginning after an ED/CPEP clinician has decided on inpatient admission**. Use a modeled cohort aged **18–64** to keep pediatric and geriatric pathways outside the initial simulator. This age interval is a product assumption. It must not replace providers' published age boundaries or imply that all adult programs have the same eligibility rules. All 23 selected campuses have an OMH inpatient-program record that includes adults. Their actual service mix remains visible separately. [DATA-001; OP-002,003,009]

The initial geographic selection is **22 NYC campuses across all five boroughs plus NewYork-Presbyterian Westchester Behavioral Health Center in White Plains**. The latter supplies a verified nearby inpatient destination and a useful regional scale change. Its inclusion establishes a receiving service, not any particular ED-to-White Plains transfer relationship. Zucker Hillside is within Queens and is not an outside-city addition. The sample is deliberately curated and incomplete; it must never be labeled the complete NYC psychiatric network. [DATA-001,002; FAC-019,025; MAP-014,018]

### What the package contains

| File | Role |
|---|---|
| RESEARCH_DOSSIER.md | Findings, definitions, evidence gate, simulation recommendations, visualization decisions and uncertainties |
| SOURCE_REGISTRY.csv | 89 source-audit records, including unsuccessful access attempts and overlapping references to the same source |
| FACILITY_SEED.csv | 23 physical-campus records with stable internal IDs, addresses, coordinates and field provenance |
| PROGRAM_SEED.csv | 35 exact OMH program records: 23 inpatient and 12 CPEP programs |
| SERVICE_SEED.csv | 46 provider-described service/unit profiles, preserving age groups, unknowns and announced status |
| FEATURE_DATA_MATRIX.csv | 57 classified display fields/features and their build implications |
| REGIONAL_GEOGRAPHY.geojson | Small derived geographic fallback containing 18 surrounding counties/county equivalents |
| GEOGRAPHY_README.md | Geographic source, vintage, conversion, coverage, license and hash |
| RESEARCH_HANDOFF.md | Concise instructions and remaining specification decisions |

Source identifiers in brackets resolve to ordinary URLs in SOURCE_REGISTRY.csv and the bibliography at the end of this dossier. They are portable identifiers for this packet, not proprietary citation tokens. All proposed numerical operations belong in a separate simulation configuration. None has been inserted into the verified seed tables.

## 2. Reading the shipping-dashboard reference

The reference is organized around a **dominant geographic scene**, a selected object, and compact instruments that explain movement through constraints. Its broad pale water surface provides negative space; highly textured land defines the channel. A narrow left rail controls layers. A thin top strip establishes context. A bottom band holds the object inspector, queue/throughput information, and event feed. Selection brackets connect the central vessel to its inspector. Thin traces establish direction, while orange is used sparingly for selection or exceptions. These are observations of the attached image, not evidence about the functionality of an underlying shipping application. [REF-001]

For psychiatry, the fixed objects are campuses and the moving objects are **synthetic placement episodes after departure**. The useful compositional translation is:

| Reference element | Meaning in this application | Recommended behavior |
|---|---|---|
| Central channel geography | NYC boroughs, waterways and nearby receiving-campus context | Geography dominates the screen; sparse land shapes and labels preserve space for network activity |
| Selected vessel and reticle | Selected campus, service or simulated transfer | Persistent bracket/highlight, synchronized inspector and filtered queue |
| Tracks and wakes | Departed simulated transfers and recent completed transfers | Neutral moving tokens; faint historical trails with explicit time window |
| Anchorage/transit queue | Unique episodes still awaiting placement or departure | Separate patient-episode counts from referral-request counts |
| Object inspector | Published campus facts plus selected service and simulated capacity | Visually separate source-backed facts from scenario state |
| Compact meters | Waiting burden, reservations, admissions, in-transit episodes | Units, denominator and window always visible |
| Alert feed | Scenario events and explicit resource changes | Acceptance, release, departure, arrival, admission, closure; no clinical-danger score |
| Replay controls | Synthetic event timeline | Pause, speed, scrub, reset, scenario branch and comparison |

A suggested desktop hierarchy gives roughly two-thirds of the usable canvas to geography, with a compact control rail and lower instrument band. This is a design starting point, not a fixed layout specification. The next agent should resolve dimensions, breakpoints and typography. Preserve readable text rather than copying the reference's very small labels. Use selection, line style and shape as well as color. The scene should remain informative with motion disabled.

At a plausible small-network simulation rate, there may be few simultaneous transfers. Use faster replay, a deterministic demonstration window and clearly labeled recent-transfer trails. Do not invent extra moving patients to make the map look busier. A selected facility and its queue can provide the focal point during quiet intervals.

## 3. Operational model

### 3.1 Documented sequence and local variation

The sequence below is an operational abstraction. Clinical care and reassessment continue during waiting; this model does not imply that treatment begins only after admission. Current NY guidance distinguishes general EDs, authorized emergency-admission services, CPEPs and inpatient programs. CMS transfer guidance requires more than a geographically nearby bed, including an appropriate accepting destination, records, and suitable transport arrangements. [OP-003,004]

| Stage | Documented operational concept | Variation or MVP simplification |
|---|---|---|
| ED arrival and assessment | Medical screening, psychiatric assessment, collateral collection and treatment inform disposition | Exact sequence, documentation and staffing vary. Default simulator begins later; full ED-arrival/assessment timing is deferred |
| Inpatient disposition | A clinician decides inpatient care is indicated | All generated episodes are already in this cohort. The simulator never decides admission from symptoms or risk |
| Readiness and referral preparation | Sending team prepares the clinical/administrative information and transfer conditions | Readiness need not coincide with disposition. Keep both events; an illustrative readiness delay is allowed |
| Placement search | Coordinator or intake service identifies possible receiving services | Local transfer centers, same-campus admission and external referral workflows differ. No citywide candidate-order policy was verified |
| Referrals and review | One episode can generate several requests and responses | Sequential versus parallel practice is local. Up to three concurrent requests is an explicit demo policy |
| Acceptance and commitment | Receiver accepts and confirms a usable place | Acceptance and reservation have distinct timestamps/concepts, but are committed atomically in the baseline model |
| Transport preparation | Appropriate transport, records and sending/receiving handoffs are arranged | The model uses a synthetic mobilization delay; it does not dispatch a real ambulance or simulate a vehicle fleet |
| Departure and travel | Patient physically leaves the sending ED and moves between campuses | Travel is distinct from waiting for transport. A same-campus admission uses an internal movement branch |
| Arrival and unit admission | Receiving-campus arrival and admission to an inpatient unit can differ | Keep a receiving-handoff interval; convert reservation to occupancy only at unit admission |
| Inpatient discharge and bed turnaround | Occupancy ends; the resource becomes reusable after relevant preparation | LOS and turnaround are modeled. No discharge suitability or treatment recommendations are generated |
| Changes before departure | Reassessment, cancellation or changed placement may require rework | Preserve event semantics for cancellation/release, but random clinical deterioration and automatic legal decisions are outside the first version |

NYP's public ACCESS Center is evidence for one centralized intake model; Kings County describes both psychiatric-emergency admissions and direct admissions from another hospital. These establish workflow possibilities, not an actual bilateral connection between two campuses. A regional discrete-event study provides methodological precedent for separate referrals and reservations, but its Minnesota-derived practice and parameters are not NYC evidence. [OP-010,011,013]

### 3.2 CPEP, extended observation and inpatient care

CPEP is an emergency service; extended observation is a distinct service state. Neither is an acute inpatient unit simply because the patient is physically staying overnight. OMH's May 2026 standards describe a 24-hour emergency-service transition limit and a 72-hour extended-observation clock measured from initial CPEP receipt. These should not become a universal definition or permitted duration of boarding. The standards also distinguish core requirements from exemplary targets. [OP-002]

The MVP should show verified emergency-service labels but should **not** attempt to model every CPEP/EOB/legal pathway. It simulates a selected post-disposition cohort. Any future EOB mode needs separate states, capacity, clocks and denominators. Similarly, state psychiatric centers, residential treatment facilities, substance-use detoxification, rehabilitation, forensic services, and general acute inpatient units must remain distinct. The OMH dataset's broad Inpatient category includes records that are not appropriate acute general-psychiatry destinations. [DATA-001; OP-006]

### 3.3 Event and metric dictionary

Use an ordered event ledger. Store absolute timestamps in UTC only when a scenario actually has an explicit date; always retain scenario-relative elapsed time. Display America/New_York for dated scenes. Use Day 1 / elapsed hours for an undated scene so it cannot be mistaken for live hospital telemetry.

The primary wait instrument should be labeled **Post-disposition ED wait**, with a visible definition: inpatient disposition through physical ED departure. It is a boarding proxy selected for the product, not a claim of universal measurement compliance.

| Metric | Start event | End event | Interpretation |
|---|---|---|---|
| Full ED LOS | ED arrival | Physical ED departure | Includes assessment. Deferred in the minimal model because ED arrival is not generated |
| Post-disposition ED wait | Inpatient disposition | Physical ED departure | Primary boarding proxy; includes readiness, search, acceptance and transport preparation while still in the ED |
| Readiness lag | Inpatient disposition | Placement-ready | Keeps pre-search delay visible |
| Search-start lag | Placement-ready | Search started | May be zero in the default policy, explicitly |
| Referral initiation delay | Placement-ready | First referral submitted | Different from how long a receiving service takes to respond |
| Referral response time | Each referral submitted | Actual receiving-service response | A canceled or timed-out request has no response unless one was recorded |
| Referral resolution time | Each referral submitted | Terminal response/cancellation/timeout | Stratify outcomes; canceling because placement succeeded elsewhere is not a rejection |
| Placement wait | Placement-ready | Successful committed placement/reservation | If later revoked, retain the original clock and additionally report accumulated searching time/rework |
| Decision-to-placement time | Inpatient disposition | Successful commitment | Includes readiness lag; must not share the placement-wait label |
| Accepted, awaiting departure | Successful commitment | ED departure | Still counts in the primary ED-wait queue |
| Transport mobilization wait | Transport requested | ED departure | Dispatch/loading/predeparture preparation abstraction; excludes journey time |
| Intercampus transfer duration | ED departure | Receiving-campus arrival | Modeled travel interval, not measured EMS response or ETA |
| Receiving handoff | Receiving-campus arrival | Unit admission | Reservation remains held |
| Inpatient access time | Inpatient disposition | Unit admission | Prefer this to “time to treatment,” since care can occur in ED |
| Inpatient LOS | Unit admission | Inpatient discharge | Distinct from every preceding interval |
| Bed turnaround | Discharge | Slot ready | The bed is unoccupied but not available during this interval |
| Queue size | Membership in chosen state at snapshot | Snapshot time | Unique episodes, not referral rows |
| Waiting burden | Integral of unique post-disposition ED queue over a window | Window end | Patient-hours; not number of people |
| Throughput | Admission or departure event within a stated window | Window end | Name the event, window and modeled cohort |

**Competing definitions matter.** APA's boarding resource document discusses definitions based on a wait over four hours after the admission decision, ED time over 24 hours, and continued ED holding after evaluation/disposition while placement is unavailable. The opened CMS1244 specification is explicitly for the **2027** measurement period and uses decision-to-admit through physical ED departure for its boarding component, with a greater-than-240-minute threshold and exclusions. It is a comparator, not a metric the MVP has implemented. No “CMS-compliant boarding” label is justified. [OP-001,005]

For an unfinished episode, show elapsed time and “ongoing.” Never fill a missing departure with zero. Completed median/p90 must display completed N and unresolved N. Current queue ages and completed-episode waits are different distributions. Comparing only completed cases can make a slower scenario appear better because it completes its easiest cases first.

## 4. Entities, geography and capacity

### 4.1 Which entity is a map node?

**Map the physical campus.** Preserve the organizational and regulatory identities behind it. OMH distinguishes sponsor, agency, facility, program unit and physical site; one program can have main and satellite sites. Its population labels are not strictly defined numeric age ranges, and its program county may describe the primary county served. Neither a program name nor an administrative county alone is a sufficient map location. [OP-009]

| Entity | Product representation | Relationship rule |
|---|---|---|
| Health system / organization | Filter and grouping metadata | Affiliation does not establish a referral relationship or common acceptance rules |
| Physical campus | Map node, stable campus ID | Separate geographically distinct campuses even when a regulatory facility spans them |
| Licensed facility/program | Program inspector and upstream identifiers | Preserve source namespace. OMH and DOH identifiers are not interchangeable |
| Service | Population/capability profile at a campus | Adult inpatient, pediatric inpatient, psychiatric emergency, EOB, geriatric, detox and other services remain distinct |
| Actual unit | Named ward/unit only where published | Unknown unit name or program mapping remains unknown |
| Simulation capacity pool | Hypothetical resource associated with a selected adult pathway | A pool is not a newly discovered real ward. Use a separate sim-prefixed ID |
| Placement episode | One synthetic placement occurrence | One physical state, many administrative records |
| Referral | Request from one episode to one destination program/pool | Many can exist for the same episode |
| Reservation | One committed resource held for an episode | At most one active reservation per episode in baseline |
| Transfer | One intercampus movement | Begins only at departure; not created for each referral |

Multiple services at a campus should appear as badges/tabs under one marker. Changing the selected service changes the denominator. Do not sum a parent program, its service description and its units into three separate capacity pools. Do not add EOB, child and adult capacity into a count that appears universally usable.

### 4.2 Capacity vocabulary and evidence requirements

| Quantity | Meaning | What would establish an actual value? |
|---|---|---|
| Licensed/certified capacity | Authorized number for a specified facility/program, service, subtype and effective date | Reconciled operating-certificate record and site/service allocation |
| Staffed operational capacity | Beds supportable with current staffing, equipment and operational conditions | Dated service/unit operations feed with a known definition |
| Occupied beds | Beds currently used by admitted patients | Reconciled census at an observation time |
| Reserved beds | Unoccupied capacity committed to accepted placements | Transfer/bed-management reservation records and release rules |
| Temporarily unavailable beds | Unoccupied capacity blocked for turnaround, maintenance, staffing or another reason | Reason-coded operational status with time bounds |
| Compatible available capacity | Free capacity usable for this placement's modeled requirements | All of the above plus service, age, clinical/medical, legal and other acceptance criteria, and receiver confirmation |

Compatibility is a filter over free slots, not an extra category to add to capacity. In the toy ledger, active configured slots are partitioned into free, occupied, reserved and temporarily unavailable states. Offline slots are outside active capacity. In real data, do not impose this partition unless the source's definitions make it valid.

The tested DOH certification dataset contains bed/service attributes, not live availability. The tested HCDA publication contains adult acute-care/ICU facility totals, not psychiatric-specific placement compatibility. The public OMH BAS announcement describes an institutional reporting system through HERDS/HCS; only the announcement was inspected. Current access, refresh intervals, schema and accuracy were not validated. [DATA-003,004; OP-012]

A credible operational availability display would need authorized service/unit data, observation timestamps, refresh/lag monitoring, occupancy and reservation reconciliation, staffed closures, compatibility rules, and a working acceptance workflow. None of the public inputs in this packet supplies that complete chain. Missing actual data must remain unavailable, not be filled with synthetic numbers under a factual label.

## 5. Public data: actual access and integration decisions

### 5.1 Source audit summary

“Opened” means content was inspected. “Endpoint tested” means a particular request was attempted. “Downloaded” means bytes were successfully saved and inspected. A successful five-row sample is not a full-dataset download; a PDF opened by the research retriever is not necessarily a locally downloaded file. SOURCE_REGISTRY records these separately, including failures.

| Source | What was actually verified | Build decision |
|---|---|---|
| OMH Local Mental Health Programs, 6nvr-tbv8 | Metadata downloaded; 59 inpatient-category and 97 Emergency/Crisis rows downloaded for seven selected counties. Row generation November 2, 2026. Initial unfiltered request was incomplete | Primary program inventory. Curate acute programs and preserve program identity; never use directory categories as live capacity [DATA-001] |
| DOH Health Facility General Information, vn5v-hh5r | Metadata and 5,982 rows downloaded; 5,798 distinct facility IDs; October 23, 2026 update | Cross-check site names/addresses and retain DOH IDs. Latitude/longitude are mailing-address geocodes [DATA-002] |
| DOH Health Facility Certification Information, 2g9y-7kqm | Metadata and 1,074 psychiatry-text-matching attribute rows downloaded; November 15, 2026 update | Regulatory reference only after Bed-vs-Service, subtype and campus reconciliation; not available beds [DATA-003] |
| DOH statewide HCDA capacity, 2dbc-sqe7 | Metadata, five-row endpoint sample dated November 17, 2026, overview and dictionary downloaded | Reject for psychiatric-availability display. Published daily adult acute/ICU snapshot lacks needed service detail [DATA-004] |
| OMH MHPD and BAS material | Public descriptions opened; restricted provider application or actual BAS feed not accessed | Explains identity/governance and an institutional path for later work, not a demo dependency [DATA-005; OP-009,012] |
| SPARCS 2024 public-use discharge file | Metadata and five-record access sample tested; full annual file not downloaded | Possible later aggregate analysis after cohort/release-note review. No patient-level records bundled or used in simulator [DATA-006] |
| NYC DOHMH Epi Data Brief 154 | April 2026 publication, 18-page PDF downloaded; 2023 mean/median LOS checked in Table 2 | Historical LOS reference with explicit cohort mismatch; no boarding-time inference [DATA-007] |
| SAMHSA 2025 mental-health directory | Public HTML and XLSX downloaded despite research-retriever 403; 14,103 facility rows, 13 columns, code-reference sheet inspected | National corroboration; 2024 survey vintage and self-report limitations make it secondary to current local evidence [DATA-008] |
| CMS IPFQR facility quality data | Metadata and full CSV downloaded: 1,411 rows, 78 columns; released November 12, 2026; measure periods mostly earlier | Defer quality overlay; it does not provide queues, referrals or availability [DATA-009] |
| Official provider pages | Manually inspected selected service and campus descriptions; some pages blocked or partly accessible | Curate services and age wording with per-record citations. No provider API was established [FAC sources] |
| NYC borough boundaries | Public API/metadata downloaded, five MultiPolygons | Verified optional higher-detail NYC geometry; portal version and current metadata-document version conflict [MAP-014,015] |
| Census 2025 county boundaries | Official 11.76 MB archive downloaded and inspected; regional GeoJSON converted and validated | Bundled offline-compatible geographic fallback, including White Plains context [MAP-017,018] |
| OSRM public routing | One arbitrary coordinate-pair response succeeded; not a hospital route | Proves endpoint access only; no runtime routing dependency or travel-time calibration [MAP-019,020,029] |

The public facility and program requests worked without accounts, paid subscriptions or tokens. Socrata documents shared-IP throttling for anonymous requests; no fixed anonymous quota or service guarantee was established. A pinned local snapshot is more dependable for a demonstration than querying the portals during every interaction. [DATA-012]

### 5.2 Findings that affect ingestion

1. **Use canonical datasets.** qy8y-zkeq and kh5t-b6ds are community-created views despite their official-looking host domains. The state warns that it has not endorsed their modifications. Use 6nvr-tbv8 and 2g9y-7kqm instead. [DATA-014,015]
2. **Separate metadata dates.** The Data.gov OMH mirror reported July 31, 2026 while the publisher's downloaded rows/metadata were November 2. A harvest date, access date, row-generation date and underlying observation period are different. [DATA-001,013]
3. **Inspect actual content, not only descriptions.** HFIS's description says hospitals/extensions only, but the downloaded file contains other facility types. Explicitly filter the needed types and deduplicate by site with conflict checks. [DATA-002]
4. **Do not infer zero capacity from a zero service measure.** Certification data contains both Bed and Service records, and service rows may have measure zero. Historical effective dates can be migration defaults. [DATA-003]
5. **Do not mistake updated publication for fresh observations.** The November 2026 CMS release includes different historical measure periods, including 2022–2024 claims windows. SAMHSA's 2025 directory uses 2024 responses and was published in March 2026. [DATA-008,009]
6. **Keep access failures visible.** Some Northwell pages were blocked, one Montefiore page only partly accessible, and the ACEP policy page redirected to member sign-in. Independent OMH records support needed service facts; those failures are not hidden behind a claim of inspected provider content. [FAC-024,026,027; OP-015]

### 5.3 Reuse and source preservation

The downloaded OPEN-NY terms support broad lawful reuse, subject to their terms and content-specific restrictions. Protected imagery, logos and other third-party materials are not covered by a blanket right to reuse them. The terms document itself is dated March 8, 2013, although the portal listing shows a later update. [DATA-010]

The separate DOH policy page could not be retrieved directly in this session; indexed text indicates attribution/date/notice requirements. Its current direct wording remains an audit limitation. Conservatively preserve publisher, publication/access dates, original notices and the requested statement: “The New York State Department of Health makes no representation, warranty or guarantee relating to the data or analyses derived from these data.” Recheck the current applicable policy before public release. [DATA-011]

No dataset-specific license was identified on many provider pages or in the fetched CMS metadata. This packet uses short factual records and ordinary citations, not copied provider artwork. The registry records unknown reuse terms rather than assuming everything on a government or hospital website is public domain. Mapping software, geographic data, tile services, routes and fonts have separate terms, covered below.

## 6. Curated seed and source conflicts

### 6.1 Campus selection

All rows below have sourced coordinates in FACILITY_SEED.csv. Borough containment was checked using downloaded DCP polygons; all 22 NYC points fall within their expected boroughs. White Plains falls outside those boroughs and inside Census Westchester County. This verifies geographic containment only, not entrance accuracy or physical unit placement.

| Campus ID | Campus | Geography | Proposed simulation role |
|---|---|---|---|
| nyc_bellevue | NYC Health + Hospitals/Bellevue | Manhattan | Origin and receiver |
| nyc_harlem | NYC Health + Hospitals/Harlem | Manhattan | Origin and receiver |
| nyc_metropolitan | NYC Health + Hospitals/Metropolitan | Manhattan | Origin and receiver |
| nyc_mount_sinai | The Mount Sinai Hospital | Manhattan | Origin and receiver |
| nyc_mount_sinai_bhc | Mount Sinai Behavioral Health Center | Manhattan | Receiver |
| nyc_mount_sinai_morningside | Mount Sinai Morningside | Manhattan | Origin and receiver |
| nyc_mount_sinai_west | Mount Sinai West | Manhattan | Origin and receiver |
| nyc_nyp_weill_cornell | NewYork-Presbyterian/Weill Cornell | Manhattan | Origin and receiver |
| nyc_nyp_columbia | NewYork-Presbyterian/Columbia | Manhattan | Origin and receiver |
| nyc_nyp_allen | NewYork-Presbyterian Allen | Manhattan | Receiver |
| nyc_jacobi | NYC Health + Hospitals/Jacobi | Bronx | Origin and receiver |
| nyc_north_central_bronx | NYC Health + Hospitals/North Central Bronx | Bronx | Origin and receiver |
| nyc_lincoln | NYC Health + Hospitals/Lincoln | Bronx | Origin and receiver |
| nyc_montefiore_moses | Montefiore Moses | Bronx | Origin and receiver |
| nyc_kings_county | NYC Health + Hospitals/Kings County | Brooklyn | Origin and receiver |
| nyc_woodhull | NYC Health + Hospitals/Woodhull | Brooklyn | Origin and receiver |
| nyc_south_brooklyn | NYC Health + Hospitals/South Brooklyn Health | Brooklyn | Origin and receiver |
| nyc_elmhurst | NYC Health + Hospitals/Elmhurst | Queens | Origin and receiver |
| nyc_queens | NYC Health + Hospitals/Queens | Queens | Origin and receiver |
| nyc_zucker_hillside | Zucker Hillside Hospital | Queens | Receiver |
| nyc_rumc | Richmond University Medical Center | Staten Island | Origin and receiver |
| nyc_siuh_princes_bay | Staten Island University Hospital Prince's Bay/South | Staten Island | Receiver |
| ny_nyp_westchester_bh | NYP Westchester Behavioral Health | White Plains | Receiver |

These are **model roles**, not assertions that receiver-only campuses lack emergency services. The 18 origins use verified emergency-service descriptions; the other five do not generate ED demand in this bounded scene. Cross-campus routing permissions remain synthetic. The exact evidence for each campus and service is in the corresponding CSV source fields. [DATA-001; FAC-001–025]

### 6.2 Conflict log and resolutions

| Issue | Evidence conflict or gap | Resolution |
|---|---|---|
| Bellevue adult units | Patient page says eight; recruitment page says seven | Keep adult service; do not choose a live capacity or exact unit census [FAC-001,010] |
| Lincoln beds | Patient page says 33; recruitment profile says 60 | Current capacity stays unknown; scenario values stay separate [FAC-009,010] |
| RUMC pediatric beds | Service page says ten; training page says eleven | Retain pediatric service/age span; omit current bed count [FAC-022,029] |
| Metropolitan populations | OMH umbrella tags include children/adolescents/adults; campus-specific description confirms adult inpatient and pediatric outpatient | Preserve raw tags; pediatric inpatient unit is unverified [DATA-001; FAC-011] |
| Metropolitan recruitment text | A paragraph under its heading describes North Central Bronx | Reject that paragraph as Metropolitan evidence [FAC-010] |
| Beth Israel / BHC | Old hospital at 16th Street closed April 9, 2025; BHC opened in June 2023; current OMH Beth Israel program address is 45 Rivington | Use one active BHC node at Rivington; retain legal alias; no active 16th Street node [DATA-001; FAC-018,028] |
| South Brooklyn | Coney Island alias and older subaddress remain in some records; newer inpatient building described as Ruth Bader Ginsburg Hospital | One campus, preserved alias; no inferred precise unit coordinates [FAC-006,010] |
| SIUH campus | Adult inpatient program is at 375 Seguine, South/Prince's Bay; North is separate | Pin the receiver at South. Do not place its beds at North or infer an observed North-to-South edge [DATA-001,002] |
| Zucker geography/identity | OMH lists LIJ psychiatric program; campus is in Glen Oaks, Queens | Separate Zucker from the LIJ general-hospital campus; DOH crosswalk remains unknown [DATA-001; FAC-025; MAP-014] |
| Morningside coordinates | Inpatient program lacks a georeference | Use same-campus CPEP program 6520:452 at 1111 Amsterdam for the campus marker; retain inpatient missing coordinates [DATA-001] |
| Columbia addresses | Inpatient, general-campus and CPEP addresses differ within campus | Keep purpose-specific addresses; do not infer an ambulance entrance [DATA-001,002; FAC-019,021] |
| Cornell age scope | OMH CPEP tags Adolescents Adults; public NYP CPEP description says 18+ | Preserve both source scopes; do not overwrite program tags or infer the adolescent lower bound [DATA-001; FAC-021] |
| Pediatric boundary overlaps | Bellevue child 4–12/adolescent 12–18; RUMC pediatric 3–18/adult 18+ | Preserve overlaps; no deterministic cross-system age rule [FAC-001,022] |
| Westchester expansion | 2 North page still describes summer-2026 launch | Mark announced/opening unconfirmed despite the past planned date [FAC-020] |
| Northwell staffing plan | FY 2027 planning document corroborates services | Do not treat planned budgets as actual current staffing/availability [FAC-025] |
| West and NCB CPEP identity | Provider descriptions exist but no separate corresponding program row found in selected download | Keep service facts, leave exact registry relationship unknown [FAC-010,016] |

### 6.3 Seed conventions and integration contract

The CSVs are UTF-8 with a header and standard quoted fields. **UNKNOWN** means a value was not established. **NOT_APPLICABLE** is distinct. Empty or absent upstream fields are preserved as unknown; neither sentinel means zero or false. Import all IDs, codes and postal codes as strings so leading zeros survive. Source lists use semicolons.

FACILITY_SEED has one row per map node. Its stable campus ID is curator-assigned; it is not a government code. Current display names, regulatory names and raw sponsor/agency identities are separate. The primary_inpatient_population_tags column describes that inpatient program only; it must not filter away a campus’s different emergency or outpatient populations. Organization filters may normalize these identities, but that is a derived grouping. Every coordinate has a source record and precision note. All campus pins come from OMH; DOH is a separate cross-check. The source does not explicitly document a geodetic accuracy or datum, so the seed does not invent one. Map display assumes the supplied geographic longitude/latitude values; entrance-level routing is deferred.

PROGRAM_SEED has one row per exact selected OMH program, with composite facility_code:program_code, source names, population tags, program address, geographic point if supplied, licensing-required flag and row-generation time. A certificate-duration field is not the certificate's expiration date. The complete operating-certificate number is unknown. Program county is retained as a service-area field, not silently renamed physical county.

SERVICE_SEED contains provider-described services and named units. Some CPEP profiles have a matched program link; exact inpatient unit-to-certificate mapping is generally unverified and remains unknown. The same-campus relationship alone does not resolve that mapping. A service profile and its program are different descriptions of service provision, not additive beds.

Zucker's raw address line ends with “And” and has a second address line. The campus display removes that dangling word while PROGRAM_SEED preserves the original lines. This is display normalization, not an independently verified new address.

Published capacities are intentionally unknown in the starter tables: OMH's directory has no capacity field, and the other public counts require reconciliation. Synthetic capacity, state, demand and edges must be added only in separate scenario entities. This preserves the ability to replace hypothetical operations later without rewriting public facts.

## 7. Data-feasibility gate

The complete field-level gate is FEATURE_DATA_MATRIX.csv. Every proposed field has one of the four requested classes. A derived metric based on synthetic events remains a simulation result; “derived” never upgrades it to observed data.

| Feature / display | Classification | Build now? | Evidence or assumption and limit |
|---|---|---|---|
| Names, addresses, supplied points, regulatory IDs | Verified public data | Yes | Curated source rows; location precision and identity mapping limitations retained |
| Program/service/population descriptions | Verified public data | Yes | Separate ages and services; unknown numeric ages remain unknown |
| Borough assignment and transformed regional geometry | Derived or modeled information | Yes | Documented point-in-polygon and CRS conversion; not entrance geometry |
| Current actual staffed/occupied/reserved beds | Unavailable or deferred | No | Public sources do not supply reconciled psychiatric service operations |
| Actual compatible bed availability | Unavailable or deferred | No | Requires operations plus case compatibility and acceptance |
| Hypothetical pathway pools and resource states | Synthetic operational data | Yes | Clearly labeled scenario allocation, not hospital-wide beds |
| Episode queue size and elapsed waits | Derived or modeled information | Yes | Calculated only from synthetic episode/events; definitions and censoring shown |
| Referral relationships and review outcomes | Synthetic operational data | Yes | Explicit toy search rules; no observed edges inferred |
| Schematic transfer arcs | Derived or modeled information | Yes | Display geometry between real points for synthetic episodes |
| Road routes and route durations | Derived or modeled information | Defer | Need graph/profile/provenance and entrance review; no real EMS performance |
| Moving transfer positions | Derived or modeled information | Yes | Interpolation over simulated departure/arrival; no GPS |
| Actual ambulance positions or fleets | Unavailable or deferred | No | No dispatch/GPS integration or public suitable feed established |
| Historical LOS mean/median | Verified public data | Context only | NYC 2023 aggregate, different cohort from demo |
| LOS distribution, demand rate and scenario differences | Derived or modeled information | Yes | Explicit family/parameter assumptions; no validated prediction |
| Playback and event feed | Synthetic operational data | Yes | Ordered scenario events, not historical operational replay |
| Full ED LOS | Unavailable or deferred | Not default | Upstream arrival is not generated in the minimum model |
| Individual risk and clinical placement recommendations | Unavailable or deferred | Excluded | Outside project scope and unsupported by model/data |

The persistent interface label should read **“Public facility information · Simulated operations.”** Include a nearby definition for each metric, a scenario label on screenshots/exports, and a source drawer with data vintage versus access date. A hypothetical no-capacity event should say “No simulated slot,” not accuse a named hospital of refusing a real patient. Avoid hospital rankings derived from invented performance.

## 8. Recommended simulation

### 8.1 Boundaries

Use a seeded **discrete-event model** of a selected inpatient-indicated cohort. No names, dates of birth, actual diagnoses, individual risk, clinical triage, insurance optimization, legal admission decisions, real bookings or real dispatch are needed. Real service facts constrain which types of destinations appear; the capacity and compatibility mechanics are an illustrative model.

The 23 potential receiving pools represent hypothetical capacity allocated to this pathway. Their occupancy is not total hospital occupancy. Other actual hospital demand, direct community admissions, out-of-area demand, and specialty pathways are absent unless explicitly added as separate synthetic streams later.

Default entry is at inpatient disposition, not initial ED arrival. A readiness delay can precede search. This supports the post-disposition wait clock while avoiding a fabricated full ED assessment model. Optional upstream illustrative events can be a later mode with distinct provenance.

### 8.2 Published parameter evidence versus assumptions

The strongest local numerical anchor located for this handoff is NYC DOHMH's 2023 adult inpatient LOS: **mean 16.5 days; median 11 days**, Table 2 of its April 2026 report. Its population is NYC residents aged 18+ hospitalized in NYC acute-care hospitals. That differs from this selected 18–64 pathway, includes hospitals not in the seed, and excludes outside-city stays. It is not a boarding or transfer-duration dataset. [DATA-007]

A useful default is an **evidence-informed but assumed lognormal LOS distribution**. Choose mu = ln(11 days) and sigma = sqrt(2 × ln(16.5 / 11)) ≈ 0.9005166. This reproduces the published mean and median under that mathematical family. The lognormal shape, tail, independence and applicability to the demo cohort are assumptions, not observed findings. Matching mean and median is not fitting a full distribution and is not “two-moment calibration.” In explicit units: LOS_days = exp(ln(11) + 0.9005166 × Z), where Z is standard normal; convert days to the engine’s chosen time units. Do not assign different LOS distributions to named hospitals without evidence.

| Parameter | Recommended starting value | Provenance and consequence |
|---|---|---|
| Modeled ages | 18–64 | Synthetic scope; separate from source age bounds |
| Active receivers | Up to 23 selected adult-capable campus programs | Adult service existence is verified; inclusion in toy network is a model decision |
| Pathway slots | 24 per enabled receiver | Purely illustrative and equal by default; 552 if all 23 enabled |
| LOS | Assumed lognormal with mean 16.5/median 11 days | Historical aggregate anchors; family and tail modeled |
| Baseline arrival rate | 0.90 × baseline slots / 16.5 per day | Derived nominal service load; approximately 30.1 episodes/day for 552 slots |
| Sending origins | Equal allocation across 18 selected origins | Toy allocation, not real market share or citywide incidence |
| Arrival process | Homogeneous Poisson or pinned generated trace | Assumption; no asserted NYC hourly/weekday pattern |
| Readiness lag | Uniform 0–90 minutes | Illustrative; preserves disposition-versus-search distinction |
| Referral policy | Home pool plus up to2 other eligible pools from a seeded permutation; at most 3 outstanding | Explicit demo policy; not actual referral relationships or preferences |
| Review duration | Uniform 15–90 minutes per request | Illustrative; no real facility acceptance probabilities |
| Retry | No more often than every 2 hours after an unsuccessful round | Model bound; prevents endless same-time retries |
| Reservation | One active commitment, held through arrival/handoff | Baseline has no random expiry; release/cancellation semantics still defined |
| Mobilization | Uniform 30–120 minutes | Synthetic transport preparation, separate from journey |
| Intercampus travel | Uniform 30–90 minutes | Synthetic, independent of schematic arc length; no traffic model |
| Same-campus movement including handoff | Uniform 5–20 minutes, ED departure through unit admission | No external mobilization, intercampus travel or external receiving-handoff delay |
| External receiving handoff | Uniform 10–30 minutes | After intercampus arrival; reservation remains until unit admission |
| Turnaround | Uniform 30–90 minutes | Bed unavailable after discharge before reuse |
| Initialization | 120 simulated days from empty, then save complete snapshot | Heuristic warm-up for a long-tailed LOS; not proof of steady state |
| Evaluation | Shared snapshot plus 7-day scenario window; optional fixed follow-up for placement cohort | Label remaining unresolved cases; no forced completion at day 7 |

The nominal 90% load accounts only for inpatient service time. Reservations, turnaround and review/movement delays change realized resource usage. It is not a guaranteed occupancy level. Compute the baseline arrival rate once; **do not recompute demand downward when a capacity scenario removes beds**, since that would confound the intervention.

No hard LOS cap is necessary to bound computation: schedule discharge once and leave later events beyond the displayed horizon. Any future cap changes the distribution and must be explicit. The 120-day initialization is cheap enough conceptually for a few thousand episodes but still needs implementation profiling. It has not been run here. A more advanced alternative is length-biased/residual-life initialization; simply giving initial occupants fresh full LOS draws would bias turnover.

### 8.3 State and transaction rules

Each episode has one physical location state: sending ED, internal movement or intercampus transit, receiving handoff, inpatient, or exited. Administrative search/referral/reservation states are separate. Referrals never create extra physical patients.

For example, episode SIM-0042 can have three requests under review while remaining one person in the sending ED. Queue count is one; referral workload is three. The first valid commitment wins one resource. Other requests become canceled-placed-elsewhere. A late response cannot reserve a second slot. Acceptance must re-check both episode state and destination capacity at commit time.

At departure, remove the episode from the ED queue and show its movement. The destination slot remains reserved. At receiving arrival, move the episode into handoff. At unit admission, convert exactly one reservation into one occupied slot. At discharge, occupied becomes turnaround; only a later ready event makes the slot free. Same-campus admission follows its own internal branch: commitment, immediate ED departure as an explicit simplification, Uniform 5–20 minutes of internal movement including handoff, then unit admission. Receiving arrival and admission can share the final timestamp in this branch. External mobilization, intercampus travel and external receiving-handoff delays do not apply. It produces no intercampus transfer arc or count.

Minimum accounting requirements:

- Initial people plus generated episodes equal all currently active physical states plus exited episodes, with each episode counted once.
- Per pool: initial occupied plus admissions minus discharges equals current occupied.
- Each slot has exactly one resource state. Counts of free, reserved, occupied and unavailable slots reconcile to active configured capacity.
- An episode has at most one active reservation and one active transport/movement.
- Departure requires a valid commitment and transport readiness; admission consumes the reservation exactly once.
- Cancellations and releases are idempotent; duplicate or stale events have no capacity side effects.
- Equal-time events use a documented deterministic order, for example capacity release before attempted commitment, with stable episode/request IDs for ties.
- No negative durations, negative availability or silently clamped overbooking. Missing events remain missing.
- Queues, map tokens, instruments, trends and feed derive from the same ledger. Animation does not update patient counts.

For a capacity reduction, retire free slots first. Then retire the next slots that finish release/turnaround, including currently occupied, reserved or temporarily unavailable slots, until the target reduction is reached. Honor existing commitments. Show requested target, currently active slots and pending closures separately. Never delete occupants or reservations to force a smaller capacity number.

### 8.4 Scenarios and comparable runs

| Scenario | Intervention | Question it can illustrate |
|---|---|---|
| Baseline | Fixed snapshot, base arrivals and selected capacity configuration | How search, reservations, movement, occupancy and discharge interact |
| Demand increase | Add an independent stream equal to30% of baseline demand during the 7-day window; preserve all original arrivals | What happens to this toy network when its modeled pathway demand grows |
| Capacity addition | Add 8 hypothetical slots to one selected pool from a stated time; unchanged demand | Local sensitivity to added pathway capacity; +8 is only 1.45% of 552 network slots |
| Capacity loss | Drain 8 slots at one selected pool, honoring occupied/reserved slots | How staged resource loss changes delays without breaking conservation |
| Optional transport constraint | Double mobilization draws while holding demand/capacity constant | Why accepted patients can remain in the ED even after placement |

These are not observed events, proposals or forecasts for named hospitals. Avoid promises that a particular intervention will reduce wait by a particular amount before a model is implemented and evaluated. A modest local capacity change need not solve network-wide demand pressure.

Clone one complete snapshot at the branch: people, queues, reservations, pool states, residual LOS, pending events and scheduler state. Reuse baseline episode IDs, arrival times and keyed random draws. Cache readiness, LOS and transport variates by episode ID and process type, independent of referral attempt. Key referral-review variates by episode, destination and attempt. Scenario changes alter parameters or event timing without redrawing existing underlying variates. A surge adds extra IDs without shifting base IDs.

Compare the same evaluation window and base-arrival cohort. Report all-arrival surge results separately because that cohort differs. Provide unresolved counts/fractions and queue-area patient-hours in addition to completed wait statistics. A fixed follow-up interval makes exposure comparable but does not remove completion bias while cases remain unresolved. Continue reporting unresolved cases; if using a restricted-horizon wait, define and compute it for the entire selected cohort. One seed is a repeatable story, not a confidence interval. Multiple seeds describe variability of the toy model only.

## 9. Visualization and implementation feasibility

### 9.1 Semantic encodings

| Visual | Meaning | Guardrail |
|---|---|---|
| Campus point / bracket | Physical campus and selection | Point stays geographically fixed; no movement of hospitals |
| Service badges | Published service categories | Child/adult/emergency/specialty remain separate |
| Small segmented capacity ring | Selected synthetic pool's free/reserved/occupied/unavailable fractions | Constant total size by default; always labeled simulated |
| Queue halo or small count | Unique episodes at that sending campus in selected wait state | Different counts for readiness, placement search and accepted-awaiting-departure |
| Faint dashed referral line | Synthetic request currently under review | Selected episode/facility only to reduce clutter; no moving person |
| Solid transfer connection | Committed simulated intercampus transfer | Not an actual agreement or calculated road route |
| Moving neutral token | Episode after departure and before arrival | Begins/ends at event times; no realistic ambulance/GPS implication |
| Faded trail | Completed synthetic transfers in a labeled recent window | Not included in current in-transit count |
| Event strip | Ordered scenario lifecycle/resource events | No invented clinical emergencies, risk scores or accusatory refusal labels |
| Sparkline / compact distribution | Selected metric from the same synthetic ledger | Fixed units, denominator, window and unresolved N |

The inspector should lead with published name, address, service and source age/vintage. Its operational section should be headed “Simulation” and show the selected pool, queue, reservation and movement state. The queue should use synthetic IDs, service class, state and elapsed time; detailed fictional diagnoses and demographic personas add little value to this MVP.

### 9.2 Three geometries, three different claims

**Schematic connection arcs** join points and convey relationships. Arc height, curvature and line length are visual encodings, not road distance or journey time. deck.gl ArcLayer is suitable for this semantic job. [MAP-003]

**Calculated road routes** come from a graph, travel profile and coordinate assumptions. Their returned time is modeled and may lack traffic, emergency-driving behavior, dispatch delay and verified hospital entrances. If added later, retain engine/version, graph vintage, profile, input coordinates, calculation date and geometry. A road route does not prove that a real transfer occurred. [MAP-019]

**Measured journeys** require real timestamped observations. No usable public psychiatric-transfer/GPS source was identified or tested. Interpolating a token on a calculated route would still be synthetic movement. Never label it “live ambulance.”

### 9.3 Mapping decision

| Option | Fit | License/account distinction |
|---|---|---|
| MapLibre GL JS | Recommended map foundation: geographic camera, vector sources and local style | BSD-3-Clause renderer; retain notices; no vendor account needed for the renderer [MAP-001,002] |
| deck.gl | Optional overlay for arcs, paths, picking and time-indexed movement | MIT; separate from basemap/data licenses [MAP-003–005] |
| Leaflet | Good simpler 2D alternative; also informs a fallback strategy | Current main license inspected as BSD-2-Clause; less direct fit for pitched GPU scene [MAP-006,007] |
| Mapbox GL JS/services | Useful optional vendor ecosystem | Current contractual terms, account/token and service meters; unnecessary for credential-free baseline [MAP-008–010] |

Mapbox's pricing page at research time listed 50,000 monthly GL JS map loads free and then $5 per 1,000 through 100,000. This is a dated observation, not a promise about all Mapbox products. Tiles, search, directions and other products can have separate terms/meters. Recheck if selecting it. [MAP-009]

### 9.4 Separate software, data and hosting obligations

| Layer | Workable baseline | Cost/license implications |
|---|---|---|
| Renderer | MapLibre; optional deck.gl | Open-source notices; no renderer per-load fee |
| Geography | Bundled regional Census conversion; optional DCP borough detail | Source/version/transform attribution; generalized geometry |
| Tile hosting | None for sparse local-vector map | No external credential or tile-service meter; ordinary application hosting still exists |
| Optional rich basemap | A bounded locally hosted PMTiles extract | Underlying geographic-data attribution plus code/style license; range-request hosting configuration [MAP-023–026] |
| Routing | None in default | Schematic arcs work without an API; later routing is a separate service/self-hosting choice |
| Geocoding | No runtime geocoder | Use curated supplied coordinates; avoid hidden external dependency |
| Fonts/assets | Local system fonts or bundled IBM Plex Sans/Mono; original simple icons | Plex SIL OFL 1.1 notice; no hospital logos or copied screenshot art [MAP-027,028] |

OSM data is governed by ODbL; OSM public tile hosting is a separate service. The tile policy is best-effort and disallows bulk/offline prefetch. Those tiles must not be downloaded as this application's offline fallback. The public Nominatim service has its own rate/integration restrictions, including current constraints on generic low-code/no-code integrations. Neither service is necessary for this build. [MAP-011–013]

The OSRM operator's public policy limits use, requires attribution/identification, and does not offer a free unlimited production routing backend. The successful probe used arbitrary coordinates and was not a hospital route. Full operator terms were partly blocked; runtime dependence is therefore especially unnecessary. [MAP-020,021,029]

### 9.5 Credential-free demonstration and fallback

The packaged REGIONAL_GEOGRAPHY.geojson is about 144 KB and contains 18 counties/county equivalents intersecting the selected regional window. Its source is Census 2025; it was converted from NAD83 to WGS84 using the documented regional transformation, with a stated nominal 4 m operation accuracy and six-decimal rounding. That number describes the datum operation, not source-boundary or facility accuracy. See GEOGRAPHY_README for the full county list and limitations. [MAP-017,018]

Bundle this geometry, campus/program/service tables, a local style, local fonts/icons, and later the generated scenario configuration/event data. Load them from the application bundle. Do not rely on a CDN for the minimum offline test. A flat SVG/Canvas geographic fallback and equivalent accessible facility/queue tables should remain usable if WebGL is unavailable. No map vendor key is required for this path.

The downloaded DCP portal geometry was labeled 26c and updated November 2, while its current metadata PDF described 26D dated November 16. Preserve the actual snapshot label if using it; do not relabel older downloaded geometry from a newer documentation page. The Census catalog had a contradictory non-public access-level field despite a CC0 entry and a successful public download; the registry records that metadata defect. [MAP-014,015,017,018]

A single city/regional view can show White Plains, but a selected-facility regional inset may preserve Manhattan legibility. Fit the camera to campus bounds or the intended regional viewport, not to every vertex of the full county polygons. Default to limited pitch; elaborate terrain or 3D hospital meshes are unnecessary to achieve the reference's hierarchy.

At this scale, a browser-resident event engine is a reasonable hypothesis. Keep it independent from rendering, initialize/warm up offscreen or in a worker, use checkpoints for seeking, and virtualize long event lists. For deck.gl TripsLayer, prefer scenario-relative seconds because its documented timestamp precision is limited. These are architecture recommendations, not benchmark results. [MAP-004]

## 10. MVP, deferred features and validation boundary

### Tractable MVP

1. The 23 sourced campus nodes, service/program inspectors, borough/organization/service filters and provenance drawer.
2. A bundled sparse geographic map with selection, clear legends and an accessible table fallback.
3. One adult 18–64 synthetic pathway, one hypothetical pool per enabled receiver and the baseline lifecycle through discharge/turnaround.
4. Baseline, increased-demand and capacity-change scenarios using a shared snapshot and deterministic demand.
5. Unique-episode placement queue, separate referral workload, accepted-awaiting-departure state, movement and event feed.
6. Post-disposition wait, placement wait, active queue, patient-hours, admissions, reservations and simulated occupancy instruments.
7. Replay pause/speed/seek/reset and a compact comparison view with comparable cohorts and unresolved cases.
8. Visible simulation labels in every operational view and export; a no-network launch path after installation/build.

### Defer

- Live beds, observed queues/referrals, operational integrations and ambulance GPS/dispatch.
- Child/adolescent, geriatric, forensic, detox, medical-psychiatry and EOB simulation pathways; their verified services can remain visible as context.
- Automated clinical destination ranking, individual risk prediction, admission-law decision logic, treatment and discharge recommendations.
- Road routing, actual EMS travel times, traffic, catchment optimization and insurance-driven matching.
- Detailed staffed rosters, real unit-level capacity allocation, hospital performance rankings, IPFQR quality overlays and 3D building models.
- Full citywide forecasting and claims of predicted improvement at a real hospital.

### What requires operational validation before real use

The next specification must make it difficult to confuse the demonstration with an operational system. Operational use would require process review with ED/CPEP clinicians, placement coordinators, receiving-unit teams, transfer centers and transport staff; authorized timestamped data; program/unit identity reconciliation; actual age/service/legal/medical eligibility; bed and reservation definitions; external inflows and admissions outside the modeled pathway; staffing/closure/turnaround practices; and comparison against held-out operational periods.

The public inputs do not validate real search order, concurrent-referral policy, rejection reasons, review-time distributions, ambulance dispatch delay, discharge constraints, time-of-day demand or institution-specific transfer relationships. These are named assumptions or unknowns, not gaps to fill with plausible institutional facts.

## 11. Research quality checks and open decisions

Completed for this handoff: successful public-data downloads distinguished from tests and failures; exact selected OMH records preserved;23 source-backed point coordinates; all geographic containment checks passed; separate 35 program and 46 service-profile records; explicit unknown ages and capacities; no patient-level records or operational histories in delivered data; valid regional geometry; source IDs/URLs and temporal conflicts retained. Table-key and reference checks are recorded during final packaging.

Not performed: implementation of an app, simulation run, clinical validation, routing of hospital entrances, live bed verification, comprehensive facility census, or software performance benchmark.

The specification agent should resolve the following before coding:

| Decision | Recommended starting position | Why it remains a product decision |
|---|---|---|
| Opening scene | Selected NYC campus, synthetic baseline, visible queue and provenance | Choose a narrative focal campus without implying it is representative |
| Camera and White Plains | City view plus regional inset/fit action | Balance regional context with Manhattan density |
| Renderer composition | MapLibre first; add deck.gl only for needed overlays | Keep scope proportional to23 nodes |
| Public brand versus sponsor filter | Human-readable organization labels with curated provenance | Legal sponsor and marketed system are not identical fields |
| Scenario defaults | Values in section 8, all exposed as assumptions | Adjust for explanatory quality without implying observation |
| Boarding label and thresholds | Post-disposition ED wait; configurable threshold annotations | Avoid silently mixing standards or claiming compliance |
| Referral policy detail | Home plus up to2 seeded alternatives; no clinical ranking | Explicit toy mechanics, not a citywide practice assertion |
| Comparison follow-up | Equal base cohort,7-day window plus declared fixed follow-up and unresolved reporting | Comparable exposure alone does not remove completion bias |
| Offline behavior | Bundled assets and static-table fallback | Demonstration should survive missing keys/network/WebGL |
| Public export | Persistent synthetic-operation watermark and source/config version | Context must travel with screenshots and exported results |

**Feasibility verdict:** accessible information is sufficient for a visually ambitious, geographic observatory of verified psychiatric campuses and services, with an internally coherent synthetic placement-and-transfer simulation. Every queue, wait, referral, acceptance, reservation, available-slot count, movement and scenario outcome will be simulated or derived from simulation. Actual psychiatric availability, observed transfer networks, real ambulance movement, patient-level risk and clinical placement recommendations remain out of scope.

## 12. Portable bibliography

The following source IDs and ordinary URLs mirror SOURCE_REGISTRY. The CSV contains the full audit, access method, dates, reuse notes, fields and limitations.


### Data and access

| ID | Publisher / title | Ordinary URL |
|---|---|---|
| DATA-001 | New York State Office of Mental Health — Local Mental Health Programs | https://data.ny.gov/Human-Services/Local-Mental-Health-Programs/6nvr-tbv8 |
| DATA-002 | New York State Department of Health — Health Facility General Information | https://health.data.ny.gov/Health/Health-Facility-General-Information/vn5v-hh5r |
| DATA-003 | New York State Department of Health — Health Facility Certification Information | https://health.data.ny.gov/Health/Health-Facility-Certification-Information/2g9y-7kqm |
| DATA-004 | New York State Department of Health — New York State Statewide Hospital Bed Capacity | https://health.data.ny.gov/Health/New-York-State-Statewide-Hospital-Bed-Capacity/2dbc-sqe7 |
| DATA-005 | New York State Office of Mental Health — Mental Health Provider Data Exchange (MHPD) | https://omh.ny.gov/omhweb/mhpd/ |
| DATA-006 | New York State Department of Health — Hospital Inpatient Discharges (SPARCS De-Identified): 2024 | https://health.data.ny.gov/Health/Hospital-Inpatient-Discharges-SPARCS-De-Identified/sf4k-39ay |
| DATA-007 | New York City Department of Health and Mental Hygiene — Psychiatric Hospitalizations Among New York City Adults, 2016 to 2023 (Epi Data Brief 154) | https://www.nyc.gov/assets/doh/downloads/pdf/epi/databrief154-mental-health-hospitalization-2026.pdf |
| DATA-008 | Substance Abuse and Mental Health Services Administration — 2025 National Directory of Mental Health Treatment Facilities | https://www.samhsa.gov/data/report/2025-national-directory-mental-health-treatment-facilit |
| DATA-009 | Centers for Medicare & Medicaid Services — Inpatient Psychiatric Facility Quality Measure Data - by Facility | https://data.cms.gov/provider-data/dataset/q9vs-r7wp |
| DATA-010 | Open New York / New York State — OPEN-NY Terms of Use | https://data.ny.gov/dataset/OPEN-NY-Terms-Of-Use/77gx-ii52 |
| DATA-011 | New York State Department of Health — New York State Department of Health Data Use Policy Statement | https://www.health.ny.gov/about/data_use.htm |
| DATA-012 | Tyler Technologies / Socrata — Application Tokens | https://dev.socrata.com/docs/app-tokens.html |
| DATA-013 | Data.gov catalog / State of New York — Local Mental Health Programs (harvested catalog) | https://catalog.data.gov/dataset/local-mental-health-programs |
| DATA-014 | State of New York portal / community view owner — Mental Health Programs (community-created view) | https://data.ny.gov/en/Human-Services/Mental-Health-Programs/qy8y-zkeq/about_data |
| DATA-015 | Health Data NY / community view owner — Bed data (community-created view) | https://health.data.ny.gov/Health/Bed-data/kh5t-b6ds |

### Operations and measurement

| ID | Publisher / title | Ordinary URL |
|---|---|---|
| OP-001 | American Psychiatric Association — Resource Document on Boarding of Mentally Ill Patients in Emergency Departments | https://www.psychiatry.org/getattachment/cc234644-9092-466a-a90e-cf41daae8e58/RD-Boarding-of-Mentally-Ill-Patients-in-ED.pdf |
| OP-002 | New York State Office of Mental Health — Comprehensive Psychiatric Emergency Program (CPEP) Standards of Care | https://omh.ny.gov/omhweb/crisis/cpep-soc.pdf |
| OP-003 | New York State Office of Mental Health and Department of Health — Guidance on Evaluation and Discharge Practices for EDs, CPEPs, and Article 28 and Private Article 31 Psychiatric Inpatient Programs | https://omh.ny.gov/omhweb/guidance/omh-doh-evaluation-discharge-guidance.pdf |
| OP-004 | Centers for Medicare & Medicaid Services — Know Your Rights: Emergency Medical Treatment and Labor Act (EMTALA) | https://www.cms.gov/files/document/emtala-know-your-rights.pdf-0 |
| OP-005 | Centers for Medicare & Medicaid Services / eCQI Resource Center — Emergency Care Access & Timeliness (HOQR) 1.2.000 | https://ecqi.healthit.gov/sites/default/files/ecqm/measures/CMS1244-v1.2.000-QDM.html |
| OP-006 | New York State Office of Mental Health — Licensed Program Type Definitions | https://omh.ny.gov/omhweb/licensing/definitions.htm |
| OP-007 | New York State Department of Health and Office of Mental Health — DAL 16-03: OMH & DOH Addressing Emergency Mental Health Needs of NYS Individuals | https://healthweb-back.health.ny.gov/professionals/hospital_administrator/letters/2016/2016-11-15_dal_16-03_quidance_to_phl.htm |
| OP-008 | US Department of Transportation / National Highway Traffic Safety Administration — Guide for Interfacility Patient Transfer | https://www.ems.gov/assets/Interfacility_Transfers.pdf |
| OP-009 | New York State Office of Mental Health — Mental Health Provider Data Exchange: Definition of Terms | https://omh.ny.gov/omhweb/mhpd/Definitions.html |
| OP-010 | NewYork-Presbyterian — Psychiatry: Inpatient Admissions | https://www.nyp.org/psychiatry/inpatient-admissions |
| OP-011 | NYC Health + Hospitals / Kings County — Behavioral Health | https://www.nychealthandhospitals.org/kings-county/services/behavioral-health/ |
| OP-012 | New York State Office of Mental Health / NYS News — NYS Office of Mental Health Launches New Electronic Tracking System to Reduce Wait Time for Inpatient Care | https://apps.cio.ny.gov/apps/mediaContact/public/view.cfm?parm=49B2918B-BE46-AF2A-5DAB766D7D9BDB2D |
| OP-013 | Adeyemi, Maass, Graham and Pasupathy / arXiv — Policy Interventions to Improve Inpatient Mental Healthcare Access: A Discrete Event Simulation Study | https://arxiv.org/abs/2304.13849 |
| OP-014 | New York State Office of Mental Health — Guidance for the Involuntary and Custodial Transportation of Individuals for Emergency Assessments and for Emergency and Involuntary Inpatient Psychiatric Admissions | https://omh.ny.gov/omhweb/guidance/interpretative-guidance-involuntary-emergency-admissions.pdf |
| OP-015 | American College of Emergency Physicians — Definition of Boarded Patient (policy page) | https://www.acep.org/patient-care/policy-statements/definition-of-boarded-patient |

### Campus and service evidence

| ID | Publisher / title | Ordinary URL |
|---|---|---|
| FAC-001 | NYC Health + Hospitals — Bellevue: Behavioral Health | https://www.nychealthandhospitals.org/bellevue/services/behavioral-health/ |
| FAC-002 | NYC Health + Hospitals — Kings County: Behavioral Health | https://www.nychealthandhospitals.org/kings-county/services/behavioral-health/ |
| FAC-003 | NYC Health + Hospitals — Elmhurst: Behavioral Health | https://www.nychealthandhospitals.org/elmhurst/services/behavioral-health/ |
| FAC-004 | NYC Health + Hospitals — Woodhull: Behavioral Health | https://www.nychealthandhospitals.org/woodhull/services/behavioral-health/ |
| FAC-005 | NYC Health + Hospitals — Harlem: Mental Health Services | https://www.nychealthandhospitals.org/harlem/services/mental-health/ |
| FAC-006 | NYC Health + Hospitals — South Brooklyn Health: Behavioral Health Services | https://www.nychealthandhospitals.org/southbrooklynhealth/services/behavioral-health-services/ |
| FAC-007 | NYC Health + Hospitals — Queens: Psychiatry | https://www.nychealthandhospitals.org/queens/services/behavioral-health/psychiatry/ |
| FAC-008 | NYC Health + Hospitals — North Central Bronx: Behavioral Health | https://www.nychealthandhospitals.org/north-central-bronx/services/behavioral-health/ |
| FAC-009 | NYC Health + Hospitals — Lincoln: Behavioral Health | https://www.nychealthandhospitals.org/lincoln/services/behavioral-health/ |
| FAC-010 | NYC Health + Hospitals — PSYCH DOCS4NYC: facility psychiatry profiles | https://www.nychealthandhospitals.org/psych-docs4nyc/ |
| FAC-011 | New York Medical College — Psychiatry Residency at Metropolitan | https://www.nymc.edu/som/education/gme/nymc-residency-programs/psychiatry-residency-at-metropolitan/ |
| FAC-012 | NYC Health + Hospitals — Metropolitan: Emergency Medicine | https://www.nychealthandhospitals.org/metropolitan/services/emergency-medicine/ |
| FAC-013 | Mount Sinai Health System — Psychiatry locations | https://www.mountsinai.org/care/psychiatry/locations |
| FAC-014 | Mount Sinai Health System — Inpatient Behavioral Health Services | https://www.mountsinai.org/care/psychiatry/treatment-programs/inpatient |
| FAC-015 | Icahn School of Medicine at Mount Sinai — Mount Sinai Hospital Psychiatry Residency: Clinical Rotations | https://icahn.mssm.edu/education/residencies-fellowships/list/msh-psychiatry-residency/curriculum/clinical-rotations |
| FAC-016 | Icahn School of Medicine at Mount Sinai — Morningside and West Psychiatry Residency: Curriculum | https://icahn.mssm.edu/education/residencies-fellowships/list/msw-msm-psychiatry-residency/curriculum |
| FAC-017 | Mount Sinai Health System — Behavioral Health Center: Inpatient Services | https://www.mountsinai.org/locations/behavioral-health-center/patients/inpatient |
| FAC-018 | Mount Sinai Health System — Mount Sinai Beth Israel closure update | https://www.mountsinai.org/locations/msbi |
| FAC-019 | NewYork-Presbyterian — Inpatient Psychiatric Services for Adults | https://www.nyp.org/psychiatry/adult-psychiatry/inpatient-psychiatric-services-for-adults |
| FAC-020 | NewYork-Presbyterian — Child & Adolescent Psychiatry: Inpatient Services | https://www.nyp.org/psychiatry/child-and-adolescent-psychiatry/inpatient-services |
| FAC-021 | NewYork-Presbyterian — Comprehensive Psychiatric Emergency Program | https://www.nyp.org/psychiatry/comprehensive-psychiatric-emergency-program |
| FAC-022 | Richmond University Medical Center — Behavioral Health – Psychiatric Emergency Services | https://rumcsi.org/services/psychiatric-emergency-services/ |
| FAC-023 | Montefiore Einstein — Emergency Psychiatry | https://montefioreeinstein.org/patient-care/services/psychiatry/programs/emergency-psychiatry?fp-link-id=cu8v6e9l |
| FAC-024 | Montefiore Einstein — Adult & Geriatric Inpatient Psychiatry | https://montefioreeinstein.org/patient-care/services/psychiatry/programs/inpatient-psychiatry?fp-link-id=92hzu5gb |
| FAC-025 | Northwell Health; hosted by NYS Department of Health — Long Island Jewish Medical Center / Zucker Hillside Hospital clinical staffing plan (FY2027) | https://healthweb-back.health.ny.gov/facilities/hospital/staffing_plans/docs/1630_f.pdf |
| FAC-026 | Northwell Health — Zucker Hillside Hospital public website | https://zucker.northwell.edu/ |
| FAC-027 | Northwell Health — Staten Island University Hospital psychiatry page | https://siuh.northwell.edu/psychiatry-behavioral-sciences |
| FAC-028 | Mount Sinai Health System — 2024 Psychiatry report: Message From the Chair | https://reports.mountsinai.org/article/psych2024-00-welcome-from-the-chair |
| FAC-029 | Richmond University Medical Center — Psychiatry residency: Educational Facilities | https://rumcsi.org/careers/graduate-medical-education/residency-programs/psychiatry/educational-facilities/ |

### Geography and mapping

| ID | Publisher / title | Ordinary URL |
|---|---|---|
| MAP-001 | MapLibre contributors — MapLibre GL JS introduction | https://maplibre.org/maplibre-gl-js/docs/ |
| MAP-002 | MapLibre contributors — MapLibre GL JS LICENSE.txt | https://github.com/maplibre/maplibre-gl-js/blob/main/LICENSE.txt |
| MAP-003 | vis.gl contributors — deck.gl ArcLayer | https://deck.gl/docs/api-reference/layers/arc-layer |
| MAP-004 | vis.gl contributors — deck.gl TripsLayer | https://deck.gl/docs/api-reference/geo-layers/trips-layer |
| MAP-005 | vis.gl contributors — deck.gl LICENSE | https://github.com/visgl/deck.gl/blob/master/LICENSE |
| MAP-006 | Leaflet contributors — Leaflet official overview | https://leafletjs.com/ |
| MAP-007 | Leaflet contributors — Leaflet LICENSE | https://github.com/Leaflet/Leaflet/blob/main/LICENSE |
| MAP-008 | Mapbox — Mapbox GL JS LICENSE.txt | https://github.com/mapbox/mapbox-gl-js/blob/main/LICENSE.txt |
| MAP-009 | Mapbox — Mapbox pricing | https://www.mapbox.com/pricing |
| MAP-010 | Mapbox — Access token glossary | https://docs.mapbox.com/help/glossary/access-token/ |
| MAP-011 | OpenStreetMap Foundation — OpenStreetMap Copyright and License | https://www.openstreetmap.org/copyright |
| MAP-012 | OpenStreetMap Foundation Operations — Tile Usage Policy | https://operations.osmfoundation.org/policies/tiles/ |
| MAP-013 | OpenStreetMap Foundation Operations — Nominatim Usage Policy | https://operations.osmfoundation.org/policies/nominatim/ |
| MAP-014 | NYC Department of City Planning / NYC Open Data — Borough Boundaries (gthc-hcne) | https://data.cityofnewyork.us/City-Government/Borough-Boundaries/gthc-hcne |
| MAP-015 | NYC Department of City Planning — New York City Borough Boundary metadata (26D) | https://s-media.nyc.gov/agencies/dcp/assets/files/pdf/data-tools/bytes/nybb_metadata.pdf |
| MAP-016 | City of New York — Open Data Technical Standards Manual: Public Policies | https://cityofnewyork.github.io/opendatatsm/publicpolicies.html |
| MAP-017 | U.S. Census Bureau Geography Division / Data.gov — 2025 Cartographic Boundary File (SHP), County and Equivalent for United States, 1:500,000 | https://catalog.data.gov/dataset/2025-cartographic-boundary-file-shp-county-and-equivalent-for-united-states-1-500000 |
| MAP-018 | U.S. Census Bureau Geography Division — cb_2025_us_county_500k.zip | https://www2.census.gov/geo/tiger/GENZ2025/shp/cb_2025_us_county_500k.zip |
| MAP-019 | Project OSRM contributors — OSRM HTTP API documentation v5.24.0 | https://project-osrm.org/docs/v5.24.0/api/ |
| MAP-020 | FOSSGIS — About routing.openstreetmap.de | https://routing.openstreetmap.de/about.html |
| MAP-021 | Project OSRM contributors — API usage policy wiki | https://github.com/Project-OSRM/osrm-backend/wiki/Api-usage-policy |
| MAP-022 | Project OSRM contributors — OSRM backend LICENSE.TXT | https://github.com/Project-OSRM/osrm-backend/blob/master/LICENSE.TXT |
| MAP-023 | Protomaps — PMTiles Concepts | https://docs.protomaps.com/pmtiles/ |
| MAP-024 | Protomaps — Basemap Downloads | https://docs.protomaps.com/basemaps/downloads |
| MAP-025 | Protomaps — Basemaps data licenses and attribution | https://github.com/protomaps/basemaps/blob/main/LICENSE_DATA.md |
| MAP-026 | Protomaps — Basemaps code licenses and attribution | https://github.com/protomaps/basemaps/blob/main/LICENSE.md |
| MAP-027 | IBM / Google Fonts repository — IBM Plex Mono OFL.txt | https://github.com/google/fonts/blob/main/ofl/ibmplexmono/OFL.txt |
| MAP-028 | IBM / Google Fonts repository — IBM Plex Sans OFL.txt | https://github.com/google/fonts/blob/main/ofl/ibmplexsans/OFL.txt |
| MAP-029 | FOSSGIS public OSRM service — Single arbitrary NYC coordinate-pair routing probe | https://routing.openstreetmap.de/routed-car/route/v1/driving/-73.98,40.75;-73.95,40.78?overview=false |

### Provided reference

| ID | Publisher / title | Ordinary URL |
|---|---|---|
| REF-001 | User-provided attachment — Shipping-dashboard visual reference | NOT_APPLICABLE (user attachment HUT0Vs7awAADe6W(1).jpeg) |
