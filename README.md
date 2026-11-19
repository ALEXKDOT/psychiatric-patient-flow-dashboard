# Flow Atlas

Flow Atlas is a psychiatric patient-flow observatory for 22 New York City campuses and one in White Plains. Explore documented campus exteriors, follow synthetic transfers and compare seven simulated days of adult inpatient placement. Facility identities, roads and elevations have public sources. Every queue, referral, reservation and journey belongs to a deterministic simulation.

## Run locally

Use Node.js 22.12 or later and npm. From the repository root:

```sh
npm ci
npm run dev
```

Open the local address printed by Vite. If the managed cloud machine has a read-only npm cache, use `npm ci --cache /tmp/flow-atlas-npm` for the install step. After installation the demonstration needs only its local HTTP server. Fonts, streets, footprints, terrain, both themes and the flat renderer are bundled. Source citations link to their publishers.

## Reproduce the featured transfer

1. Start **Baseline**, seed 42. The ordinary opening is **Day 7, 11:20** (minute 9320), with three intercampus trips. Standard motion starts at 360× and reduced motion starts paused. **Pause motion** stops continuous presentation and playback.
2. Activate **Bellevue Hospital** on the map or in **Campuses**. Inspect Building H, pan or rotate the local view, switch the theme, and open the campus source record. **Back to network** restores the network camera. On a phone, expand the subject sheet for inspector actions.
3. Choose **Watch featured transfer**. This starts baseline episode **EP-0190** at Day 7, 08:25 (minute 9145). At 360×, one real second advances six simulated minutes. The guide presents approximately 40 seconds of case history.

   | Day 7 time | Episode and location |
   | --- | --- |
   | 08:25 | Placement search at Bellevue. The destination is still unknown to the live case. |
   | 08:43 | Queens accepts and reserves. The episode remains at Bellevue. Another case reserves during this minute, bringing the Queens pool to two reservations. |
   | 10:39 | ED departure starts the external transfer. The moving mark follows a schematic connection. |
   | 11:20 | EP-0190 is 41 simulated minutes into travel. The clock matches the ordinary opening sample. |
   | 12:02 | Arrival at Queens ends travel. The reservation remains held during receiving handoff. |
   | 12:27 | Unit admission converts this episode's reservation to occupancy. |

4. Pause or seek to revisit an event. **Reset to Day 1** returns to minute zero in the selected scenario. The sample-transfer control restores that scenario’s opening. Use the transfer list in **Layers** or activate a token to inspect a trip independently.
5. Open **Scenario lab** to compare baseline with added demand or a local eight-slot change. **Matched base** compares the same 211 arrivals for seed 42. **All arrivals** also includes the extra demand stream, giving 271 total in the surge branch. JSON downloads retain both cohorts, unresolved cases, definitions, seed, model version and source snapshot.

The directory and transfer list provide keyboard-accessible alternatives to the map. Add `?map=svg` to the local URL to open the 2D map, which uses documented streets and building outlines. WebGL enables the tilted campus view and orbit.

## Build and verify

```sh
npm run typecheck
npm run lint
npm test
python3 scripts/import-data.py --check
python3 scripts/validate-campus-packs.py
npm run build
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

In another terminal, run the browser checks against the production preview:

```sh
npm run test:browser -- --url http://127.0.0.1:4173 --operations
node tests/browser_journey.mjs --url http://127.0.0.1:4173
node tests/browser_journey.mjs --url http://127.0.0.1:4173 --flat
node tests/browser_recovery.mjs --url http://127.0.0.1:4173
```

The browser harness uses system Chromium on Linux when available. Alternatively install Chromium once with `npx playwright install chromium` or point `CHROMIUM_BIN` at a compatible executable. To reproduce captures, run `node tests/browser_journey.mjs --url http://127.0.0.1:4173 --stage final --out docs/screenshots`. The screen recorder additionally needs ffmpeg and ffprobe: `node tests/browser_record.mjs --url http://127.0.0.1:4173`. See the [capture directory](docs/screenshots/) and [browser verification](docs/VERIFICATION.md).

## Distribution

Vite writes a static site to `dist/` with a relative asset base. Serve the entire directory, including `campuses/`, `geography/`, local fonts and notices. The repository's existing Pages project serves the published release. Publishing a new source revision is a separate operation through the existing `npm run deploy:pages` workflow. [Published release](https://alexkdot.github.io/psychiatric-patient-flow-dashboard/)

See the [documentation index](docs/README.md), [build status](docs/BUILD_STATUS.md), [facility data](docs/DATA.md), [cartography and attribution](src/cartography/README.md), and [project skill guide](.agents/skills/README.md).
