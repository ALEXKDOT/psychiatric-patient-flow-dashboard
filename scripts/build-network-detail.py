"""Build the offline regional street atlas. See docs/attribution/network-detail.md."""
import argparse
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
import hashlib
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImagePath
import shapefile

ROOT = Path(__file__).resolve().parents[1]
BOUNDS = (-74.53, 40.39, -73.43, 41.19)
# Logical XYZ zoom, output pixels per square tile, includes mapped building outlines.
LEVELS = [(9, 640), (11, 704), (12, 1024)]
STREET_TYPES = {'S1100': 'primary', 'S1200': 'secondary', 'S1400': 'street',
                'S1630': 'ramp', 'S1640': 'ramp', 'S1740': 'service', 'S1780': 'service'}
PARK_TYPES = {'K2180', 'K2181', 'K2182', 'K2183', 'K2184', 'K2185', 'K2186',
              'K2187', 'K2188', 'K2189', 'K2190', 'K2561'}
COLORS = {
    # Indexed transparent ink, painted over the existing local terrain and shoreline.
    'empty': ((0,0,0,0), (0,0,0,0)),
    'park': ((198,213,186,222), (63,83,66,225)),
    'water': ((207,222,223,255), (33,49,55,255)),
    'building': ((192,198,187,205), (95,108,104,200)),
    'casing': ((173,183,172,170), (25,34,35,205)),
    'grid': ((135,149,138,185), (124,142,135,171)),
    'minor': ((253,252,244,245), (100,112,110,218)),
    'major': ((255,251,230,255), (153,150,127,245)),
}
INDEX = {k:i for i,k in enumerate(COLORS)}
COUNTIES = '36061 36005 36047 36081 36085 36059 36119 36087 36103 34017 34003 34013 34039 34023 34031 34027 34025 34035 09190 09120'.split()


def world(lon, lat):
    return (lon + 180) / 360, (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2


def in_region(b):
    west,south,east,north = BOUNDS
    return b[2] >= west and b[0] <= east and b[3] >= south and b[1] <= north


def ring_parts(s):
    bounds = list(s.parts) + [len(s.points)]
    return [s.points[a:b] for a,b in zip(bounds,bounds[1:])]


@dataclass
class Mark:
    kind: str
    rings: list
    holes: list
    bounds: tuple


def mark(kind, parts, holes=None):
    paths = [ImagePath.Path([world(*p[:2]) for p in part]) for part in parts if len(part)>=2]
    boxes = [p.getbbox() for p in paths]
    return Mark(kind, paths, holes or [], (min(b[0] for b in boxes), min(b[1] for b in boxes),
                                            max(b[2] for b in boxes), max(b[3] for b in boxes)))


def polygon_marks(kind, geometry):
    for poly in geometry['coordinates'] if geometry['type']=='MultiPolygon' else [geometry['coordinates']]:
        if poly and len(poly[0])>=3:
            yield mark(kind,poly,[i for i in range(1,len(poly))])


def gather(source):
    marks, candidates, counts = [], {}, Counter()
    def keep(m):
        marks.append(m)
        counts[m.kind] += 1
    def read(layer,code):
        path = source / f'tl_2025_{code}_{layer}.zip'
        with shapefile.Reader(str(path),encoding='latin1') as reader:
            for s in reader.iterShapeRecords():
                if in_region(s.shape.bbox):
                    yield s.shape,s.record
    for code in ['09','34','36']:
        for s,r in read('arealm',code):
            if r.MTFCC not in PARK_TYPES: continue
            for m in polygon_marks('park',s.__geo_interface__): keep(m)
            if r.ALAND >= 500000 and any(word in r.FULLNAME.lower() for word in ('park','garden','reserve','forest','reservation','greenway')):
                key = ('park',r.FULLNAME,code)
                candidates[key]=(int(r.ALAND),{'text':r.FULLNAME,'lon':float(r.INTPTLON),'lat':float(r.INTPTLAT),'angle':0,'kind':'park'})
    for code in COUNTIES:
        for s,r in read('areawater',code):
            kind = 'water' if r.MTFCC in ('H2030','H2040') else 'coastMask'
            for m in polygon_marks(kind,s.__geo_interface__): keep(m)
        for s,r in read('roads',code):
            kind = STREET_TYPES.get(r.MTFCC)
            if not kind: continue
            parts = ring_parts(s)
            keep(mark(kind,parts))
            name = r.FULLNAME.strip()
            if kind not in ('street','secondary') or not name or len(name)>27: continue
            pts=max(parts,key=len)
            length=sum(math.hypot((a[0]-b[0])*.76,a[1]-b[1]) for a,b in zip(pts,pts[1:]))
            if length < .009: continue
            i=max(0,len(pts)//2-1)
            lon,lat=pts[i][:2]
            end=pts[i+1]
            angle=math.degrees(math.atan2(lat-end[1],(end[0]-lon)*.76))
            key=('road',round(lon/.018),round(lat/.014))
            score=min(length,.07)*(1.4 if kind=='secondary' else 1)
            if key not in candidates or score>candidates[key][0]:
                candidates[key]=(score,{'text':name,'lon':round(lon,5),'lat':round(lat,5),'angle':round((angle+90)%180-90),'kind':'street'})
    last = 0
    while True:
        rows=json.loads((source/f'footprints-400-{last}.json').read_bytes())
        for row in rows:
            if row.get('the_geom'):
                for m in polygon_marks('building',row['the_geom']): keep(m)
        if len(rows)<10000: break
        last=int(rows[-1]['objectid'])
    # The county provides the White Plains campus neighborhood independently of NYC OTI.
    county=ROOT/'public/campuses/ny_nyp_westchester_bh/buildings.geojson'
    for f in json.loads(county.read_bytes())['features']:
        for m in polygon_marks('building',f['geometry']): keep(m)
    return marks,[v[1] for v in sorted(candidates.values(),key=lambda x:-x[0])],counts


def tile_jobs(marks,z):
    n=2**z
    west,south,east,north=BOUNDS
    left,top=world(west,north)
    right,bottom=world(east,south)
    bins=defaultdict(lambda:defaultdict(list))
    for m in marks:
        if z<12 and m.kind in ('building','service'): continue
        if z==9 and m.kind=='ramp': continue
        x0,y0,x1,y1=m.bounds
        for x in range(max(int(left*n),math.floor(x0*n-.002)),min(int(right*n),math.floor(x1*n+.002))+1):
            for y in range(max(int(top*n),math.floor(y0*n-.002)),min(int(bottom*n),math.floor(y1*n+.002))+1):
                bins[x,y][m.kind].append(m)
    return bins


def render(job):
    out,z,x,y,size,kinds=job
    # Render at twice delivery resolution for fine street edges. Keep a gutter for resampling at tile seams.
    factor=2
    gutter=6
    extent=size*factor
    total=extent+2*gutter
    img=Image.new('L',(total,total))
    pen=ImageDraw.Draw(img)
    matrix=(extent*(2**z),0,gutter-extent*x,0,extent*(2**z),gutter-extent*y)
    def project(p):
        q=ImagePath.Path(p)
        q.transform(matrix)
        return q
    for kind in ['park','coastMask','water','building']:
        ink = INDEX['empty' if kind == 'coastMask' else kind]
        for m in kinds.get(kind,[]):
            paths=[project(p) for p in m.rings]
            if m.holes:
                # A courtyard or an island exposes whatever was painted below the polygon.
                area=paths[0].getbbox()
                bounds=(max(0,math.floor(area[0])),max(0,math.floor(area[1])),
                        min(total,math.ceil(area[2])+1),min(total,math.ceil(area[3])+1))
                if bounds[0]>=bounds[2] or bounds[1]>=bounds[3]: continue
                saved=img.crop(bounds)
                pen.polygon(paths[0],fill=ink)
                mask=Image.new('1',saved.size)
                hole_pen=ImageDraw.Draw(mask)
                for i in m.holes:
                    paths[i].transform((1,0,-bounds[0],0,1,-bounds[1]))
                    hole_pen.polygon(paths[i],fill=1)
                img.paste(saved,bounds,mask)
            else: pen.polygon(paths[0],fill=ink)
    widths={9:[0,.55,.65,1.1,1.4],11:[0,1.05,1.35,1.9,2.5],12:[1,2,2.5,3.4,4.8]}[z]
    for kind,w in zip(('service','street','ramp','secondary','primary'),widths):
        if w==0: continue
        roads=[project(p) for m in kinds.get(kind,[]) for p in m.rings]
        if z==12 or kind in ('secondary','primary'):
            for p in roads: pen.line(p,fill=INDEX['casing'],width=round((w+1.3)*factor))
        for p in roads:
            pen.line(p,fill=INDEX['major' if kind in ('secondary','primary') else ('minor' if z==12 else 'grid')],width=max(1,round(w*factor)))
    if not img.getbbox(): return None
    for theme,n in [('light',0),('dark',1)]:
        palette=img.convert('P')
        palette.putpalette([c for pair in COLORS.values() for c in pair[n][:3]])
        palette.info['transparency']=bytes(pair[n][3] for pair in COLORS.values())
        rgba=palette.convert('RGBA').resize((size,size),Image.Resampling.BOX,
                box=(gutter,gutter,gutter+extent,gutter+extent))
        # Four subpixels give exact coverage at street edges. A small palette keeps
        # the tile cache light enough for a credential-free static distribution.
        rgba.quantize(colors=48, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(
            out/f'{z}-{x}-{y}-{theme}.webp', lossless=True, method=4)
    return f'{z}-{x}-{y}'


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('sources',type=Path)
    parser.add_argument('--workers',type=int,default=3)
    args=parser.parse_args()
    out=ROOT/'public/geography/network'
    out.mkdir(exist_ok=True)
    marks,labels,counts=gather(args.sources)
    print('Mapped features',counts,flush=True)
    files=[]
    for z,size in LEVELS:
        bins=tile_jobs(marks,z)
        with ThreadPoolExecutor(max_workers=args.workers) as pool:
            ids=pool.map(render,[(out,z,x,y,size,v) for (x,y),v in sorted(bins.items())])
            files.extend(k for k in ids if k)
        print(f'Finished level {z}',flush=True)
    atlas=ROOT/'src/cartography'
    (atlas/'network-tiles.json').write_text(json.dumps(sorted(files),separators=(',',':'))+'\n')
    (atlas/'network-labels.json').write_text(json.dumps(labels,separators=(',',':'))+'\n')
    snapshot={'bounds':BOUNDS,'counts':dict(counts),'tiles':len(files),'sources':{
        p.name:hashlib.sha256(p.read_bytes()).hexdigest()
        for pattern in ('tl_2025_*.zip','footprints-400-*.json')
        for p in sorted(args.sources.glob(pattern))}}
    (ROOT/'docs/attribution/network-detail-snapshot.json').write_text(json.dumps(snapshot,indent=2)+'\n')

if __name__=='__main__':
    main()
