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

Each of the 48 route guides has an original hand-drawn SVG schematic with named stops, a principal travel mode and, where applicable, ferry, train or bus connections. A legend distinguishes walking, cycling, driving and public transport. Where labels would collide, number labels may be offset and connected by thin leader lines. Illustrative terrain strokes are decorative, not measured elevation contours. Some out-and-back itineraries show the route segments in reverse on the return. The sketches represent an approximate sequence, not surveyed GPS coordinates, a precise route trace, elevation, travel time or turn-by-turn directions. Official references in [ROUTE-SOURCES.md](ROUTE-SOURCES.md) support place names and order where available, but do not validate the drawn positions or every segment. Verify route details and current conditions with the relevant authority or operator; these graphics are not for navigation.
