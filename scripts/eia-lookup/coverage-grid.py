"""Freeze the denominator before observation checks; no network or app changes.
UNSD-style correspondence table, as required in DESIGN.md and work order B.0d.
"""
import hashlib,importlib.util,itertools,json
from pathlib import Path
spec=importlib.util.spec_from_file_location('inventory',Path(__file__).with_name('coverage-inventory.py'))
i=importlib.util.module_from_spec(spec);spec.loader.exec_module(i)
KINDS=['country','World','US','state']
QUALIFIERS=['crude oil','gasoline']
def build(catalogues,vocabulary):
    products=set(vocabulary['products']);activities=set(vocabulary['activities']);sectors=set(vocabulary['sectors'])
    sector_sources={};qualifier_sources={}
    for route,data in catalogues.items():
        rows=data['dataColumns']+[r for rs in data['facets'].values() for r in rs]
        rows=[r for r in rows if r.get('classification')!='out of vocabulary' and not r.get('ownerException')]
        for r in rows:
            if r.get('product') not in products or r.get('sector') not in sectors:continue
            for activity in r.get('activities',[r.get('activity')]):
                if activity not in activities:continue
                sector_sources.setdefault((r['product'],activity,r['sector']),set()).add(route)
                if r.get('qualifier') in QUALIFIERS:qualifier_sources.setdefault((r['qualifier'],activity,r['sector']),set()).add(route)
        sector_rows=[r for fid,rs in data['facets'].items() if fid in ['sector','sectorid'] for r in rs if r.get('sector') in sectors and not r.get('ownerException')]
        if sector_rows:
            # A cell belongs in the denominator even if only components are known.
            # This is possible vocabulary correspondence, never a publication claim.
            ps={r.get(k) for r in rows for k in ['product','inputProduct']} & products
            acts={a for r in rows for a in r.get('activities',[r.get('activity')])} & activities
            for p,a,s in itertools.product(sorted(ps),sorted(acts),sorted({r['sector'] for r in sector_rows})):
                sector_sources.setdefault((p,a,s),set()).add(route)
    cells=[]
    def add(kind,product,activity,sector=None,qualifier=None,sources=None):
        group=('qualifier-sector' if sector else 'qualifier') if qualifier else ('sector' if sector else 'base')
        row={'id':'|'.join([kind,product,activity,sector or '',qualifier or '']),'group':group,'placeKind':kind,'product':product,'activity':activity,'sector':sector,'qualifier':qualifier,'status':'not checked'}
        if sources:row['definitionRoutes']=sorted(sources)
        cells.append(row)
    for kind,p,a in itertools.product(KINDS,vocabulary['products'],vocabulary['activities']):add(kind,p,a)
    for (p,a,s),routes in sorted(sector_sources.items()):
        for kind in KINDS:add(kind,p,a,s,sources=routes)
    for kind,q,a in itertools.product(KINDS,QUALIFIERS,vocabulary['activities']):add(kind,'petroleum',a,qualifier=q)
    for (q,a,s),routes in sorted(qualifier_sources.items()):
        for kind in KINDS:add(kind,'petroleum',a,s,q,routes)
    assert len({r['id'] for r in cells})==len(cells)
    from collections import Counter
    return {'method':'Fixed vocabulary cross-product plus every metadata-derived named sector correspondence. Place kinds are the denominator, not availability. Qualifiers are separate and never replace whole petroleum.','counts':dict(Counter(r['group'] for r in cells)),'cells':cells}
def main():
    v=i.read(i.ROOT/'data/eia/phase4-routing-config.json')['vocabulary'];summary=i.read(i.EVIDENCE/'series-catalog-summary.json')
    catalogues={r:i.read(i.EVIDENCE/d['file']) for r,d in summary['routes'].items()}
    for route,c in catalogues.items():
        if not (c['classificationComplete'] or c.get('reviewCompleteWithExceptions')):raise ValueError('Unreviewed definitions: '+route)
    grid=build(catalogues,v);assert grid['counts']['base']==672
    target=i.EVIDENCE/'cell-grid.json';encoded=(json.dumps(grid,separators=(',',':'))+'\n').encode()
    if target.exists() and target.read_bytes()!=encoded:raise ValueError('Existing grid differs: no automatic rewrite of freeze')
    target.write_bytes(encoded)
    sources=['cell-grid.json','owner-clarifications.json','series-catalog-summary.json']
    manifest={'phase':'B.0d denominator freeze before B1; this is not Set D freeze or implementation approval','files':{name:hashlib.sha256((i.EVIDENCE/name).read_bytes()).hexdigest() for name in sources},'vocabularySHA256':hashlib.sha256((i.ROOT/'data/eia/phase4-routing-config.json').read_bytes()).hexdigest(),'counts':grid['counts'],'unresolvedExceptions':'OB2, OBW, sector 95 cannot supply results or nonpublication evidence','uncertainScopeLabel':'EIA scope note not verified'}
    (i.EVIDENCE/'cell-grid-freeze.json').write_text(json.dumps(manifest,indent=2)+'\n');print(json.dumps({'counts':grid['counts'],'total':len(grid['cells']),'sha256':manifest['files']['cell-grid.json']}))
if __name__=='__main__':main()
