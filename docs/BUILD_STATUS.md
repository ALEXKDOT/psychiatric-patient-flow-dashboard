# Build status

The starting branch was `work`, clean at `315514a`. The repository contained project instructions and skills. The owner requested implementation on November 18, 2026.

## Inputs and design decisions

The submitted ZIP contains nine research files, preserved in [research](research/). Neither the checkout nor the archive included the named reference screenshot or separate product, data, design, architecture and implementation-plan documents. The three milestones in the request set the implementation order. The handoff, the dossier's composition analysis, the geographic provenance, and the feature matrix supplied the detailed requirements. After the initial build, the owner attached four visual references, including the light Bosphorus shipping console. These supplied the missing visual comparison.

- Build Flow Atlas as a React and TypeScript application with Vite, MapLibre and a local flat-map alternative. The handoff specifies the renderer and leaves the application framework open. The compact network needs no deck.gl overlay.
- Default to the city camera and Bellevue's campus inspector. Display undated scenario-relative Day and time. Use local IBM Plex Sans and Mono, pale land and water, graphite telemetry and small orange selection marks. Inspect at 1440 × 900 and 390 × 844, as the packet specifies no viewport sizes.
- Keep source facts distinct from the 18–64 adult-pathway simulation. Preserve the original CSV strings, source IDs and unknowns. Use published sponsor code for organization filters. Selection changes inspection; summary metrics always cover the full simulated network. Label filtered lists with their scope.
- Branch four simulations from a common baseline: baseline demand, an additional 30% stream, and a local addition or staged reduction of eight Bellevue slots. The fixed campus makes scenario results reproducible as the user explores other sites.

## Milestones

1. **Visual slice verified.** Loaded the approved seeds, selected Bellevue and rendered an actual post-departure transfer. Chromium at 1440 × 900 and 390 × 844 exercised the map, record lookup, layers and filters. Inspection found a blank band below the mobile map, corrected by sizing the renderer to the entire canvas. The repeated captures are in [screenshots](screenshots/).
2. **Operational ledger and playback verified.** Eight model tests passed for replay, one winning request, occupied and reserved slots, draining capacity, shared starting resources, independent surge demand, unresolved waits, and retained referral history for warm-up occupants. Three data-integrity tests passed. The play, speed, reset, seek and scenario controls use the same frame as the map, capacity ring, event log and instruments.
3. **Complete demonstration verified.** Matched and all-arrival cohorts, unresolved counts, patient-hours and JSON export are implemented for three alternatives to baseline. Production browser checks exercised both renderer paths, keyboard selection and focus return, offline replay, and responsive layouts. The final captures and measured performance are in [VERIFICATION.md](VERIFICATION.md).

## Reference-led redesign

The first dashboard devoted approximately a quarter of its desktop viewport to geography. In the provided references, fine instrument controls share the edges of a substantially larger map. The redesign follows the pale Bosphorus view for the geographic field and target brackets, the black tracking view for compact floating telemetry, and the aviation and dark maritime views for the aligned control and instrument panels.

The workspace now puts layer visibility, the selected campus record, a slot raster and a regional locator in a narrow left rail. Replay attaches to the map; the lower bank shows the placement queue, queue history and event feed. The selected campus has an anchored ID and coordinate readout. Small screens move the telemetry above the map and expose the layer controls in a keyboard-accessible dialog. Search opens with Ctrl+K or Cmd+K.

Review of the rendered map exposed a shoreline error: the supplied county polygons extend into the Hudson and East River. The dashboard now clips the local geographic field to historic borough shorelines and GSHHG water geometry, so the city map shows both riverbanks. Census block groups provide the fine surface detail.

The supplied seed facts and model remain the basis of the display. Browser capture and verification commands, screen dimensions, performance measurements and limitations are in [VERIFICATION.md](VERIFICATION.md). Geographic sources and rendering choices are in the [cartography notes](../src/cartography/README.md).

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
