"""Derive the regional tidal-water mask. See README for the two source datasets.
Usage: python make_shore.py path/to/basemap_data path/to/boroughs.geojson
"""
import json
from pathlib import Path
import sys
import numpy as np
from shapely import box, clip_by_rect, make_valid, Polygon, union_all, set_precision
from shapely.geometry import Point, mapping, shape

base = Path(__file__).resolve().parent
bounds = (-74.60, 40.38, -73.45, 41.17)
area = box(*bounds)
data_path = Path(sys.argv[1])
coords = np.memmap(data_path / 'gshhs_f.dat', dtype='<f4', mode='r').reshape((-1, 2))
levels = {level: [] for level in (1, 2, 3, 4)}
for line in (data_path / 'gshhsmeta_f.dat').read_text().splitlines():
    level, _, n, south, north, start, size, _ = line.split()
    level = int(level)
    if level not in levels or int(n) < 4 or float(north) < bounds[1] or float(south) > bounds[3]:
        continue
    ring = coords[int(start)//8:(int(start)+int(size))//8]
    if ring[:, 0].max() < bounds[0] or ring[:, 0].min() > bounds[2]:
        continue
    geom = clip_by_rect(Polygon(ring), *bounds)
    if not geom.is_empty:
        levels[level].append(make_valid(geom))
land = union_all(levels[1]).difference(union_all(levels[2])).union(union_all(levels[3])).difference(union_all(levels[4]))
# Within the five NYC counties, use the more detailed DCP water-clipped boroughs.
county_data = json.loads((base / '../../docs/research/REGIONAL_GEOGRAPHY.geojson').read_text())
county_ids = {'36005', '36047', '36061', '36081', '36085'}
city_counties = union_all([shape(f['geometry']) for f in county_data['features'] if f['id'] in county_ids])
boroughs = union_all([shape(f['geometry']) for f in json.loads(Path(sys.argv[2]).read_text())['features']])
land = land.difference(city_counties).union(boroughs)
water = set_precision(area.difference(land).simplify(0.00006, preserve_topology=True), 0.00001)
# County boundaries include administrative water. Check known sites on both sides
# of the shoreline before replacing the shipped mask.
for site, longitude, latitude, expected_water in [
    ('Hudson River at the Lincoln Tunnel', -74.0139, 40.7626, True),
    ('East River at the Williamsburg Bridge', -73.9734, 40.7130, True),
    ('Harlem River near Macombs Dam Bridge', -73.9345, 40.8277, True),
    ('Bellevue Hospital', -73.9764, 40.7398, False),
    ('Times Square', -73.9855, 40.7581, False),
]:
    if water.contains(Point(longitude, latitude)) != expected_water:
        raise ValueError(f"Shoreline regression at {site}: expected {'water' if expected_water else 'land'}")
# Do not stroke the artificial rectangular boundary of the local high-resolution dataset.
outline = water.boundary.intersection(area.buffer(-0.00006))
out = {'type': 'FeatureCollection', 'features': [
    {'type':'Feature', 'properties': {'kind':'water'}, 'geometry':mapping(water)},
    {'type':'Feature', 'properties': {'kind':'shore'}, 'geometry':mapping(outline)},
]}
(base/'tidal-water.json').write_text(json.dumps(out,separators=(',', ':')) + '\n')
