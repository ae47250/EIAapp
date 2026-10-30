"""Native natural-gas correspondence, research only; never query interpretation.
Full series definitions control over misleading route/process headings.
"""
import gzip,importlib.util,json,re
from pathlib import Path
spec=importlib.util.spec_from_file_location('reserves',Path(__file__).with_name('coverage-gas-reserves-classification.py'))
r=importlib.util.module_from_spec(spec);spec.loader.exec_module(r)
i=r.i

def mark(status,reason,**extra):return r.mark(status,reason,product='natural gas',**extra)
def out(reason):return mark('out of vocabulary',reason)
def pending(reason):return mark('pending',reason)
def measure(activity,status='whole product',**extra):return mark(status,'Native measure definition; preserve population, basis and geographic scope.',activity=activity,**extra)
def sector(activity,name,complete=True):return measure(activity,'subset',sector=name,sectorCellClassification='whole product' if complete else 'subset')

GROUPS={
 'production':{'FGW','FPD','VGM'},
 'production_subset':{'FGC','FGG','FGO','FGS','VGN'},
 'consumption':{'VC0'},
 'consumption_subset':{'VGT','VDV','VGL','VGP','VCL','VCF','VF8','VFT','VRT'},
 'capacity':{'SAC'},
 'capacity_subset':{'SA1','SA4','SA6','SACW0','SACWA','SACWD','SACWS'},
 'storage':{'SAT'},
 'storage_subset':{'SAB','SAO','SNB','SNO','SNT','SSB','SSO','SST','SWO'},
 'imports':{'IM0'},'exports':{'EEX'},
 'imports_subset':{'IML','INC','IRP'},'exports_subset':{'ENC','ENG','ENP','ERE','ETR','EVE','EVT'},
 'prices':{'FWA','PG1','PEX','PM0'},
 'prices_subset':{'PIC','PML','PNG','PNP','PRC','PRP','PDV','PGP','PCSL','PCSM','PRSL','PRSM'},
 'out':{'EEI','IMB','IMI','IMN','MID','MIE','MIF','MIN','MIR','MIT','OVI','FSB','FSO','FSP','FSR','FSS','FWC','FWV','SA2','SA3','SA5','SAD','SAH','SAI','SAL','SAN','SAW','SLI','SLW','SNI','SNN','SNW','SSI','SSN','SSW','STN','VF6','VF9','VFA','VFC','VFCL','VFI','VG4','VGQ','VGV','VP5','VP7','VRN','VRX','VRXL','XDC','XDG','YGP'}
}
SECTORS={'VCS':('consumption','commercial',True),'VRS':('consumption','residential',True),'VIN':('consumption','industrial',True),'VEU':('consumption','electric power',True),'VN3':('customers','residential',True),'VN5':('customers','commercial',True),'VN7':('customers','industrial',True),'VN4':('customers','residential',False),'VNT':('customers','residential',False),'VN6':('customers','commercial',False),'VNC':('customers','commercial',False),'VN8':('customers','industrial',False),'VN9':('customers','industrial',False),'PCS':('prices','commercial',False),'PRS':('prices','residential',False),'PIN':('prices','industrial',False),'PEU':('prices','electric power',False)}

def process(d):
    code=d['id']
    if code.startswith('R'):return r.process(d)
    if code in SECTORS:
        result=sector(*SECTORS[code])
        if code in ['PCS','PRS','PIN']:
            result.update(sectorCellClassification='whole product',basisLabel='sales price; excludes gas transported for other sellers',scopeDecision='headlineSectorGasPrices',selectionConstraint='Use broader EIA total for same product/activity/place/sector if published.')
        if code=='PEU':result.update(sectorCellClassification='whole product',basisLabel='Average cost of natural gas delivered for electricity generation; EIA-923 reporting plants',scopeDecision='standingScopeRule',selectionConstraint='Use broader EIA total for same product/activity/place/sector if published; verify before B1 selection.')
        return result
    if code in ['VG9','YGT']:return r.mark('subset','Extracted gas liquids are a liquid component of petroleum, including gaseous-equivalent reporting.',product='petroleum',activity='production')
    for group,codes in GROUPS.items():
        if code not in codes:continue
        if group=='out':return out('Accounting flow, ratio, count of facilities, supply input, processing or value measure outside locked activities; not a substitute for a stock or output.')
        activity=group.split('_')[0];return measure(activity,'subset' if group.endswith('_subset') else 'whole product')
    return pending('Unreviewed process code.')

def series(d,route):
    name=re.sub(r'\s+',' ',d['name']).strip();low=name.lower()
    for correction in i.read(i.EVIDENCE/'natural-gas-source-review.json').get('metadataConflicts',[]):
        if correction.get('sourceDefinition')==d and correction.get('classificationCorrection'):
            return dict(correction['classificationCorrection'],reason=correction['finding'],classificationSource=correction['source'])
    if route=='natural-gas/move/ist':return out('Interstate/in-transit/net movement route; not gross foreign trade. Native process definitions independently checked.')
    # Exact earlier reserve correspondence, including misleading expected-future title.
    if 'reserves' in low or 'discoveries' in low or 'expected future production' in low or route.endswith(('/coalbed','/shalegas','/lc','/ngpl')):
        old=r.series(d)
        if old['classification']!='pending':return old
    if re.search(r'\(%\)|\(percent\)|percent |% |average annual consumption per|balancing item|number of (?:oil|gas and gas condensate) wells',low):return out('Percentage, per-customer ratio, balancing item or well count, not a locked quantity.')
    if 'imputed value of natural gas market production' in low:return out('Production value is not consumer expenditure or a unit price.')
    if 'wellhead value' in low:
        if 'quantity of production associated' in low:return measure('production','subset',basisLabel='Production associated with reported wellhead value; reporting subsample')
        return out('Production value is not consumer expenditure or a unit price.')
    if 'coalbed methane' in low and 'reserves based production' in low:return measure('production','subset',basisLabel='Coalbed methane production estimated from reserves survey')
    if 'supplemental' in low:return out('Supplemental gas supply/input, not total natural-gas production or a locked supply activity.')
    if 'nonhydrocarbon' in low or 'repressuring' in low or 'vented and flared' in low:return out('Nonhydrocarbon removal/reinjection/disposal flow, not total output or consumption.')
    if 'net receipts' in low or 'interstate' in low or 'intransit' in low or 'in-transit' in low or 'international deliveries' in low or 'international receipts' in low or 'net imports' in low or 'net movements' in low:return out('Net, in-transit or interstate movements are not gross international imports/exports.')
    unitmatch=re.search(r'\(([^()]*)\)$',name)
    if not unitmatch:return pending('No reviewed terminal unit.')
    unit=unitmatch[1].lower();price=unit in ['dollars per thousand cubic feet','nominal dollars per thousand cubic feet']
    volume=unit in ['mmcf','million cubic feet','bcf','billion cubic feet','million cubic feet per day']
    count=unit in ['count','number of elements']
    if not (price or volume or count or unit in ['thousand barrels','million barrels']):return pending('Unreviewed source unit.')
    if 'storage' in low:
        if re.search(r'number of|count of',low):return out('Storage field count is not gas capacity or customer count.')
        if re.search(r'injections|additions|withdrawals|activity-|change in working',low):return out('Storage flow/change is not the end-period stock or capacity.')
        if not volume:return pending('Storage quantity has incompatible unit.')
        component=bool(re.search(r'working|base gas|salt|acquifer|depleted',low))
        activity='capacity' if 'capacity' in low else 'storage'
        return measure(activity,'subset' if component else 'whole product',basisLabel='Natural gas underground storage '+('capacity' if activity=='capacity' else 'end-period inventory')+('; component as named by EIA' if component else '; total base and working gas'),scopeConstraints=[{'placeCode':'USA','wholeScopeFrom':'2013','reason':'US totals excluded Alaska before January 2013.'}])
    if 'imports' in low or 'exports' in low:
        if not (price or volume):return pending('Trade series has incompatible unit.')
        activity='prices' if price else 'imports' if 'imports' in low else 'exports'
        component=bool(re.search(r'liquefied|lng |compressed|pipeline|re-exports|by vessel|by truck|by rail|imports from|exports to',low))
        return measure(activity,'subset' if component else 'whole product',basisLabel='Natural gas international '+('import' if 'imports' in low else 'export')+(' unit price' if price else ' volume')+('; component/partner as named' if component else '; all modes and partners'),placeRole='US subject or state border crossing; foreign named places are partners, never subject countries')
    if 'plant liquids' in low or 'total liquids extracted' in low:
        return r.mark('subset','Extracted liquids are part of petroleum, not whole gas, even in gaseous-equivalent units.',product='petroleum',activity='production',basisLabel='Natural gas plant liquids production; preserve origin versus processing location')
    if 'processed' in low:return out('Processing throughput is not production, consumption or capacity.')
    if 'number of' in low and 'consumers' in low and count:
        sec=next((s for s in ['residential','commercial','industrial'] if s in low),None)
        if not sec:return pending('Unreviewed customer sector.')
        return sector('customers',sec,not bool(re.search(r' - sales| - transported',low)))
    if price:
        if 'wellhead' in low:return measure('prices',basisLabel='Natural gas average wellhead price; discontinued January 2013')
        if 'citygate' in low or 'city gate' in low:return measure('prices',basisLabel='Natural gas citygate acquisition price')
        sec=next((s for s in ['residential','commercial','industrial','electric power'] if s in low),None)
        if sec:
            result=sector('prices',sec,False)
            headline=sec in ['residential','commercial','industrial'] and not ('by local distributor companies' in low or 'by marketers' in low)
            result.update(basisLabel='Natural gas '+sec+' price; reported sales/receipt population',populationRestriction='Sales exclude deliveries for the account of others; electric-power receipt population and historical utility-only restrictions remain.')
            if headline:result.update(sectorCellClassification='whole product',basisLabel='Natural gas '+sec+' sales price; excludes gas transported for other sellers',scopeDecision='headlineSectorGasPrices',selectionConstraint='Use broader EIA total for same product/activity/place/sector if published.')
            if sec=='electric power':result.update(sectorCellClassification='whole product',basisLabel='Average cost of natural gas delivered for electricity generation; EIA-923 reporting plants',scopeDecision='standingScopeRule',selectionConstraint='Use broader EIA total for same product/activity/place/sector if published; verify before B1 selection.',historicalScope='Electric utilities only through 2001; verify and label historical population before choosing history.')
            return result
        if 'vehicle fuel' in low:return sector('prices','transportation',False)
        if 'pipeline' in low:return sector('prices','transportation',False)
        return pending('Unreviewed price basis.')
    if volume:
        if 'total consumption' in low:return measure('consumption',basisLabel='Total natural gas consumption, including lease/plant and pipeline/distribution use')
        sec=next((s for s in ['residential','commercial','industrial','electric power'] if s in low),None)
        if sec and ('consumption' in low or 'account of others' in low or 'deliveries to electric power consumers' in low):return sector('consumption',sec,'account of others' not in low)
        if 'delivered to consumers' in low:return measure('consumption','subset',basisLabel='Deliveries to end-use consumers; excludes other gas uses')
        if 'vehicle fuel' in low or ('pipeline and distribution use' in low or 'pipeline & distribution use' in low):return sector('consumption','transportation',False)
        if 'lease' in low and 'fuel' in low or 'plant fuel consumption' in low:return sector('consumption','industrial',False)
        if 'non-marketed production' in low or re.search(r'withdrawals from (?:gas|oil|coalbed) wells|withdrawals from shale gas',low):return measure('production','subset',basisLabel='Natural gas production component as named by EIA')
        if 'gross withdrawals' in low:return measure('production',basisLabel='Natural gas gross withdrawals')
        if 'marketed production' in low:return measure('production',basisLabel='Natural gas marketed production')
        if 'dry production' in low or 'dry natural gas production' in low:return measure('production',basisLabel='Dry natural gas production')
    return pending('Unreviewed full natural-gas series definition.')

def build(node):
    route=node['route'];review=i.read(i.EVIDENCE/'natural-gas-source-review.json')
    result=dict(route=route,sources=['natural-gas-source-review.json','natural-gas-reserves-source-review.json'],publicationStatus='unverified',dataColumns=[dict(id=k,sourceDefinition=v,classification='via full series definition',publicationStatus='unverified') for k,v in node['data'].items()],facets={},scope={'seriesRequirement':'Use the full classified series, crosswalk and historical constraints; product/process cross-products do not prove published combinations.','historicalConstraints':review['historicalScope']})
    for fid,rows in i.inventory(route).items():
        if fid not in ['product','process','series']:continue
        decisions=[]
        for item in rows:
            d=item['definition'];decision=r.product(d) if fid=='product' else process(d) if fid=='process' else series(d,route)
            decisions.append(dict(sourceDefinition=d,frequencies=item['frequencies'],calls=item['calls'],**decision))
        result['facets'][fid]=decisions
    result['complete']=all(x['classification']!='pending' and not str(x.get('sectorCellClassification','')).startswith('pending') for rows in result['facets'].values() for x in rows)
    return result

def main():
    nodes=[n for n in i.read(i.EVIDENCE/'route-census.json')['nodes'] if n.get('classification')=='FITS' and n['route'].startswith('natural-gas/') and '/enr/' not in n['route']]
    result={'method':'Reviewed native definitions; no coverage claim.','routes':{n['route']:build(n) for n in nodes}}
    (i.EVIDENCE/'natural-gas-classification.json.gz').write_bytes(gzip.compress((json.dumps(result,separators=(',',':'))+'\n').encode(),mtime=0))
    from collections import Counter
    pendingrows=[]
    for route,d in result['routes'].items():
        rows=[(fid,x) for fid,rs in d['facets'].items() for x in rs if x['classification']=='pending'];pendingrows.extend((route,fid,x['sourceDefinition']) for fid,x in rows)
        print(route,'pending',len(rows),'series',len(d['facets']['series']))
    Path('/private/tmp/eia-gas-pending.json').write_text(json.dumps(pendingrows,indent=2)+'\n');print('pending total',len(pendingrows))
if __name__=='__main__':main()
