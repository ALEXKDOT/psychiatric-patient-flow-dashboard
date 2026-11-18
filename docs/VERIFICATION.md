# Browser verification

Run the application checks against a local production preview. From the repository root, run `npm ci`, `npm run build`, then `npm run preview -- --host 127.0.0.1 --port 4173 --strictPort`. Keep the preview running while executing these commands in a second terminal.

```sh
# Install a test browser if the machine has no system Chromium.
npx playwright install chromium
node tests/browser_verify.mjs --url http://127.0.0.1:4173
node tests/browser_capture.mjs --url http://127.0.0.1:4173 --out docs/screenshots --prefix observatory --comparison
```

Both scripts use Playwright. On Linux they prefer `/usr/bin/chromium` when present. Set `CHROMIUM_BIN` to choose a different local executable. Screenshots use device scale factor 1, English labels, reduced motion, and CSS viewports of 1440 × 900, 1920 × 1080, and 390 × 844. The capture log includes the rendered map's position, dimensions, and share of the viewport before counting overlaid controls.

The browser harness denies HTTP(S) requests to other origins and counts attempted requests. This tests use without an Internet connection while the installed app is served locally. It does not test opening a previously visited dashboard without a running web server. The test browser starts with a fresh profile and no credentials.

## Initial visual slice

The nine-file research archive included the written compositional analysis and geographic data. Neither the archive nor the repository contained the referenced shipping screenshot. The first build used the dossier's described hierarchy of pale geography, a strong selection, schematic movement, an inspector, and compact lower instruments.

The first responsive capture exposed a 131px empty band under the mobile map. The corrected 390px capture fills the map panel through its legend. Both revised views show the selected Bellevue campus, an actual in-flight episode from the ledger, source/config vintage, and simulated-operation status. Neither viewport had horizontal overflow at the visual-slice milestone.

- [Desktop visual slice, 1440 × 900](screenshots/milestone-1-desktop.png)
- [Mobile visual slice, 390 × 844](screenshots/milestone-1-mobile.png)

## Interaction coverage

The repeatable browser journey exercises campus selection via keyboard, all-campus regional extent, zoom, pan, map reset, layer visibility, expanded-map focus return, directory search, area filters, empty results and clearing, source citations, and the text list of transfers. It compares distinct queue entries and open referral sums with displayed counts and the latest network queue sample. It seeks both directions, changes replay speed, runs and pauses playback, resets to Day 1, returns to a sampled transfer, and restores baseline after a local intervention. The comparison test reads the downloaded JSON to verify its synthetic designation, source and model versions, seed, matched cohort, added arrivals, and resolved/unresolved arithmetic.

The model tests cover state-space behavior through simulated time; the browser checks above follow the public controls. The dashboard's local WebGL renderer runs on desktop. The second browser session disables WebGL through Chromium's startup flag and requests reduced motion. It switches the browser context offline after initial load to exercise local fallback navigation and replay. For directory and export checks it permits only the local app origin again.

## Console redesign review

The redesign follows the light cartographic reference with a thin status bar, a persistent layer rail on desktop, a selected-campus callout anchored to its marker, and a ruled lower instrument band. The three dark console references informed the floating telemetry strip, instrument density, and fine labels. The factual facility catalogue and seeded patient-flow model remain the same.

At the initial 1440 × 900 checkpoint the original map began 343 px from the top and covered 25.2% of the viewport. The redesign moves control navigation out of the header and overlays the network metrics on the geographic scene. On a narrow screen the layer controls open in a dialog and the telemetry strip sits above the map, leaving the touch surface available for exploration.

The browser journey operates the layer rail using the keyboard, checks that hiding and restoring campus and movement layers changes the map, opens the mobile layer dialog, and opens the campus directory with Ctrl+K. A keyboard pass verified that the first Tab reveals the skip link and that a focused layer checkbox displays a solid two-pixel focus outline.

- [Desktop console, 1440 × 900](screenshots/observatory-desktop.png)
- [Wide console, 1920 × 1080](screenshots/observatory-wide.png)
- [Mobile console, 390 × 844](screenshots/observatory-mobile.png)
- [Scenario comparison](screenshots/scenario-lab.png)

## Production results for the redesign

The complete production browser suite passed on November 18, 2026. Desktop reached MapLibre idle and exposed all 23 campus markers in the regional view. The keyboard journey selected a campus and an active transfer, inspected their details, and exercised both map extent controls. In a separate mobile session, Chromium disabled WebGL, rendered the SVG fallback, and completed map and playback interactions after the network was disconnected. Both browsers completed filter, directory, comparison and export checks with zero uncaught page errors and zero external HTTP requests. Twelve widths from 320 to 1920 px had no page-level horizontal overflow.

All four revised screenshots were inspected after capture. The surface shows the Hudson and East Rivers around Manhattan, a bracket and callout on Bellevue, three ledger-backed schematic transfers, and a separate local geography credit. The desktop instrument band fits below the replay controls. The mobile layout keeps simulated status, scenario, replay controls, seed, and source/model versions visible at its opening scroll position.

| Opening viewport | Map top | Map dimensions | Map share of viewport |
| --- | ---: | ---: | ---: |
| 1440 × 900 | 132 px | 1188 × 477 px | 43.7% |
| 1920 × 1080 | 145 px | 1631 × 648 px | 51.0% |
| 390 × 844 | 257 px | 374 × 397 px | 45.1% |

The desktop map starts 211 px higher than in the original 1440px capture. Its bounding rectangle covers 43.7% of the viewport compared with the earlier 25.2%. The percentages include controls drawn over the map. The operational samples, data vintage and source versions are visible on the redesigned screenshots.

| Playback measurement | Desktop, MapLibre | Mobile viewport, SVG |
| --- | ---: | ---: |
| CSS viewport | 1440 × 900 | 390 × 844 |
| Sample duration | 4.016 s | 4.017 s |
| Animation-frame callbacks per second, average | 60.0 | 57.0 |
| Frame interval, 95th percentile | 16.7 ms | 16.8 ms |
| Longest frame interval | 16.8 ms | 83.3 ms |
| Observed main-thread long tasks | 0 | 1 |

In a fresh desktop browser context, DOMContentLoaded finished at 422 ms, first contentful paint occurred at 964 ms, and MapLibre reached idle at 3,050 ms. The navigation and resource entries reported 2,147,287 encoded bytes through map readiness. Each single-run frame sample used the 1,440× replay setting on the installed local server. The environment was headless Chromium 156.0.8078.79 on a shared x86-64 Linux VM using SwiftShader. The mobile viewport used this same machine and measured the SVG fallback. Physical-device and other-browser performance remain unmeasured.

A separate axe-core 4.10.3 scan of the 1440 × 900 production opening screen with SVG rendering reported zero automated violations for the WCAG 2.0/2.1 A and AA rule tags. The functional suite separately exercised keyboard navigation, visible focus, modal dismissal and reduced-motion preference. No assistive-technology user study or blanket conformance claim is implied.
