# Regional map detail

The network view loads local cartography at three scales. The regional extent shows a subdued street grid. City zoom resolves streets, highways, parks and inland water. At neighborhood zoom the buildings and additional street names appear. Both map renderers project the same transparent atlas tiles onto the existing shoreline and terrain. The hospital pins, simulated movement and selection controls remain interactive above them.

## Sources and coverage

- **Streets.** U.S. Census Bureau, 2025 TIGER/Line All Roads. The build uses twenty county or county-equivalent road and water archives across New York, New Jersey and Connecticut. Selected MTFCC classes distinguish major roads, local streets, ramps and service roads. Road labels use published names and points along the source geometry. The boundaries for this atlas are 74.53°W–73.43°W and 40.39°N–41.19°N. Context outside the atlas uses the existing regional geography. [Census All Roads files](https://www2.census.gov/geo/tiger/TIGER2025/ROADS/) · [Census technical documentation](https://www.census.gov/programs-surveys/geography/technical-documentation/complete-technical-documentation/tiger-geo-line.2025.html)
- **Parks and water.** Census area landmarks provide park and recreation polygons. Census area hydrography supplies lakes, reservoirs and an exclusion mask for park boundaries that include tidal water. Open space labels use the reported landmark name and interior point. The source year describes the cartographic snapshot. [Area landmarks](https://www2.census.gov/geo/tiger/TIGER2025/AREALM/) · [Area hydrography](https://www2.census.gov/geo/tiger/TIGER2025/AREAWATER/)
- **Building outlines.** NYC Office of Technology and Innovation, Building Footprints. The November 19, 2026 extract selected 83,536 records with a published shape_area of at least 400, retaining geometry and object ID. Neighborhood scale also includes the bundled White Plains campus building shapes, subject to the existing county terms. Smaller NYC structures and buildings in other surrounding jurisdictions are outside this overview layer. The campus view continues to use its separately sourced higher-detail neighborhood. [NYC Building Footprints](https://data.cityofnewyork.us/d/5zhs-2jue) · [NYC Open Data terms](https://opendata.cityofnewyork.us/overview/#termsofuse) · [Westchester attribution](campuses/westchester.md)

## Reproduction

App installation uses the committed tiles without keys or external tile requests. Regeneration requires Python, Pillow and pyshp. From the project root run the following commands with an empty source directory for a fresh snapshot.

```sh
python3 -m pip install Pillow pyshp==2.3.1
python3 scripts/fetch-network-detail.py /tmp/flow-atlas-gis
python3 scripts/build-network-detail.py /tmp/flow-atlas-gis
```

The fetcher pages NYC records by object ID and reuses local source archives. Upstream updates can change results from a fresh download. The [snapshot](network-detail-snapshot.json) records input hashes, counts, extent and tile count. XYZ placement uses Web Mercator. The transformation paints each tile with a gutter before downsampling, includes polygon holes, and uses separately colored light and dark variants. A scale-dependent subset of actual street and park names is drawn as text so the Place names control and geographic labels stay synchronized.

The runtime loads only tiles intersecting the current map viewport. The local release audit verifies that all tile IDs have both theme files in the build. With a production preview at port 4277, run `node tests/browser_network_detail.mjs` to check geographic extents, non-empty Midtown coverage, themes and native/fallback rendering with off-origin requests blocked.
