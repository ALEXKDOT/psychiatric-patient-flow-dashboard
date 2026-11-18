# Browser verification

Run the application checks against a local production preview. From the repository root, run `npm ci`, `npm run build`, then `npm run preview -- --host 127.0.0.1 --port 4173 --strictPort`. Keep the preview running while executing these commands in a second terminal.

```sh
# Install a test browser if the machine has no system Chromium.
npx playwright install chromium
node tests/browser_verify.mjs --url http://127.0.0.1:4173
node tests/browser_capture.mjs --url http://127.0.0.1:4173 --out docs/screenshots --prefix observatory
```

Both scripts use Playwright. On Linux they prefer `/usr/bin/chromium` when present. Set `CHROMIUM_BIN` to choose a different local executable. Screenshots use device scale factor 1, English labels, reduced motion, and CSS viewports of 1440 × 900 and 390 × 844. These sizes were chosen for this build. The handoff supplied no fixed dimensions.

The browser harness denies HTTP(S) requests to other origins and counts attempted requests. This tests use without an Internet connection while the installed app is served locally. It does not test opening a previously visited dashboard without a running web server. No credentials are supplied to the browser.

## Visual review

The nine-file research archive included the written compositional analysis and geographic data. Neither the archive nor the repository contained the referenced shipping screenshot. Visual review used the dossier's described hierarchy of pale geography, a strong selection, schematic movement, an inspector, and compact lower instruments.

The first responsive capture exposed a 131px empty band under the mobile map. The corrected 390px capture fills the map panel through its legend. Both revised views show the selected Bellevue campus, an actual in-flight episode from the ledger, source/config vintage, and simulated-operation status. Neither viewport had horizontal overflow at the visual-slice milestone.

- [Desktop visual slice, 1440 × 900](screenshots/milestone-1-desktop.png)
- [Mobile visual slice, 390 × 844](screenshots/milestone-1-mobile.png)

## Interaction coverage

The repeatable browser journey exercises campus selection via keyboard, all-campus regional extent, zoom, pan, map reset, layer visibility, expanded-map focus return, directory search, area filters, empty results and clearing, source citations, and the text list of transfers. It compares distinct queue entries and open referral sums with displayed counts and the latest network queue sample. It seeks both directions, changes replay speed, runs and pauses playback, resets to Day 1, returns to a sampled transfer, and restores baseline after a local intervention. The comparison test reads the downloaded JSON to verify its synthetic designation, source and model versions, seed, matched cohort, added arrivals, and resolved/unresolved arithmetic.

The model tests cover state-space behavior through simulated time; the browser checks above follow the public controls. The dashboard's local WebGL renderer runs on desktop. The second browser session disables WebGL through Chromium's startup flag and requests reduced motion. It switches the browser context offline after initial load to exercise local fallback navigation and replay. For directory and export checks it permits only the local app origin again.

## Production run, November 18, 2026

The production browser suite exited successfully. Each session recorded zero uncaught page errors and zero requests to external HTTP origins. The desktop session reached MapLibre's idle state and exposed all 23 campus markers at regional extent. In the reduced-motion mobile session, Chromium refused WebGL 2 creation, the SVG renderer took over, and keyboard map movement and replay still worked after network disconnection. Selection, the inspector, filters, comparison, and JSON export worked at both viewport sizes. An additional desktop and mobile comparison check exercised all three interventions and read six exported files. The demand comparison had 211 matched base arrivals and 271 all-stream arrivals in the +30% branch.

| Measurement | Desktop, MapLibre | Mobile-size viewport, SVG |
| --- | ---: | ---: |
| CSS viewport | 1440 × 900 | 390 × 844 |
| Playback sample | 4.017 seconds | 4.016 seconds |
| Browser animation frames per second, average | 60.0 | 58.3 |
| Frame interval, 95th percentile | 16.8 ms | 16.8 ms |
| Longest frame interval | 16.8 ms | 50.0 ms |
| Observed main-thread long tasks in sample | 0 | 0 |

On a fresh local browser context, the desktop DOMContentLoaded event finished at 229 ms, the first contentful paint occurred at 596 ms, and the local MapLibre renderer reached idle at 1,274 ms. The navigation and resource timing entries reported 879,937 encoded bytes through map readiness. Each frame sample used the 1,440× replay setting with the local server already loaded. Frame intervals measure browser animation-frame callbacks during playback.

These are single-run measurements from Chromium 156.0.8078.79 on a shared x86-64 Linux cloud VM using SwiftShader for WebGL. The mobile result uses a desktop browser with a mobile viewport and WebGL disabled. Device CPU, GPU, pixel density, browser, and screen reader combinations outside this environment remain unmeasured.

### Final screenshots

Both final opening screenshots use the MapLibre renderer and seed 42. Visual inspection confirmed the provenance line, selected Bellevue campus, active schematic transfers, readable map controls, and a map canvas flush with its legend. At 390px the inspector and instrument panels follow the map vertically. A responsive check at widths from 320 to 1440px found no page-level horizontal overflow at the 11 sampled widths.

- [Desktop observatory](screenshots/observatory-desktop.png)
- [Mobile observatory](screenshots/observatory-mobile.png)
- [Scenario comparison](screenshots/scenario-lab.png)
