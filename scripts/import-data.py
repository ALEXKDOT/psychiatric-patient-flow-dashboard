"""Validate the research snapshot and generate the browser's local data module."""
import argparse
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / "docs/research"
OUT = ROOT / "src/data.generated.json"


def read_table(filename, key, count):
    with (RESEARCH / filename).open(encoding="utf-8-sig", newline="") as source:
        rows = list(csv.DictReader(source))
    if len(rows) != count or len({row[key] for row in rows}) != count:
        raise ValueError(f"{filename}: expected {count} unique {key} records")
    if any(None in row or None in row.values() for row in rows):
        raise ValueError(f"{filename}: malformed row")
    return rows


def ids(value):
    return set() if value == "NOT_APPLICABLE" else set(value.split(";"))


def build():
    campuses = read_table("FACILITY_SEED.csv", "campus_id", 23)
    programs = read_table("PROGRAM_SEED.csv", "program_id", 35)
    services = read_table("SERVICE_SEED.csv", "service_id", 46)
    evidence = read_table("SOURCE_REGISTRY.csv", "source_id", 89)
    read_table("FEATURE_DATA_MATRIX.csv", "display_field_or_feature", 57)
    geo = json.loads((RESEARCH / "REGIONAL_GEOGRAPHY.geojson").read_text())
    assert len({f["id"] for f in geo["features"]}) == 18
    source_ids = {r["source_id"] for r in evidence}
    campus_ids = {r["campus_id"] for r in campuses}
    program_index = {r["program_id"]: r for r in programs}
    for r in campuses + programs + services:
        assert r["campus_id"] in campus_ids and ids(r["source_ids"]) <= source_ids, r
    for c in campuses:
        assert ids(c["program_ids"]) == {r["program_id"] for r in programs if r["campus_id"] == c["campus_id"]}
        assert ids(c["service_ids"]) == {r["service_id"] for r in services if r["campus_id"] == c["campus_id"]}
        assert c["coordinate_source_id"] in source_ids and -75 < float(c["longitude"]) < -73 and 40 < float(c["latitude"]) < 42
    assert len({r["omh_program_key"] for r in programs}) == len(programs)
    for r in services:
        if r["linked_program_id"] != "UNKNOWN":
            assert program_index[r["linked_program_id"]]["campus_id"] == r["campus_id"]
    # Keep all original fact fields as strings, including zero-padded identifiers.
    # The full source audit, including its original request metadata, stays in the CSV.
    fields = "source_id publisher title url data_vintage last_updated access_date reuse_terms".split()
    return {"facilities": campuses, "programs": programs, "services": services,
            "sources": [{key: row[key] for key in fields} for row in evidence]}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="verify checked-in output without writing")
    options = parser.parse_args()
    contents = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    if options.check:
        if not OUT.exists() or contents != OUT.read_text():
            raise SystemExit("Data output is stale. Run python3 scripts/import-data.py")
    else:
        OUT.write_text(contents, encoding="utf-8")
    print("Verified 23 campuses, 35 programs, 46 services, 89 sources, 57 feature decisions and 18 geographic features.")
