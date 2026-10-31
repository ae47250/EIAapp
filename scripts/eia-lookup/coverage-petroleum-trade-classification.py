"""Research correspondence: petroleum gross trade, partners and rail movements."""
import gzip,importlib.util,json,re
from pathlib import Path
spec=importlib.util.spec_from_file_location('stock',Path(__file__).with_name('coverage-petroleum-stock-cons-classification.py'))
s=importlib.util.module_from_spec(spec);spec.loader.exec_module(s);i=s.i
REVIEW=i.read(i.EVIDENCE/'petroleum-trade-source-review.json');ROUTES=set(REVIEW['routes'])
PRODUCTS={x['id']:x for x in REVIEW['reviewedProducts']};PROCESSES={x['id']:x for x in REVIEW['reviewedProcesses']}
mark=s.mark;pending=s.pending
SCOPE='U.S. trade covers the 50 states and DC; Puerto Rico, Virgin Islands and other possessions/territories are trade partners. Area of entry is not final consumption destination.'
def product(d):
 code=d.get('id')
 if PRODUCTS.get(code)!=d:return pending('Unreviewed full trade product definition.')
 r=mark('subset','Fuel/product component of petroleum and other liquids.',product='petroleum')
 if code=='EP00':r.update(classification='whole product',reason='Total crude oil and petroleum products.')
 elif code.startswith('EPOOR') or code=='EPOOXE':
  r.update(product='biofuels',reason='Liquid biofuel component unless all including-ethanol biofuels.')
  if code=='EPOOR':r.update(classification='whole product',basisLabel='Liquid biofuels including fuel ethanol')
 elif code=='EPC0':r.update(qualifier='crude oil',qualifierClassification='whole product')
 elif code.startswith(('EPM','EPOBG')):r.update(qualifier='gasoline',qualifierClassification='whole product' if code=='EPM0' else 'subset')
 return r

def process(d):
 code=d.get('id')
 if PROCESSES.get(code)!=d:return pending('Unreviewed full trade process definition.')
 if code=='IMN':return mark('out of vocabulary','Net imports are imports minus exports, not gross imports; fixed vocabulary has no net-trade activity.')
 if code=='RAIL':return mark('out of vocabulary','Transport movements are not an activity in the form; explicit cross-border series may be trade components only.')
 return mark('whole product' if code in ['IM0','EEX'] else 'subset','Gross trade total or SPR/importer-population component.',activity='exports' if code=='EEX' else 'imports',basisLabel=d['name'])

def named_product(body,source):
 pc=s.named_product(body,source)
 if pc is None and 'EPOO' in source['product'] and re.search(r'\bOther Hydrocarbons/Oxygenates$',body):return 'EPOO'
 return pc

def series(d,route,source):
 if route not in ROUTES or source['series'].get(d.get('id'))!=d:return pending('Unknown route or changed full series definition.')
 name=d['name'];modern=re.fullmatch(r'[^_]+_([^_]+)_([^_]+)_(.+)_([^_]+)',d['id'])
 if route.endswith('/neti') or re.search(r'\bNet Imports\b',name,re.I):return mark('out of vocabulary','Net imports are a trade balance, not gross imports; no net-trade activity in fixed vocabulary.',basisLabel=name)
 unit=re.search(r'\((Thousand Barrels(?: per Day)?)\)\s*$',name)
 if not unit:return pending('Unreviewed trade unit; no inferred unit or rate.')
 body=name[:unit.start()].strip();join={};partner=False;population=False
 if modern:
  pc,qc,place,uc=modern.groups()
  if pc not in source['product'] or qc not in source['process']:return pending('Native trade product/process/place does not join source facets.')
  if {'MBBL':'Thousand Barrels','MBBLD':'Thousand Barrels per Day','1':'Thousand Barrels','2':'Thousand Barrels per Day'}.get(uc)!=unit[1]:return pending('Native trade unit and source unit disagree.')
  p=product(source['product'][pc]);q=process(source['process'][qc]);join.update(nativeProduct=pc,nativeProcess=qc,nativePlace=place)
  if p['classification']=='pending' or q['classification']=='pending':return pending('Unreviewed native trade product/process.')
  if pc in ['EP00','EPC0','EPM0','EPOOR'] and named_product(body,source)!=pc:return pending('Whole-product native code conflicts with full trade title.')
  if qc=='RAIL':
   pair=place.split('-')
   if len(pair)!=2:return pending('Rail identifier lacks destination/origin pair.')
   dest,origin=pair
   if origin=='NCA' and (dest=='NUS' or dest.startswith('R')):activity='imports';subject=dest
   elif dest=='NCA' and (origin=='NUS' or origin.startswith('R')):activity='exports';subject=origin
   else:return mark('out of vocabulary','Domestic or mixed domestic/cross-border rail movements; not whole imports/exports or another fixed activity.',basisLabel=name,**join)
   r=mark('subset','Cross-border rail is one mode and partner of trade, not all-modal/all-partner total.',product=p['product'],activity=activity,subjectNativePlace=subject,placeRole='U.S. subject; Canada partner; rail mode only',basisLabel=name+'; EIA estimated rail movements',unit=unit[1],**join)
   if p.get('qualifier'):r.update(qualifier=p['qualifier'],qualifierClassification='subset')
   return r
  if q['classification']=='out of vocabulary':return q
  pair=place.split('-');partner=len(pair)!=2 or pair[-1]!='Z00';join['subjectNativePlace']=pair[0]
  activity=q['activity'];population=q['classification']=='subset'
 else:
  pc=named_product(body,source)
  if pc is None:return pending('Legacy product phrase has no unique reviewed correspondence.')
  p=product(source['product'][pc]);join.update(matchedProduct=pc,sourceJoin='Legacy full definition; B1 must verify facet associations.')
  if re.search(r'\bExports\b',body):activity='exports'
  elif re.search(r'\bImports\b',body):activity='imports'
  else:return pending('Legacy full definition lacks reviewed gross-trade activity.')
  partner=bool(re.search(r'\b(?:Imports from|Exports to)\b',body,re.I));population=bool(re.search(r'\b(?:by SPR|for SPR|excluding SPR)\b',body,re.I))
  q=mark('subset' if population else 'whole product','Gross trade total or SPR population component.',activity=activity)
 if p['classification']=='pending':return p
 if not re.search(r'\b'+('Imports' if activity=='imports' else 'Exports')+r'\b',body,re.I):return pending('Native activity conflicts with full series wording.')
 r=mark('whole product' if p['classification']=='whole product' and not partner and not population else 'subset','Combine full product, all-partner coverage and gross-flow population.',product=p['product'],activity=activity,basisLabel=name,unit=unit[1],partnerRestricted=partner,populationRestricted=population,placeRole='Named U.S. subject/area; foreign names are partners, never foreign-country totals',sourceScope=SCOPE,selectionConstraint=s.BROADER,**join)
 if p.get('qualifier'):r.update(qualifier=p['qualifier'],qualifierClassification='whole product' if p['qualifierClassification']=='whole product' and not partner and not population else 'subset')
 if route.endswith(('/expc','/impcus','/wimpc')):r.update(subjectKind='US',subjectCode='USA')
 if modern and not partner and re.search(r'\b(?:Imports from|Exports to)\b',body,re.I):r.update(coverageEligible=False,geographyValidity='Full title names a partner but native code is all-partner; verify observation facets before coverage.')
 if modern and place not in source['duoarea']:r.update(coverageEligible=False,geographyValidity='Native area absent from advertised place facet; do not guess a crosswalk entry.')
 if route.endswith('/wkly') and activity=='exports':r['basisLabel']=name+'; EIA weekly export estimate'
 return r

def build(node):
 route=node['route'];inv=i.inventory(route);source={fid:{x['definition']['id']:x['definition'] for x in inv[fid]} for fid in ['product','process','duoarea','series']}
 result={'route':route,'sources':['petroleum-trade-source-review.json'],'scope':{'combine':'Subject versus partner, full product, process, units and crosswalk must agree; no availability inferred.'},'dataColumns':[dict(id=k,sourceDefinition=v,classification='via full series definition',publicationStatus='unverified') for k,v in node['data'].items()],'facets':{}}
 for fid in ['product','process','series']:
  result['facets'][fid]=[dict(sourceDefinition=x['definition'],frequencies=x['frequencies'],calls=x['calls'],**(product(x['definition']) if fid=='product' else process(x['definition']) if fid=='process' else series(x['definition'],route,source))) for x in inv[fid]]
 result['complete']=all(x['classification']!='pending' for rows in result['facets'].values() for x in rows);return result

def main():
 nodes=[n for n in i.read(i.EVIDENCE/'route-census.json')['nodes'] if n['route'] in ROUTES]
 result={'method':'Source correspondence only, not publication proof.','routes':{n['route']:build(n) for n in nodes}}
 i.write_review(i.EVIDENCE/'petroleum-trade-classification.json.gz',result)
 rows=[{'route':route,'facet':fid,**x} for route,v in result['routes'].items() for fid,entries in v['facets'].items() for x in entries if x['classification']=='pending']
 Path('/private/tmp/eia-trade-pending.json').write_text(json.dumps(rows,indent=2)+'\n');print(json.dumps({'routes':len(nodes),'complete':sum(x['complete'] for x in result['routes'].values()),'pending':len(rows),'examples':rows[:3]}))
if __name__=='__main__':main()
