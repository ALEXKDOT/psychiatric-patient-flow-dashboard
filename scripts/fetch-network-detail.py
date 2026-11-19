"""Download the public GIS source files used by build-network-detail.py."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
import time
from urllib.parse import urlencode
from urllib.request import Request, urlopen
from zipfile import ZipFile

COUNTIES = (
    '36061 36005 36047 36081 36085 36059 36119 36087 36103 '
    '34017 34003 34013 34039 34023 34031 34027 34025 34035 09190 09120'
).split()


def download(url):
    for attempt in range(4):
        try:
            request = Request(url, headers={'User-Agent': 'FlowAtlas cartographic data build/1.0'})
            with urlopen(request, timeout=120) as response:
                return response.read()
        except OSError:
            if attempt == 3:
                raise
            time.sleep(2 ** attempt)


def census_archive(root, layer, code):
    name = f'tl_2025_{code}_{layer.lower()}.zip'
    path = root / name
    if not path.exists():
        pending = path.with_suffix('.part')
        pending.write_bytes(download(f'https://www2.census.gov/geo/tiger/TIGER2025/{layer}/{name}'))
        with ZipFile(pending) as archive:
            if archive.testzip() is not None:
                raise ValueError(f'Incomplete Census download: {name}')
        pending.replace(path)


def footprints(root):
    cursor = 0
    while True:
        path = root / f'footprints-400-{cursor}.json'
        if not path.exists():
            query = urlencode({'$select': 'objectid,the_geom',
                               '$where': f'shape_area >= 400 AND objectid > {cursor}',
                               '$order': 'objectid', '$limit': 10000})
            data = download('https://data.cityofnewyork.us/resource/5zhs-2jue.json?' + query)
            rows = json.loads(data)
            if not isinstance(rows, list):
                raise ValueError('Unexpected NYC footprint response')
            path.write_bytes(data)
        else:
            rows = json.loads(path.read_bytes())
        if len(rows) < 10000:
            return
        cursor = int(rows[-1]['objectid'])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source_directory', type=Path)
    root = parser.parse_args().source_directory
    root.mkdir(exist_ok=True, parents=True)
    jobs = [(layer, county) for county in COUNTIES for layer in ('ROADS', 'AREAWATER')]
    jobs.extend(('AREALM', state) for state in ('09', '34', '36'))
    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = [pool.submit(census_archive, root, *job) for job in jobs]
        for future in futures:
            future.result()
    footprints(root)


if __name__ == '__main__':
    main()
