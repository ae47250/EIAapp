"""Source correspondence for petroleum price routes, including duplicated move routes.
No application query rules. Expectations: petroleum-price-source-review.json.
"""
import gzip,importlib.util,json,re
from pathlib import Path
spec=importlib.util.spec_from_file_location('inventory',Path(__file__).with_name('coverage-inventory.py'))
i=importlib.util.module_from_spec(spec);spec.loader.exec_module(i)
REVIEW=i.read(i.EVIDENCE/'petroleum-price-source-review.json')
ROUTES=set(REVIEW['routes'])
PRODUCTS={r['id']:r for r in REVIEW['reviewedProducts']}
PROCESSES={r['id']:r for r in REVIEW['reviewedProcesses']}
BROADER='Prefer a broader published EIA total for the same product, activity, place, sector and transaction basis; verify before B1 selection.'
def mark(status,reason,**extra):return dict(classification=status,reason=reason,publicationStatus='unverified',**extra)
def pending(reason):return mark('pending',reason)

def product(d):
    code=d.get('id')
    if PRODUCTS.get(code)!=d:return pending('Product definition not reviewed; no name or prefix fallback.')
    r=mark('subset','Petroleum component, never whole petroleum.',product='petroleum')
    if code.startswith('EPC'):r.update(qualifier='crude oil',qualifierClassification='whole product' if code=='EPC0' else 'subset')
    if code.startswith('EPM'):r.update(qualifier='gasoline',qualifierClassification='whole product' if code=='EPM0' else 'subset')
    return r

def process(d):
    code=d.get('id')
    if PROCESSES.get(code)!=d:return pending('Process definition not reviewed; no default acceptance.')
    totals={'PTE':'Retail pump price; including taxes','PTA':'Sales to end users by all sellers; excluding taxes','PWA':'Wholesale/resale price by all sellers; excluding taxes','PWR':'Wholesale/resale price','FWA':'Domestic crude oil first purchase price at lease/wellhead','PCT':'Composite refiner acquisition cost of domestic and imported crude oil','INF':'FOB cost of imported crude oil','INL':'Landed cost of imported crude oil'}
    if code in totals:return mark('whole product','Whole named transaction basis, subject to product, geography and source-population checks.',activity='prices',basisLabel=totals[code],selectionConstraint=BROADER)
    sector={'PRS':'residential','PRT':'residential','PCS':'commercial','PIN':'industrial'}.get(code)
    if sector:return mark('subset','One purchaser sector, not all sectors.',activity='prices',sector=sector,sectorCellClassification='whole product',basisLabel=d['name'],selectionConstraint=BROADER)
    components={'PBR','PBS','PDR','PDS','POR','POA','PPL','PRA','PRG','PTC','PTG','PTR','PWG','PDT','PFT'}
    if code in components:
        r=mark('subset','One seller/channel/origin component; broader market or composite exists as a candidate.',activity='prices',basisLabel=d['name'],selectionConstraint=BROADER)
        if code=='PPL':r.update(sector='industrial',sectorCellClassification='subset')
        return r
    return pending('Reviewed process still lacks semantic correspondence.')

def series(d,route,source):
    if route not in ROUTES:return pending('Unreviewed route.')
    name=d['name'];low=name.lower();unit=re.search(r'\(([^()]*)\)\s*$',name)
    if not unit or unit[1] not in ['Dollars per Gallon','Dollars per Barrel']:return pending('Unreviewed price unit; no quantity/price substitution.')
    if re.search(r'\bspot\b|futures',low):return mark('out of vocabulary','Spot/trading-hub and futures price measures excluded by owner.')
    r=mark('subset','Petroleum component; combine product, market, geography and source scope.',product='petroleum',activity='prices',basisLabel=name,unit=unit[1],selectionConstraint=BROADER)
    modern=re.fullmatch(r'[^_]+_([^_]+)_([^_]+)_(.+)_([^_]+)',d['id'])
    if modern:
        p=source['product'].get(modern[1]);q=source['process'].get(modern[2]);place=source['duoarea'].get(modern[3])
        if not p or not q or not place:return pending('Native series identifiers do not join advertised product/process/place definitions.')
        pd=product(p);qd=process(q)
        if 'pending' in [pd['classification'],qd['classification']]:return pending('Unreviewed native product/process definition.')
        if qd.get('activity')!='prices':return pending('Process does not establish a price.')
        if modern[4] not in {'DPG','DPB'} or (modern[4]=='DPG')!=(unit[1]=='Dollars per Gallon'):return pending('Native unit code and full series unit disagree.')
        r.update(nativeProduct=modern[1],nativeProcess=modern[2],nativePlace=modern[3],basisLabel=name+'; '+qd['basisLabel'])
        if pd.get('qualifier'):
            r['qualifier']=pd['qualifier']
            if pd['qualifier']=='gasoline' and ('gasoline' not in low or (modern[1]=='EPM0' and re.search(r'\bregular\b|\bpremium\b|\bmidgrade\b|reformulated|conventional|oxygenated|aviation',low))):return pending('Full series product wording conflicts with native total gasoline code.')
            r['qualifierClassification']='whole product' if pd['qualifierClassification']=='whole product' and qd['classification']=='whole product' else 'subset'
        if qd.get('sector'):
            r['sector']=qd['sector'];r['sectorCellClassification']='subset' # Every price product here is a petroleum component.
            if r.get('qualifier'):
                r['qualifierSectorCellClassification']='whole product' if pd['qualifierClassification']=='whole product' and qd['sectorCellClassification']=='whole product' else 'subset'
                r.pop('qualifierClassification',None)
        r['marketClassification']=qd['classification']
        if route=='petroleum/pri/gnd':r['frequencyBasis']='EIA publishes monthly and annual averages from weekly observations; fetch requested frequency, do not recompute.'
        return r
    # Legacy identifiers do not encode separate facets; use documented route
    # families and full series wording, never a guessed identifier parse.
    leaf=route.split('/')[-1]
    r.update(qualifier='crude oil',qualifierClassification='subset',sourceJoin='Legacy series: full definition and route; B1 response must verify actual facet association.')
    if leaf.startswith(('imc','land')):
        phrase='FOB' if leaf.startswith('imc') else 'Landed'
        if not name.startswith('U.S. '+phrase+' Costs of ') or not ('Crude Oil' in name or 'Crude with API Gravity' in name):return pending('Unreviewed import-cost definition.')
        r.update(subjectKind='US',subjectCode='USA',placeRole='U.S. importing subject; foreign origin is a partner, not requested-country market price.',basisLabel=name+'; '+('FOB acquisition basis' if phrase=='FOB' else 'Landed acquisition basis; excludes discharge-port fees'),geographicScope='EIA import survey U.S. includes territories and possessions.')
        if leaf.endswith('1') and name=='U.S. '+phrase+' Costs of Crude Oil (Dollars per Barrel)':r['qualifierClassification']='whole product'
        else:r['scopeRestriction']='One foreign origin, crude stream or API-gravity band.'
        return r
    if leaf in ['dfp1','dfp2','dfp3']:
        if not re.search(r'First Purchase Prices? \(',name) and not ('First Purchase Prices with API Gravity' in name):return pending('Unreviewed first-purchase definition.')
        r['basisLabel']=name+'; domestic first purchase at lease/wellhead'
        r['placeRole']='Producing origin; not refinery destination'
        r['geographicScope']='EIA domestic survey U.S. includes outer continental shelf and DC.'
        if leaf=='dfp1' and 'Crude Oil First Purchase Price' in name and not re.search(r'\bless\b|\bother\b|north slope|offshore',low):r['qualifierClassification']='whole product'
        else:r['scopeRestriction']='Crude stream, API-gravity band or partial geography; never whole requested place/product.'
        return r
    if leaf=='rac2':
        match=re.search(r'Crude Oil (Composite|Domestic|Imported) Acquisition Cost by Refiners',name)
        if not match:return pending('Unreviewed refiner acquisition definition.')
        r['basisLabel']=name+'; refiner acquisition cost'
        r['qualifierClassification']='whole product' if match[1]=='Composite' else 'subset'
        r['placeRole']='Intended refinery destination'
        r['geographicScope']='EIA refinery acquisition U.S. includes territories and possessions.'
        return r
    return pending('Unreviewed legacy series definition.')

def build(node):
    route=node['route'];inv=i.inventory(route)
    source={fid:{r['definition']['id']:r['definition'] for r in inv[fid]} for fid in ['product','process','duoarea']}
    result={'route':route,'sources':['petroleum-price-source-review.json'],'scope':{'combine':'Full series, product/process facets and place crosswalk must all agree. Do not infer publication from facet combinations.','qualifierOnly':'Crude oil/gasoline are explicitly requested components; never whole petroleum.'},'publicationStatus':'unverified','dataColumns':[dict(id=k,sourceDefinition=v,classification='via full series definition',publicationStatus='unverified') for k,v in node['data'].items()],'facets':{}}
    for fid in ['product','process','series']:
        rows=[]
        for x in inv[fid]:
            d=x['definition'];a=product(d) if fid=='product' else process(d) if fid=='process' else series(d,route,source)
            rows.append(dict(sourceDefinition=d,frequencies=x['frequencies'],calls=x['calls'],**a))
        result['facets'][fid]=rows
    result['complete']=all(r['classification']!='pending' for rows in result['facets'].values() for r in rows)
    return result

def main():
    nodes=[n for n in i.read(i.EVIDENCE/'route-census.json')['nodes'] if n['route'] in ROUTES and n.get('classification')=='FITS']
    result={'method':'Reviewed native definitions, not a coverage claim.','routes':{n['route']:build(n) for n in nodes}}
    (i.EVIDENCE/'petroleum-price-classification.json.gz').write_bytes(gzip.compress((json.dumps(result,separators=(',',':'))+'\n').encode(),mtime=0))
    pendingrows=[{'route':route,'facet':fid,**r} for route,v in result['routes'].items() for fid,rows in v['facets'].items() for r in rows if r['classification']=='pending']
    Path('/private/tmp/eia-petroleum-price-pending.json').write_text(json.dumps(pendingrows,indent=2)+'\n')
    print(json.dumps({'routes':len(nodes),'complete':sum(r['complete'] for r in result['routes'].values()),'pending':len(pendingrows),'examples':pendingrows[:3]}))
if __name__=='__main__':main()
