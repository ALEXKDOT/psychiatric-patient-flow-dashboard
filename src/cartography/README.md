# Local cartography

Flow Atlas uses a regional overview and 23 local campus packs. The overview marker uses the publicly documented program coordinates. Each campus view uses its own verified exterior feature ID and a separate point inside the footprint. A transfer uses the program endpoints and simulated timing. The schematic connection supplies no observed ambulance path or destination agreement.

## Regional overview

The regional layer includes 18 generalized counties from the supplied 2025 Census snapshot. The map uses a Web Mercator camera, measured terrain, the tidal mask below and local TIGERweb major roads. The 754 primary roads and 1,796 secondary roads are simplified for display. Labels are locally placed for orientation. [County metadata and CRS](../../docs/research/GEOGRAPHY_README.md) · [Road query record](../../public/geography/roads-source.json) · [TIGERweb transportation](https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Transportation/MapServer)

The 358 local 256 × 256 Terrarium PNGs contain sampled ground elevations. The regional window covers zooms 8–11, and bounded campus areas cover zooms 12–15. MapLibre reads the local elevation source for hillshade. The flat regional fallback uses separately prepared light and dark relief images derived from the same elevation and road geometry. The terrain loader uses a lower-resolution ancestor when outside a more detailed tile's coverage. Beyond available coverage, or on a missing tile, a neutral flat tile supplies context without invented relief. [Coverage inventory](../../public/geography/terrain/coverage.json) · [Terrain Tiles catalog](https://registry.opendata.aws/terrain-tiles/)

Terrain tiles are from Mapzen. United States 3DEP (formerly NED) and global GMTED2010 and SRTM terrain data courtesy of the U.S. Geological Survey. [Complete terrain-provider attribution](../../docs/attribution/terrain.md)

## Campus views

The application loads only the selected campus's streets and buildings. It retains up to three parsed neighborhood packs. Department of City Planning and GSHHG shoreline data delineate waterways. Map controls, street names and scale reference local geographic coordinates. The named exterior, provenance, selected height and any discrepancies stay available in the campus record. A program marker can be hundreds of meters from the focus point, particularly at Westchester.

- **New York City.** The 22 windows contain 40,926 source building/structure features and 7,468 street segments counted across overlapping windows. NYC roof heights are in feet above ground. The registry retains the original value and the evidence for its displayed metric height. Bellevue Building H retains its conflicting footprint height (95 ft) and uses the filed building height (264 ft) for approximate massing. Disputed or unestablished display heights retain a flat footprint. [NYC building footprints](https://data.cityofnewyork.us/d/5zhs-2jue) · [NYC street centerlines](https://data.cityofnewyork.us/d/inkn-q76z) · [Identity evidence](../../docs/attribution/campuses/identity.md)
- **White Plains.** Westchester County GIS supplied 1,205 buildings and 514 streets. Feature 274916 represents the main connected complex. The dataset's implicit height units are interpreted as feet using the documented cross-check. The resulting 13.716 m massing is approximate. The county makes its data available for general information and disclaims survey, engineering and site-specific accuracy. [Westchester County GIS and reproduction notes](../../docs/attribution/campuses/westchester.md) · [County snapshot](../../docs/attribution/campuses/westchester-manifest.json)
- **Rendered detail.** The 3D scene extrudes source-backed heights. The 2D plan draws the same exterior and surrounding streets. A single height per outline cannot resolve detailed roof forms. Exterior identity does not identify care locations inside the building. The directory and campus record provide text alternatives.

## Verify or refresh

The checked-in assets run without GIS tooling or publication credentials. Validate the registry, source IDs, snapshot hashes and geographic focus points offline with standard Python 3:

```sh
python3 scripts/validate-campus-packs.py
```

To reproduce the terrain and road assets from the separately supplied handoff, install Python, NumPy and Pillow, then pass the extracted packet's public asset directory:

```sh
python3 scripts/import-terrain.py /path/to/packet/assets
```

MapLibre GL JS is distributed under BSD-3-Clause. The flat view uses native SVG. Source URLs in the record open only when requested. [Bundled licenses](../../public/licenses/)

## Regional land and shoreline provenance

Adjacent land outside the handoff's 18 counties uses the [CitySDK national county boundaries, 2019, 1:500,000](https://github.com/uscensusbureau/citysdk/blob/master/v2/GeoJSON/500k/2019/county.json) from the US Census Bureau (public domain), SHA256 819387b23d5a599b60497d6b48099285ccae9d39a3cedf23a7de17f35a192458. New York and neighboring states supply regional context beyond the modeled network. County polygons intersecting [-79.5, 38, -68.8, 44] are dissolved and simplified by 0.0008°, after excluding the handoff's counties and the historical Fairfield County overlapping the modern Western Connecticut region. This layer prevents the edge of a county selection from looking like a shoreline.

The generalized county boundaries include administrative water. The tidal mask restores the banks of the Hudson, East and Harlem rivers, docks, islands and bays in both renderers. NYC uses the NYC Department of City Planning's water-clipped borough land polygons, in the [dwillis/nyc-maps source snapshot](https://github.com/dwillis/nyc-maps/blob/598f08a18c0764110846bf069a11249f1bfd09da/boroughs.geojson) (source SHA256 ba883b9d8a194028cb83f2fc75fedbc88cc072bfa863337a554bf972f4d604d5). This historical shoreline is for orientation. The DCP map publisher disclaims accuracy or suitability for a particular use.

The New Jersey and surrounding non-NYC shores use the full-resolution GSHHG shoreline by Paul Wessel and Walter H. F. Smith, distributed in [basemap-data-hires 2.0.0](https://pypi.org/project/basemap-data-hires/2.0.0/) under LGPL-3.0-or-later. The wheel SHA256 is d38c431e9ab348bfda72bc8cfef6b45814c1e5cec69f4aff0754ebb10fedcf43. See [the license](licenses/GSHHG-COPYING.LESSER.txt) and [its incorporated terms](licenses/GSHHG-COPYING.txt). The tidal-water derivative is provided under the same license. The reproducible modification clips the source rings to the regional extent, composites the DCP boroughs within NYC, extracts the water complement, and simplifies it at 0.00006°. To regenerate, supply the unpacked wheel's `mpl_toolkits/basemap_data` directory and the DCP snapshot to `python src/cartography/make_shore.py basemap_data boroughs.geojson` using NumPy and Shapely 2.x.
