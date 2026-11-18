# Build status

The starting branch was `work`, clean at `315514a`. The repository contained project instructions and skills. The owner requested implementation on November 18, 2026.

## Inputs and design decisions

The submitted ZIP contains nine research files, preserved in [research](research/). Neither the checkout nor the archive included the named reference screenshot or separate product, data, design, architecture and implementation-plan documents. The three milestones in the request set the implementation order. The handoff, the dossier's composition analysis, the geographic provenance, and the feature matrix supply the detailed requirements. A direct comparison with the original image is unavailable.

- Build Flow Atlas as a React and TypeScript application with Vite, MapLibre and a local flat-map alternative. The handoff specifies the renderer and leaves the application framework open. The compact network needs no deck.gl overlay.
- Default to the city camera and Bellevue's campus inspector. Display undated scenario-relative Day and time. Use local IBM Plex Sans and Mono, pale land and water, a dark graphite shell and small orange selection marks. Inspect at 1440 × 900 and 390 × 844, as the packet specifies no viewport sizes.
- Keep source facts distinct from the 18–64 adult-pathway simulation. Preserve the original CSV strings, source IDs and unknowns. Use published sponsor code for organization filters. Selection changes inspection; summary metrics always cover the full simulated network. Label filtered lists with their scope.
- Branch four simulations from a common baseline: baseline demand, an additional 30% stream, and a local addition or staged reduction of eight Bellevue slots. The fixed campus makes scenario results reproducible as the user explores other sites.

## Milestones

1. **Visual slice verified.** Loaded the approved seeds, selected Bellevue and rendered an actual post-departure transfer. Chromium at 1440 × 900 and 390 × 844 exercised the map, record lookup, layers and filters. Inspection found a blank band below the mobile map, corrected by sizing the renderer to the entire canvas. The repeated captures are in [screenshots](screenshots/).
2. **Operational ledger and playback verified.** Eight model tests passed for replay, one winning request, occupied and reserved slots, draining capacity, shared starting resources, independent surge demand, unresolved waits, and retained referral history for warm-up occupants. Three data-integrity tests passed. The play, speed, reset, seek and scenario controls use the same frame as the map, capacity ring, event log and instruments.
3. **Complete demonstration verified.** Matched and all-arrival cohorts, unresolved counts, patient-hours and JSON export are implemented for three alternatives to baseline. Production browser checks exercised both renderer paths, keyboard selection and focus return, offline replay, and responsive layouts. The three final captures and measured performance are in [VERIFICATION.md](VERIFICATION.md).

## Verification and remaining acceptance item

A clean directory install from the lockfile, strict TypeScript, ESLint, the production build and all 11 data/model tests passed. The browser tested both map renderers with external HTTP requests blocked. Production playback also worked after network disconnection. The application serves its assets from the local server. Vite reports a bundle-size advisory for the local vector geography and the MapLibre runtime. The measured payload through map readiness was about 880 KB encoded in the test browser.

The outstanding visual acceptance item is direct comparison with the original shipping-dashboard screenshot. The image was absent from the available inputs. If supplied, compare it with the final desktop/mobile captures and review differences in composition. Source-backed service facts, simulations, software-rendered browser performance and real-world operational validation each have distinct limits, documented in [DATA.md](DATA.md), [MODEL.md](MODEL.md) and [VERIFICATION.md](VERIFICATION.md).

## Reproduction

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
