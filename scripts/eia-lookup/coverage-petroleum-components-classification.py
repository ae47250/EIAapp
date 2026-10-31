"""Research mapping for manufacturing inputs, component fuels and facility fuel use."""
import gzip,importlib.util,json,re
from pathlib import Path
spec=importlib.util.spec_from_file_location('stock',Path(__file__).with_name('coverage-petroleum-stock-cons-classification.py'))
s=importlib.util.module_from_spec(spec);spec.loader.exec_module(s);i=s.i
REVIEW=i.read(i.EVIDENCE/'petroleum-components-source-review.json');ROUTES=set(REVIEW['routes'])
PRODUCTS={d['id']:d for d in REVIEW['reviewedProducts']};PROCESSES={d['id']:d for d in REVIEW['reviewedProcesses']}
mark=s.mark;pending=s.pending
FUEL={'8FC0':'coal','8FN0':'natural gas','8FE0':'electricity','8FPP0':'petroleum','8FPPC':'petroleum','8FPPM':'petroleum','8FPC':'petroleum','8FO0':'petroleum','8FPD':'petroleum','8FPR':'petroleum','8FPL':'petroleum','8FPS':'petroleum','8NGFSHY':'natural gas','819LPG':'petroleum','819CL0':'coal','819PE0':'electricity','819NG0':'natural gas','819BG0':'biofuels','819NGHF':'natural gas','819OF0':'total energy'}
OUT={'8FS0':'Purchased steam is outside the product vocabulary.','819PS0':'Purchased steam is outside the product vocabulary.','819PH0':'Purchased hydrogen is outside the product vocabulary.','YIFBP':'Raw manufacturing feedstocks are not finished biofuel production or consumption.','8BDPC0':'Producer counts are not customers or capacity.','SCG':'Stock change is not the ending stock level.'}
ACTIVITY={'8BDPC':'capacity','VBPIB':'sales','VBP':'sales','YNPB':'production','SAE':'storage','FPF':'production','YOP':'production','YNP':'production','YPC':'production','YPM':'production'}
def product(d,route):
 code=d.get('id')
 if PRODUCTS.get(code)!=d:return pending('Unreviewed full component product definition.')
 if code=='(NA)':return mark('out of vocabulary','Structural product placeholder; actual fuel is defined by reviewed process and full series.')
 if route.endswith('/feedbiofuel'):return mark('out of vocabulary','Raw agricultural/oil/fat feedstock is not a finished fuel in the fixed product vocabulary.')
 target='biofuels' if code.startswith('EPOOR') or code in ['EPOOXE','EPOOBD'] else 'petroleum'
 return mark('subset','Individual fuel or chemical component, never the whole product.',product=target)

def process(d):
 code=d.get('id')
 if PROCESSES.get(code)!=d:return pending('Unreviewed full component process definition.')
 if code in OUT:return mark('out of vocabulary',OUT[code])
 if code in FUEL:
  r=mark('subset','Fuel use at refineries/biofuel plants is an industrial subsector, not whole industry or all sectors.',product=FUEL[code],activity='consumption',sector='industrial',sectorCellClassification='subset',basisLabel=d['name'])
  if code=='8FPC':r.update(qualifier='crude oil',qualifierSectorCellClassification='subset')
  return r
 if code in ACTIVITY:return mark('subset' if code in ['YPC','YPM'] else 'whole product','Named activity; product/population restrictions still apply.',activity=ACTIVITY[code],basisLabel=d['name'])
 return pending('Reviewed process still lacks correspondence.')

def series(d,route,source):
 if route not in ROUTES or source['series'].get(d.get('id'))!=d:return pending('Unreviewed route or changed full source series.')
 name=d['name'];modern=re.fullmatch(r'[^_]+_([^_]+)_([^_]+)_(.+)_([^_]+)',d['id']);join={}
 if modern:
  pc,qc,place,uc=modern.groups();pc='(NA)' if pc=='NA' else pc
  if pc not in source['product'] or qc not in source['process']:return pending('Native product/process absent from advertised source facets.')
  p=product(source['product'][pc],route);q=process(source['process'][qc]);join=dict(nativeProduct=pc,nativeProcess=qc,nativePlace=place)
 else:
  if not route.endswith('/gp') or 'Gas Plant Production of ' not in name:return pending('Unreviewed legacy full component definition.')
  if not all(product(d,route).get('product')=='petroleum' for d in source['product'].values()):return pending('Legacy route products do not establish one component family.')
  p=mark('subset','All advertised gas-plant products are petroleum liquid components.',product='petroleum');q=process(source['process']['FPF']);qc='FPF';join={'sourceJoin':'Legacy full definition and common petroleum-component route; B1 must verify actual native facets.'}
 if 'pending' in [p['classification'],q['classification']]:return pending('Unreviewed product or process.')
 unit=re.search(r'\(([^()]*)\)\s*$',name)
 if q['classification']=='out of vocabulary':return dict(q,basisLabel=name,unit=unit[1] if unit else None,**join)
 if p['classification']=='out of vocabulary' and qc not in FUEL:return dict(p,basisLabel=name,**join)
 units={'Thousand Barrels','Thousand Barrels per Day','Million Gallons','Million Cubic Feet','Million Pounds','Thousand Gallons','Million Kilowatthours','Thousand Short Tons'}
 if unit and unit[1] not in units:return pending('Unreviewed physical source unit.')
 if modern and unit:
  encoded={'MBBL':'Thousand Barrels','MBBLD':'Thousand Barrels per Day','MMGL':'Million Gallons','MMCF':'Million Cubic Feet','MMLB':'Million Pounds','MGAL':'Thousand Gallons','MMKWH':'Million Kilowatthours'}
  if uc in encoded and encoded[uc]!=unit[1]:return pending('Native unit and full source unit disagree.')
 if qc in FUEL and unit:
  expected={'natural gas':'Million Cubic Feet','coal':'Thousand Short Tons','electricity':'Million Kilowatthours'}.get(q['product'])
  if expected and unit[1]!=expected:return pending('Reviewed fuel-use basis conflicts with source unit.')
 if qc in FUEL:
  if q['product']=='natural gas' and 'Natural Gas' not in name:return pending('Natural-gas process conflicts with full fuel name.')
  r=dict(q,basisLabel=name,unit=unit[1] if unit else None,**join)
  if 'Purchased Electricity' in name:r['sourceScope']='Purchased electricity for plant operations; excludes on-site generation.'
  if qc in ['8NGFSHY','819NGHF']:r['sourceScope']='Natural gas used as hydrogen feedstock; one non-energy use, not total gas consumption.'
 else:
  r=mark('subset','Component fuel; no subset becomes whole biofuels or petroleum.',product=p['product'],activity=q['activity'],basisLabel=name,unit=unit[1] if unit else None,**join)
  if q['activity']=='capacity':r['unitBasis']='Annual production potential (million gallons per year), not observed monthly production; preserve original source unit text.'
 if not unit:r.update(coverageEligible=False,unitValidity='Source title omits unit; verify observation-unit metadata before coverage.')
 if modern and place not in source['duoarea']:r.update(coverageEligible=False,geographyValidity='Native place absent from advertised facet; no guessed crosswalk.')
 if route.endswith('/b100'):r['sourcePeriodNote']='Historical report discontinued after December 2020; successor series requires separate verification.'
 return r

def build(node):
 route=node['route'];inv=i.inventory(route);source={fid:{x['definition']['id']:x['definition'] for x in inv[fid]} for fid in ['product','process','duoarea','series']}
 result={'route':route,'sources':['petroleum-components-source-review.json'],'scope':{'combine':'Raw materials, plant fuel use and output are different measures. Definitions do not prove observations.'},'dataColumns':[dict(id=k,sourceDefinition=v,classification='via full series definition',publicationStatus='unverified') for k,v in node['data'].items()],'facets':{}}
 for fid in ['product','process','series']:
  result['facets'][fid]=[dict(sourceDefinition=x['definition'],frequencies=x['frequencies'],calls=x['calls'],**(product(x['definition'],route) if fid=='product' else process(x['definition']) if fid=='process' else series(x['definition'],route,source))) for x in inv[fid]]
 result['complete']=all(x['classification']!='pending' for rows in result['facets'].values() for x in rows);return result

def main():
 nodes=[n for n in i.read(i.EVIDENCE/'route-census.json')['nodes'] if n['route'] in ROUTES]
 result={'method':'Definition correspondence, not a publication claim.','routes':{n['route']:build(n) for n in nodes}}
 i.write_review(i.EVIDENCE/'petroleum-components-classification.json.gz',result)
 rows=[{'route':route,'facet':fid,**x} for route,v in result['routes'].items() for fid,entries in v['facets'].items() for x in entries if x['classification']=='pending']
 Path('/private/tmp/eia-components-pending.json').write_text(json.dumps(rows,indent=2)+'\n');print(json.dumps({'routes':len(nodes),'complete':sum(x['complete'] for x in result['routes'].values()),'pending':len(rows),'examples':rows[:3]}))
if __name__=='__main__':main()
