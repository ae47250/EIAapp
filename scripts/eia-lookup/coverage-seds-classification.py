"""Reviewable SEDS correspondence rules over EIA definitions, never user queries."""
import importlib.util,json,re
from pathlib import Path
spec=importlib.util.spec_from_file_location('inventory',Path(__file__).with_name('coverage-inventory.py'))
i=importlib.util.module_from_spec(spec);spec.loader.exec_module(i)
WHOLE={'CL':'coal','NG':'natural gas','NU':'nuclear','PA':'petroleum','ES':'electricity','EL':'electricity','FF':'fossil fuels','GE':'geothermal','HY':'hydro','HV':'hydro','RE':'renewable','SO':'solar','WY':'wind','TE':'total energy','PE':'total energy','TN':'total energy','BF':'biofuels','BM':'biofuels'}
SUBSETS={
 'petroleum':'AB AR AV BQ BY CO DA DF DK DM EQ EY FN FO FS HL IQ IY JF KS LU MB MG MM MS NA OH OM OP P1 P5 PC PL PM PP PQ PY RF SG SN UO US WX',
 'biofuels':'B1 BD BO BX EM EN WD WS WW WZ',
 'natural gas':'CY NN NT NY SF',
 'electricity':'BT HP PH OT',
 'renewable':'NC',
 'solar':'SH SP',
 'fossil fuels':'CC',
 'total energy':'OJ',
}
SUBSET={prefix:product for product,prefixes in SUBSETS.items() for prefix in prefixes.split()}
OUT_PREFIX={'CD':'Carbon emissions/intensity, outside the activity vocabulary.','GD':'GDP, outside the product vocabulary.','TP':'Population, outside the product vocabulary.','ZW':'Weather degree days, outside the product vocabulary.','EV':'Charging infrastructure/ports, not energy sales or energy-customer counts.','LD':'Vehicle stocks, not stored energy.','LO':'Electrical system losses, not final electricity use.'}
def classify(definition):
    code=definition['id'];name=definition['name'];text=name.casefold();prefix=code[:2]
    result={'sourceDefinition':definition,'classification':'pending'}
    if prefix in OUT_PREFIX:return dict(result,classification='out of vocabulary',reason=OUT_PREFIX[prefix])
    bad=re.search(r'co2|carbon dioxide|capacity factor|usage factor|conversion factor|factor for converting|per capita|per dollar|as percent|vehicle.*stocks|vehicle.*share|losses and co-products',text)
    if bad:return dict(result,classification='out of vocabulary',reason='Definition concerns '+bad.group(0)+', not an allowed whole-product measure.')
    if re.search(r'net (interstate flow|imports)|net imports|net interstate|consumption less.*production',text):
        return dict(result,classification='out of vocabulary',reason='Net trade/flow is not gross imports, exports or product consumption.')
    if 'feedstock' in text and 'production' in text:
        return dict(result,classification='out of vocabulary',reason='Production inputs/feedstock (including losses and coproducts) are not the resulting biofuel output. Keep BFPRP liquid output separate.')
    product=WHOLE.get(prefix) or SUBSET.get(prefix)
    if not product:return dict(result,reason='Unreviewed SEDS product prefix.')
    status='whole product' if prefix in WHOLE else 'subset'
    reason='EIA named whole-product basis.' if status=='whole product' else 'Named product/component narrower than '+product+'.'
    if 'crude oil' in text:
        product='petroleum';status='subset';reason='Crude oil is part of petroleum, not all petroleum and other liquids.'
        result.update(qualifier='crude oil',qualifierClassification='whole product')
    if prefix=='MG':result.update(qualifier='gasoline',qualifierClassification='whole product')
    if prefix=='BF':result['basisRestriction']='Liquid biofuels output; retain the EIA basis label.'
    if prefix=='BM':result['basisRestriction']='Total biomass basis; do not label as liquid biofuels only.'
    activity=None
    activity_patterns=[
        (r'expenditures','expenditures'),(r'\bprice\b','prices'),
        (r'net summer capacity|generating units.*capacity','capacity'),
        (r'\bconsumption\b|\bconsumed\b|\bused\b|\buse\b|product supplied|net inputs','consumption'),
        (r'net generation|electricity generation','generation'),(r'\bproduction\b','production'),
        (r'\bimported\b|\bimports\b','imports'),(r'\bexported\b|\bexports\b','exports'),
        (r'\breserves\b','reserves'),(r'\bsales\b','sales')]
    for pattern,value in activity_patterns:
        if re.search(pattern,text):activity=value;break
    if not activity:return dict(result,product=product,reason='Activity needs individual review; no default inferred from product prefix.')
    result.update(classification=status,product=product,activity=activity,basisLabel=name,reason=reason)
    sectors=[sector for sector in ['residential','commercial','industrial','transportation','electric power'] if sector in text]
    if len(sectors)==1:
        result['sector']=sectors[0]
        result['sectorCellClassification']=status
        result['classification']='subset'
        result['reason']+=' One sector is a subset of the all-sector total.'
        if result.get('qualifier'):result['qualifierSectorCellClassification']=result.pop('qualifierClassification')
    elif len(sectors)>1:
        result['classification']='subset';result['reason']+=' Combined sectors do not equal an individual sector or all-sector total.'
    narrower=re.search(r'excluding|except|adjusted for|share of|small-scale|end-use|refiner(?:y|ies)|blender|pipeline|distribution use|at no cost|no direct fuel cost|intermediate products|process fuel|coke plants|lease and plant fuel|vehicle.*use',text)
    if narrower and not (activity in ['prices','expenditures'] and narrower.group(0)=='end-use'):
        result['classification']='subset'
        if result.get('sector'):result['sectorCellClassification']='subset'
        if result.get('qualifierClassification'):result['qualifierClassification']='subset'
        if result.get('qualifierSectorCellClassification'):result['qualifierSectorCellClassification']='subset'
        result['reason']+=' Additional scope restriction: '+narrower.group(0)+'.'
    if product=='natural gas' and activity=='prices' and result.get('sector') in ['residential','commercial','industrial'] and result.get('sectorCellClassification')=='whole product':
        result['basisLabel']+='; sales price; excludes gas transported for other sellers'
        result['scopeDecision']='headlineSectorGasPrices'
        result['scopeEvidence']='headline-scope-source-review.json'
        result['historicalScope']='SEDS onsystem-sales definition documented from 1987; retain earlier source-method notes.'
        result['selectionConstraint']='Use broader EIA total for same product/activity/place/sector if published; verify before B1 selection.'
    if product=='natural gas' and activity=='prices' and result.get('sector')=='electric power':
        result['basisLabel']+='; EIA sector price estimates, including assigned prices where source values are missing'
        result['scopeEvidence']='headline-scope-source-review.json'
        result['selectionConstraint']='Use broader EIA total for same product/activity/place/sector if published; verify before B1 selection.'
    return result

def main():
    rows=i.inventory('seds')['seriesId'];records=[dict(classify(r['definition']),frequencies=r['frequencies'],calls=r['calls']) for r in rows]
    result={'route':'seds','complete':not any(r['classification']=='pending' for r in records),'reviewStatus':'Draft: systematic metadata correspondence requires boundary-case review before grid freeze.','scope':'Concept classifications only; no observations or coverage claims.','series':records}
    (i.EVIDENCE/'seds-classification.json').write_text(json.dumps(result,indent=2)+'\n')
    from collections import Counter
    print(json.dumps({'counts':dict(Counter(r['classification'] for r in records)),'pending':[r['sourceDefinition'] for r in records if r['classification']=='pending']}))
if __name__=='__main__':main()
