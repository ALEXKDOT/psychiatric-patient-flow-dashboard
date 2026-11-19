# Build status

## Campus geography and continuous replay

The local redesign starts from `c11f213e8cb7284fcd6364c26ea62622f8a325f9`. The two supplied archives reconstruct one research packet. Its validator passed 470 file checksums and all 23 building identities. The original light and dark reference JPGs, three release screenshots and geometric study were used for visual review. The repo holds the resulting application, redistributable geographic inputs and captures of the running app. The original reference media and handoff stay outside the release.

| Milestone | Implemented behavior |
| --- | --- |
| A · Geography | Selected map marks and directory results open the same attributed exterior. The 23 neighborhoods contain 42,131 mapped footprints and 7,982 street features. The regional map uses 2,550 Census road features, local water boundaries and relief from 358 Mapzen Terrarium tiles. Campus focus has a locator, scale, street labels, interruptible orbit and Back. The flat map uses local geometry. |
| B · Replay | Standard motion opens playing at Day 7 11:20, 360×. Reduced motion opens paused. The canonical event ledger drives the clock, travel interval, queue, pool, event feed and inspectors. A manual camera move releases Follow and leaves the episode selected. Reset, speed changes, backward and forward seek, visibility changes and the seven-day end are supported. |
| C · Demonstration | Watch featured transfer switches to Baseline/42 and starts at Day 7 08:25. Bellevue remains the origin until departure. The camera follows the schematic connection and frames Queens at arrival. Arrival opens handoff with the reservation held. Admission updates occupied capacity. Both themes, keyboard controls, a responsive subject sheet and local failure recovery support the walkthrough. |

### Recorded episode

| Day 7 time | Model minute | Observation |
| --- | ---: | --- |
| 08:25 | 9145 | EP-0190 in Bellevue placement search. Three open referrals for this episode, destination unknown. |
| 08:43 | 9163 | Commitment to Queens. Two slots reserved in the receiving pool, including a separate episode committed in the same minute. |
| 10:39 | 9279 | ED departure. One active schematic traveler for EP-0190. |
| 11:20 | 9320 | Opening sample. Three queued episodes, zero open referrals, three external transfers, 461 of 552 slots occupied. |
| 12:02 | 9362 | Arrival and receiving handoff. Moving marker removed and this episode’s slot still reserved. |
| 12:27 | 9387 | Admission. Queens converts this reservation into occupancy. |

The renderer interpolates the recorded interval with a monotonic presentation clock. Every clinical state change comes from the integer-minute ledger. The unmodified packet exporter produced a byte-for-byte match for all 13 fixture frames after the redesign. Travel paths depict simulated connections. Facility program records, building identity, mapped heights and synthetic operations have separate provenance. Bellevue Building H alone uses its 264 ft filed height. White Plains retains the program point for the regional network and a separate interior point for the county complex. The 26 unknown source heights remain unknown.

### Verification and reproduction

The production build, TypeScript, ESLint and all 24 unit and integration tests passed. A clean lockfile installation installed 251 packages with Node 24.22.1 / npm 12.2.3 using a writable npm cache. Both source validators passed. Regenerating the regional elevation assets, light/dark relief and tile index in a separate directory reproduced the committed files byte for byte.

| Acceptance | Observation |
| --- | --- |
| A1 · Network composition | Geography measured 1418 × 637 at 1440 × 900 and 1891 × 764 at 1920 × 1080, or 69.7% at both sizes. Clear center rectangles measured 1384 × 307 and 1857 × 374. The earlier release occupied 43.7% on the smaller desktop. |
| A2–A4 · Campus identity and return | Inspected actual Bellevue and Queens light, dark and phone captures before installing the remaining 21 packs. Checked keyboard and pointer selection, orientation, return focus and view, and all target IDs. The neighborhood loader cancels stale selections and retains at most three parsed packs. |
| B1–B4 · Replay consistency | All 13 reference observations matched the original model exporter. Tests covered reservations, separate episodes and referrals, handoff, admission, all four scenarios, fractional 1× motion, speed changes, hidden time, forward/backward seeks, empty traffic and replay completion. |
| C1 · Accessible controls | Chromium accessibility tree, keyboard navigation and touch emulation covered selection, list equivalents, visible focus, sheet, reduced motion, timeline and phase stepping. Manual tests included both 390 × 844 and 320px widths. |
| C2 · Local service and renderer failures | Local Pages subpath passed under cold off-origin blocking. The walkthrough worked in forced SVG and with WebGL unavailable. A true WebGL context loss preserved the campus in the 2D plan. Failed neighborhood requests exposed Retry and Back. With all 21 requested elevation tiles deliberately rejected, Bellevue’s roof, street names and Back stayed usable. A warm reload revalidated 28 resources with HTTP 304, including three font files. |
| C3 · Scene retention | Across 23 successive native selections the app retained at most three parsed packs, five native campus sources, one visible campus canvas and one hidden regional canvas. Main-frame heap after forced GC measured 24.0 MB at selection 3, 26.3 MB at 10, 24.6 MB at 20 and 25.2 MB at 23. |
| Static distribution | Audited 436 files / 57,460,247 bytes, containing 46 campus files loaded on selection and 358 supplied DEM tiles. Verified all release paths against the static asset inventory and 22 review-only digests. The map and geometry JS chunks trigger Vite’s default 500 kB size warning. |

A five-second native orbit changed bearing by 7.10° with 0.00 CSS px focus drift. At 47° pitch and −11° bearing the measured distance between EP-0190’s hit center and the projected trail endpoint was 0.000205 CSS px. Keyboard Back restored the original zoomed extent and focused its invoking pin.

The local 1440 × 900 production recording lasts 48.96 seconds (VP9, 7,894,455 bytes). Its 1,387 captured compositor frames preserve the actual wall-time intervals. The sequence includes selecting Bellevue, moving EP-0190, the Queens handoff, later admission, and returning to the network. [Watch the recording](screenshots/bellevue-queens-walkthrough.webm)

### Performance on the available renderer

Chromium 156.0.8078.79 used ANGLE/Vulkan SwiftShader at 1440 × 900 and DPR 1 with five reported logical processors. The container was limited to four CPU cores and 32 GiB of RAM. For each trial the browser sampled a running network, a ten-second campus orbit and an active Follow. Smaller motion-only drawing buffers apply to software rendering. Text and controls keep their native resolution. The regional renderer persists while the selected campus loads, and both views reuse the same parsed shoreline.

| Production trial | Cold Bellevue entry | Warm Bellevue entry | Network frames/s | Orbit frames/s | Orbit p95 interval | Follow frames/s |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 1.757 s | 1.687 s | 59.3 | 34.6 | 50 ms | 59.5 |
| 2 | 1.922 s | 1.830 s | 60.0 | 30.6 | 50 ms | 60.0 |
| 3 | 1.797 s | 1.754 s | 59.5 | 31.0 | 50 ms | 59.8 |

The median warm selection improved from 3.777 to 1.754 seconds over the two measured revisions. All three optimized trials reached the 30 fps average and 2.2-second warm-selection targets. **The 33.4 ms p95 orbit interval target remains unmet** on this software renderer. The longest orbit frame was 133.3 ms. First-load encoded resource bodies measured 2,949,379 bytes, followed by 882,441 bytes of geometry on first entry to Bellevue. The timing run preceded three small-screen fixes. They reserve space for transfer endpoints on phones, hide the search keycap at tablet widths and fit the flat campus camera before its first paint. [Per-trial timings, frame samples and bytes](verification/campus-replay-performance.json)

The production path in this environment is a locally served Pages project subpath. The simulation works with outbound requests blocked while that server is running. A disconnected cold start of the public site and measurements on physical phones or hardware GPUs are outside these checks.

From the checkout, repeat the non-browser checks with:

```sh
npm ci --cache /tmp/flow-atlas-npm
npm run typecheck
npm run lint
npm test
python3 scripts/import-data.py --check
python3 scripts/validate-campus-packs.py
npm run build
node scripts/check-pages-dist.mjs
npm run preview -- --host 127.0.0.1 --port 4184 --strictPort --base=/psychiatric-patient-flow-dashboard/
```

With the original research packet available, these independent checks reproduce its validation and recorded journey:

```sh
ATLAS_PACKET=/path/to/extracted/Flow-Atlas-Redesign
(cd "$ATLAS_PACKET" && python3 tools/validate.py)
node --import tsx "$ATLAS_PACKET/tools/export_journey.mjs" > /tmp/flow-atlas-journey.json
cmp "$ATLAS_PACKET/verification/bellevue-queens.json" /tmp/flow-atlas-journey.json
```

See the [walkthrough and installation commands](../README.md), [campus sources](attribution/campuses/README.md), [cartography notes](../src/cartography/README.md), [browser evidence](VERIFICATION.md) and [application captures](screenshots/).

## Historical build record

The starting branch was `work`, clean at `315514a`. The repository contained project instructions and skills. The owner requested implementation on November 18, 2026.

### Inputs and design decisions

The submitted ZIP contains nine research files, preserved in [research](research/). Neither the checkout nor the archive included the named reference screenshot or separate product, data, design, architecture and implementation-plan documents. The three milestones in the request set the implementation order. The handoff, the dossier's composition analysis, the geographic provenance, and the feature matrix supplied the detailed requirements. After the initial build, the owner attached four visual references, including the light Bosphorus shipping console. These supplied the missing visual comparison.

- Build Flow Atlas as a React and TypeScript application with Vite, MapLibre and a local flat-map alternative. The handoff specifies the renderer and leaves the application framework open. The compact network needs no deck.gl overlay.
- Default to the city camera and Bellevue's campus inspector. Display undated scenario-relative Day and time. Use local IBM Plex Sans and Mono, pale land and water, graphite telemetry and small orange selection marks. Inspect at 1440 × 900 and 390 × 844, as the packet specifies no viewport sizes.
- Keep source facts distinct from the 18–64 adult-pathway simulation. Preserve the original CSV strings, source IDs and unknowns. Use published sponsor code for organization filters. Selection changes inspection; summary metrics always cover the full simulated network. Label filtered lists with their scope.
- Branch four simulations from a common baseline: baseline demand, an additional 30% stream, and a local addition or staged reduction of eight Bellevue slots. The fixed campus makes scenario results reproducible as the user explores other sites.

### Milestones

1. **Visual slice verified.** Loaded the approved seeds, selected Bellevue and rendered an actual post-departure transfer. Chromium at 1440 × 900 and 390 × 844 exercised the map, record lookup, layers and filters. Inspection found a blank band below the mobile map, corrected by sizing the renderer to the entire canvas. The repeated captures are in [screenshots](screenshots/).
2. **Operational ledger and playback verified.** Eight model tests passed for replay, one winning request, occupied and reserved slots, draining capacity, shared starting resources, independent surge demand, unresolved waits, and retained referral history for warm-up occupants. Three data-integrity tests passed. The play, speed, reset, seek and scenario controls use the same frame as the map, capacity ring, event log and instruments.
3. **Complete demonstration verified.** Matched and all-arrival cohorts, unresolved counts, patient-hours and JSON export are implemented for three alternatives to baseline. Production browser checks exercised both renderer paths, keyboard selection and focus return, offline replay, and responsive layouts. The final captures and measured performance are in [VERIFICATION.md](VERIFICATION.md).

### Reference-led redesign

The first dashboard devoted approximately a quarter of its desktop viewport to geography. In the provided references, fine instrument controls share the edges of a substantially larger map. The redesign follows the pale Bosphorus view for the geographic field and target brackets, the black tracking view for compact floating telemetry, and the aviation and dark maritime views for the aligned control and instrument panels.

The workspace now puts layer visibility, the selected campus record, a slot raster and a regional locator in a narrow left rail. Replay attaches to the map; the lower bank shows the placement queue, queue history and event feed. The selected campus has an anchored ID and coordinate readout. Small screens move the telemetry above the map and expose the layer controls in a keyboard-accessible dialog. Search opens with Ctrl+K or Cmd+K.

Review of the rendered map exposed a shoreline error: the supplied county polygons extend into the Hudson and East River. The dashboard now clips the local geographic field to historic borough shorelines and GSHHG water geometry, so the city map shows both riverbanks. Census block groups provide the fine surface detail.

The supplied seed facts and model remain the basis of the display. Browser capture and verification commands, screen dimensions, performance measurements and limitations are in [VERIFICATION.md](VERIFICATION.md). Geographic sources and rendering choices are in the [cartography notes](../src/cartography/README.md).

### Reproduction

```sh
npm ci --cache /tmp/flow-atlas-npm
npm run dev
```

For the validation path, from the repository root:

```sh
python3 scripts/import-data.py --check
npm run lint
npm test
npm run build
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

In a second terminal run `npm run test:browser -- --url http://127.0.0.1:4173`. See the [walkthrough](../README.md#reproduce-the-demonstration) for seed 42 and [browser verification](VERIFICATION.md) for browser setup and screenshot commands.
