"""Research correspondence for densified biomass and crude-import definitions.
Source expectations precede edits in biomass-crude-source-review.json. No app use.
"""
import importlib.util,json
from pathlib import Path
spec=importlib.util.spec_from_file_location('inventory',Path(__file__).with_name('coverage-inventory.py'))
i=importlib.util.module_from_spec(spec);spec.loader.exec_module(i)

def mark(status,reason,**extra):
    return dict(classification=status,reason=reason,publicationStatus='unverified',**extra)

def facet(route,fid,d):
    if fid=='gradeId' and route=='crude-oil-imports':
        grades={'HSW':'Heavy Sweet','MED':'Medium','HSO':'Heavy Sour','LSW':'Light Sweet','LSO':'Light Sour'}
        if grades.get(d.get('id'))==d.get('name'):
            return mark('subset','One crude grade; not all crude and never whole petroleum.',product='petroleum',qualifier='crude oil',qualifierClassification='subset')
    if fid=='fuelTypeId' and route.startswith('densified-biomass/'):
        feedstock={'SR':'Sawmill Residuals','OR':'Other Residuals','RP':'Roundwood/Pulpwood','WPMR':'Wood Product Manufacturing Residuals'}
        fuels={'WPPS':'Wood Pellets Premium Standard','WPU':'Wood Pellets Utility','CBL':'Compressed Bricks Log'}
        if route.endswith('/feedstocks-and-cost') and feedstock.get(d.get('id'))==d.get('name'):
            return mark('out of vocabulary','Manufacturing raw material input, not a finished fuel product/activity.')
        if route.endswith(('/production-by-region','/inventories-by-region')) and fuels.get(d.get('id'))==d.get('name'):
            return mark('subset','One densified wood-fuel component of biofuels; no new qualifier authorized.',product='biofuels')
    return mark('pending','Unreviewed source definition; no default acceptance.')

def column(route,key,d):
    if route=='crude-oil-imports' and key=='quantity' and d.get('units')=='thousand barrels':
        return mark('subset','Crude import quantity is a petroleum component; combine grade and place restrictions before qualification.',product='petroleum',activity='imports',qualifier='crude oil',qualifierClassification='whole product',basisLabel='Company-reported crude oil imports; excludes estimates included in aggregate imports',selectionConstraint='Prefer broader published EIA aggregate imports. Every advertised grade is only a crude component; no summation or unfiltered-total assumption.')
    leaf=route.split('/')[-1]
    if route.startswith('densified-biomass/'):
        if leaf=='feedstocks-and-cost' and key in ['quantity','cost']:
            return mark('out of vocabulary','Purchased manufacturing feedstocks or their input cost; not fuel production, energy consumption or a finished-fuel price.')
        if leaf=='capacity-by-region' and key in ['number-of-facilities','number-of-fte-employees']:
            return mark('out of vocabulary','Manufacturing facility/employee count, not energy-product customers or capacity.')
        measures={
            ('capacity-by-region','capacity'):('capacity','Densified biomass manufacturing capacity; excludes planned and small annually reporting facilities','tons'),
            ('sales-and-price-by-region','quantity'):('sales','Densified biomass domestic sales; retail and wholesale','tons'),
            ('sales-and-price-by-region','average-price'):('prices','Densified biomass domestic sales price; retail and wholesale','USD per ton'),
            ('export-sales-and-price','quantity'):('exports','Densified biomass U.S. export sales','tons'),
            ('export-sales-and-price','average-price'):('prices','Densified biomass export sales price','USD per ton'),
            ('production-by-region','production'):('production','Densified biomass production','tons'),
            ('inventories-by-region','inventory'):('storage','Densified biomass end-of-month inventories','tons')}
        definition=measures.get((leaf,key))
        if definition and d.get('units',d.get('unit'))==definition[2]:
            activity,label,_=definition
            r=mark('subset','Densified wood fuels are a component of biofuels, not a whole-product total.',product='biofuels',activity=activity,basisLabel=label)
            if activity=='capacity':r['unitNote']='API says tons; EIA published table defines annual capacity in tons per year. Retain original unit, do not silently convert.'
            return r
    return mark('pending','Unreviewed data column or unit.')

def build(node):
    route=node['route']
    scope=node.get('scopeEvidence',{})
    if route=='crude-oil-imports':
        scope={'subject':'U.S. imports','originRole':'Foreign trade partner; never subject-country imports','destinationRoles':{'RS':'Processing/refinery state','PS':'Port-of-entry state','US':'United States'},'restriction':'Preserve destinationType with destinationId. Do not equate port state with processing state. Apply place crosswalk and every grade restriction; no aggregate inferred.','source':'https://www.eia.gov/petroleum/imports/companylevel/cli_note.php'}
    result={'route':route,'sources':['biomass-crude-source-review.json'],'scope':scope,'publicationStatus':'unverified','dataColumns':[dict(id=k,sourceDefinition=d,**column(route,k,d)) for k,d in node['data'].items()],'facets':{}}
    for fid,rows in i.inventory(route).items():
        if fid not in ['fuelTypeId','gradeId']:continue
        result['facets'][fid]=[dict(sourceDefinition=r['definition'],frequencies=r['frequencies'],calls=r['calls'],**facet(route,fid,r['definition'])) for r in rows]
    result['complete']=all(r['classification']!='pending' for r in result['dataColumns']+[r for rows in result['facets'].values() for r in rows])
    return result

def main():
    nodes=[n for n in i.read(i.EVIDENCE/'route-census.json')['nodes'] if n.get('classification')=='FITS' and (n['route']=='crude-oil-imports' or n['route'].startswith('densified-biomass/'))]
    result={'method':'Source-definition correspondence; all facet and place restrictions must be combined. No publication claim.','routes':{n['route']:build(n) for n in nodes}}
    i.write_review(i.EVIDENCE/'biomass-crude-classification.json',result)
    print(json.dumps({r:{'complete':v['complete'],'columns':len(v['dataColumns']),'facetDefinitions':sum(len(x) for x in v['facets'].values())} for r,v in result['routes'].items()}))
if __name__=='__main__':main()
