# Simulation and application architecture

**Public facility information · Simulated operations.** The simulation represents an illustrative adult general acute inpatient pathway after an inpatient disposition. Ages 18–64, the choice of sending campuses, the admission pool, search rules and all operational measures are modeling choices. The public evidence preserves each service's own age wording and uncertainties.

## One event history

The source-table importer validates the supplied CSVs and creates a versioned local snapshot. `src/data.ts` relates campuses, OMH program rows, provider profiles and source records by stable keys. It passes only campus IDs and modeled sending roles to the simulator. The map draws a single point per campus.

`src/sim.ts` builds each run with a discrete-event scheduler and deterministic variates keyed by seed, episode and process. Referral reviews additionally use the attempt and destination. Integer-minute events share a stable priority order: slot release, discharge, admission, arrival, departure, disposition, search, review, then episode and destination IDs for ties. A newly scheduled same-minute consequence follows its cause. The main clock is scenario-relative.

Start with empty pools, run 120 days, and clone the resulting state, including ongoing people, referral histories, committed resources and residual scheduled events. Every branch reuses that snapshot. A 7-day evaluation window follows. Each pool retains ordered resource changes, while each episode and request retains its timestamps. Seeking uses binary lookup for capacity and events plus an as-of projection of the episode timelines. Displayed facts never expose a later state transition. A short lookahead resolves travel interpolation for trips crossing the endpoint.

`src/runs.ts` caches each scenario/seed once. React renders a single projected frame at the replay clock. The network cards, inspector, event log, transfer list and map read that frame. Map panning and interpolation have no side effects on the ledger. Snapshot trend points use hourly samples with the current frame appended. The event feed retains up to 300 recent evaluation events. The map shows current transfers and optional two-hour arrival trails.

## Assumptions

| Process | Synthetic rule |
| --- | --- |
| Network | 23 receiving pools × 24 slots. Equal demand allocation among 18 selected origins. Five campuses are receive-only within this model. |
| Demand | Homogeneous Poisson arrivals. The baseline rate is 0.90 × 552 / 16.5 = 30.1 per day, fixed across capacity interventions. |
| Readiness | Uniform 0–90 minutes after disposition. Up to three parallel requests, to the home pool and up to two seeded alternatives. |
| Review | Uniform 15–90 minutes per request. If the whole round is unsuccessful, wait 120 minutes before retrying. |
| Commitment | The first eligible response with a free slot reserves it in one transaction. Other pending requests close as placed elsewhere. A stale review cannot reserve another slot. |
| External transfer | Remain in the ED for 30–120 minutes after commitment, travel for 30–90 minutes, and hand off at the receiver for 10–30 minutes. Journey duration is independent of the schematic line length. |
| Internal placement | Same-campus commitment and ED departure coincide. Movement and handoff take 5–20 minutes before admission. No intercampus transfer is generated. |
| Stay | Lognormal days with log-location ln(11) and log-scale 0.9005166. These assumptions reproduce an aggregate median of 11 and mean of 16.5 days. Stays can continue beyond replay. |
| Turnaround | Discharge releases occupancy into a 30–90 minute turnaround. Availability resumes at completion unless the resource is due to close. |

The historical anchor is NYC DOHMH's 2023 summary of NYC residents aged 18+ hospitalized in NYC acute-care hospitals. The simulated distribution, tail and independence are assumptions. See [source details](DATA.md). The warm-up approximates a populated network at time zero. It has no empirical steady-state validation.

## Accounting and comparisons

A person occupies one physical state. The ED queue includes readiness, search and preparation. Requests have their own lifetimes. A commitment moves a slot from free to reserved, and the reservation survives travel and receiving handoff. Admission converts that reservation into occupancy. At each campus, free + reserved + occupied + turnaround equals active capacity. A reduction retires free slots immediately, then retires released slots after turnaround. The gap between active capacity and the target is visible as pending closures.

Day 1 interventions are **baseline**, **+30% demand**, **+8 Bellevue slots**, and **−8 Bellevue slots**. Increased demand is an independent stream, preserving the base entrants, times and per-process variates. Both capacity changes preserve demand. Selecting a campus changes the inspector; switching scenarios keeps the replay minute and pauses the clock. Reset returns to minute zero in the active scenario. A separate control returns to that scenario's sample transfer.

**Post-disposition ED wait** measures disposition to physical ED departure. **Placement wait** measures readiness to commitment. Response intervals require a receiving response. Resolution also includes cancellations. Durations and ongoing counts have separate columns. A queue snapshot includes carry-in episodes; the comparison cohorts contain only evaluation-window arrivals. Admission and ED-departure throughput count evaluation-window events and can include carry-in episodes.

Scenario comparison uses matched base arrivals across the full seven-day window, independently of the replay position. The all-arrivals view also includes surge entrants. Completed medians and p90s exclude still-open intervals and report their counts separately. Patient-hours sum every cohort episode's waiting time through departure or the common cutoff. Later entrants have less follow-up. A single demonstration seed provides neither a forecast nor evidence of observed hospital performance.

## Map and control behavior

MapLibre renders bundled local geography. A shared geographic overlay places campuses, selected referral lines and transfer tokens using the same flat projection in both WebGL and SVG. Recent transfer trails are separated from current in-transit counts. The region camera includes the White Plains campus. The directory, movement list and episode timelines provide text alternatives. The app starts paused; reduced-motion preferences suppress cosmetic motion.

A filter that hides the selected campus selects the first remaining match. An empty result clears visible selection until the filter changes. Clearing a filter preserves the current selection. Directory selection opens that campus on the map and clears map filters. Filtered queue counts use the sending campus; a transfer remains visible when either endpoint matches. Network summaries and scenario comparison retain their original network denominators.
