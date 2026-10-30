"""Research wrapper for native reserve definitions and crude field-production routes."""
import gzip,importlib.util,json,re
from pathlib import Path
spec=importlib.util.spec_from_file_location('reserve',Path(__file__).with_name('coverage-gas-reserves-classification.py'))
r=importlib.util.module_from_spec(spec);spec.loader.exec_module(r)
i=r.i
REVIEW=i.read(i.EVIDENCE/'petroleum-crude-source-review.json');ROUTES=set(REVIEW['routes'])
PRODUCTS={d['id']:d for d in REVIEW['reviewedProductionProducts']}
def product(d):
    code=d.get('id')
    if PRODUCTS.get(code)!=d:return r.mark('pending','Unreviewed source product definition.')
    return r.mark('subset','Crude oil is a petroleum component; individual grades/streams further narrow crude.',product='petroleum',qualifier='crude oil',qualifierClassification='whole product' if code in ['EPC0','EPC99A'] else 'subset')
def field_series(d,route,source):
    name=d['name'];unit=re.search(r'\((Thousand Barrels(?: per Day)?)\)\s*$',name)
    result=r.mark('subset','Crude production is not whole petroleum.',product='petroleum',activity='production',qualifier='crude oil',qualifierClassification='subset',basisLabel=name,unit=unit[1] if unit else None,unitValidity='valid source title' if unit else 'invalid title ending; observation-unit verification required',selectionConstraint='Prefer broader compatible EIA total; verify exact source basis and place before B1 selection.')
    if route.endswith('/api'):
        m=re.fullmatch(r'M_([^_]+)_FPF_([^_]+)_MBBLD',d['id'])
        if not m or m[1] not in source['product'] or m[2] not in source['duoarea']:return r.mark('pending','Native production identifier does not join source product/place.')
        p=product(source['product'][m[1]])
        if p['classification']=='pending':return p
        if 'Crude Oil and Lease Condensate Production for ' not in name:return r.mark('pending','Full production definition conflicts with native route.')
        whole=m[1]=='EPC99A'
        if whole!=('for all API Gravity' in name):return r.mark('pending','Native gravity total conflicts with full series wording.')
        result.update(nativeProduct=m[1],nativeProcess='FPF',nativePlace=m[2],qualifierClassification=p['qualifierClassification'],basisLabel=name+'; crude oil and lease condensate combined')
    elif route.endswith('/crpdn'):
        if 'Field Production of Crude Oil' not in name and 'Crude Oil Production' not in name:return r.mark('pending','Unreviewed full field-production definition.')
        result['qualifierClassification']='subset' if 'North Slope' in name else 'whole product'
        result['basisLabel']=name+'; EIA crude field-production estimates'
    else:return r.mark('pending','Unreviewed field-production route.')
    if not unit:result['coverageEligible']=False
    if unit and route.endswith('/api') and unit[1]!='Thousand Barrels per Day':return r.mark('pending','Gravity-route native rate and source unit disagree.')
    return result

def build(node):
    route=node['route']
    if route not in ROUTES:raise ValueError('Unreviewed crude route')
    if route.split('/')[-1] in ['pres','cplc','nprod']:
        result=r.build(node);result['sources'].append('petroleum-crude-source-review.json')
        for row in result['facets']['series']:
            if row.get('activity')=='production':row['selectionConstraint']='Reserve-survey estimate; prefer compatible official EIA field-production total where published, retain both bases and labels.'
        return result
    inv=i.inventory(route);source={fid:{x['definition']['id']:x['definition'] for x in inv[fid]} for fid in ['product','duoarea']}
    result={'route':route,'sources':['petroleum-crude-source-review.json'],'scope':{'placeRequirement':'Crosswalk required: substate, offshore, Lower 48 and Other States are not whole requested states/US.','seriesRequirement':'Preserve rate versus period-total units; no inferred summation.'},'dataColumns':[dict(id=k,sourceDefinition=v,classification='via full series definition',publicationStatus='unverified') for k,v in node['data'].items()],'facets':{}}
    for fid in ['product','process','series']:
        rows=[]
        for x in inv[fid]:
            d=x['definition']
            if fid=='product':a=product(d)
            elif fid=='process':a=r.mark('whole product','Field production; product/place restrictions still apply.',activity='production') if d=={'id':'FPF','name':'Field Production'} else r.mark('pending','Unreviewed process definition.')
            else:a=field_series(d,route,source)
            rows.append(dict(sourceDefinition=d,frequencies=x['frequencies'],calls=x['calls'],**a))
        result['facets'][fid]=rows
    result['complete']=all(x['classification']!='pending' for rows in result['facets'].values() for x in rows)
    return result

def main():
    nodes=[n for n in i.read(i.EVIDENCE/'route-census.json')['nodes'] if n['route'] in ROUTES]
    result={'method':'Definition correspondence only; no publication claim.','routes':{n['route']:build(n) for n in nodes}}
    i.write_review(i.EVIDENCE/'petroleum-crude-classification.json.gz',result)
    pending=[{'route':route,**x} for route,v in result['routes'].items() for rows in v['facets'].values() for x in rows if x['classification']=='pending']
    print(json.dumps({'routes':len(nodes),'complete':sum(x['complete'] for x in result['routes'].values()),'pending':pending[:10],'pendingCount':len(pending)}))
if __name__=='__main__':main()
