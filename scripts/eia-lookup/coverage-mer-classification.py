"""Reviewable MER correspondence over EIA definitions; no user-query rules.
UNSD correspondence-table method. These are candidates, not availability claims.
"""
import importlib.util,json,re
from pathlib import Path
spec=importlib.util.spec_from_file_location('inventory',Path(__file__).with_name('coverage-inventory.py'))
i=importlib.util.module_from_spec(spec);spec.loader.exec_module(i)
WHOLE={
 'BF':'biofuels','BM':'biofuels','RY':'biofuels','CL':'coal','EL':'electricity','ES':'electricity',
 'FF':'fossil fuels','GE':'geothermal','HV':'hydro','LN':'natural gas','NG':'natural gas','NN':'natural gas',
 'NU':'nuclear','PA':'petroleum','PT':'petroleum','RE':'renewable','SO':'solar','TE':'total energy',
 'TF':'total energy','TN':'total energy','TX':'total energy','WY':'wind',
}
SUBSETS={
 'petroleum':'AR AV CO D2 DF DK DM DR DS HL JF JK KS LG LU MG MM MT NL OL OP PC PF PM PN PQ PR PU PY PZ RA RB RC RF RL RM RO RP RQ RR RU SN',
 'biofuels':'B1 BD BO EM EN WD',
 'electricity':'BT HP',
 'fossil fuels':'CC OJ',
 'solar':'SH SP',
 'total energy':'AF OT WS',
 'natural gas':'CY NT NY',
}
SUBSET={p:product for product,ps in SUBSETS.items() for p in ps.split()}
SUBSET['WC']='coal'
OUT_PREFIX={
 'CD':'Carbon emissions/intensity','CK':'Carbon emissions','CP':'Consumer price index','DH':'Wells drilled',
 'EV':'Charging ports/locations','GD':'GDP','GO':'Gross output','HE':'Vehicle mileage','HG':'Vehicle count',
 'HR':'Well count','LD':'Vehicle count','LO':'Electrical system losses','LT':'Vehicle efficiency/mileage',
 'MV':'Vehicle efficiency/mileage','NW':'Carbon emissions','NX':'Storage injection/withdrawal flow, not stock',
 'OG':'Rig/well activity','OM':'Non-energy trade balance','PH':'Vehicle count/mileage','TM':'Non-energy merchandise trade',
 'TP':'Population','TR':'Vehicle efficiency/mileage','UR':'Uranium material, not nuclear energy output',
 'VT':'Well count','ZW':'Weather degree days',
}
SECTORS=['residential','commercial','industrial','transportation','electric power']

def classify(definition):
    code=definition['id'];name=definition['name'];text=name.casefold();prefix=code[:2]
    result={'sourceDefinition':definition,'classification':'pending','basisLabel':name,'publicationStatus':'unverified'}
    if prefix in OUT_PREFIX:
        return dict(result,classification='out of vocabulary',reason=OUT_PREFIX[prefix]+' is outside the locked product/activity vocabulary.')
    nonmeasure=re.search(r'co2|carbon dioxide|capacity factor|usage factor|heat content|heat rate|per capita|per real dollar|as share|percentage|\bin percent\b|per kilowatthour|wells drilled|rotary rigs|operable units|registered vehicles|miles per vehicle|miles per gallon|gallons per vehicle|net storage withdrawals|denaturant in|losses|unaccounted|balancing item|stock change|change in working gas|adjustments|processing gain|net imports|\bbalance in\b|feedstock',text)
    # Monetary prices per kWh are prices, while Btu/kWh is a conversion factor.
    if nonmeasure and nonmeasure.group(0)=='per kilowatthour' and re.search(r'price|cost',text):
        nonmeasure=None
    if nonmeasure:
        return dict(result,classification='out of vocabulary',reason='Not an allowed quantity/price/activity: '+nonmeasure.group(0)+'.')
    product=WHOLE.get(prefix) or SUBSET.get(prefix)
    if not product:return dict(result,reason='Unreviewed MER source family; no fallback classification.')
    status='whole product' if prefix in WHOLE else 'subset'
    if 'crude oil' in text:
        product='petroleum';status='subset';result.update(qualifier='crude oil',qualifierClassification='whole product')
    elif 'gasoline' in text:
        product='petroleum';status='subset';result.update(qualifier='gasoline',qualifierClassification='whole product')
    if 'ngpl' in text or 'natural gas plant liquids' in text or 'natural gas liquids' in text:
        product='petroleum';status='subset'
    if 'supplemental gaseous fuels' in text and 'excluding' not in text:
        product='total energy';status='subset'
    if 'biomass' in text:product='biofuels';status='whole product' if prefix in ['BF','BM','RE'] else status
    if 'other petroleum' in text:product='petroleum';status='subset'
    if 'total fossil fuels' in text:product='fossil fuels'
    activity=None
    for pattern,value in [
        (r'\bprice\b|\bcost\b','prices'),(r'\bexpenditures\b','expenditures'),
        (r'net summer capacity','capacity'),
        (r'consumption|consumed|\bsupplied\b|electricity end use|direct use|vehicle use|net inputs?','consumption'),
        (r'net generation|photovoltaic generation','generation'),
        (r'\bproduction\b|gross withdrawals','production'),(r'\bimports\b','imports'),(r'\bexports\b','exports'),
        (r'stocks|in underground storage','storage'),(r'\bsales\b','sales')]:
        if re.search(pattern,text):activity=value;break
    if not activity:
        if 'supplemental gaseous fuels' in text:
            return dict(result,classification='subset',product='total energy',reason='Mixed supplemental supply component; no unique locked activity is stated.',basisRestriction='Not a natural-gas whole-product total.')
        return dict(result,product=product,reason='No reviewed activity correspondence; retain unresolved.')
    result.update(classification=status,product=product,activity=activity,reason='Named whole-product basis.' if status=='whole product' else 'Named component narrower than '+product+'.')
    if 'consumption/production' in text:result['activities']=['consumption','production']
    if activity in ['imports','exports'] and 'in million dollars' in text:
        result['basisRestriction']='Monetary trade value, not physical volume or total end-use expenditures.'
    if product=='biofuels':result['basisRestriction']='Preserve named liquid-biofuel versus total-biomass basis; these are not interchangeable units.'
    if code.endswith('US'):
        result['placeKind']='US';result['placeCode']='USA'
    else:
        result['placeKind']=None;result['geographicRestriction']='Series has a partner/subnational/group suffix; no country/state mapping from this route without a place facet.'
    sectors=[s for s in SECTORS if re.search(r'\b'+s+(r' sector\b' if s=='electric power' else r'\b'),text)]
    if len(sectors)==1:
        result.update(sector=sectors[0],sectorCellClassification=status,classification='subset')
        result['reason']+=' Named sector is a subset of the all-sector cell.'
        if result.get('qualifier'):result['qualifierSectorCellClassification']=result.pop('qualifierClassification')
    elif len(sectors)>1:
        result['classification']='subset';result['reason']+=' Multiple sectors are not a single sector or all-sector total.'
    restrictions=[]
    for pattern,why in [
        (r'non-combustion|non-combusiton','Non-combustion use only'),
        (r'small-scale','Small-scale facilities only'),
        (r'utility-scale','Utility-scale facilities only'),
        (r'photovoltaic|solar thermal','One solar technology'),
        (r'other industrial|sector, other|customers, other|coke plants|non-chp','Sub-sector restriction'),
        (r'pipeline|distribution in|lease and plant|vehicle fuel|vehicle use','One end-use component'),
        (r'government|department of|postal service|general services|national aeronautics','Government agency/ownership subset'),
        (r'strategic petroleum reserve|base gas|working gas','One stored-stock component'),
        (r'producers and distributors|end-use sectors|end-use-sectors','Selected consuming/holding sectors'),
        (r'direct use','Direct-use component only'),
        (r'gasoline.*(?:regular|premium)|(?:regular|premium|aviation|leaded).*gasoline|conventional gasoline areas|reformulated gasoline areas','Gasoline grade/type/area restriction'),
        (r'excluding biofuels|excluding ethanol|excluding denaturant','Product-component exclusion'),
        (r'refinery and blender|field production','Production/processing stage component'),
    ]:
        if re.search(pattern,text):
            if activity in ['generation','capacity'] and why=='Utility-scale facilities only':
                continue  # Owner standing rule: labelled headline basis, broader total preferred.
            if product=='electricity' and activity=='sales' and why=='Selected consuming/holding sectors' and 'end-use' in text:
                continue  # All retail end-use sectors are the whole sales market.
            restrictions.append(why)
    if activity=='consumption' and 'for electricity generation' in text:
        # Electricity-only excludes useful thermal output. Even both outputs are
        # still a subset of total fuel use outside the electric-power sector.
        if 'useful thermal output' not in text or sectors!=['electric power']:
            restrictions.append('Fuel used for generation is not all use of that fuel')
    if activity=='prices' and 'receipts at electric generating plants' in text:
        restrictions.append('Generating-plant receipts only; not all product purchases')
    if result.get('geographicRestriction'):restrictions.append('Selected trade partner or subnational area')
    if restrictions:
        result['classification']='subset';result['restrictions']=restrictions
        for field in ['sectorCellClassification','qualifierClassification','qualifierSectorCellClassification']:
            if field in result:result[field]='subset'
        result['reason']+=' '+'; '.join(restrictions)+'.'
    if activity=='generation':
        # Explicit correspondence over EIA series definitions, not query exceptions.
        # SOTEPUS is the combined total in MER Table 10.6; Section 7 totals
        # (including SOETPUS, despite 'All Sectors') are utility-scale.
        scope='all sizes' if code=='SOTEPUS' else ('small-scale only' if 'small-scale' in text else 'utility-scale')
        result['generationScope']=scope
        result['scopeEvidence']='generation-scope-review.json'
        if scope=='utility-scale':
            result['basisLabel']+='; utility-scale (1 MW and larger)'
            result['selectionConstraint']='Fallback only where EIA does not publish a compatible all-size total; verify across routes, places, sectors and frequencies before acceptance.'
            # Domestic small-PV estimates are for end-use sectors, not the
            # electric-power sector. This does not prove foreign-place scope.
            if result.get('placeKind')=='US' and product in ['solar','electricity','renewable'] and result.get('sector')!='electric power':
                result['omittedSmallScaleEstimate']='solar photovoltaic'
                result['basisLabel']+='; excludes small-scale (e.g. rooftop) generation'
        elif scope=='all sizes':
            result['basisLabel']+='; utility-scale and small-scale generation'
            result['selectionPreference']='Prefer over utility-scale-only totals with compatible dimensions.'
    if activity=='capacity':
        result['scopeDecision']='standingScopeRule'
        result['scopeEvidence']='capacity-scope-source-review.json'
        result['timeMeaning']='End of period; not a period sum or average'
        result['selectionConstraint']='Use broader EIA total for same product/activity/place/sector if published; verify before B1 selection.'
        if code=='NUGBPUS':
            result['capacityScope']='Operable nuclear generating units'
            result['basisLabel']+='; operable nuclear generating units'
            result['historicalScope']='MER Table 8.1: from 2011 monthly uprates/derates plus final year-end capacity reconciliation assigned to January; not Table 7.7 utility-only history.'
        else:
            result['capacityScope']='utility-scale'
            result['basisLabel']+='; utility-scale; end of period'
            result['capacityFuelAssignment']='Predominant energy source for multifuel plants'
            if result.get('sector') not in ['commercial','industrial']:
                result['historicalScope']='MER Table 7.7: through 1988 electric utilities only; beginning 1989 includes other producers in the named total. Do not treat earlier years as the current population.'
            result['historicalFuelScope']='Through 1988 conventional hydro includes pumped storage and solar is included in wind; through 1984 wood includes waste; through 2000 waste includes nonrenewable waste. Apply relevant source footnotes before selecting periods.'
            if product=='solar':
                result['basisLabel']+='; excludes small-scale solar photovoltaic capacity'
                result['broaderPublishedTotal']='EPM Table 6.2.B estimated total solar includes small-scale PV; compatible API mapping unverified.'
    if product=='natural gas' and activity=='prices' and result.get('sector') in ['residential','commercial','industrial'] and result.get('sectorCellClassification')=='whole product':
        result['basisLabel']+='; sales price; excludes gas transported for other sellers'
        result['scopeDecision']='headlineSectorGasPrices'
        result['scopeEvidence']='headline-scope-source-review.json'
        result['selectionConstraint']='Use broader EIA total for same product/activity/place/sector if published; verify before B1 selection.'
    if product=='natural gas' and activity=='prices' and result.get('sector')=='electric power' and result.get('sectorCellClassification')=='whole product':
        result['basisLabel']+='; average cost delivered for electricity generation; EIA-923 reporting plants'
        result['scopeDecision']='standingScopeRule'
        result['scopeEvidence']='headline-scope-source-review.json'
        result['selectionConstraint']='Use broader EIA total for same product/activity/place/sector if published; verify before B1 selection.'
        result['historicalScope']='Electric utilities only through 2001; preserve historical population notes.'
    return result

def main():
    rows=i.inventory('total-energy')['msn']
    records=[dict(classify(r['definition']),frequencies=r['frequencies'],calls=r['calls']) for r in rows]
    result={'route':'total-energy','complete':not any(r['classification']=='pending' or r.get('scopeReview') for r in records),'reviewStatus':'Draft: inspect whole/sector candidates and source notes before grid freeze.','scope':'Concept correspondence, not availability or period verification.','methodSources':['https://unstats.un.org/unsd/classifications/ExpertGroup/EGM2011/AC234-6.PDF','https://www.w3.org/TR/skos-reference/#mapping','https://www.eia.gov/totalenergy/data/monthly/'],'series':records}
    i.write_review(i.EVIDENCE/'total-energy-classification.json',result)
    from collections import Counter
    print(json.dumps({'counts':dict(Counter(r['classification'] for r in records)),'pending':[r['sourceDefinition'] for r in records if r['classification']=='pending']}))
if __name__=='__main__':main()
