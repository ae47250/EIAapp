"""Generate compact exact selectors from verified mapped cells, never raw observations."""
import collections,gzip,hashlib,importlib.util,json
from pathlib import Path
s=importlib.util.spec_from_file_location('i',Path(__file__).with_name('coverage-inventory.py'));i=importlib.util.module_from_spec(s);s.loader.exec_module(i)
canonical=lambda x:json.dumps(x,sort_keys=True,separators=(',',':'))
def original_match(catalog,cell,d):
 kind,p,a,sector,qualifier=cell['cellId'].split('|')
 for r in catalog['rows']:
  if r['product']!=p or r['activity']!=a or (r.get('qualifier') or '')!=qualifier or d['frequency'] not in r['frequencies'] or r['route']!=d['route'] or r['dataColumn']!=d['dataColumn'] or r['unit'].lower()!=d['unitName'].lower():continue
  if r.get('excludedProducts') or r.get('excludedSectors') or r.get('region'):continue
  if r['geographyKind']!=dict(country='country',World='eia_region',US='united_states',state='state')[kind]:continue
  mapping=catalog['routes'][r['route']];value=mapping['geographies'].get(d['geographyCode'])
  if not value:continue
  sectors=r.get('sectorMapping',{}).get(sector) if r.get('sectorSupported') else {} if not sector else None
  if sectors is None:continue
  facets={**r['fixedFacets'],mapping['geographyFacet']:value,**mapping.get('extraGeographyFacets',{}).get(d['geographyCode'],{}),**sectors}
  if facets==d['facets']:return r['key']
 return None

def generate(table,selected,checks,cross,catalog):
 mapped={c['id'] for c in table['cells'] if c['status']=='mapped'}
 verified={r['key'] for r in checks['records'] if r['pass']};assert len(verified)==len(checks['records']) and not checks['unsupported']
 grouped=collections.defaultdict(list)
 for cell in selected['mappedCandidateCells']:
  if cell['cellId'] not in mapped:continue
  for d in cell['defaults']:
   key=hashlib.sha256(canonical([cell['cellId'],d]).encode()).hexdigest()[:24];assert key in verified
   original=original_match(catalog,cell,d)
   g=(cell['cellId'],d['route'],d['dataColumn'],d['frequency'],d['unitName'],d['basisLabel'],original)
   grouped[g].append(d)
 nuclear=i.read(i.EVIDENCE/'nuclear-basis-comparison.json')
 rows=[];overlays=[]
 for g,ds in sorted(grouped.items(),key=lambda x:canonical(x[0])):
  cid,route,column,freq,unit,basis,original=g;kind,p,a,sector,qualifier=cid.split('|');common={k:v for k,v in ds[0]['facets'].items() if all(d['facets'].get(k)==v for d in ds)}
  place={d['geographyCode']:{k:v for k,v in d['facets'].items() if k not in common} for d in ds};assert len(place)==len(ds)
  description=basis
  for note in dict.fromkeys(str(n) for d in ds for n in d.get('scopeNotes',[]) if n):description+='; '+note
  n=nuclear['sources']['consumption']['selector']
  if nuclear.get('sameWithinPublishedRounding') and route==n['route'] and column==n['column'] and all(all(d['facets'].get(k)==v for k,v in n['facets'].items()) for d in ds):description+='; '+nuclear['displayNote']
  if qualifier:description+='; '+qualifier.title()+' (part of '+p+')'
  if p=='electricity' and a=='consumption' and kind=='state':description+='; Retail sales; excludes electricity generated and used on-site'
  scope=cross['routes'][route].get('scopeEvidence')
  row={'key':original or 'coverage-'+hashlib.sha256(canonical(g).encode()).hexdigest()[:20],'generatedFrom':cid,'geographyKind':{'country':'country','World':'eia_region','US':'united_states','state':'state'}[kind],'placeFacets':place,'product':p,'activity':a,'qualifier':qualifier or None,'sector':sector or None,'sectorSupported':bool(sector),'sectorMapping':{sector:{}} if sector else {},'route':route,'dataColumn':column,'fixedFacets':common,'frequencies':[freq],'unit':unit,'reportedUnits':sorted({v for d in ds for v in [d['unit'],d['unitName']]}),'basisLabel':basis,'description':description,'eiaName':basis,'otherMeasuresExist':any(d['alternativeCount'] for d in ds),'sampleGeography':ds[0]['geographyCode'],'required':False,'verification':'verified','metadataReferences':['evidence/eia-coverage/coverage-table.json','evidence/eia-coverage/coverage-selection-details.json','evidence/eia-coverage/row-replay-checks.json']}
  if scope:
   assert kind=='US' and set(place)=={'USA'};row['documentedUSScope']=scope
  (overlays if original else rows).append(row)
 return {'schemaVersion':1,'scopeRoutes':{r:v['scopeEvidence'] for r,v in cross['routes'].items() if v.get('scopeEvidence')},'rows':rows,'overlays':overlays,'mappedCells':sorted(mapped),'verification':'Every exact place/frequency selector passed replay of complete EIA observations; no periods stored. Original rows retained; exact duplicate selectors reuse original keys through coverage overlays.'}
if __name__=='__main__':
 E=i.EVIDENCE;catalog=i.read(i.ROOT/'data/eia/lookup-list.json');out=generate(i.read(E/'coverage-table.json'),i.read(E/'coverage-selection-details.json'),i.read(E/'row-replay-checks.json'),i.read(E/'place-crosswalk.json'),catalog)
 p=i.ROOT/'data/eia/lookup-coverage.json.gz';p.write_bytes(gzip.compress((canonical(out)+'\n').encode(),mtime=0));print(json.dumps({'generatedRows':len(out['rows']),'originalRowOverlays':len(out['overlays']),'mappedCells':len(out['mappedCells']),'bytes':p.stat().st_size}))
