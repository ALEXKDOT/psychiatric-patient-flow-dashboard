# Browser verification

## Reproduce the production checks

Run these commands from the repository root using Node 22.12 or newer. The production preview serves the same relative asset paths used on GitHub Pages.

```sh
npm ci
npm run typecheck
npm run lint
npm test
npm run build
npx playwright install chromium
npm run preview -- --host 127.0.0.1 --port 4184 --strictPort --base=/psychiatric-patient-flow-dashboard/
```

In a second terminal, run the functional, visual and timing checks. Playwright uses the system Chromium when available. Set `CHROMIUM_BIN` to select a local executable. Recording also requires `ffmpeg` and `ffprobe` on the path.

```sh
ATLAS_URL=http://127.0.0.1:4184/psychiatric-patient-flow-dashboard/
node tests/browser_verify.mjs --url "$ATLAS_URL"
node tests/browser_journey.mjs --url "$ATLAS_URL"
node tests/browser_journey.mjs --url "${ATLAS_URL}?map=svg" --flat
node tests/browser_recovery.mjs --url "$ATLAS_URL"
node tests/browser_capture.mjs --url "$ATLAS_URL" --out docs/screenshots --prefix campus-redesign --comparison
node tests/browser_journey.mjs --url "$ATLAS_URL" --stage campus-redesign --out docs/screenshots
node tests/browser_journey.mjs --url "${ATLAS_URL}?map=svg" --stage campus-redesign --out docs/screenshots
node tests/browser_record.mjs --url "$ATLAS_URL" --out docs/screenshots/bellevue-queens-walkthrough.webm
node tests/browser_perf.mjs --url "$ATLAS_URL"
```

## Before and pilot views

The before images come from a production build of revision `c11f213e8cb7284fcd6364c26ea62622f8a325f9`, served locally under the project subpath. The baseline showed a regional marker at Bellevue. At 1440 × 900 its map occupied 43.7% of the viewport. The redesign introduces a campus-scale exterior and a continuously advancing replay. [Desktop before](screenshots/before-desktop.png) · [Phone before](screenshots/before-mobile.png)

The milestone A captures were taken in Chromium while only the Bellevue and Queens neighborhoods were installed. Review covered both original shipping references, the three release screenshots and the building study in the handoff. The new views frame Building H above Franklin D. Roosevelt Drive and the Queens main building near 164th Street. Both exteriors retain an orange perimeter, distinct neighboring roofs, a scale and identity information. All six pilot captures completed with zero uncaught page errors and zero requests to other origins.

| Campus | Desktop light | Desktop dark | Phone light |
| --- | --- | --- | --- |
| Bellevue | [1440 × 900](screenshots/pilot-desktop-bellevue-light.png) | [1440 × 900](screenshots/pilot-desktop-bellevue-dark.png) | [390 × 844](screenshots/pilot-mobile-bellevue-light.png) |
| Queens | [1440 × 900](screenshots/pilot-desktop-queens-light.png) | [1440 × 900](screenshots/pilot-desktop-queens-dark.png) | [390 × 844](screenshots/pilot-mobile-queens-light.png) |

## Measurement conditions

Functional checks create fresh profiles, deny off-origin HTTP(S) and record attempted external requests, including failures. Routing disables Chromium's HTTP cache in those sessions. Local fonts, street records, building geometry and relief must load from the running local server. Preloaded state is also exercised with the browser context offline. Opening a disconnected remote site or reopening a dead local server requires a different cache strategy.

Performance trials use three fresh profiles with the HTTP cache enabled and with request monitoring. A warm campus selection repeats a campus within the same open app, and a warm reload measures browser cache reuse. Reported frame intervals come from consecutive `requestAnimationFrame` callbacks. They measure browser scheduling on this host. The script includes slow frames and main-thread long tasks. No physical phone or hardware GPU is emulated by a narrower viewport.

The recording uses real timestamps from Chromium's compositor screencast in a 1440 × 900 standard-motion session. The encoder preserves the captured intervals and the replay runs at the speed selected by the featured sequence.

## Earlier builds

Screenshots of the original visual slice and the first instrument-console layout remain available for historical review. [Initial desktop](screenshots/milestone-1-desktop.png) · [Initial phone](screenshots/milestone-1-mobile.png) · [Prior console](screenshots/observatory-desktop.png)

## Deterministic journey

The supplied export script produced a byte-identical Bellevue–Queens fixture, SHA-256 `82f28a1717da2ae2f340938c1767ceb935efe05dac43e71618d3ca316487533c`. The model suite checks every fixture field and the adjacent model minutes. During the browser journey, the selected episode, live token, destination pool and four network readouts are checked against the same fixture while seeking both directions. Before commitment, the episode has three open referrals and an unknown destination. At minute 9163 its referral closes and the Queens pool holds two reservations across episodes.

| Baseline minute | EP-0190 | Queens reserved | Queens occupied |
| --- | --- | ---: | ---: |
| 9278 | Preparing at Bellevue | 2 | 19 |
| 9279 | External transport departs | 2 | 19 |
| 9320 | In transit | 2 | 19 |
| 9362 | Receiving handoff in Queens | 2 | 19 |
| 9386 | Receiving handoff in Queens | 1 | 20 |
| 9387 | Inpatient admission | 0 | 21 |

These values are synthetic. The geographic exterior and the network marker have separate source identities. A moving mark follows a schematic connection between published program coordinates.

## Viewport review

The table uses CSS pixels at DPR 1. The geographic stage includes overlaid instruments. The clear area is the largest measured rectangle through the center after excluding the telemetry, nameplate, navigation, attribution and playback bounds.

| Viewport | Map width × height | Map top | Share of viewport | Clear center width × height | Still |
| --- | ---: | ---: | ---: | ---: | --- |
| 1440 × 900 | 1418 × 637 | 97 | 69.7% | 1384 × 307 | [Desktop](screenshots/campus-redesign-desktop.png) |
| 1920 × 1080 | 1891 × 764 | 103 | 69.7% | 1857 × 374 | [Wide](screenshots/campus-redesign-wide.png) |
| 390 × 844 | 378 × 439 | 176 | 50.4% | 348 × 211 | [Phone](screenshots/campus-redesign-mobile.png) |

Both desktop sizes clear the required 65% map area. The screenshots show the selected Bellevue marker, the four network instruments, the three active transports and the playback strip in the opening viewport. At 390 px the subject sheet leaves the simulation designation and replay controls visible.

## Production performance

Chromium 156.0.8078.79 used the SwiftShader Vulkan software renderer at 1440 × 900 and DPR 1. The Linux container exposed five logical processors on an AMD EPYC host, a four-CPU quota and 32 GiB memory limit. Each of three trials used a fresh profile, the same seed and local production assets. [Raw measurements](verification/campus-replay-performance.json)

| Interaction | Average RAF/s per trial | Median interval per trial | p95 interval per trial | Worst interval across trials |
| --- | --- | --- | --- | ---: |
| Network, 4 s | 59.3 / 60.0 / 59.5 | 16.7 / 16.7 / 16.7 ms | 16.7 / 16.7 / 16.8 ms | 50.0 ms |
| Campus orbit, 10 s | 34.6 / 30.6 / 31.0 | 33.3 / 33.3 / 33.3 ms | 50.0 / 50.0 / 50.0 ms | 133.3 ms |
| Transfer follow, 4 s | 59.5 / 60.0 / 59.8 | 16.7 / 16.7 / 16.7 ms | 16.7 / 16.7 / 16.7 ms | 33.4 ms |

The ten-second orbit exceeded 30 RAF/s on average in all three trials. Its p95 interval exceeded the suggested 33.4 ms limit. The renderer reduces the software drawing-buffer resolution during orbit and restores detail when the camera rests. Hardware GPU behavior remains unmeasured.

Cold Bellevue selections reached a rendered target, readable street names and orbit-ready state in 1.757, 1.922 and 1.797 s. Warm selections took 1.687, 1.830 and 1.754 s, within the 2.2 s target. Initial map readiness from navigation took 1.816, 3.478 and 3.865 s. The navigation and observed initial resources contained 2,949,379 encoded bytes in each cache-enabled trial. Bellevue's first neighborhood added 769,921 bytes of footprint data and 112,520 bytes of streets. The figures include the local assets actually requested at this viewport.

## Interaction, fallback and retained resources

- Standard motion advanced from the featured opening without input. A five-second observation of Bellevue rotated 7.10° with 0.00 CSS px of anchor drift. A drag stopped orbit, Resume preserved the bearing, Pause motion stopped both presentation and replay, and Back restored the original regional camera and keyboard focus.
- On a 47° pitched campus at bearing −11°, the native EP-0190 button center and its projected trail endpoint differed by 0.000205 CSS px. Hit testing at that center selected the same episode. In the phone's flat plan the separation was 0.000585 px. The numeric checks use the marker and the path actually drawn by each renderer.
- The nonmodal inspector preserved running playback. At 1× its progress advanced within a single model minute. The 360× follow view supported manual interruption, stop, re-follow and Back. A headless browser keeps its tabs visible, so the browser visibility-adapter check dispatched explicit visibility changes with real elapsed time. The fake-clock unit tests also checked suspension across hidden time.
- All 23 source feature IDs matched the registry. The browser held the first Bellevue neighborhood response while selecting Harlem then Queens. Queens remained the final subject when that response was released. A deliberately missing street file showed Retry; a later successful fetch restored the campus.
- The campus retained five native sources and three parsed neighborhood packs through the 23-campus pass. At selections 3, 10, 20 and 23 the main-frame heap after forced garbage collection was approximately 24.0, 26.3, 24.6 and 25.2 MB. One regional map was retained while the selected campus was visible. Total canvas count stayed at two, with one visible. These observations cover the measured sequence and exclude GPU memory.
- A native WebGL context loss switched the selected campus to its flat plan. A separate cold run rejected all 21 optional terrain requests and retained the selected Bellevue roof, street names and Back. Under the project subpath, late neighborhood files, DEM tiles and local fonts remained within the prefix. Street labels come directly from the neighborhood data. The normal walkthrough needed zero cross-origin requests.
- With Chromium's HTTP cache enabled and the local server's `Cache-Control: no-cache`, a warm reload produced 28 HTTP 304 responses, including all three requested font files. The three timing trials reported 8,100 transferred bytes over 27 warm resources each. The server revalidated existing response bodies.

The production operations suite passed on desktop MapLibre and WebGL-disabled phone Chromium. It exercised all-campus navigation, source records, queue/referral arithmetic, chart and feed alternatives, filter empty states, rewind, reset, speed, intervention selection and the downloaded comparison JSON. After resizing, the document fit at all 12 measured widths from 320 through 1920 px. The touch workflow opened and collapsed the subject sheet with the transfer in progress. At 390 px, the Queens label ended at x322.79 and the navigation controls began at x335, leaving 12.21 px clear.

## Recorded demonstration and stills

The 48.96-second, 1440 × 900 VP9 recording contains 1,387 captured compositor frames. It enters Bellevue, observes the reserve, follows the moving EP-0190, shows receiving handoff followed by admission, and returns to the saved network view. [Real-time walkthrough](screenshots/bellevue-queens-walkthrough.webm)

| Scene | Desktop | Phone |
| --- | --- | --- |
| Network | [Light](screenshots/campus-redesign-desktop.png) · [Dark](screenshots/campus-redesign-desktop-network-dark.png) | [Network](screenshots/campus-redesign-mobile.png) |
| Bellevue focus | [Light](screenshots/campus-redesign-desktop-bellevue-light.png) · [Dark](screenshots/campus-redesign-desktop-bellevue-dark.png) · [Flat fallback](screenshots/campus-redesign-desktop-flat-bellevue.png) | [Bellevue](screenshots/campus-redesign-mobile-bellevue-light.png) |
| In transit | [Follow EP-0190](screenshots/campus-redesign-desktop-transfer-follow.png) | [Travel and inspector](screenshots/campus-redesign-mobile-transfer-follow.png) |
| Queens | [Handoff](screenshots/campus-redesign-desktop-queens-handoff.png) · [Light](screenshots/campus-redesign-desktop-queens-light.png) · [Dark](screenshots/campus-redesign-desktop-queens-dark.png) | [Handoff](screenshots/campus-redesign-mobile-queens-handoff.png) |
| Comparison | [Scenario lab](screenshots/campus-redesign-scenario-lab.png) | |
