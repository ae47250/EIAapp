"""Research correspondence for native reserve definitions; never used to parse queries.
Expectations precede implementation in natural-gas-reserves-source-review.json.
"""
import gzip,importlib.util,json,re
from pathlib import Path
spec=importlib.util.spec_from_file_location('inventory',Path(__file__).with_name('coverage-inventory.py'))
i=importlib.util.module_from_spec(spec);spec.loader.exec_module(i)

def mark(status,reason,**extra):
    return dict(classification=status,reason=reason,publicationStatus='unverified',**extra)

def product(d):
    code=d['id']
    if code=='EPG0':return mark('whole product','Whole gas product; process and series restrictions still apply.',product='natural gas')
    if code in ['EPC0','EPCCOND']:
        return mark('subset','Crude is part of petroleum; explicit qualifier only.',product='petroleum',qualifier='crude oil',qualifierClassification='whole product',basisLabel='Crude oil plus lease condensate' if code=='EPCCOND' else 'Crude oil')
    if code=='EPL0':return mark('subset','Liquid hydrocarbons separated from gas, not whole gas or whole petroleum.',product='petroleum')
    return mark('pending','Unreviewed product code.')

# Native EIA process IDs, not query exceptions. Totals and changes are different measures.
RESERVES={'R01','R11','R21','R31','R41','R51','R5301','R54','R56','R9907','R9908','R9909','R9910','R9911'}
PRODUCTION={'R10','R20','R30','R40','R50','R52','R5302','R55','R57'}
CHANGES={f'R{x:02d}' for x in range(2,50) if x%10 in range(2,10)}|{'R07A','R17A','R27A','R37A','R47A'}
CHANGES|={f'R{prefix}{x:02d}' for prefix in ['51','56'] for x in range(2,10)}|{'R5107A','R5607A','R53R02','R5307A'}|{f'R53{x:02d}' for x in range(3,10)}
SUBSET_PROCESS={'R31','R40','R41','R50','R51','R52','R5301','R5302','R54','R55','R56','R57','R9907','R9908','R9909','R9910','R9911'}

def process(d):
    code=d['id']
    if code in CHANGES:return mark('out of vocabulary','Reserve change/ownership transfer, not total reserves or physical product sales.')
    if code in RESERVES|PRODUCTION:
        activity='reserves' if code in RESERVES else 'production'
        r=mark('subset' if code in SUBSET_PROCESS else 'whole product','Within product facet only; full series definition and geography remain required.',activity=activity)
        if code=='R11':r['basisLabel']='Dry natural gas proved reserves at year end'
        if code=='R54':r['basisLabel']='Gas plant liquids content of proved gas reserves'
        return r
    return mark('pending','Unreviewed native process code.')

PRODUCT_RE=re.compile(r'(Associated-Dissolved Natural Gas|Nonassociated Natural Gas|Dry Natural Gas|Natural Gas Liquids Lease Condensate|Natural Gas Plant Liquids|Natural Gas Liquids|Natural Gas|Crude Oil \+ Lease Condensate|Crude Oil|Coalbed Methane|Shale)\b')
CHANGE_RE=re.compile(r'(?:Proved )?Reserves (?:Adjustments|(?:Revision )?Increases|(?:Revision )?Decreases|Acquisitions(?: Acquisitions)?|Divestitures|Extensions(?: and Discoveries)?|New Field Discoveries|New Reservoir(?: Discoveries)? in Old Fields)|New (?:Field Discoveries|Reservoir Discoveries in Old Fields)')
PROD_TAILS={'Production','Estimated Production from Reserves','Reserves Estimated Production','Reserves, Estimated Production','Reserves Based Production'}

def series(d):
    name=d['name'];m=PRODUCT_RE.search(name)
    if not m:return mark('pending','No reviewed product in full series definition.')
    label=m.group();tail=name[m.end():].strip(' ,')
    unit=re.search(r' \((Billion Cubic Feet|Million Barrels|Bcf)\)$',tail)
    if not unit:return mark('pending','Unreviewed unit/title ending.')
    tail=tail[:unit.start()].strip(' ,')
    tail=re.sub(r'^Wet After Lease Separation[, ]*','',tail)
    tail=re.sub(r', Wet$','',tail)
    if CHANGE_RE.fullmatch(tail):return mark('out of vocabulary','Reserve accounting change or ownership transfer, not a locked product activity.')
    if tail=='Expected Future Production' and label not in ['Dry Natural Gas','Natural Gas Plant Liquids']:
        return mark('pending','Expected future production needs explicit reserve-table correspondence.')
    if tail in ['Proved Reserves','Expected Future Production','Reserves in Nonproducing Reservoirs']:activity='reserves'
    elif tail in PROD_TAILS:activity='production'
    else:return mark('pending','Unreviewed full measure description: '+tail)
    liquids=label in ['Natural Gas Liquids Lease Condensate','Natural Gas Plant Liquids','Natural Gas Liquids']
    crude=label in ['Crude Oil','Crude Oil + Lease Condensate']
    component=label in ['Associated-Dissolved Natural Gas','Nonassociated Natural Gas','Coalbed Methane','Shale']
    nonproducing=tail=='Reserves in Nonproducing Reservoirs'
    status='subset' if liquids or crude or component or nonproducing else 'whole product'
    basis=label
    if label=='Natural Gas' and 'Wet After Lease Separation' in name:basis+='; wet after lease separation'
    basis+=' proved reserves at year end' if activity=='reserves' else '; production estimated from reserves survey'
    r=mark(status,'Full native series definition; availability and place scope remain unverified.',product='petroleum' if liquids or crude else 'natural gas',activity=activity,basisLabel=basis)
    if nonproducing:r['populationRestriction']='Nonproducing reservoirs only'
    if crude:r.update(qualifier='crude oil',qualifierClassification='subset' if nonproducing else 'whole product')
    return r

def build(node):
    route=node['route'];result=dict(route=route,sources=['natural-gas-reserves-source-review.json'],publicationStatus='unverified',dataColumns=[dict(id=k,sourceDefinition=v,classification='via full series definition',publicationStatus='unverified') for k,v in node['data'].items()],facets={},scope={'placeRequirement':'Use mapped whole US/state area only; districts, substate areas and federal-offshore components do not become states.','seriesRequirement':'Select a classified full series; independent product/process lists do not prove valid combinations.'})
    for fid,rows in i.inventory(route).items():
        if fid not in ['product','process','series']:continue
        classify={'product':product,'process':process,'series':series}[fid]
        result['facets'][fid]=[dict(sourceDefinition=r['definition'],frequencies=r['frequencies'],calls=r['calls'],**classify(r['definition'])) for r in rows]
    result['complete']=all(r['classification']!='pending' for rows in result['facets'].values() for r in rows)
    return result

def main():
    nodes=[n for n in i.read(i.EVIDENCE/'route-census.json')['nodes'] if n.get('classification')=='FITS' and n['route'].startswith('natural-gas/enr/')]
    out={'method':'Native definition correspondence, not application interpretation or accepted coverage.','routes':{n['route']:build(n) for n in nodes}}
    body=(json.dumps(out,separators=(',',':'))+'\n').encode()
    (i.EVIDENCE/'natural-gas-reserves-classification.json.gz').write_bytes(gzip.compress(body,mtime=0))
    from collections import Counter
    for route,r in out['routes'].items():print(route,r['complete'],dict(Counter(x['classification'] for x in r['facets']['series'])))
    pending=[(route,fid,r['sourceDefinition']) for route,d in out['routes'].items() for fid,rows in d['facets'].items() for r in rows if r['classification']=='pending']
    print('Pending:',json.dumps(pending[:20]),'count',len(pending))
if __name__=='__main__':main()
