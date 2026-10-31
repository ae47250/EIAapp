"""Collect complete facet definitions for candidate leaves; never retrieve observations."""
import importlib.util,json,sys
from pathlib import Path
spec=importlib.util.spec_from_file_location('research',Path(__file__).with_name('coverage-research.py'))
r=importlib.util.module_from_spec(spec);spec.loader.exec_module(r)

def collect(c,node):
    route=node['route'];out=r.EVIDENCE/'facets'/(route.replace('/','__')+'.json.gz')
    result=r.read(out) if out.exists() else {'route':route,'metadataCall':node['metadataCall'],'complete':False,'facets':{}}
    for facet in node['facets']:
        fid=facet['id']
        if result['facets'].get(fid,{}).get('complete'):continue
        data,rec=c.get(route+'/facet/'+fid,kind='facet')
        response=data['response'];total=int(response['totalFacets']);values=response['facets'];calls=[rec['id']]
        if not isinstance(values,list):raise RuntimeError('Unexpected facet values shape')
        while len(values)<total:
            page,pr=c.get(route+'/facet/'+fid,{'offset':len(values),'length':5000},kind='facet')
            rows=page['response']['facets']
            if not rows or int(page['response']['totalFacets'])!=total:raise RuntimeError('Facet total changed or paging stalled')
            values+=rows;calls.append(pr['id'])
        ids=[str(v['id']) for v in values]
        if len(values)!=total or len({json.dumps(v,sort_keys=True) for v in values})!=total:raise RuntimeError('Facet count or duplicate-page mismatch: '+route+'/'+fid)
        # Definitions only; raw API responses remain in durable local storage.
        result['facets'][fid]={'description':facet['description'],'total':total,'uniqueIds':len(set(ids)),'duplicateIds':sorted({v for v in ids if ids.count(v)>1}),'complete':True,'calls':calls,'values':[{k:v[k] for k in ['id','name','alias'] if k in v} for v in values]}
        r.write(out,result)
        print(json.dumps({'route':route,'facet':fid,'values':total,'calls':len(c.records)}),flush=True)
    result['complete']=len(result['facets'])==len(node['facets'])
    result['completenessScope']='All entries returned by default facet endpoints; frequency-specific completeness is not established.'
    r.write(out,result)
    return result

def main():
    c=r.Collector();census=json.loads((r.EVIDENCE/'route-census.json').read_text())
    routes=sys.argv[1:]
    for n in census['nodes']:
        if n['hasRoutesArray'] or n.get('classification')=='DOES NOT FIT':continue
        if routes and n['route'] not in routes:continue
        collect(c,n)
    print(json.dumps({'complete':True,'calls':len(c.records)}),flush=True)
if __name__=='__main__':main()
