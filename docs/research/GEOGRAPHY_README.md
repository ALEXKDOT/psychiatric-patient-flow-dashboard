# Regional geography fallback

`REGIONAL_GEOGRAPHY.geojson` is a small, bundled cartographic background for an NYC psychiatric-flow **simulation**. Its geography comes from public Census data. It contains no hospital operations, patient data, service catchments, referral agreements, road routes, or transfer observations.

## Source and snapshot

- Source ID: **MAP-018** (data); **MAP-017** (catalog metadata).
- Publisher: U.S. Census Bureau, Geography Division.
- Source: [2025 county and county-equivalent cartographic boundaries, 1:500,000](https://www2.census.gov/geo/tiger/GENZ2025/shp/cb_2025_us_county_500k.zip).
- [Catalog metadata and stated license](https://catalog.data.gov/dataset/2025-cartographic-boundary-file-shp-county-and-equivalent-for-united-states-1-500000).
- Boundary reference date: **2025-01-01**. Catalog issued/modified: **2026-05-01**. Download/access date: **2026-11-18**.
- Official ZIP was successfully downloaded without authentication: HTTP 200, **11,758,981 bytes**. The archive and source DBF/projection were inspected.
- Source ZIP SHA256: `aa976c00b181939755d0da757f4c7c2dc0103c3b3b4530fb2a91c2bb62fc777c`.
- Output SHA256: `cce25dfc1bf8be243c14c665c56d1b3a29162d39cceb3ad1d0a3294d40dc08a0`.
- Output size: **143,672 bytes**; **18 features**.

## Selection and coordinate handling

Selected every source county/county-equivalent whose **actual polygon geometry intersects** longitude/latitude bounding box **[-74.35, 40.45, -73.55, 41.20]**. Selection used GDAL/OGR geometry `Intersects`, not a centroid or bounding-box-only test. Full selected shapes are retained; none is clipped to the selection rectangle. The additional NJ, NY, and CT land is visual context, not an expansion of the modeled facility network.

Source CRS is **NAD83 / EPSG:4269**. Output coordinates use **WGS84 longitude, latitude**, the browser GeoJSON convention. Transformation used pyproj 3.7.1 / PROJ 9.6.0, with an area of interest matching the selection rectangle and ballpark transformations disabled. The selected operation was **NAD83 to WGS 84 (1)** with traditional longitude/latitude axis order. PROJ reports **4-meter nominal operation accuracy** and implements this operation as a zero-shift (`proj=noop`) transformation in this region. Coordinates therefore remain numerically unchanged before rounding; this is an explicitly documented approximation, not a survey-grade datum realization or epoch conversion.

No additional shape simplification was applied. Census already generalizes this 1:500,000 cartographic source. Coordinates are rounded to six decimal places; that precision does not imply sub-meter source accuracy. Polygon ring directions follow the GeoJSON right-hand convention. All 18 output geometries passed OGR validity checks. Processing used GDAL 3.10.3.

Preserved fields: `GEOID`, `NAME`, `STATEFP`, `COUNTYFP`. Added provenance fields: `source_id=MAP-018`, `source_vintage=2025-01-01`. Each GeoJSON feature ID is its `GEOID`.

## Included counties and county equivalents

| GEOID | Source name | State |
|---|---|---|
| 09190 | Western Connecticut | CT |
| 34003 | Bergen | NJ |
| 34013 | Essex | NJ |
| 34017 | Hudson | NJ |
| 34023 | Middlesex | NJ |
| 34025 | Monmouth | NJ |
| 34027 | Morris | NJ |
| 34031 | Passaic | NJ |
| 34039 | Union | NJ |
| 36005 | Bronx | NY |
| 36047 | Kings | NY |
| 36059 | Nassau | NY |
| 36061 | New York | NY |
| 36071 | Orange | NY |
| 36081 | Queens | NY |
| 36085 | Richmond | NY |
| 36087 | Rockland | NY |
| 36119 | Westchester | NY |

The five NYC county names correspond to Bronx, Brooklyn (Kings), Manhattan (New York), Queens, and Staten Island (Richmond). Connecticut's included source entity is **Western Connecticut**, a county equivalent as named in this dataset; it has not been silently renamed Fairfield County.

## Reuse and display

The catalog states **CC0 1.0**. Retain the Census attribution, source version, transformation notes and hashes as provenance. The catalog also contains a contradictory `accessLevel=non-public` field; the authoritative linked file was publicly downloadable without credentials, as tested above.

Use the selection rectangle or facility bounds for the initial camera. Because full counties are preserved, automatically fitting every geographic vertex would zoom farther out than intended. These generalized boundaries are suitable for regional visual context, not ambulance routing, campus entrance identification, legal-boundary surveying, or placement eligibility.
