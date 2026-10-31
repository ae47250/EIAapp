"""Per-place/frequency evidence for missing Set D entries, from full saved research.
Never infer missing data from the absence of a selected default alone.
"""
import gzip,hashlib,importlib.util,json
from pathlib import Path

def module(name):
 s=importlib.util.spec_from_file_location(name,Path(__file__).with_name(name+'.py'));m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
i=module('coverage-inventory');negative=module('coverage-negative');E=i.EVIDENCE
sha=lambda b:hashlib.sha256(b).hexdigest()
class Proof:
 def __init__(self):
  self.original={p['id']:p for p in i.read(E/'b1-request-plan.json')['plans']};self.plan=i.read(E/'reduced-request-plan.json');self.audit=i.read(E/'observation-audit.json')['groups'];self.cross=i.read(E/'place-crosswalk.json')['routes'];self.gaps=i.read(E/'negative-candidates.json')['gaps'];self.cache={}
 def route_has_place(self,route,code):
  c=self.cross[route]
  return code=='USA' and c.get('scopeEvidence',{}).get('placeKind')=='US' or any(x['status']=='mapped' and x['geographyCode']==code for rs in c['facets'].values() for x in rs)
 def get(self,cid,code,frequency):
  kind,product,activity,sector,qualifier=cid.split('|');cell={'id':cid,'placeKind':kind,'product':product,'activity':activity,'sector':sector or None,'qualifier':qualifier or None}
  gaps=[g for g in self.gaps if self.route_has_place(g['route'],code)]
  blockers=negative.blocked(cell,gaps)
  if blockers:return {'verified':False,'reason':'An unresolved metadata definition could fit this specific place','gaps':blockers}
  groups=[g for g in self.plan['groups'] if any(any(c['cellId']==cid for c in self.original[pid]['cells']) for pid in g['originalPlanIds'])]
  relevant=[g for g in groups if self.route_has_place(g['route'],code)]
  if any(g['id'] not in self.audit or not self.audit[g['id']]['validated'] or not self.audit[g['id']]['retrievalComplete'] for g in relevant):return {'verified':False,'reason':'Relevant candidate retrieval/audit incomplete'}
  positive=[];symbolOnly=[];calls=set()
  for g in relevant:
   gid=g['id'];a=self.audit[gid]
   if gid not in self.cache:
    raw=Path(a['localFile']).expanduser().read_bytes();assert sha(raw)==a['sha256'];self.cache[gid]=json.loads(gzip.decompress(raw))
   data=self.cache[gid];calls.update(data['calls'])
   for series in data['series']:
    if series['cellId']!=cid or series['candidateStatus']!='whole product':continue
    for p in series['places'].values():
     if p['geographyCode']!=code:continue
     record={'group':gid,'seriesId':series['id'],'frequency':series['frequency'],'numeric':p['numeric'],'rows':p['rows'],'symbols':p['symbols'],'nativePlaceFilters':p['nativePlaceFilters'],'measureFacets':series['measureFacets']}
     (positive if p['numeric'] else symbolOnly).append(record)
  if positive:return {'verified':False,'reason':'Whole-product observations exist; no missing claim allowed','positive':positive}
  if any(s['frequency']==frequency for s in symbolOnly):return {'verified':False,'reason':'Symbol-only whole series exists: preserve its observations/meanings rather than replace with an empty series','symbolOnly':symbolOnly}
  return {'verified':True,'status':"not in EIA's catalogue" if not relevant else 'EIA returns no data','scope':{'cellId':cid,'geographyCode':code,'requestedFrequency':frequency,'allAdvertisedFrequenciesChecked':True},'proof':'Complete official place/series lists plus every relevant fully paginated candidate group, no unresolved definition that could fit this place, and no numeric whole-product series at any frequency. Not an inference from missing selected default.','groups':[g['id'] for g in relevant],'calls':sorted(calls),'catalogueEvidence':'catalogue-absence-evidence-index.json','placeCrosswalkSHA256':sha((E/'place-crosswalk.json').read_bytes()),'otherNonrequestedSymbolSeries':symbolOnly}
