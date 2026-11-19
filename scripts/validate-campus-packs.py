"""Validate the local exterior geometry and recorded identity/height snapshot, offline."""
import csv
import hashlib
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NOTICES = ROOT / "docs/attribution/campuses"
manifest = json.loads((NOTICES / "snapshot.json").read_text())
registry = json.loads((ROOT / "src/cartography/campus/targets.json").read_text())
nyc = {r["campus_id"]: r for r in json.loads((NOTICES / "nyc-manifest.json").read_text())["campuses"]}
county = json.loads((NOTICES / "westchester-manifest.json").read_text())


def require(ok, message):
    if not ok:
        raise ValueError(message)


def inside(point, ring):
    """Even-odd ray crossing for the point on the publisher's WGS84 polygon."""
    x, y = point
    crossed = False
    for (x1, y1), (x2, y2) in zip(ring, ring[1:]):
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            crossed = not crossed
    return crossed


def validate():
    for name, source in manifest.items():
        data = (ROOT / name).read_bytes()
        require(len(data) == source["bytes"] and hashlib.sha256(data).hexdigest() == source["sha256"], name)
    with (ROOT / "docs/research/FACILITY_SEED.csv").open(encoding="utf-8") as file:
        campuses = {r["campus_id"]: r for r in csv.DictReader(file)}
    require(len(registry) == len(campuses) == 23 and {r["campus_id"] for r in registry} == set(campuses), "Campus keys")
    totals = Counter()
    for t in registry:
        cid = t["campus_id"]
        point = [float(campuses[cid][axis]) for axis in ["longitude", "latitude"]]
        require(point == t["network_marker"], f"{cid}: OMH marker")
        require(t["evidence_url"].startswith("https://") and t["target_label"], f"{cid}: target evidence")
        for layer in ["buildings", "streets"]:
            path = ROOT / "public/campuses" / cid / (layer + ".geojson")
            rows = json.loads(path.read_text())["features"]
            count = nyc[cid]["layers"][layer]["retained"] if cid in nyc else county["layers"][layer]["feature_count"]
            require(len({str(f["properties"]["objectid"]) for f in rows}) == len(rows) == count, f"{cid}: {layer} keys")
            totals[layer] += count
            if layer == "streets":
                continue
            focus = [f for f in rows if int(f["properties"]["objectid"]) == t["feature_id"]]
            require(len(focus) == 1, f"{cid}: feature match")
            feature = focus[0]
            props = feature["properties"]
            if cid in nyc:
                require(all(str(props[k]) == t[key] for k, key in [("bin", "bin"), ("base_bbl", "bbl"), ("doitt_id", "doitt_id")]), f"{cid}: NYC identity")
            require(props["height_m"] == t["recorded_height_m"], f"{cid}: recorded height")
            shape = feature["geometry"]
            polys = [shape["coordinates"]] if shape["type"] == "Polygon" else shape["coordinates"]
            require(any(inside(t["focus_lonlat"], poly[0]) and all(not inside(t["focus_lonlat"], hole) for hole in poly[1:]) for poly in polys), f"{cid}: point on exterior")
    print(f"Verified {len(registry)} targets, {totals['buildings']:,} buildings and {totals['streets']:,} street features against packet digests, manifests and seed identities.")


if __name__ == "__main__":
    validate()
