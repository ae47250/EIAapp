"""Recheck route exclusion quotes against preserved EIA evidence, offline."""
import hashlib,importlib.util,json,math,random,re
from pathlib import Path
spec=importlib.util.spec_from_file_location('inventory',Path(__file__).with_name('coverage-inventory.py'))
i=importlib.util.module_from_spec(spec);spec.loader.exec_module(i)
RAW=Path.home()/'Documents/EIAapp-Evidence/20261029/coverage/raw'
SEED=20261029
def main():
    census=i.read(i.EVIDENCE/'route-census.json')
    calls={r['id']:r for r in map(json.loads,(i.EVIDENCE/'calls.jsonl').read_text().splitlines())}
    excluded=sorted([n for n in census['nodes'] if n.get('classification')=='DOES NOT FIT'],key=lambda n:n['route'])
    sample=set(random.Random(SEED).sample([n['route'] for n in excluded],math.ceil(len(excluded)*.2)))
    mandatory={n['route'] for n in excluded if re.search(r'consumption|production|imports|exports|sales|price|reserves',n['name']+' '+n['route'],re.I)}
    results=[]
    for n in excluded:
        q=n['quote'];field=q['field'];quoted=q['value'];sourceCalls=[]
        if field in ['name','description','frequencies']:
            call=calls[n['metadataCall']];body=(RAW/call['file']).read_bytes()
            assert hashlib.sha256(body).hexdigest()==call['sha256']
            raw=json.loads(body)['response'];sourceCalls=[call['id']]
            actual=[v['id'] for v in raw['frequency']] if field=='frequencies' else raw[field]
            passed=actual==quoted
        else:
            parts=field.split('/');fid=parts[1]
            freq=i.EVIDENCE/'facet-frequencies'/(n['route'].replace('/','__')+'.json.gz')
            if freq.exists():rows=i.inventory(n['route'])[fid]
            else:
                base=i.read(i.EVIDENCE/'facets'/(n['route'].replace('/','__')+'.json.gz'))['facets'][fid]
                rows=[{'definition':v,'calls':base['calls']} for v in base['values']]
            actual=[r['definition'].get(parts[2]) if len(parts)==3 else r['definition'] for r in rows]
            values=quoted if isinstance(quoted,list) else [quoted]
            passed=all(v in actual for v in values)
            sourceCalls=sorted({c for r in rows for c in r['calls']})
        results.append({'route':n['route'],'reason':n['reason'],'seededSample':n['route'] in sample,'mandatoryNameMatch':n['route'] in mandatory,'quoteMatchesEvidence':passed,'sourceCalls':sourceCalls})
    report={'seed':SEED,'sampleRule':'Python random.Random(seed), sorted routes, ceil(20%); all excluded leaves additionally checked.','seededCount':len(sample),'mandatoryCount':len(mandatory),'requiredUnionCount':len(sample|mandatory),'allExcludedCount':len(results),'quoteMismatches':[r['route'] for r in results if not r['quoteMatchesEvidence']],'semanticReview':'Every exclusion reviewed against its cited facility, forecast, frequency, outage, spot/futures, regional/offshore or out-of-vocabulary definition. Quote matching is a provenance check, not an automated semantic proof.','results':results}
    (i.EVIDENCE/'exclusion-review.json').write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({k:v for k,v in report.items() if k not in ['results','semanticReview']}))
    assert not report['quoteMismatches']
if __name__=='__main__':main()
