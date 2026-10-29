"""Draft route-specific place correspondence from checked EIA definitions.
Unresolved records prevent this research output being used as a finished crosswalk.
No app code imports this file and no API calls are made.
"""
import importlib.util,json,re
from pathlib import Path
spec=importlib.util.spec_from_file_location('inventory',Path(__file__).with_name('coverage-inventory.py'))
i=importlib.util.module_from_spec(spec);spec.loader.exec_module(i)
PLACE_FACETS={'duoarea','countryRegionId','stateId','stateid','stateID','location','stateRegionId','region','mineStateId','plantStateId','state','originId','destinationId','countryId','customsDistrictId'}
def norm(value):return re.sub(r'\s+',' ',str(value or '').strip()).casefold()
def classify(route,fid,value,geos,approved):
    code=str(value['id']);name=norm(value.get('name'))
    if (route=='coal/exports-imports-quantity-price' and fid in ['countryId','customsDistrictId']) or (route=='crude-oil-imports' and fid=='originId'):
        return {'status':'not a place we use','reason':'Trade partner or customs district filter, not requested-country/state scope. National subject scope is recorded separately.'}
    if route=='natural-gas/stor/wkly':
        return {'status':'not a place we use','reason':'Region or Lower 48, not a whole US/state/country/World cell. Existing legacy row is preserved separately.'}
    if route=='crude-oil-imports' and fid=='destinationId':
        kind,_,state=code.partition('_')
        if kind in ['RF','PT','RP','PP']:
            return {'status':'not a place we use','reason':'EIA destination type identifies refinery, port or PADD, not a whole state/country. Type definitions are in the same route facet inventory.'}
        if kind in ['RS','PS'] and state in geos and name==norm(geos[state]['name']):
            return {'status':'mapped','geographyCode':state,'basis':'Exact state name plus EIA Refinery State/Port State destination type. Keep these bases separate.','requiredFilters':{'destinationType':[kind]}}
    # Exact name correspondence is safe for separately coded territories, but only
    # on a direct-place facet, never a trade-partner or duoarea facet.
    if fid!='duoarea':
        matches=[g for g in geos.values() if norm(g['name'])==name]
        if len(matches)==1:
            target=matches[0]['code']
            return {'status':'mapped','geographyCode':target,'basis':'Unique exact approved place name in a direct EIA geography facet. Alternate codes remain separate candidate filters; observations must confirm coverage.','alternateCode':route=='international' and code.startswith('WP')}
    reverse={str(v):k for k,v in approved.get(route,{}).get('geographies',{}).items()}
    if fid==approved.get(route,{}).get('geographyFacet') and code in reverse:
        target=reverse[code]
        if target in geos:
            return {'status':'mapped','geographyCode':target,'basis':'Previously approved route-specific mapping, with code re-confirmed in current EIA facet inventory.'}
    if fid=='duoarea':
        if code in ['NUS','NUS-Z00','NUS-Z0S'] and name in ['u.s.','united states']:
            return {'status':'mapped','geographyCode':'USA','basis':'Explicit U.S. facet name; series-specific partner/product restrictions still apply.'}
        match=re.fullmatch(r'S([A-Z]{2})(?:-Z00|-Z0S)?',code)
        if match and match[1] in geos and geos[match[1]]['type']=='state':
            target=match[1]
            if name in [norm(geos[target]['name']),norm('USA-'+target)]:
                return {'status':'mapped','geographyCode':target,'basis':'EIA facet name matches the approved state, including EIA USA-state notation. The complete EIA code is retained; Z00/Z0S partner scope must also pass series validation.'}
        if code.startswith('R'):
            return {'status':'not a place we use','reason':'Regional/PADD/offshore scope or regional bilateral flow; never a whole state/country/US.'}
        if code.startswith('Y'):
            return {'status':'not a place we use','reason':'Local terminal, port, city or entry/exit point; not a whole state/country.'}
        if '-' in code and code not in ['NUS-Z00'] and not code.endswith(('-Z00','-Z0S')):
            return {'status':'not a place we use','reason':'Bilateral partner or transport-mode flow; not an unrestricted whole-place measure. Preserve the original code/name for series review.'}
    else:
        target='USA' if code in ['US','USA'] else 'WLD' if code=='WORL' else code
        if target in geos and name==norm(geos[target]['name']):
            return {'status':'mapped','geographyCode':target,'basis':'Exact approved geography code and EIA place name.'}
        if target=='USA' and name in ['u.s. total','united states']:
            return {'status':'mapped','geographyCode':'USA','basis':'Explicit U.S. total facet name.'}
        if fid=='region' and code=='US-TOTAL':
            return {'status':'mapped','geographyCode':'USA','basis':'US-TOTAL facet plus route-specific EIA U.S. scope documentation in census.'}
        if fid=='region' and code in ['EAST','WEST','SOUTH']:
            return {'status':'not a place we use','reason':'Multi-state region, not a whole US/state/country/World cell.'}
    if fid!='duoarea' and route.startswith(('coal/','electricity/')):
        # These codes were reviewed in the all-frequency facet inventory. Values
        # bearing state-product qualifiers remain components, never state totals.
        regional={'90','ENC','ESC','MAT','MTN','NEW','PACC','PACN','PAC','PCC','PCN','SAT','WNC','WSC','APC','APN','APP','APS','EMR','EST','ILL','INO','INT','KYE','KYW','MID','PAA','PAB','PRB','STH','UNT','WBO','WMR','WSB','WST','WVN','WVS','OVR'}
        if code in regional:
            return {'status':'not a place we use','reason':'Reviewed EIA region, basin, state subregion, overseas aggregate or state/product component; not a whole requested place.'}
    if route=='international' and (code in {'AFRC','ASOC','CSAM','DEUO','EU27','EURA','EURO','GBRO','MIDE','NLDO','NOAM','NOEC','OEAO','OECD','OEEU','OENA','OPAF','OPEC','OPNO','OPSA','PERG'} or code.startswith('WP')):
        return {'status':'not a place we use','reason':'Region, offshore load-only code or multi-country WP group. Single-country labels were matched separately and remain candidate filters.'}
    return {'status':'unresolved','reason':'Needs route-specific evidence; no fuzzy or prefix-only geography mapping.'}
def build():
    geos={g['code']:g for g in i.read(i.ROOT/'data/eia/routing-metadata.json')['geographies'] if '+' not in g['code']}
    approved=i.read(i.ROOT/'data/eia/lookup-list.json')['routes']
    resolutions=i.read(i.EVIDENCE/'place-scope-resolutions.json')
    result={'complete':False,'policy':'Definitions from every advertised frequency; unresolved entries block completion. Mapping a place does not validate a series or a whole-product cell.','routes':{}}
    for node in i.read(i.EVIDENCE/'route-census.json')['nodes']:
        if node.get('classification')!='FITS':continue
        route=node['route'];facets=i.inventory(route);entry={'facets':{}}
        if node.get('scopeEvidence'):entry['scopeEvidence']=node['scopeEvidence']
        for fid,rows in facets.items():
            if fid not in PLACE_FACETS:continue
            records=[]
            for r in rows:
                decision=classify(route,fid,r['definition'],geos,approved)
                if decision['status']=='unresolved' and fid=='duoarea':
                    code=str(r['definition']['id']);name=str(r['definition'].get('name',''))
                    state=re.fullmatch(r'S([A-Z]{2})-(?:Z00|Z0S)',code)
                    target=state[1] if state else name if name in geos else None
                    if target in geos:
                        matching=[x for x in facets['series'] if '_'+code+'_' in x['definition']['id'] and norm(geos[target]['name']) in norm(x['definition'].get('name'))]
                        if matching:
                            proof=matching[0]
                            decision={'status':'mapped','geographyCode':target,'basis':'Exact duoarea token in EIA series identifier plus approved place name in that same series title.','seriesEvidence':proof}
                if decision['status']=='unresolved':
                    matches=[v for v in resolutions if v['route']==route and v['facet']==fid and v['definition']==r['definition']]
                    if len(matches)>1:raise ValueError('Conflicting place evidence')
                    if matches:
                        resolution=matches[0]
                        decision={'status':'mapped','geographyCode':resolution['geographyCode'],'basis':resolution['basis'],'resolutionEvidence':resolution}
                        if resolution.get('requiredFilters'):decision['requiredFilters']=resolution['requiredFilters']
                records.append(dict(r,**decision))
            entry['facets'][fid]=records
        result['routes'][route]=entry
    result['complete']=not any(r['status']=='unresolved' for entry in result['routes'].values() for rows in entry['facets'].values() for r in rows)
    return result
if __name__=='__main__':
    result=build()
    path=i.EVIDENCE/'place-crosswalk.json';path.write_text(json.dumps(result,indent=2)+'\n')
    from collections import Counter
    counts=Counter(r['status'] for x in result['routes'].values() for rows in x['facets'].values() for r in rows)
    print(json.dumps({'routes':len(result['routes']),'counts':counts,'bytes':path.stat().st_size}))
