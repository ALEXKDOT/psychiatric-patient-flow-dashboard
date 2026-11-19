"""Prepare local MapLibre elevation tiles and the shaded regional map from the handoff."""
import argparse
import json
import math
import shutil
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
MOSAIC_ZOOM = 11
TILE_SIZE = 256


def pixel(lon, lat):
    """Web Mercator pixel coordinates at the regional mosaic's resolution."""
    width = TILE_SIZE * 2**MOSAIC_ZOOM
    return (
        (lon + 180) / 360 * width,
        (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * width,
    )


def prepare(source, root):
    terrain = source / "terrain"
    public = root / "public/geography"
    (public / "terrain").mkdir(parents=True, exist_ok=True)
    coverage = json.loads((terrain / "coverage.json").read_text())
    tiles = sorted(terrain.glob("*/*/*.png"))
    if len(tiles) != coverage["tileCount"]:
        raise ValueError("Elevation tile count differs from the supplied coverage manifest")
    for tile in tiles:
        dest = public / "terrain" / tile.relative_to(terrain)
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(tile, dest)
    shutil.copyfile(terrain / "coverage.json", public / "terrain/coverage.json")
    for filename, dest in (("major-roads.geojson", "major-roads.geojson"), ("source.json", "roads-source.json")):
        shutil.copyfile(source / "regional" / filename, public / dest)

    regions = {region["id"]: region["bounds"] for region in coverage["regions"]}
    inventory = {
        "bounds": regions,
        "tiles": [t.relative_to(terrain).with_suffix("").as_posix() for t in tiles],
    }
    index = root / "src/cartography/terrain-index.json"
    index.parent.mkdir(parents=True, exist_ok=True)
    index.write_text(json.dumps(inventory, separators=(",", ":")) + "\n")
    # Terrarium encodes zero meters as RGB(128, 0, 0).
    Image.new("RGB", (TILE_SIZE, TILE_SIZE), (128, 0, 0)).save(public / "terrain/flat.png")

    west, south, east, north = regions["network"]
    left, top = pixel(west, north)
    right, bottom = pixel(east, south)
    x0, y0 = math.floor(left / TILE_SIZE), math.floor(top / TILE_SIZE)
    elevation = np.zeros(
        ((math.floor(bottom / TILE_SIZE) - y0 + 1) * TILE_SIZE,
         (math.floor(right / TILE_SIZE) - x0 + 1) * TILE_SIZE),
        dtype="float32",
    )
    for tile in terrain.glob(f"{MOSAIC_ZOOM}/*/*.png"):
        x, y = (int(tile.parent.name) - x0) * TILE_SIZE, (int(tile.stem) - y0) * TILE_SIZE
        with Image.open(tile) as image:
            rgb = np.asarray(image.convert("RGB"), dtype="float32")
        elevation[y:y + TILE_SIZE, x:x + TILE_SIZE] = (
            rgb[:, :, 0] * 256 + rgb[:, :, 1] + rgb[:, :, 2] / 256 - 32768
        )
    meters_per_pixel = 40075016.7 * math.cos(math.radians((north + south) / 2)) / (2**MOSAIC_ZOOM * TILE_SIZE)
    dy, dx = np.gradient(elevation, meters_per_pixel)
    light = np.clip((dx + dy) * 0.707, -0.48, 0.48)
    roads = json.loads((public / "major-roads.geojson").read_text())["features"]
    roads.sort(key=lambda feature: feature["properties"]["rank"] == "primary")
    themes = [
        ("light", (231, 233, 226), (165, 171, 165), (193, 198, 191)),
        ("dark", (43, 49, 49), (100, 108, 106), (72, 81, 79)),
    ]
    crop = (round(left) - x0 * TILE_SIZE, round(top) - y0 * TILE_SIZE,
            round(right) - x0 * TILE_SIZE, round(bottom) - y0 * TILE_SIZE)
    for mode, land, primary, secondary in themes:
        shaded = np.clip(np.array(land) + light[:, :, None] * 85, 0, 255).astype("uint8")
        image = Image.fromarray(shaded)
        draw = ImageDraw.Draw(image)
        for feature in roads:
            geometry = feature["geometry"]
            lines = geometry["coordinates"] if geometry["type"] == "MultiLineString" else [geometry["coordinates"]]
            color = primary if feature["properties"]["rank"] == "primary" else secondary
            for line in lines:
                points = (pixel(lon, lat) for lon, lat in line)
                draw.line([(px - x0 * TILE_SIZE, py - y0 * TILE_SIZE) for px, py in points], fill=color, width=1)
        image.crop(crop).save(public / f"regional-{mode}.webp", quality=91)
    print(f"Prepared {len(tiles)} local DEM tiles, {len(roads)} roads and two flat relief maps.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("assets", type=Path, help="Extracted handoff assets directory")
    parser.add_argument("--output-root", type=Path, default=ROOT, help="Output checkout or staging directory")
    args = parser.parse_args()
    prepare(args.assets, args.output_root)
