# New Zealand map sources

The home-page national map coastline is derived from Natural Earth 1:50m Admin 0 Countries, maintained by the Natural Earth project. The geometry is not generated or guessed. The fragment shows the North Island, South Island, Rakiura / Stewart Island and several nearshore islands. Chatham and subantarctic islands are outside this mainland travel-map extent.

- Project: https://www.naturalearthdata.com/
- Maintainer repository: https://github.com/nvkelso/natural-earth-vector
- Exact GeoJSON downloaded: https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson
- Licence / terms: https://www.naturalearthdata.com/about/terms-of-use/
- Downloaded and terms checked: 31 October 2026, Pacific/Auckland.

Natural Earth states that its vector and raster data are in the public domain, including commercial use and modification, and attribution is not required. The visible map nevertheless credits Natural Earth.

Transformation: New Zealand country polygons were selected by ADMIN = New Zealand, then mainland-region polygons were projected using a simple equirectangular projection with a 41°S reference latitude. Coordinates are rounded to one decimal SVG unit. The main-island shapes and their relative positions come from the source data.

The green terrain/contour strokes are original decorative artwork following the broad axial mountain trend. They are not measured elevation contours, do not state altitude, and are not suitable for navigation. Point locations are approximate town/region centres and are route-browsing links, not trailheads. Fiordland is deliberately a regional marker. The Rakiura point is an island selector rather than a settlement.

The national-map SVG is inline and does not make external requests. Markers and island choices are browsing controls; they represent towns or regions rather than surveyed trailheads.

## Route-detail coastline and island sources

The background of route-detail maps uses a separate, more detailed set of sources from the home page:

- [Natural Earth 1:10m Admin 0 Countries — New Zealand](https://github.com/nvkelso/natural-earth-vector/blob/master/geojson/ne_10m_admin_0_countries.geojson); [original GeoJSON](https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson). The New Zealand feature was selected from the dataset; the recorded source rings were retained. In route-detail maps it supplies nearshore islands other than Rangitoto. Natural Earth data is in the [public domain](https://www.naturalearthdata.com/about/terms-of-use/).
- The North Island, South Island and Rangitoto Island are supplied from [LINZ NZ Coastlines and Islands Polygons (Topo 1:50k)](https://data.linz.govt.nz/layer/51153-nz-coastlines-and-islands-polygons-topo-150k/), distributed via [Environment Canterbury's public ArcGIS item](https://www.arcgis.com/home/item.html?id=2dcaa0b1c8ec4416834f1340d98db688) and [feature layer](https://services1.arcgis.com/RNxkQaMWQcgbiF98/arcgis/rest/services/lds_nz_coastlines_and_islands_polygons_topo_150k_SHP/FeatureServer/0). **Attribution:** Contains data sourced from the LINZ Data Service licensed for reuse under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The named Rangitoto Island polygon was exported in EPSG:4326 and retained from the service output. The two main-island polygons were exported with the service’s `maxAllowableOffset=0.001` degrees and `geometryPrecision=6`, so their boundaries were generalized and rounded. These are Environment Canterbury redistribution snapshots, not a claim that they match the latest LINZ release.

Both sources were acquired for this project on 1 November 2026. Route-detail backgrounds, decorative terrain strokes and travel paths remain schematic and are not appropriate for navigation.

## Route sketches

Each of the 53 route guides published before v3 has an original hand-drawn SVG schematic with named stops, a principal travel mode and, where applicable, ferry, train or bus connections. A legend distinguishes walking, cycling, driving and public transport. Where labels would collide, number labels may be offset and connected by thin leader lines. Illustrative terrain strokes are decorative, not measured elevation contours. Some out-and-back itineraries show the route segments in reverse on the return. The sketches represent an approximate sequence, not surveyed GPS coordinates, a precise route trace, elevation, travel time or turn-by-turn directions. Official references in [ROUTE-SOURCES.md](ROUTE-SOURCES.md) support place names and order where available, but do not validate the drawn positions or every segment. Verify route details and current conditions with the relevant authority or operator; these graphics are not for navigation.

## v3 additions (2026-11-10)

- The 25 route guides added in v3 have no hand-drawn schematic. Their route page draws the DOC track line instead: **DOC Walking and Tramping Experiences – routes**, Department of Conservation Te Papa Atawhai, [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), read through the DOC ArcGIS service on the date stored in `data/doc-tracks.json`; simplified (about 0.0003 degrees) and redrawn. Routes missing from that dataset (for example the Heaphy Track) show a note pointing to the official map.
- Route sketch points: of 240 points, 238 are hand-placed and marked `approximate`. The two that carried a mapcarta reference now use the **New Zealand Gazetteer (NZGB)** coordinate and are marked `gazetteer`: Taranaki Falls (name ID 41646) and Kawakawa Bay, Taupō (name ID 24833), read from https://gazetteer.linz.govt.nz/ on 2026-11-10. The Orakau car park point, formerly referenced to a Google Maps link, is not a gazetted place; it is hand-placed and flagged “to verify”. No coordinate in this project now cites mapcarta or Google Maps.
- City centre points used by the sports pages are OpenStreetMap place nodes (© OpenStreetMap contributors, ODbL).

### Full attribution statements

- **LINZ**: Contains data sourced from the [LINZ Data Service](https://data.linz.govt.nz/) licensed for reuse under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Datasets: [NZ Coastlines and Islands Polygons (Topo 1:50k)](https://data.linz.govt.nz/layer/51153-nz-coastlines-and-islands-polygons-topo-150k/), [NZ Lake Polygons (Topo 1:50k)](https://data.linz.govt.nz/layer/50293-nz-lake-polygons-topo-150k/), [NZ River Name Lines (Pilot)](https://data.linz.govt.nz/layer/103632-nz-river-name-lines-pilot/), [NZ River Name Polygons (Pilot)](https://data.linz.govt.nz/layer/103631-nz-river-name-polygons-pilot/), [NZ Place Names (NZGB)](https://data.linz.govt.nz/layer/51681-nz-place-names-nzgb/) and the New Zealand Gazetteer. Changes: reprojected to WGS84, filtered, simplified, clipped and restyled. The coastline came through Environment Canterbury's redistribution of the LINZ layer, as described above.
- **DOC**: Contains information sourced from the Department of Conservation Te Papa Atawhai, licensed for reuse under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Datasets: [DOC Walking and Tramping Experiences – locations](https://catalogue.data.govt.nz/dataset/doc-walking-and-tramping-experiences-locations4) and [routes](https://catalogue.data.govt.nz/dataset/doc-walking-and-tramping-experiences-routes4), [DOC Tracks](https://catalogue.data.govt.nz/dataset/doc-tracks8). Changes: regrouped by region and time band, lines simplified, track segments matched to walks by location.
- **Natural Earth**: public domain.
- **OpenStreetMap**: © OpenStreetMap contributors, [ODbL 1.0](https://opendatacommons.org/licenses/odbl/); see https://www.openstreetmap.org/copyright .
