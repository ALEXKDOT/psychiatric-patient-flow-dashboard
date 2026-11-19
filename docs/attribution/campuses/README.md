# Campus geometry and evidence

The November 18, 2026 redesign packet supplies 23 independent neighborhoods with street centerlines and exterior footprints. Overlapping neighborhoods retain some of the same real-world features. Feature counts and file sizes are per extract. The full local collection uses 28,134,544 bytes of GeoJSON, of which Bellevue uses 882,441 bytes and Queens uses 2,261,687. These figures describe the original uncompressed file bodies. Browser transfer sizes depend on the server's compression and cache.

The [registry](../../../src/cartography/campus/targets.json) preserves the source campus ID, OMH program marker, point on the target polygon, exterior name and evidence link, building identifiers, height fields and explanation. The [coverage table](coverage.csv) lists the named target and feature counts for every extract. The public facility record displays the target's identity and estimated massing. Published service descriptions apply to the campus and documented programs. The geometry describes exteriors only.

[Source manifests](nyc-manifest.json) preserve the NYC publisher, update timestamps, exact requests, and per-layer counts. NYC Open Data supplies these records as-is. The NYC Office of Technology and Innovation publishes the [building footprints](https://data.cityofnewyork.us/City-Government/Building-Footprints/5zhs-2jue) and [street centerlines](https://data.cityofnewyork.us/City-Government/Centerline/inkn-q76z). See the [terms of use](https://data.cityofnewyork.us/stories/s/Terms-of-Use/k9k7-3cje/).

Westchester County GIS supplies the White Plains building and street records for general information. The county disclaims liability and suitability for engineering, survey or site-specific use. See its [layer metadata](westchester-manifest.json), [credit and height interpretation](westchester.md) and [County GeoHub](https://gis.westchestercountyny.gov/).

A focus uses the supplied source feature key and namespace. For NYC the loader checks BIN, BBL and OTI ID before applying a matched target height. Bellevue's approximate display height is 80.4672 m from filed building characteristics, while its original OTI value remains 28.956 m. Queens uses the mapped 31.394 m. The publisher's roof-height field and the DOB existing-height field differ. White Plains uses the county's approximate roof-minus-base interpretation. The 26 included feature records with unknown heights remain flat. The [identity research](identity.md) describes the full evidence and distinctions between exteriors on a shared tax lot.

The [snapshot index](snapshot.json) preserves each distributed geometry's byte count and SHA-256 digest from the supplied packet. Run `python3 scripts/validate-campus-packs.py` to check all records offline, including each target-to-footprint join and point-in-polygon match.

Only the activated campus's buildings and streets are fetched. The frontend retains up to three loaded neighborhoods in an LRU cache. Stale or aborted loads cannot populate the cache once the supplied signal is aborted. All requests use the application's configured base path.

## Static release audit

After `npm run build`, run `node scripts/check-pages-dist.mjs`. An optional path selects another Vite build directory. The audit checks the 46 campus artifacts against the retained SHA-256 digests, confirms local terrain inventory and static notices, checks generated HTML/CSS asset dependencies for project-subpath compatibility, and rejects review-only inputs and unexpected payloads. It reads the output without changing it.

The audit reports uncompressed file bytes and a gzip level 6 estimate per asset class. On Node 24.22.1 the campus files together compressed from 28,134,544 to 4,969,147 bytes. Bellevue compressed from 882,441 to 160,864 bytes and Queens from 2,261,687 to 374,827. The browser requests one campus at a time through ordinary static URLs. The serving host controls HTTP content negotiation; actual transferred bytes need a response measurement after publication. The local DEM tiles already use PNG compression.
