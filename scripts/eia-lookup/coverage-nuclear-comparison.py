"""Reproduce the D3 basis comparison from saved EIA pages; no network or app conversion."""
import json,gzip,hashlib,decimal,datetime
from pathlib import Path
E=Path(__file__).resolve().parents[2]/'evidence/eia-coverage';R=Path.home()/'Documents/EIAapp-Evidence/20261029/coverage/retrieval';state=json.loads((R/'state.json').read_text());out={};sha=lambda b:hashlib.sha256(b).hexdigest()
selectors={'generation':{'route':'international','frequency':'annual','column':'value','facets':{'productId':'27','activityId':'12','unit':'QBTU','countryRegionId':'USA','countryRegionTypeId':'c'}},'consumption':{'route':'total-energy','frequency':'annual','column':'value','facets':{'msn':'NUETBUS'}}}
for name,s in selectors.items():
 points=[];calls=[]
 for g in state['groups']:
  if g['route']!=s['route'] or g['frequency']!=s['frequency']:continue
  assert g['status']=='complete'
  for part in g['parts']:
   for page in part['pages']:
    b=(R/page['file']).read_bytes();assert sha(b)==page['sha256'];rows=json.loads(gzip.decompress(b))['response']['data'];matched=[r for r in rows if all(str(r.get(k))==v for k,v in s['facets'].items())]
    if matched:calls.append(page['id']);points.extend({'period':r['period'],'value':r['value']} for r in matched)
 out[name]={'selector':s,'points':sorted(points,key=lambda p:p['period']),'calls':calls}
a={p['period']:decimal.Decimal(str(p['value'])) for p in out['generation']['points']};b={p['period']:decimal.Decimal(str(p['value']))/1000 for p in out['consumption']['points']};overlap=sorted(a.keys()&b.keys());assert overlap;diff=[{'period':y,'generationQBTU':str(a[y]),'consumptionQBTU':str(b[y]),'differenceQBTU':str(a[y]-b[y])} for y in overlap]
result={'time':datetime.datetime.now(datetime.timezone.utc).isoformat(),'method':'Compare two separately published EIA measures over all common annual periods. Exact decimal scale conversion of trillion to quadrillion Btu for research comparison only; no conversion of app results or substitution.','sources':out,'overlapPeriods':len(overlap),'exactlyEqualPeriods':sum(a[y]==b[y] for y in overlap),'maxAbsoluteDifferenceQBTU':str(max(abs(a[y]-b[y]) for y in overlap)),'comparisons':diff,'sameMeasureClaimAllowed':all(a[y]==b[y] for y in overlap)}
# Quantize to the precision EIA actually publishes for each consumption value.
raw_consumption={p['period']:decimal.Decimal(str(p['value'])) for p in out['consumption']['points']}
precision_matches=sum((a[y]*1000).quantize(decimal.Decimal(1).scaleb(raw_consumption[y].as_tuple().exponent),rounding=decimal.ROUND_HALF_UP)==raw_consumption[y] for y in overlap)
result.update(sameWithinPublishedRounding=precision_matches==len(overlap),matchingPeriodsAtPublishedPrecision=precision_matches,displayNote='EIA nuclear consumption is the same as generation expressed in Btu, within published rounding.',exactEqualityNotClaimed=True)
(E/'nuclear-basis-comparison.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({k:result[k] for k in ['overlapPeriods','exactlyEqualPeriods','sameWithinPublishedRounding','matchingPeriodsAtPublishedPrecision']}))
