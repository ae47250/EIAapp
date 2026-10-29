"""EIA electricity definition correspondence; research only, never app query rules.
UNSD/SKOS method and source-based expectations: electricity-source-review.json.
Definitions and combinations remain separate from verified publication in B1.
"""
import importlib.util,json
from pathlib import Path
spec=importlib.util.spec_from_file_location('inventory',Path(__file__).with_name('coverage-inventory.py'))
i=importlib.util.module_from_spec(spec);spec.loader.exec_module(i)
OPS='electricity/electric-power-operational-data'
RETAIL='electricity/retail-sales'
PREFIX='electricity/state-electricity-profiles/'
SOURCES=['electricity-source-review.json','generation-scope-review.json']

def decision(status,reason,**extra):
    return dict(classification=status,reason=reason,publicationStatus='unverified',**extra)
def whole(reason,**extra):return decision('whole product',reason,**extra)
def subset(reason,**extra):return decision('subset',reason,**extra)
def outside(reason):return decision('out of vocabulary',reason)
def pending(reason,**extra):return decision('pending',reason,**extra)

def fuel(code):
    totals={'COW':'coal','PET':'petroleum','REN':'renewable','WND':'wind','NUC':'nuclear','BIO':'biofuels','SUN':'solar','TSN':'solar','NG':'natural gas','GEO':'geothermal','HYC':'hydro','FOS':'fossil fuels'}
    parts={'coal':'RC LIG BIT ANT SUB WOC BIS COL','solar':'SPV STH TPV DPV','biofuels':'WAS LFG MLG WWW MSB','renewable':'AOR ORW','wind':'WNT WNS','petroleum':'PC PEL RFO WOO DFO','fossil fuels':'NGO OOG','electricity':'HPS','total energy':'OTH'}
    if code=='ALL':return whole('All electricity output; all-fuel input belongs to total energy, not electricity.',product='electricity',inputProduct='total energy')
    if code in ['OB2','OBW']:return pending('API biomass label does not distinguish this code from the documented BIO total. Source component definition unresolved.',product='biofuels')
    if code in totals:
        r=whole('EIA named total; preserve its documented basis.',product=totals[code])
        if code=='TSN':r.update(generationScope='all sizes',selectionPreference='Prefer compatible all-size total over utility-scale-only total.')
        if code=='BIO':r['basisLabel']='Biomass: wood and other biomass'
        if code=='HYC':r['basisLabel']='Conventional hydroelectric generation; excludes pumped-storage generation'
        return r
    for product,codes in parts.items():
        if code in codes.split():
            r=subset('Fuel, technology or storage component narrower than '+product+'.',product=product)
            if code=='AOR':r['basisLabel']='Other renewables; excludes hydroelectric'
            if code in ['TPV','DPV','SPV','STH']:r['generationScope']={'TPV':'all sizes','DPV':'small-scale only','SPV':'utility-scale','STH':'utility-scale'}[code]
            if code=='COL':r['storageBasisReview']='Browser publishes COL as headline coal stock total excluding waste coal; verify stock-table definition before whole-product acceptance.'
            return r
    return pending('Unreviewed electricity fuel code; no label fallback.')

def facet(route,fid,d):
    code=d['id']
    if fid=='fueltypeid':return fuel(code)
    if fid=='energysourceid':
        totals={'ALL':'electricity','NG':'natural gas','PET':'petroleum','NUC':'nuclear','GEO':'geothermal','WND':'wind','HYC':'hydro','COL':'coal','SOL':'solar'}
        if code in totals:return whole('Named fuel total within this route; facility-size and producer restrictions still apply.',product=totals[code])
        groups={'natural gas':'NGCC NGIC NGGT NGST NGOTH','petroleum':'PETIC PETOTH PETGT PETST','solar':'SOLPV SOLTH','biofuels':'WOO OBM','fossil fuels':'OOG','electricity':'HPS BAT','total energy':'OT'}
        for product,codes in groups.items():
            if code in codes.split():return subset('Named technology or fuel component.',product=product)
    if fid=='technology':
        products={'Wind':'wind','Photovoltaic':'solar','All Technologies':'electricity','Other Technologies':'electricity'}
        if code in products:return subset('Net-metered installations only; PV also excludes solar thermal.',product=products[code])
    if fid=='producertypeid':
        if code=='TOT':return whole('All producer types within route; utility-scale capacity restriction remains.')
        if code in ['EU','IPP']:return subset('One producer class, not all producers or the entire electric-power sector.')
    if fid in ['sector','sectorid']:
        if code in ['TOT','ALL','99']:return whole('All sectors within route; this does not broaden a restricted measure.')
        sector={'RES':'residential','COM':'commercial','IND':'industrial','TRA':'transportation','TRN':'transportation','8':'residential','96':'commercial','97':'industrial','98':'electric power'}.get(code)
        if sector:return subset('One sector within the all-sector total.',sector=sector,sectorCellClassification='whole product')
        component={'1':'electric power','94':'electric power','2':'electric power','3':'electric power','90':'electric power','4':'commercial','5':'commercial','6':'industrial','7':'industrial'}.get(code)
        if component:return subset('Ownership or CHP component is not a whole sector.',sector=component,sectorCellClassification='subset')
        if code=='OTH':return subset('Legacy other customers is not one of the locked sectors.')
        if code=='95':return pending('Sector value labelled Coal Consumption does not identify a locked sector; verify source definition.')
    return pending('Unreviewed facet definition; preserve unresolved.')

def column(route,key,d):
    if route==RETAIL:
        mapping={'sales':('sales',['sales','consumption']),'revenue':('expenditures',['expenditures']),'price':('prices',['prices']),'customers':('customers',['customers'])}
        if key in mapping:
            activity,activities=mapping[key]
            return whole('Whole electricity retail market; sector facet may narrow it.',product='electricity',activity=activity,activities=activities,basisLabel=('Retail sales; excludes electricity generated and used on-site' if key=='sales' else d['alias']))
    if route==OPS:
        if key=='generation':return whole('Fuel and sector facets determine product scope; utility-scale accepted only under owner fallback rule.',activity='generation',generationScope='utility-scale unless explicit all-size or small-scale fuel code',selectionConstraint='Prefer EIA compatible all-size total. Label utility-scale and published omitted small-scale estimate.')
        if key.startswith('consumption') or key.startswith('total-consumption'):
            r=subset('Generating-facility fuel use is not total economy or whole industrial/commercial fuel consumption.',activity='consumption')
            if key.startswith('total-consumption'):r['sectorCandidate']='electric power: total generation plus useful thermal output, subject to facility-scope verification'
            return r
        if key=='stocks':return subset('Fuel held by generating facilities, not all product stockholders.',activity='storage',sectorCandidate='electric power, subject to full stock definition and fuel-scope verification')
        if key in ['cost','cost-per-btu']:return subset('Delivered fuel cost at generating facilities, not all product purchases.',activity='prices',sectorCandidate='electric power, subject to population verification')
        if key in ['receipts','receipts-btu']:return outside('Receipts at plants are not production, imports, sales or consumption; no receipts activity in locked vocabulary.')
        if key in ['sulfur-content','ash-content','heat-content']:return outside('Fuel composition or conversion factor, not a locked quantity/activity.')
    if route==PREFIX+'net-metering':
        if key in ['capacity','customers']:return subset('Net-metered systems only, not the whole capacity/customer population.',activity=key)
    if route==PREFIX+'capability' and key=='capability':return subset('EIA-860 utility-scale capacity excludes smaller facilities. Owner facility-size exception is generation-only.',activity='capacity',basisLabel='Net summer capacity; utility-scale (1 MW and larger)')
    if route==PREFIX+'summary':
        if key.endswith('-rank') or '-rank-' in key or d.get('units')=='rank':return outside('Rank is not the requested level of a product/activity.')
        if key.startswith(('sulfer-','nitrogen-','carbon-')) or key=='prime-source':return outside('Emission measure or primary-source category is outside the locked activities.')
        if key=='net-generation':return whole('All-sector utility-scale generation, subject to owner all-size preference.',product='electricity',activity='generation',generationScope='utility-scale')
        if key in ['generation-elect-utils','generation-ipp']:return subset('Electric utilities or IPP/CHP ownership group, not the full electric-power sector. Published Table 1 overrides misleading API alias.',product='electricity',activity='generation',generationScope='utility-scale')
        if key.startswith(('net-summer-capacity','capacity-')):return subset('Utility-scale capacity; producer group may further restrict it. Generation-only owner amendment does not apply.',product='electricity',activity='capacity')
        if key=='total-retail-sales':return whole('Whole retail electricity market.',product='electricity',activity='sales',activities=['sales','consumption'],basisLabel='Retail sales; excludes electricity generated and used on-site')
        if key in ['fsp-service-provider-sales','eop-sales']:return subset('Selected retailer classes.',product='electricity',activity='sales')
        if key=='direct-use':return subset('Direct-use component, not total electricity consumption.',product='electricity',activity='consumption')
        if key=='average-retail-price':return whole('Retail electricity average price.',product='electricity',activity='prices')
    if route==PREFIX+'source-disposition':
        if key=='total-net-generation':return whole('All-sector utility-scale generation, subject to all-size preference.',product='electricity',activity='generation',generationScope='utility-scale')
        sector={'elect-pwr-sector-gen-subtotal':'electric power','combined-heat-and-pwr-comm':'commercial','combined-heat-and-pwr-indust':'industrial'}.get(key)
        if sector:return subset('Sector generation is a subset of all-sector total.',product='electricity',activity='generation',sector=sector,sectorCellClassification='whole product',generationScope='utility-scale')
        if key in ['electric-utilities','independent-power-producers','combined-heat-and-pwr-elect','indust-and-comm-gen-subtotal']:return subset('Ownership/technology or mixed-sector generation component.',product='electricity',activity='generation',generationScope='utility-scale')
        if key in ['total-international-imports','total-international-exports']:return whole('Gross international electricity trade; not net interstate flow.',product='electricity',activity='imports' if key.endswith('imports') else 'exports',basisLabel='International electricity '+('imports' if key.endswith('imports') else 'exports'))
        if key=='total-elect-indust':return whole('All retail electricity sales.',product='electricity',activity='sales',activities=['sales','consumption'],basisLabel='Retail sales; excludes electricity generated and used on-site')
        if key in ['full-service-providers','energy-only-providers','facility-direct']:return subset('Retailer/producer class, not total retail market.',product='electricity',activity='sales')
        if key=='direct-use':return subset('Direct use only.',product='electricity',activity='consumption')
        if key in ['total-supply','total-disposition','estimated-losses','net-interstate-trade','unaccounted','net-trade-index']:return outside('Balance, loss, net flow or ratio; not gross trade or consumption.')
    return pending('Unreviewed data column; no default acceptance.')

def build(node):
    route=node['route'];out={'route':route,'sources':SOURCES,'publicationStatus':'unverified','dataColumns':[],'facets':{}}
    for key,d in node['data'].items():out['dataColumns'].append(dict(id=key,sourceDefinition=d,**column(route,key,d)))
    for fid,rows in i.inventory(route).items():
        if fid not in ['fueltypeid','energysourceid','technology','producertypeid','sector','sectorid']:continue
        out['facets'][fid]=[dict(sourceDefinition=r['definition'],frequencies=r['frequencies'],calls=r['calls'],**facet(route,fid,r['definition'])) for r in rows]
    decisions=out['dataColumns']+[r for rows in out['facets'].values() for r in rows]
    out['complete']=all(r['classification']!='pending' for r in decisions)
    return out

def main():
    nodes=[n for n in i.read(i.EVIDENCE/'route-census.json')['nodes'] if n.get('classification')=='FITS' and n['route'].startswith('electricity/')]
    result={'method':'Source correspondence; dimension classifications must be combined without dropping restrictions. No publication claim.','routes':{n['route']:build(n) for n in nodes}}
    (i.EVIDENCE/'electricity-classification.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps({route:{'complete':r['complete'],'pending':[x.get('id',x.get('sourceDefinition',{}).get('id')) for x in r['dataColumns']+[y for rows in r['facets'].values() for y in rows] if x['classification']=='pending']} for route,r in result['routes'].items()}))
if __name__=='__main__':main()
