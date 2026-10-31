"""Source correspondence for all eight coal FITS routes, not application query rules.
Expectations and established method recorded first in coal-source-review.json.
"""
import importlib.util,json
from pathlib import Path
spec=importlib.util.spec_from_file_location('inventory',Path(__file__).with_name('coverage-inventory.py'))
i=importlib.util.module_from_spec(spec);spec.loader.exec_module(i)

def mark(status,reason,**extra):return dict(classification=status,reason=reason,product='coal',publicationStatus='unverified',**extra)
def whole(reason,**extra):return mark('whole product',reason,**extra)
def subset(reason,**extra):return mark('subset',reason,**extra)
def out(reason):return mark('out of vocabulary',reason)
def pending(reason):return mark('pending',reason)

def facet(fid,d):
    code=d['id']
    if fid=='coalRankId':
        if code=='TOT':return whole('All coal ranks/types within route; other restrictions remain.')
        if code in ['SUB','BIT','LIG','ANT','MET','COK','STM','SYN','WC','REF']:return subset('One coal rank, type or processed component; no new qualifier authorized.')
    if fid=='mineTypeId':
        if code in ['TOT','ALL']:return whole('All mine types; does not remove producing-mine-only reserve restriction.')
        if code in ['UND','SUR','REF']:return subset('One mining method/type, not all coal.')
    if fid=='marketTypeId':
        if code=='TOT':return whole('Total captive and open-market sales.')
        if code in ['CAP','OM']:return subset('One sales market, not the total market.')
    if fid=='exportImportType' and code in ['Exports','Imports']:return whole('Gross U.S. trade direction; partner/district restrictions apply.',activity=code.lower())
    if fid=='sector':
        sector={'98':'electric power','8':'commercial','10':'industrial','9':'industrial','1':'electric power','2':'electric power','3':'electric power','94':'electric power'}.get(code)
        if sector:return subset('One consuming sector or sector component, not all coal use.',sector=sector,sectorCellClassification='whole product' if code in ['98','8'] else 'subset')
    return pending('Unreviewed source facet; no default acceptance.')

def column(route,key,d):
    leaf=route.split('/')[-1]
    if key in ['heat-content','sulfur-content','ash-content']:return out('Fuel quality/conversion measure, not a locked product activity.')
    if leaf=='aggregate-production':
        if key=='production':return whole('Coal mine output, with all-rank/all-mine filters.',activity='production',basisLabel='Coal mine production')
        if key in ['number-of-mines','labor-hours','average-employees','productivity']:return out('Mine/labor count or productivity ratio; not coal output, capacity or customers.')
    if leaf=='consumption-and-quality':
        activity={'consumption':'consumption','stocks':'storage','price':'prices'}.get(key)
        if activity:
            r=subset('Sector-specific coal measure; no all-sector facet total published in this inventory.',activity=activity,sectorCellClassification='via sector facet',basisLabel={'consumption':'Coal consumption','stocks':'Coal stocks held by consuming sector','price':'Average delivered coal price by consuming sector'}[key])
            if key=='price':
                r['sectorCellOverrides']={'electric power':'whole product'}
                r['sectorBasisLabels']={'electric power':'Average cost of coal delivered for electricity generation; EIA-923 reporting plants'}
                r['selectionConstraint']='Use broader EIA total for same product/activity/place/sector if published; verify before B1 selection.'
                r['scopeDecision']='standingScopeRule'
                r['populationRestriction']='EIA-923 receipt population: coal-primary plants of at least 50 MW; headline acceptance does not remove this label or broaden other facets.'
            return r
        if key=='receipts':return out('Receipts are not consumption, production, imports or sales.')
    if leaf=='exports-imports-quantity-price':
        restriction={'countryId':'TOT','customsDistrictId':'TOT'}
        if key=='quantity':return whole('Gross U.S. coal trade; direction facet defines imports or exports.',activities=['imports','exports'],activityFacet='exportImportType',subjectKind='US',subjectCode='USA',requiredTotalFacets=restriction)
        if key=='price':return whole('Unit value of U.S. coal imports or exports, not domestic retail price.',activity='prices',subjectKind='US',subjectCode='USA',requiredTotalFacets=restriction,basisLabel='Coal import/export unit value; preserve trade direction')
    if leaf=='market-sales-price':
        if key in ['sales','price']:return whole('Whole mine sales market only with marketTypeId=TOT.',activity='sales' if key=='sales' else 'prices',basisLabel='Coal mine sales' if key=='sales' else 'Average coal mine sales price')
    if leaf=='price-by-rank' and key=='price':return whole('Average mine sales price; all ranks required for whole coal.',activity='prices',basisLabel='Average coal mine sales price')
    if leaf=='reserves-capacity':
        if key=='productive-capacity':return whole('EIA total productive mine capacity; all mine types required.',activity='capacity',basisLabel='Coal mine productive capacity')
        if key=='recoverable-reserves':return subset('Recoverable reserves at producing mines exclude other recoverable coal reserves.',activity='reserves',basisLabel='Recoverable coal reserves at producing mines')
        if key=='producer-distributor-stocks':return subset('Producer/distributor holdings exclude consumer stocks.',activity='storage',basisLabel='Coal producer and distributor stocks')
    if '/shipments/' in route:
        if key=='quantity':return out('Shipments/receipts to electric-power facilities are neither total production nor consumption; no shipments activity.')
        if key=='price':
            destination=leaf=='plant-state-aggregates'
            return subset('Delivered price for coal shipped to reporting electric-power facilities, not all coal sales. Origin state is not the consumer state.',activity='prices',sector='electric power',sectorCellClassification='whole product' if destination else 'subset',basisLabel='Average cost of coal delivered for electricity generation; EIA-923 reporting plants; '+('destination plant state' if destination else 'origin mine state'),selectionConstraint='Use broader EIA total for same product/activity/place/sector if published; verify before B1 selection.',scopeDecision='standingScopeRule')
    return pending('Unreviewed coal data column.')

def build(node):
    route=node['route'];review=i.read(i.EVIDENCE/'coal-source-review.json');result={'route':route,'sources':['coal-source-review.json'],'publicationStatus':'unverified','dataColumns':[dict(id=k,sourceDefinition=d,**column(route,k,d)) for k,d in node['data'].items()],'facets':{},'scope':review['routeScope'].get(route,{})}
    for fid,rows in i.inventory(route).items():
        if fid not in ['coalRankId','mineTypeId','marketTypeId','exportImportType','sector']:continue
        result['facets'][fid]=[dict(sourceDefinition=r['definition'],frequencies=r['frequencies'],calls=r['calls'],**facet(fid,r['definition'])) for r in rows]
    records=result['dataColumns']+[r for rows in result['facets'].values() for r in rows]
    result['complete']=all(r['classification']!='pending' and not str(r.get('sectorCellClassification','')).startswith('pending') for r in records)
    return result

def main():
    nodes=[n for n in i.read(i.EVIDENCE/'route-census.json')['nodes'] if n.get('classification')=='FITS' and n['route'].startswith('coal/')]
    result={'method':'Definition correspondence; combine every facet and source restriction before B1 acceptance.','routes':{n['route']:build(n) for n in nodes}}
    i.write_review(i.EVIDENCE/'coal-classification.json',result)
    print(json.dumps({r:{'complete':x['complete'],'dataColumns':len(x['dataColumns']),'facetDefinitions':sum(len(y) for y in x['facets'].values())} for r,x in result['routes'].items()}))
if __name__=='__main__':main()
