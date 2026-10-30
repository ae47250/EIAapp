"""Research correspondence for remaining summary, input and net-output definitions."""
import copy,gzip,importlib.util,json,re
from pathlib import Path
spec=importlib.util.spec_from_file_location('stock',Path(__file__).with_name('coverage-petroleum-stock-cons-classification.py'))
s=importlib.util.module_from_spec(spec);spec.loader.exec_module(s);i=s.i
REVIEW=i.read(i.EVIDENCE/'petroleum-summary-source-review.json');ROUTES=set(REVIEW['routes'])
PRODUCTS={d['id']:d for d in REVIEW['reviewedProducts']};PROCESSES={d['id']:d for d in REVIEW['reviewedProcesses']}
mark=s.mark;pending=s.pending
FAMILIES=['price','crude','stock-cons','trade','components','refinery']
PRIOR={}
for family in FAMILIES:
 for route,v in i.read(i.EVIDENCE/('petroleum-'+family+'-classification.json.gz'))['routes'].items():
  for x in v['facets']['series']:PRIOR.setdefault(json.dumps(x['sourceDefinition'],sort_keys=True),[]).append((route,x))
OUT={'VNR','TVP','VUA','SCG','IMN','YUP','VSD','YRSD','YRS','VSI','SPC','SCS','SPT','SCX','YRA'}
INPUTS={'YIR','YIY','YIB'};OUTPUTS={'YNP','FPF','YPR','YOP','YPA','YPT','YPY','YPB'}
STOCKS={'SAE','SAXP','SAXL','SKB','SAS','SKA','SAX','SKL','SKR','STT','STR'}
TRADE={'IM0','IMX','IMS','IMU','IMT','EEX'};CAPACITY={'YRL','YRO','YRI'}
PRICE={'PTA','PRT','PTG','PTC'}
UNITS={'MBBL':'Thousand Barrels','MBBLD':'Thousand Barrels per Day','1':'Thousand Barrels','2':'Thousand Barrels per Day','PER':'Percent','DAYS':'Days','DPG':'Dollars per Gallon','MGALD':'Thousand Gallons per Day'}
def product(d):
 code=d.get('id')
 if PRODUCTS.get(code)!=d:return pending('Unreviewed full product definition.')
 if code in ['(NA)','EPXXX2']:return mark('out of vocabulary','Placeholder or gross process-input total; actual measure requires full process/series.')
 if code in ['EPOOOH','EPPG']:return mark('out of vocabulary','Hydrogen or processing-gain accounting item is not a product in the fixed vocabulary.')
 r=mark('subset','Individual fuel/component of petroleum and other liquids.',product='petroleum')
 if code=='EP00':r.update(classification='whole product',reason='Crude oil and petroleum products total; activity/source scope still applies.')
 elif code.startswith('EPOOR') or code=='EPOOXE':r.update(product='biofuels',classification='whole product' if code=='EPOOR' else 'subset',basisLabel='Liquid biofuels; petroleum supply reporting basis')
 if code=='EPC0':r.update(qualifier='crude oil',qualifierClassification='whole product')
 elif code.startswith(('EPM','EPOBG')):r.update(qualifier='gasoline',qualifierClassification='whole product' if code in ['EPM0','EPM0F'] else 'subset')
 return r

def process(d):
 code=d.get('id')
 if PROCESSES.get(code)!=d:return pending('Unreviewed full process definition.')
 if code in OUT:return mark('out of vocabulary','Balance adjustment, change, ratio, transfer or receipt is not the named stock/flow activity.',basisLabel=d['name'])
 if code in INPUTS:return mark('out of vocabulary','Transformation input; crude-demand proxy and biofuel-accounting components require product-specific source evidence.',basisLabel=d['name'])
 if code in OUTPUTS:return mark('subset' if code in ['YPY','YPB'] else 'whole product','Production basis with product and facility-population restrictions.',activity='production',basisLabel=d['name'])
 if code in STOCKS:return mark('whole product' if code=='SAE' else 'subset','End stocks total or one storage population component.',activity='storage',basisLabel=d['name'])
 if code in TRADE:return mark('whole product' if code in ['IM0','EEX'] else 'subset','Gross trade total or SPR component; subject and partner must be verified.',activity='exports' if code=='EEX' else 'imports',basisLabel=d['name'])
 if code in CAPACITY:return mark('whole product' if code=='YRL' else 'subset','Operable capacity total or operating/idle component.',product='petroleum',activity='capacity',basisLabel=d['name'])
 if code in PRICE:return mark('whole product' if code=='PTA' else 'subset','Price transaction population; product and sector restrictions apply.',activity='prices',basisLabel=d['name'])
 if code in ['VPP','P00']:return mark('whole product','Products supplied approximates consumption; sales is a distinct flow.',activity='consumption' if code=='VPP' else 'sales',basisLabel=d['name'])
 return pending('Reviewed process lacks correspondence.')

def prior(d):
 found=PRIOR.get(json.dumps(d,sort_keys=True),[])
 if not found:return None
 fields=['classification','product','activity','qualifier','qualifierClassification','sector','sectorCellClassification','qualifierSectorCellClassification']
 values={json.dumps({k:x.get(k) for k in fields},sort_keys=True) for _,x in found}
 if len(values)!=1:return pending('Previously reviewed duplicate definitions disagree; reconcile before coverage.')
 route,x=found[0];r={k:copy.deepcopy(v) for k,v in x.items() if k not in ['sourceDefinition','calls','frequencies']};r['reusedDefinitionFrom']=route;return r

def legacy_process(name,source):
 patterns=[('VUA',r'Adjustment|Unaccounted'),('VNR',r'Net Receipts'),('TVP',r'Transfers'),('SCG',r'Stock Change'),('YUP',r'Percent Utilization'),('VSD',r'Days of Supply'),('YRA',r'Alaskan Crude Oil Refinery Receipts'),('YRL',r'Operable (?:Crude Oil Distillation|Refinery) Capacity|Refinery Operable Capacity'),('YRO',r'Operating Crude Oil Distillation Capacity'),('YRI',r'Idle Crude Oil Distillation Capacity'),('YIR',r'Refiner(?:y)? and Blender Net Input'),('YIY',r'Refiner(?:y)? Net Input|Gross Inputs (?:in)?to (?:Refineries|Atmospheric Crude Oil Distillation Units)'),('YIB',r'Blender Net Input'),('YPR',r'Refiner(?:y)? and Blender (?:Adjusted )?(?:Net )?Production'),('YPY',r'Refinery (?:Net )?Production'),('YPB',r'Blender (?:Net )?Production'),('FPF',r'Field Production|Gas Plant Production'),('YPA',r'Refiner, Blender, and Gas Plant Net Production'),('YPT',r'\bProduction of '),('YOP',r'Oxygenate Plant Production'),('YNP',r'(?:Biofuel|Renewable Fuel|Oxygenate).*Plant Net Production')]
 for code,pat in patterns:
  if re.search(pat,name,re.I):
   if code in source['process']:return code
   if code in ['SCG','VSD'] and any(k in source['process'] for k in (['SCG','SCX','SCS'] if code=='SCG' else ['VSI'])):return next(k for k in (['SCG','SCX','SCS'] if code=='SCG' else ['VSI']) if k in source['process'])
 if 'Imports' in name:
  for code,pat in [('IMX',r'Excluding SPR'),('IMU',r'for SPR by Others'),('IMT',r'SPR Imports')]:
   if code in source['process'] and re.search(pat,name):return code
 if 'Exports of ' in name and 'EEX' in source['process']:return 'EEX'
 if 'Imports of ' in name and 'IM0' in source['process']:return 'IM0'
 if 'Ending Stocks' in name and 'SAE' in source['process']:return 'SAE'
 if 'Product Supplied of ' in name and 'VPP' in source['process']:return 'VPP'
 return None

def series(d,route,source):
 if route not in ROUTES or source['series'].get(d.get('id'))!=d:return pending('Unreviewed route or changed full source definition.')
 reused=prior(d)
 if reused:return reused
 name=d['name'];unit=re.search(r'\(([^()]*)\)\s*$',name);u=unit[1] if unit else None
 modern=re.fullmatch(r'[^_]+_([^_]+)_([^_]+)_(.+)_([^_]+)',d['id']);join={}
 if modern:
  pc,qc,place,uc=modern.groups();pc='(NA)' if pc=='NA' else pc
  if pc not in source['product'] or qc not in source['process']:return pending('Native codes absent from advertised product/process facets.')
  allowed={s.norm(UNITS[uc])} if uc in UNITS else set()
  if uc=='MBBLD' and qc in CAPACITY:allowed.add('thousand barrels per calendar day')
  if uc=='DAYS':allowed.add('number of days')
  if not allowed or (u and s.norm(u) not in allowed):return pending('Native unit and full source unit disagree or are unknown.')
  join=dict(nativeProduct=pc,nativeProcess=qc,nativePlace=place)
 else:
  qc=legacy_process(name,source);pc=s.named_product(name,source)
  for code,names in REVIEW.get('reviewedLegacyNameVariants',{}).items():
   if code in source['product'] and any(' '+s.norm(alias)+' ' in ' '+s.norm(name)+' ' for alias in names):pc=code
  if 'Gross Inputs' in name:pc='EPXXX2' if 'EPXXX2' in source['product'] else None
  if 'Processing Gain' in name:return mark('out of vocabulary','Processing gain is a volume-accounting component, not standalone whole-product production.',basisLabel=name,unit=u)
  if qc is None:return pending('Legacy full process wording has no reviewed correspondence.')
  join={'matchedProduct':pc,'matchedProcess':qc,'sourceJoin':'Legacy full definition and reviewed source table; B1 must verify actual facets.'}
 q=process(source['process'][qc])
 if q['classification']=='pending':return q
 if qc in OUT:return dict(q,basisLabel=name,unit=u,**join)
 if u and s.norm(u) not in {s.norm(v) for v in UNITS.values()}|{'thousand barrels per calendar day'}:return pending('Unreviewed physical unit in full source definition.')
 if qc in CAPACITY:
  if not u or s.norm(u) not in ['thousand barrels per day','thousand barrels per calendar day']:return pending('Unreviewed refining-capacity unit.')
  r=dict(q,basisLabel=name+'; atmospheric crude oil distillation capacity',unit=u,capacityBasis='refining throughput',selectionConstraint=s.BROADER,**join)
 elif qc in INPUTS:
  if pc=='EPC0':r=mark('subset','Crude refinery input is EIA demand proxy only for explicit crude oil; not whole petroleum consumption.',product='petroleum',activity='consumption',qualifier='crude oil',qualifierClassification='whole product',basisLabel=name+'; refinery inputs, EIA proxy for crude-oil demand',unit=u,selectionConstraint=s.BROADER,**join)
  elif pc and product(source['product'][pc]).get('product')=='biofuels':r=mark('subset','Biofuel blending input is a component of broader consumption including products supplied; never whole consumption alone.',product='biofuels',activity='consumption',basisLabel=name+'; biofuel inputs to refining/blending',unit=u,broaderCandidate='total-energy liquid-biofuel consumption',**join)
  else:return mark('out of vocabulary','Intermediate/gross transformation input is not directly whole-product consumption or production.',basisLabel=name,unit=u,**join)
 else:
  if pc is None:return pending('Legacy product wording has no unique reviewed correspondence.')
  p=product(source['product'][pc])
  if p['classification'] in ['pending','out of vocabulary']:return dict(p,basisLabel=name,unit=u,**join)
  r=mark('whole product' if p['classification']==q['classification']=='whole product' else 'subset','Combine product total/component and full process population.',product=p['product'],activity=q['activity'],basisLabel=name,unit=u,selectionConstraint=s.BROADER,**join)
  if p.get('qualifier'):r.update(qualifier=p['qualifier'],qualifierClassification='whole product' if p['qualifierClassification']==q['classification']=='whole product' else 'subset')
  if qc in OUTPUTS:
   r['basisLabel']=name+'; net output on the stated plant/field basis, not gross primary extraction'
   if pc=='EP00' and qc!='YPR':r.update(classification='subset',reason='Field-only or plant-only component; compare whole petroleum production bases.')
   if r.get('qualifier')=='gasoline' and qc not in ['YPR','YPA','YPT']:
    r.update(qualifierClassification='subset',broaderCandidate='Combined refinery/blender and any broader all-plant gasoline production, same place/frequency')
   if qc=='YPR':r['sourceScope']='Refinery and blender net production (secondary production); prefer broader compatible all-plant total where published.'
   if qc in ['YPY','YPB']:r['broaderCandidate']='Combined refinery and blender net production, same product/place/frequency'
  if qc in TRADE:
   r.update(subjectKind='US',subjectCode='USA',placeRole='U.S. trade subject; foreign places in import/export names are partners')
   if modern and '-' in place and not place.endswith('-Z00'):r.update(classification='subset',qualifierClassification='subset' if r.get('qualifier') else None,scopeRestriction='Partner component')
  if qc=='VPP':
   r['basisLabel']=name+'; products supplied, EIA approximation of consumption'
   if pc=='EPP0' and route.endswith('/sndw'):r['classification']='whole product'
   if pc=='EPC0':r.update(qualifierClassification='subset',sourceScope='Direct crude fuel use excludes refinery inputs')
   if p['product']=='biofuels':r.update(classification='subset',broaderCandidate='MER biofuel consumption including blending inputs')
  if qc in STOCKS:r['sourceScope']=s.STOCK_SCOPE
 if not u:r.update(coverageEligible=False,unitValidity='Source title omits unit; observation metadata required.')
 if modern and place not in source['duoarea']:r.update(coverageEligible=False,geographyValidity='Native place absent from advertised facet; no guessed crosswalk.')
 return r

def build(node):
 route=node['route'];inv=i.inventory(route);source={fid:{x['definition']['id']:x['definition'] for x in inv[fid]} for fid in ['product','process','duoarea','series']}
 result={'route':route,'sources':['petroleum-summary-source-review.json'],'scope':{'combine':'Full native definitions; existing identical definitions retain decisions. No coverage inferred.'},'dataColumns':[dict(id=k,sourceDefinition=v,classification='via full series definition',publicationStatus='unverified') for k,v in node['data'].items()],'facets':{}}
 for fid in ['product','process','series']:
  result['facets'][fid]=[dict(sourceDefinition=x['definition'],frequencies=x['frequencies'],calls=x['calls'],**(product(x['definition']) if fid=='product' else process(x['definition']) if fid=='process' else series(x['definition'],route,source))) for x in inv[fid]]
 result['complete']=all(x['classification']!='pending' for rows in result['facets'].values() for x in rows);return result

def main():
 nodes=[n for n in i.read(i.EVIDENCE/'route-census.json')['nodes'] if n['route'] in ROUTES]
 result={'method':'Definition correspondence, not a publication claim.','routes':{n['route']:build(n) for n in nodes}}
 (i.EVIDENCE/'petroleum-summary-classification.json.gz').write_bytes(gzip.compress((json.dumps(result,separators=(',',':'))+'\n').encode(),mtime=0))
 rows=[{'route':route,'facet':fid,**x} for route,v in result['routes'].items() for fid,entries in v['facets'].items() for x in entries if x['classification']=='pending']
 Path('/private/tmp/eia-summary-pending.json').write_text(json.dumps(rows,indent=2)+'\n');print(json.dumps({'routes':len(nodes),'complete':sum(x['complete'] for x in result['routes'].values()),'pending':len(rows),'examples':rows[:3]}))
if __name__=='__main__':main()
