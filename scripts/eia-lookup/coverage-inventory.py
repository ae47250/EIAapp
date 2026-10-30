"""Read all-frequency EIA definitions without network access or app changes."""
import gzip,json,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
EVIDENCE=ROOT/'evidence/eia-coverage'
def read(path):
    data=json.loads(gzip.decompress(path.read_bytes()) if path.suffix=='.gz' else path.read_bytes())
    if isinstance(data,dict) and data.get('storage')=='local-research-evidence-v1':
        source=Path(data['localFile']).expanduser()
        body=source.read_bytes()
        if hashlib.sha256(body).hexdigest()!=data['sha256']:
            raise ValueError('Local research evidence hash mismatch: '+path.name)
        return json.loads(gzip.decompress(body) if source.suffix=='.gz' else body)
    return data

def write_review(path,data):
    """Keep duplicate per-route research outside Git; catalogue definitions stay in Git."""
    body=(json.dumps(data,separators=(',',':'))+'\n').encode()
    body=gzip.compress(body,mtime=0)
    digest=hashlib.sha256(body).hexdigest()
    directory=Path.home()/'Documents/EIAapp-Evidence/20261029/coverage/research-details'
    directory.mkdir(parents=True,exist_ok=True)
    target=directory/(path.name.removesuffix('.gz').removesuffix('.json')+'-'+digest+'.json.gz')
    if target.exists():
        if target.read_bytes()!=body:raise ValueError('Existing evidence content mismatch')
    else:target.write_bytes(body)
    if hashlib.sha256(target.read_bytes()).hexdigest()!=digest:raise ValueError('Evidence copy verification failed')
    from collections import Counter
    records=data.get('series',[])
    for route in data.get('routes',{}).values():
        records+=route.get('dataColumns',[])
        for rows in route.get('facets',{}).values():records+=rows
    pointer={'storage':'local-research-evidence-v1','summary':'Duplicate research classification details; complete candidate definitions remain in series-catalog/. Reproduction requires this verified local evidence or regeneration from committed metadata.','localFile':str(target).replace(str(Path.home()),'~',1),'sha256':digest,'bytes':len(body),'recordCounts':dict(Counter(r.get('classification','unspecified') for r in records))}
    encoded=(json.dumps(pointer,indent=2)+'\n').encode()
    path.write_bytes(gzip.compress(encoded,mtime=0) if path.suffix=='.gz' else encoded)
def inventory(route):
    stem=route.replace('/','__')+'.json.gz'
    base=read(EVIDENCE/'facets'/stem)
    audit=read(EVIDENCE/'facet-frequencies'/stem)
    if not base.get('complete') or not audit.get('complete'):
        raise ValueError('Incomplete facet inventory: '+route)
    out={}
    for frequency,facets in audit['frequencies'].items():
        for fid,record in facets.items():
            bv=base['facets'][fid]['values']
            values=(bv if record.get('usesAllDefaultValues') else [bv[i] for i in record['defaultIndices']])+record.get('additionalDefinitions',[])
            if not record.get('complete') or len(values)!=record['total']:
                raise ValueError('Incomplete frequency facet: '+route+'/'+fid+'/'+frequency)
            target=out.setdefault(fid,{})
            for value in values:
                signature=json.dumps(value,sort_keys=True,separators=(',',':'))
                row=target.setdefault(signature,{'definition':value,'frequencies':[],'calls':[]})
                row['frequencies'].append(frequency)
                row['calls']=sorted(set(row['calls']+record['calls']))
    return {fid:list(rows.values()) for fid,rows in out.items()}
