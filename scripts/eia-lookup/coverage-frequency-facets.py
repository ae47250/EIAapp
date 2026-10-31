"""Audit facet definitions at every advertised frequency, using EIA browser's array format.
Only definitions differing from the default catalogue are repeated in the evidence.
"""
import importlib.util,json,sys
from pathlib import Path
spec=importlib.util.spec_from_file_location('facets',Path(__file__).with_name('coverage-facets.py'))
f=importlib.util.module_from_spec(spec);spec.loader.exec_module(f)
r=f.r

def signature(value):return json.dumps(value,sort_keys=True,separators=(',',':'))
def definition(value):return {k:value[k] for k in ['id','name','alias'] if k in value}
def pack(values,base,calls):
    lookup={signature(v):i for i,v in enumerate(base)}
    indices=[];extra=[]
    for v in values:
        key=signature(v)
        if key in lookup:indices.append(lookup[key])
        else:extra.append(v)
    result={'total':len(values),'calls':calls,'complete':True}
    if len(indices)==len(base) and len(set(indices))==len(base):result['usesAllDefaultValues']=True
    else:result['defaultIndices']=sorted(indices)
    if extra:result['additionalDefinitions']=extra
    return result

def expand(record,base):
    return (base if record.get('usesAllDefaultValues') else [base[i] for i in record['defaultIndices']])+record.get('additionalDefinitions',[])

def collect(c,node):
    stem=node['route'].replace('/','__')+'.json.gz'
    base=r.read(r.EVIDENCE/'facets'/stem)
    if not base.get('complete'):raise RuntimeError('Default facet inventory is incomplete: '+node['route'])
    metadata=next(rec for rec in c.records if rec['id']==node['metadataCall'])
    raw=r.RAW/metadata['file'];assert r.digest(raw.read_bytes())==metadata['sha256']
    default=json.loads(raw.read_text())['response']['defaultFrequency']
    out=r.EVIDENCE/'facet-frequencies'/stem
    result=r.read(out) if out.exists() else {'route':node['route'],'defaultFrequency':default,'defaultDefinitions':'../facets/'+stem,'frequencies':{},'complete':False}
    for frequency in [v['id'] for v in node['frequencies']]:
        records=result['frequencies'].setdefault(frequency,{})
        for facet in node['facets']:
            fid=facet['id']
            if records.get(fid,{}).get('complete'):continue
            bv=base['facets'][fid]
            if frequency==default:
                records[fid]=pack(bv['values'],bv['values'],bv['calls'])
                records[fid]['source']='default endpoint at route defaultFrequency'
            else:
                params=[('frequency[]',frequency)]
                data,rec=c.get(node['route']+'/facet/'+fid,params,kind='facet')
                response=data['response'];total=int(response['totalFacets']);values=response['facets'];calls=[rec['id']]
                while len(values)<total:
                    page,pr=c.get(node['route']+'/facet/'+fid,params+[('offset',len(values)),('length',5000)],kind='facet')
                    rows=page['response']['facets']
                    if not rows or int(page['response']['totalFacets'])!=total:raise RuntimeError('Frequency facet paging stalled or total changed')
                    values+=rows;calls.append(pr['id'])
                if len(values)!=total or len({signature(v) for v in values})!=total:raise RuntimeError('Frequency facet count/duplicate mismatch')
                records[fid]=pack([definition(v) for v in values],bv['values'],calls)
                assert len(expand(records[fid],bv['values']))==total
            r.write(out,result)
        print(json.dumps({'route':node['route'],'frequency':frequency,'facets':len(records),'calls':len(c.records)}),flush=True)
    result['complete']=True;r.write(out,result)
    return result

def main():
    c=r.Collector();routes=sys.argv[1:]
    for n in json.loads((r.EVIDENCE/'route-census.json').read_text())['nodes']:
        if n['hasRoutesArray'] or n.get('classification')=='DOES NOT FIT':continue
        if routes and n['route'] not in routes:continue
        collect(c,n)
    print(json.dumps({'complete':True,'calls':len(c.records)}),flush=True)
if __name__=='__main__':main()
