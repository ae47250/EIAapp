"""Research-only correspondence for petroleum stocks, supplied quantities and sales.
Uses native definitions and published table hierarchies, never query-specific rules.
"""
import gzip,importlib.util,json,re
from pathlib import Path
spec=importlib.util.spec_from_file_location('inventory',Path(__file__).with_name('coverage-inventory.py'))
i=importlib.util.module_from_spec(spec);spec.loader.exec_module(i)
REVIEW=i.read(i.EVIDENCE/'petroleum-stock-cons-source-review.json');ROUTES=set(REVIEW['routes'])
PRODUCTS={x['id']:x for x in REVIEW['reviewedProducts']};PROCESSES={x['id']:x for x in REVIEW['reviewedProcesses']}
BROADER='Prefer broader compatible EIA total for same product/activity/place/sector; verify source population and period before B1 selection.'
STOCK_SCOPE='End-period primary stocks; excludes Northeast Heating Oil Reserve, Northeast Regional Refined Petroleum Product Reserve and New York Strategic Fuels Reserve; total crude/products excludes lease stocks from January 2005.'
def mark(status,reason,**extra):return dict(classification=status,reason=reason,publicationStatus='unverified',**extra)
def pending(reason):return mark('pending',reason)
def norm(s):return re.sub(r'[^a-z0-9]+',' ',s.lower()).strip()
def product(d,activity):
    code=d.get('id')
    if PRODUCTS.get(code)!=d:return pending('Unreviewed full product definition; no prefix fallback.')
    result=mark('subset','One component of petroleum and other liquids.',product='petroleum')
    if code=='EP00':result.update(classification='whole product',reason='Total crude oil and petroleum products; documented source basis.')
    elif code.startswith('EPOOR') or code=='EPOOXE':
        result.update(product='biofuels',reason='Liquid biofuel component unless full including-ethanol total and compatible activity.')
        if code=='EPOOR':result.update(classification='whole product',basisLabel='Liquid biofuels including fuel ethanol; EIA petroleum-supply basis')
    elif code=='EPC0':result.update(qualifier='crude oil',qualifierClassification='whole product')
    elif code.startswith(('EPM','EPOBG')):
        result.update(qualifier='gasoline',qualifierClassification='whole product' if code=='EPM0' or (code=='EPM0F' and activity=='consumption') else 'subset')
    return result

def process(d):
    code=d.get('id')
    if PROCESSES.get(code)!=d:return pending('Unreviewed full process definition.')
    if code.startswith('S'):
        return mark('whole product' if code in ['SAE','SAEL'] else 'subset','End-period stock total or one storage location/population component.',activity='storage',basisLabel=d['name'],selectionConstraint=BROADER)
    if code=='VPP':return mark('whole product','Product supplied approximates consumption; source accounting and product restrictions apply.',activity='consumption',basisLabel='Products supplied; EIA approximation of consumption',selectionConstraint=BROADER)
    if code=='P00':return mark('whole product','Prime supplier sales into local markets; not directly measured consumption.',activity='sales',basisLabel='Prime supplier sales for local consumption',selectionConstraint=BROADER)
    result=mark('subset','Sales channel, seller population or end-use component; never automatically consumption.',activity='sales',basisLabel=d['name'],selectionConstraint=BROADER)
    sector={'VCS':'commercial','VAC':'commercial','VRS':'residential','VAR':'residential','VIN':'industrial','VAI':'industrial','VEU':'electric power','VAE':'electric power','VTT':'transportation','VAT':'transportation'}.get(code)
    if sector:result.update(sector=sector,sectorCellClassification='whole product',sectorScope='EIA fuel-oil/kerosene sales survey end-use definition; verify historical allocation.')
    if code in ['VAA','VTE']:result.update(classification='whole product',reason='Total fuel-oil/kerosene sales, subject to product limits; adjusted and survey bases separate.')
    return result

# Source-name variants only, anchored as full phrases. These are metadata
# correspondences for legacy identifiers; not spelling repair or app aliases.
ALIASES={'EP00':['Total Crude Oil and Petroleum Products','Crude Oil and Petroleum Products'],
'EPP0':['Total Petroleum Products','Petroleum Products'],
'EPL0':['Hydrocarbon Gas Liquids'], 'EPD0':['Total Distillate'],
'EPM0R':['Reformulated Gasoline'], 'EPM0U':['Conventional Gasoline'],
'EPJN':['Jet Fuel Naphtha'], 'EPMM':['Midgrade'], 'EPD2F':['No. 2 Fuel Oil'], 'EPDOD':['Distillate Other'],
'EPOOR':['Biofuels (incl. Fuel Ethanol)'], 'EPOORXFE':['Biofuels (excluding Fuel Ethanol)'],
'EPOORO':['Other Biofuels'], 'EPOORD':['Biodiesel and Renewable Diesel Fuel'],
'EPOBG':['Motor Gasoline Blending Components'], 'EPLL':['Liquefied Petroleum Gases'],
'EPLLB0N':['Normal Butane-Butylene'], 'EPLLB0I':['Isobutane-Isobutylene'],
'EPOUK':['Kerosene and Light Gas Oils'], 'EPOO':['Other Hydrocarbons and Oxygenates'],
'EPOOOXH':['Other Hydrocarbons'], 'EPM0RA':['Reformulated Motor Gasoline Blended with Alcohol'],
'EPM0CA':['Conventional Motor Gasoline Blended with Alcohol']}
def named_product(name,source):
    text=' '+norm(name)+' ';matches=[]
    for code,d in source['product'].items():
        for alias in [d['name']]+ALIASES.get(code,[]):
            key=norm(alias)
            if ' '+key+' ' in text:matches.append((len(key),code))
    if not matches:return None
    length=max(x[0] for x in matches);codes={c for n,c in matches if n==length}
    return next(iter(codes)) if len(codes)==1 else None

def series(d,route,source):
    if route not in ROUTES:return pending('Unreviewed route.')
    if source['series'].get(d.get('id'))!=d:return pending('Unreviewed or changed source series definition.')
    name=d['name'];unit=re.search(r'\((Thousand (?:Barrels|Gallons)(?: per Day)?)\)\s*$',name)
    if not unit:
        if re.search(r'\([^()]*\)\s*$',name):return pending('Unreviewed physical unit; do not infer rate or period total.')
    body=(name[:unit.start()] if unit else name).strip();leaf=route.split('/')[-1]
    activity='storage' if '/stoc/' in route else 'consumption' if leaf in ['psup','wpsup'] else 'sales'
    modern=re.fullmatch(r'[^_]+_([^_]+)_([^_]+)_(.+)_([^_]+)',d['id'])
    if modern:
        pc,qc,place,uc=modern.groups()
        if pc not in source['product'] or qc not in source['process'] or place not in source['duoarea']:return pending('Native series does not join advertised product/process/place facets.')
        expected={'MBBL':'Thousand Barrels','MBBLD':'Thousand Barrels per Day','MGAL':'Thousand Gallons','MGALD':'Thousand Gallons per Day'}
        if uc not in expected or (unit and expected[uc]!=unit[1]):return pending('Native unit code conflicts with source unit.')
        q=process(source['process'][qc]);p=product(source['product'][pc],activity)
        if q.get('activity')!=activity:return pending('Route and native process activity conflict.')
        if pc in ['EP00','EPC0','EPM0','EPM0F','EPOOR'] and named_product(body,source)!=pc:return pending('Full series wording conflicts with native whole-product code.')
        join=dict(nativeProduct=pc,nativeProcess=qc,nativePlace=place)
    else:
        pc=named_product(body,source)
        if pc is None:return pending('Legacy full product wording has no unique reviewed correspondence.')
        p=product(source['product'][pc],activity)
        join={'matchedProduct':pc,'sourceJoin':'Legacy full definition; verify actual facet associations in B1 response.'}
        if activity=='storage':
            if 'Stocks' not in body:return pending('Stock route and full series wording conflict.')
            whole=bool(re.search(r'Ending Stocks of ',body)) and not re.search(r'\bin SPR\b|excluding|Excluding',body)
            q=mark('whole product' if whole else 'subset','Full definition distinguishes end-stock total from SPR/location components.',activity=activity,basisLabel=body)
        elif activity=='consumption':
            if 'Product Supplied of ' not in body:return pending('Supplied route and full series wording conflict.')
            q=process(source['process']['VPP'])
        elif leaf=='prim':
            if 'All Sales/Deliveries by Prime Supplier' not in body:return pending('Prime-supplier route and series wording conflict.')
            q=process(source['process']['P00'])
        elif leaf in ['refmg','refoth','refres']:
            if 'by Refiners' not in body:return pending('Refiner sales route and source population conflict.')
            q=mark('subset','Refiner/channel sales are narrower than prime-supplier market total.',activity=activity,basisLabel=body)
        elif leaf.startswith('821'):
            q=mark('subset','Fuel-oil/kerosene end-use sales; survey and adjusted bases remain separate.',activity=activity,basisLabel=body)
            for words,sector in [('Residential','residential'),('Commercial','commercial'),('Industrial','industrial'),('Electric','electric power'),('Transportation Total','transportation')]:
                if words in body:q.update(sector=sector,sectorCellClassification='whole product')
        else:return pending('Unreviewed legacy route family.')
    if 'pending' in [p['classification'],q['classification']]:return pending('Unreviewed source product/process.')
    result=mark('whole product' if p['classification']==q['classification']=='whole product' else 'subset','Combine full product and activity/population scope.',product=p['product'],activity=activity,basisLabel=body+'; '+q['basisLabel'],unit=unit[1] if unit else None,selectionConstraint=BROADER,**join)
    if not unit:result.update(coverageEligible=False,unitValidity='No source-title unit; observation-unit verification required')
    if p.get('qualifier'):result.update(qualifier=p['qualifier'],qualifierClassification='whole product' if p['qualifierClassification']==q['classification']=='whole product' else 'subset')
    if q.get('sector'):
        result.update(sector=q['sector'],sectorCellClassification='subset') # These routes have only petroleum components by sector.
    if activity=='storage':result['sourceScope']=STOCK_SCOPE
    if activity=='consumption':
        result['basisLabel']=body+'; products supplied, EIA approximation of consumption'
        if pc=='EPP0' and leaf=='wpsup':result.update(classification='whole product',reason='Published EIA weekly total products supplied headline; compare broader totals at requested frequency.')
        if pc=='EPC0':result.update(qualifierClassification='subset',reason='Direct crude fuel use on leases/pipelines excludes refinery input use; not all crude consumption.',basisLabel=body+'; crude burned on leases and by pipelines as fuel')
        if p['product']=='biofuels':result.update(classification='subset',reason='Products supplied excludes biofuel refinery/blender inputs included in broader MER consumption.',broaderCandidate='total-energy: liquid-biofuel total consumption including blending inputs')
    if activity=='sales':
        result['sourceScope']='Prime-supplier local-market sales' if leaf=='prim' else 'Refiner/gas-plant sales' if leaf in ['refmg','refoth','refres'] else ('Adjusted fuel-oil/kerosene end-use sales; allocations vary by period' if leaf.endswith('a') else 'Survey fuel-oil/kerosene end-use sales')
    return result

def build(node):
    route=node['route'];inv=i.inventory(route);activity='storage' if '/stoc/' in route else 'consumption' if route.endswith(('/psup','/wpsup')) else 'sales'
    source={fid:{x['definition']['id']:x['definition'] for x in inv[fid]} for fid in ['product','process','duoarea','series']}
    result={'route':route,'sources':['petroleum-stock-cons-source-review.json'],'scope':{'combine':'Full series, advertised facets and place crosswalk must agree; no observation coverage inferred.'},'dataColumns':[dict(id=k,sourceDefinition=v,classification='via full series definition',publicationStatus='unverified') for k,v in node['data'].items()],'facets':{}}
    for fid in ['product','process','series']:
        result['facets'][fid]=[dict(sourceDefinition=x['definition'],frequencies=x['frequencies'],calls=x['calls'],**(product(x['definition'],activity) if fid=='product' else process(x['definition']) if fid=='process' else series(x['definition'],route,source))) for x in inv[fid]]
    result['complete']=all(x['classification']!='pending' for rows in result['facets'].values() for x in rows)
    return result

def main():
    nodes=[n for n in i.read(i.EVIDENCE/'route-census.json')['nodes'] if n['route'] in ROUTES]
    result={'method':'Source correspondence only; publication and exact geography remain unverified.','routes':{n['route']:build(n) for n in nodes}}
    i.write_review(i.EVIDENCE/'petroleum-stock-cons-classification.json.gz',result)
    pendingrows=[{'route':route,'facet':fid,**x} for route,v in result['routes'].items() for fid,rows in v['facets'].items() for x in rows if x['classification']=='pending']
    Path('/private/tmp/eia-stock-cons-pending.json').write_text(json.dumps(pendingrows,indent=2)+'\n')
    print(json.dumps({'routes':len(nodes),'complete':sum(x['complete'] for x in result['routes'].values()),'pending':len(pendingrows),'examples':pendingrows[:4]}))
if __name__=='__main__':main()
