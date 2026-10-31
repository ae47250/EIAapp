"""Research-only correspondence for refinery capacity, counts and transfer flows."""
import gzip,importlib.util,json,re
from pathlib import Path
spec=importlib.util.spec_from_file_location('stock',Path(__file__).with_name('coverage-petroleum-stock-cons-classification.py'))
s=importlib.util.module_from_spec(spec);spec.loader.exec_module(s);i=s.i
REVIEW=i.read(i.EVIDENCE/'petroleum-refinery-source-review.json');ROUTES=set(REVIEW['routes'])
PRODUCTS={d['id']:d for d in REVIEW['reviewedProducts']};PROCESSES={d['id']:d for d in REVIEW['reviewedProcesses']}
mark=s.mark;pending=s.pending
COUNTS={'8O0','8OO','8OI'}
OUT_PRODUCTS={'8PH','8PS'}
FEED={'YDC','YDD','YDF','YDR'}
RECEIPTS={k for k,d in PROCESSES.items() if 'Receipts' in d['name']}
STORAGE={k for k,d in PROCESSES.items() if 'Storage Capacity' in d['name']}
UNITS={'4':'Barrels per Calendar Day','5':'Barrels per Stream Day','BSD':'Barrels per Stream Day','6':'Million Cubic Feet per Day','S':'Short Tons per Day','C':'Count','MBBL':'Thousand Barrels'}
def product(d):
 if PRODUCTS.get(d.get('id'))!=d:return pending('Unreviewed full refinery product definition.')
 return mark('out of vocabulary','Structural product placeholder; actual measure is defined by process and full series.')

def process(d):
 code=d.get('id')
 if PROCESSES.get(code)!=d:return pending('Unreviewed full refinery process definition.')
 if code in COUNTS:return mark('out of vocabulary','Count of refinery facilities is neither customer count nor physical capacity.')
 if code in OUT_PRODUCTS:return mark('out of vocabulary','Hydrogen/sulfur are outside the fixed product vocabulary.')
 if code in FEED:return mark('out of vocabulary','Actual fresh-feed input to a processing unit is transformation throughput, not capacity, production or final consumption.')
 if code in RECEIPTS:return mark('out of vocabulary','Refinery delivery receipts are distinct from customs imports, sales and consumption; receipt activity is outside the fixed vocabulary.')
 if code in STORAGE:
  target='biofuels' if any(t in d['name'].lower() for t in ['renewable','biomass','ethanol']) else 'petroleum'
  r=mark('subset','Refinery-only storage capacity is one facility population; individual fuels are further components. Not stock levels.',product=target,activity='capacity',capacityBasis='storage volume',basisLabel=d['name'],broaderComparison='EIA Working and Net Available Shell Storage Capacity report includes other facility populations; compare same product and basis. Not a processing-throughput alternative.')
  if 'Crude Oil' in d['name']:r.update(qualifier='crude oil',qualifierClassification='subset')
  elif 'Gasoline' in d['name']:r.update(qualifier='gasoline',qualifierClassification='subset')
  return r
 if code=='8D0':return mark('whole product','EIA headline operable refinery capacity; includes operating and idle. Broader compatible EIA total takes precedence.',product='petroleum',activity='capacity',capacityBasis='atmospheric crude oil distillation throughput',basisLabel='Operable atmospheric crude oil distillation capacity; includes operating and idle',broaderComparison='Compare compatible refining capacity, not electric generating capacity or storage volume; do not add downstream units.')
 if code in ['8DO','8DI']:return mark('subset','Operating or idle component of broader operable atmospheric crude distillation capacity.',product='petroleum',activity='capacity',broaderMeasure='8D0',capacityBasis='atmospheric crude oil distillation throughput',basisLabel=d['name'])
 return mark('subset','Reviewed capacity of a downstream processing unit or individual petroleum product; not total refinery capacity.',product='petroleum',activity='capacity',capacityBasis='downstream charge or component production capacity',basisLabel=d['name'])

def series(d,route,source):
 if route not in ROUTES or source['series'].get(d.get('id'))!=d:return pending('Unreviewed route or changed full source series.')
 name=d['name'];unit=re.search(r'\(([^()]*)\)\s*$',name)
 if route.endswith('/dwns'):
  if 'Downstream Processing of Fresh Feed Input' not in name or not unit or unit[1]!='Thousand Barrels per Day':return pending('Fresh-feed table and full series disagree.')
  if any(process(x)['classification']!='out of vocabulary' for x in source['process'].values()):return pending('Unreviewed downstream process.')
  return mark('out of vocabulary','Full table and series describe actual transformation throughput, despite YDR short-name Capacity; not an activity in the fixed vocabulary.',basisLabel=name,unit=unit[1],sourceJoin='Full source series and reviewed fresh-feed table. No inferred legacy identifier decomposition.')
 m=re.fullmatch(r'8_NA_([^_]+)_(.+)_([^_]+)',d['id'])
 if not m:return pending('Unreviewed native refinery series structure.')
 code,place,uc=m.groups()
 if code not in source['process'] or '(NA)' not in source['product']:return pending('Native process or placeholder absent from advertised source facets.')
 if product(source['product']['(NA)'])['classification']=='pending':return pending('Changed product placeholder.')
 q=process(source['process'][code])
 if q['classification']=='pending':return q
 if not unit or uc not in UNITS or unit[1]!=UNITS[uc]:return pending('Native unit and full source unit are missing, unknown or disagree.')
 if code in COUNTS and ('Number of ' not in name or unit[1]!='Count'):return pending('Facility-count process conflicts with full source measure.')
 if code in RECEIPTS and 'Refinery Receipts' not in name:return pending('Receipt process conflicts with full source measure.')
 if q.get('activity')=='capacity' and 'Capacity' not in name:return pending('Capacity process conflicts with full source measure.')
 if code=='8D0' and 'Operable Atmospheric Crude Oil Distillation Capacity' not in name:return pending('Whole operable capacity conflicts with full source scope.')
 if code in STORAGE and 'Storage Capacity' not in name:return pending('Storage-volume process conflicts with full source measure.')
 r=dict(q,basisLabel=name,unit=unit[1],nativeProduct='(NA)',nativeProcess=code,nativePlace=place)
 if place not in source['duoarea']:r.update(coverageEligible=False,geographyValidity='Native place absent from advertised facet; no guessed crosswalk.')
 if code in STORAGE:r['sourcePeriodNote']='Historical January 1 refinery storage series; EIA changed collection beginning in 2011. Broader successor report discontinued after March 2024. Do not join histories automatically.'
 if q.get('activity')=='capacity':r['referenceTime']='As of January 1; not an annual sum.'
 if uc in ['4','5','BSD']:r['unitBasis']='Usual operating conditions, allowing downtime' if uc=='4' else 'Maximum input in 24 hours at full capacity; no allowance for downtime'
 return r

def build(node):
 route=node['route'];inv=i.inventory(route);source={fid:{x['definition']['id']:x['definition'] for x in inv[fid]} for fid in ['product','process','duoarea','series']}
 result={'route':route,'sources':['petroleum-refinery-source-review.json'],'scope':{'combine':'Capacity bases, counts, delivery receipts and actual processing inputs stay distinct; definitions do not establish observations.'},'dataColumns':[dict(id=k,sourceDefinition=v,classification='via full series definition',publicationStatus='unverified') for k,v in node['data'].items()],'facets':{}}
 for fid in ['product','process','series']:
  result['facets'][fid]=[dict(sourceDefinition=x['definition'],frequencies=x['frequencies'],calls=x['calls'],**(product(x['definition']) if fid=='product' else process(x['definition']) if fid=='process' else series(x['definition'],route,source))) for x in inv[fid]]
 result['complete']=all(x['classification']!='pending' for rows in result['facets'].values() for x in rows);return result

def main():
 nodes=[n for n in i.read(i.EVIDENCE/'route-census.json')['nodes'] if n['route'] in ROUTES]
 result={'method':'Definition correspondence, not a publication claim.','routes':{n['route']:build(n) for n in nodes}}
 i.write_review(i.EVIDENCE/'petroleum-refinery-classification.json.gz',result)
 rows=[{'route':route,'facet':fid,**x} for route,v in result['routes'].items() for fid,entries in v['facets'].items() for x in entries if x['classification']=='pending']
 Path('/private/tmp/eia-refinery-pending.json').write_text(json.dumps(rows,indent=2)+'\n');print(json.dumps({'routes':len(nodes),'complete':sum(x['complete'] for x in result['routes'].values()),'pending':len(rows),'examples':rows[:3]}))
if __name__=='__main__':main()
