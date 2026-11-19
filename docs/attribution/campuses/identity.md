# Hospital campus and exterior building identities

Checked November 18, 2026. NYC building identification numbers (BINs) identify buildings within the city's records. Borough-block-lot numbers (BBLs) identify tax lots that can contain several institutions. The operator and state identify the hospital, while the exterior geometry joins on the building ID. The two trip endpoints use actual named building footprints and synthetic event positions. The sources establish no receiving door, unit or vehicle journey. [NYC definition of BIN and BBL](https://www.nyc.gov/site/buildings/codes/REMOVE-compliance-instructions.page) · [NYC OTI footprint specifications](https://github.com/CityOfNewYork/nyc-geo-metadata/blob/main/Metadata/Metadata_BuildingFootprints.md)

## Trip endpoints

| Campus | Building and tax lot | Exterior geometry | Derived point inside the footprint, longitude then latitude |
| --- | --- | --- | --- |
| NYC Health + Hospitals/Bellevue, 462 First Avenue, Manhattan | **Main Hospital, Building H**, BIN **1091053**, BBL **1009620100** | NYC OTI `doitt_id` **1302248** | **−73.97430063, 40.73870929** |
| NYC Health + Hospitals/Queens, 82-68 164th Street, Jamaica | **Queens Hospital Main Building**, BIN **4442433**, BBL **4068580001** | NYC OTI `doitt_id` **68658** | **−73.80444567, 40.71715902** |

**Bellevue.** The municipal building filing M01356904-I1 explicitly names Building H and supplies its BIN, borough, block and lot. NYC Health + Hospitals' February 2023 site plan shows H as the large eastern rectangle beside the rest of the complex. Rotating the lot's civic footprints to the street grid puts BIN 1091053 in that position with the same major edges and dimensions. The attached irregular western group uses the separate BIN 1086515 under the city's generic Bellevue Center inventory name. The site's street entrance at First Avenue and 27th Street is separately documented. [DOB building filing](https://data.cityofnewyork.us/resource/w9ak-ipjd.json?job_filing_number=M01356904-I1&%24select=job_filing_number,bin,borough,block,lot,existing_stories,job_description) · [Health + Hospitals exterior site plan, cover sheet](https://a856-cityrecord.nyc.gov/Search/GetFile?documentId=41494&requestId=20250212034&requestStatus=Archived&sectionId=6) · [Current OTI building outline](https://data.cityofnewyork.us/resource/5zhs-2jue.geojson?bin=1091053) · [Official hospital address](https://www.nychealthandhospitals.org/bellevue/patients-visitors/map-parking-directions/)

**Bellevue height.** The OTI footprint carries a 95-foot roof value, which conflicts with the named building's filings. Of 34 DOB NOW rows on BIN 1091053, 22 give an existing height. All 22 report **264 feet** and **22 existing stories**, including the distinct initial jobs M00622055-I1, M00896251-I1 and M07994761-I1. Their proposed heights also equal 264 feet. The current facade filing that names Building H independently records 22 stories with height left blank. Use the filed 264 feet (**80.4672 m**) as this footprint's estimated extrusion and retain the original 95-foot field with its provenance. DOB records applicant-reported building characteristics. Roof equipment and facade detail require separate geometry. [DOB height records](https://data.cityofnewyork.us/resource/w9ak-ipjd.json?bin=1091053&%24select=job_filing_number,existing_stories,existing_height,proposed_height,proposed_no_of_stories) · [DOB application form, height in feet, p. 3](https://home4.nyc.gov/assets/buildings/pdf/pw1.pdf#page=3) · [City Planning description of the 22-story tower](https://www.nyc.gov/assets/planning/download/pdf/applicants/env-review/first_ave/08_feis.pdf)

**Queens.** NYC's 2025 municipal inventory explicitly maps the Main Building to BIN 4442433 on borough 4, block 6858, lot 1. The current civic polygon matches that BIN and lot. The inventory gives separate entries for the N Building, Pavilion and other buildings sharing the campus mailing address. The public tax parcel extends beyond the Main Building. [2025 municipal inventory, PDF p. 65](https://home4.nyc.gov/assets/finance/downloads/pdf/25pdf/2025-annual-ll84-municipal-report.pdf#page=65) · [NYC OTI Main Building outline](https://data.cityofnewyork.us/resource/5zhs-2jue.geojson?bin=4442433) · [Operator's location](https://www.nychealthandhospitals.org/locations/queens/) · [New York State hospital profile](https://profiles.health.ny.gov/hospital/printview/103033)

The Queens OTI geometry reports a **103-foot roof value** (31.3944 m). Nine of 13 DOB NOW rows on that BIN give a **96-foot existing building height** and five stories, with the other four heights blank. The fields reflect different reporting methods. The 7-foot difference should remain in the provenance. [Queens DOB building characteristics](https://data.cityofnewyork.us/resource/w9ak-ipjd.json?bin=4442433&%24select=job_filing_number,existing_stories,existing_height,proposed_height) · [OTI geometry and roof value](https://data.cityofnewyork.us/resource/5zhs-2jue.json?bin=4442433)

The project’s state program marker for Bellevue (6566:020) is −73.97639, 40.73984, about 216 m from the derived Building H point. For Queens (6581:020) it is −73.80396, 40.71719, about 41 m from the derived point. Neither state point falls inside its named target footprint. The point-on-surface coordinates above come directly from the downloaded geographic polygon and serve as cartographic label positions. [NYS OMH program data](https://data.ny.gov/Human-Services/Local-Mental-Health-Programs/6nvr-tbv8)

## Additional municipal hospitals

The building name and BIN in each row below have a corresponding current NYC footprint. The city inventory page numbers refer to physical PDF pages. Keep the named scope of each entry when labeling it. [2025 city building inventory](https://home4.nyc.gov/assets/finance/downloads/pdf/25pdf/2025-annual-ll84-municipal-report.pdf) · [NYC OTI footprints](https://data.cityofnewyork.us/City-Government/Building-Footprints/5zhs-2jue)

| Campus | Exterior building label | BIN | BBL | OTI footprint ID | Inventory page |
| --- | --- | --- | --- | --- | --- |
| Harlem | Martin Luther King Pavilion | 1053899 | 1017340001 | 791046 | 12 |
| Metropolitan | Main Building | 1083929 | 1016690001 | 80428 | 12 |
| Lincoln | Lincoln Medical and Mental Health Center | 2097050 | 2023350016 | 806124 | 17 |
| North Central Bronx | North Central Bronx Hospital | 2017787 | 2033270200 | 614684 | 29 |
| Jacobi | New Jacobi Building | 2102971 | 2042050001 | 1112363 | 31 |
| Woodhull | Woodhull Medical and Mental Health Center | 3048341 | 3017230001 | 654321 | 40 |
| Kings County | Building D | 3327712 | 3048290001 | 1118917 | 47 |
| South Brooklyn Health | Ruth Bader Ginsburg Hospital | 3425771 | 3072390001 | 1301076 | See address reconciliation below |
| Elmhurst | Main Building | 4437132 | 4015000002 | 1115239 | 57 |

**Harlem.** The same city inventory assigns 1082167 to both Kountz and Mural Pavilion. Use only the distinct Martin Luther King Pavilion identity above for that campus unless a separate exterior match is established for those names. [Harlem inventory, PDF p. 12](https://home4.nyc.gov/assets/finance/downloads/pdf/25pdf/2025-annual-ll84-municipal-report.pdf#page=12)

**South Brooklyn.** The 2025 inventory labels 3337275 as the RBG building. That BIN has no feature in the inspected current hospital footprint extract. DCAS identifies the RBG facility at 2619 Ocean Parkway while listing the separate tower at 2601. DOB’s new-hospital construction filing 320911171 identifies 2619 Ocean Parkway as BIN 3425771. The current footprint joins on this BIN and matches the hospital lot. [DCAS RBG address, printed p. 358](https://www.nyc.gov/assets/dcas/downloads/pdf/energy/reportsandpublication/local-law-24-fy2024-report.pdf) · [DOB new-hospital filing](https://data.cityofnewyork.us/resource/ic3t-wcy2.json?job__=320911171&doc__=02&%24select=job__,bin__,house__,street_name,job_description) · [Current RBG footprint](https://data.cityofnewyork.us/resource/5zhs-2jue.geojson?bin=3425771)

## Westchester

The White Plains operator's grounds plan and the county’s building geometry support a visual match to the main hospital complex, county Buildings **OBJECTID 274916**. Its interior label point is **−73.7538926, 41.0275733**. The connected footprint includes several wings, and the state program marker lies roughly 435 m away. The county publishes reusable buildings and street centerlines with county credit and a general-information disclaimer. The stand-alone `westchester-pack` contains the bounded extracts, snapshot hashes, height interpretation, attribution and reproduction script. [Operator's grounds map](https://www.nyp.org/sites/default/files/acquiadam/2020-09/nyp_westchester_grounds_map.pdf) · [County Buildings](https://giswww.westchestergov.com/arcgis/rest/services/DataHub_BasemapPlanimetrics/MapServer/5) · [County Streets](https://giswww.westchestergov.com/arcgis/rest/services/DataHub_BasemapPlanimetrics/MapServer/13) · [County GeoHub](https://gis.westchestercountyny.gov/)

## Implementation choices

The registry selects Kings County Building R, named in the program address, and the Jacobi Building at the published campus address. The municipal table above also establishes Building D and the New Jacobi Building as documented alternative campus exteriors. Use the registry for the default camera target. [Camera targets](../../../src/cartography/campus/targets.json) · [Named property records](property-evidence.json)
