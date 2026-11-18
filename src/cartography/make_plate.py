"""Render the local geographic print texture from Census land and block-group outlines.

Run from this directory with the 2019 NY and NJ CitySDK block-group JSON paths:
python make_plate.py ny-block-group.json nj-block-group.json
Requires Pillow, NumPy, and SciPy only when regenerating the artwork.
"""
from pathlib import Path
import hashlib
import json
import math
import sys

import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import gaussian_filter, distance_transform_edt

BASE = Path(__file__).resolve().parent
WEST, SOUTH, EAST, NORTH = -74.53, 40.39, -73.43, 41.19
WIDTH = 2700


def mercator(latitude):
    return math.degrees(math.log(math.tan(math.pi / 4 + math.radians(latitude) / 2)))


top = mercator(NORTH)
scale = WIDTH / (EAST - WEST)
height = round((top - mercator(SOUTH)) * scale)
size = (WIDTH, height)
land = Image.new("L", size, 0)
land_ink = ImageDraw.Draw(land)
group_ink = Image.new("L", size, 0)
group_draw = ImageDraw.Draw(group_ink)
shade = Image.new("L", size, 230)
shade_draw = ImageDraw.Draw(shade)
land_data = json.loads((BASE / "../../docs/research/REGIONAL_GEOGRAPHY.geojson").read_text())
geometries = [f["geometry"] for f in land_data["features"]]
geometries += [json.loads((BASE / "regional-context.json").read_text())]


def polygons(geometry):
    coords = geometry["coordinates"]
    return [coords] if geometry["type"] == "Polygon" else coords


def projected(ring):
    return [((x - WEST) * scale, (top - mercator(y)) * scale) for x, y in ring]


for geom in geometries:
    for outer, *holes in polygons(geom):
        land_ink.polygon(projected(outer), fill=255)
        for hole in holes:
            land_ink.polygon(projected(hole), fill=0)

# Cut the verified tidal water out of the print plate as well as the vector display.
tidal = json.loads((BASE / "tidal-water.json").read_text())["features"][0]["geometry"]
for outer, *holes in polygons(tidal):
    land_ink.polygon(projected(outer), fill=0)
    for hole in holes:
        land_ink.polygon(projected(hole), fill=255)

for file in sys.argv[1:]:
    data = Path(file).read_bytes()
    print(Path(file).name, hashlib.sha256(data).hexdigest())
    for feat in json.loads(data)["features"]:
        shape = feat["geometry"]
        west, south, east, north = shape["bbox"]
        if east < WEST or west > EAST or north < SOUTH or south > NORTH:
            continue
        identity = feat["properties"]["GEOID"]
        # Deterministic print tone, independent of operational values or population.
        tone = hashlib.sha256(identity.encode()).digest()[0]
        for outer, *_ in polygons(shape):
            pts = projected(outer)
            shade_draw.polygon(pts, fill=220 + tone // 18)
            group_draw.line(pts, fill=255, width=2)

ink = np.asarray(group_ink, dtype=np.float32) / 255
mask = np.asarray(land) > 128
shore_distance = distance_transform_edt(mask).astype(np.float32)
ridges = gaussian_filter(ink, 1.5)
density = gaussian_filter(ink, 10)
grain = np.random.default_rng(817).standard_normal(mask.shape, dtype=np.float32)
# Raised geographic linework and shore-parallel bands create an engraved print.
# These marks do not encode elevation, population or operational values.
base = np.asarray(shade, dtype=np.float32) - density * 18
base += (np.roll(ridges, 2, axis=0) - np.roll(ridges, -1, axis=1)) * 42
base += (1 - np.exp(-shore_distance / 9)) * 5 - np.exp(-shore_distance / 3) * 26
base += np.exp(-shore_distance / 13) * np.cos(shore_distance * 1.55) * 18
base += grain * 4.5
base -= (grain < -1.15) * (5 + density * 11)
lum = np.clip(base, 152, 250).astype(np.uint8)
rgba = np.empty((*lum.shape, 4), dtype=np.uint8)
rgba[:, :, :3] = lum[:, :, None]
# Fade out at the plate edges into the county/tract context underneath.
x = np.minimum(np.arange(WIDTH), np.arange(WIDTH)[::-1])
y = np.minimum(np.arange(height), np.arange(height)[::-1])
fade = np.minimum(np.minimum(x[None, :], y[:, None]) / 100, 1)
rgba[:, :, 3] = (np.asarray(land) * fade).astype(np.uint8)
image = Image.fromarray(rgba, mode="RGBA")
image.save(BASE / "census-plate.webp", quality=70, method=5)
