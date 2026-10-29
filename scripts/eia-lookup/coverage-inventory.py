"""Read all-frequency EIA definitions without network access or app changes."""
import gzip,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
EVIDENCE=ROOT/'evidence/eia-coverage'
def read(path):
    return json.loads(gzip.decompress(path.read_bytes()) if path.suffix=='.gz' else path.read_bytes())
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
