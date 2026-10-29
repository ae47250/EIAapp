"""Inventory every measure-defining facet of FITS routes; research only.
Classification is deliberately pending until reviewed. No observation or app calls.
"""
import gzip,hashlib,importlib.util,json
from pathlib import Path
spec=importlib.util.spec_from_file_location('inventory',Path(__file__).with_name('coverage-inventory.py'))
i=importlib.util.module_from_spec(spec);spec.loader.exec_module(i)
MEASURE_FACETS={'productId','activityId','seriesId','msn','series','product','process','coalRankId','mineTypeId','marketTypeId','exportImportType','sector','sectorid','fueltypeid','fuelTypeId','technology','producertypeid','energysourceid','gradeId'}
def encoded(data):return (json.dumps(data,separators=(',',':'))+'\n').encode()
def build_node(node):
    source=i.inventory(node['route'])
    result={'route':node['route'],'classificationComplete':False,'publicationStatus':'Not checked: these definitions identify candidates, not proof of observations or valid facet combinations.','metadataCall':node['metadataCall'],'dataColumns':[{ 'id':key,'definition':value,'classification':'pending'} for key,value in node['data'].items()],'facets':{}}
    for fid,rows in source.items():
        if fid not in MEASURE_FACETS:continue
        result['facets'][fid]=[dict(row,classification='pending') for row in rows]
    reviews={'seds':('seds-classification.json','seriesId'),'total-energy':('total-energy-classification.json','msn')}
    if node['route'] in reviews:
        filename,facet=reviews[node['route']]
        review=i.read(i.EVIDENCE/filename)
        decisions={json.dumps(r['sourceDefinition'],sort_keys=True):r for r in review['series']}
        for row in result['facets'][facet]:
            decision=decisions[json.dumps(row['definition'],sort_keys=True)]
            row.update({k:v for k,v in decision.items() if k not in ['sourceDefinition','frequencies','calls']})
        result['dataColumns'][0]['classification']='via '+facet
        result['classificationComplete']=review['complete'] and all(r['classification']!='pending' for r in result['facets'][facet])
    if node['route'].startswith('electricity/'):
        review=i.read(i.EVIDENCE/'electricity-classification.json')['routes'][node['route']]
        columns={r['id']:r for r in review['dataColumns']}
        for row in result['dataColumns']:
            decision=columns[row['id']]
            if row['definition']!=decision['sourceDefinition']:raise ValueError('Electricity column definition changed')
            row.update({k:v for k,v in decision.items() if k not in ['id','sourceDefinition']})
        for fid,rows in result['facets'].items():
            decisions={json.dumps(r['sourceDefinition'],sort_keys=True):r for r in review['facets'][fid]}
            for row in rows:
                decision=decisions[json.dumps(row['definition'],sort_keys=True)]
                row.update({k:v for k,v in decision.items() if k not in ['sourceDefinition','frequencies','calls']})
        result['classificationComplete']=review['complete']
        result['classificationSources']=review['sources']
    if node['route']=='international':
        review=i.read(i.EVIDENCE/'international-classification.json')
        for facet,key in [('productId','products'),('activityId','activities')]:
            for row in result['facets'][facet]:
                decision=review[key][row['definition']['id']]
                if decision['source']['definition']!=row['definition']:
                    raise ValueError('Classification source definition changed')
                row.update({k:v for k,v in decision.items() if k!='source'})
        result['dataColumns'][0]['classification']='via facet combinations'
        combinations=[]
        for product in result['facets']['productId']:
            for activity in result['facets']['activityId']:
                frequencies=sorted(set(product['frequencies']) & set(activity['frequencies']))
                if not frequencies:continue
                statuses={product['classification'],activity['classification']}
                status=next((x for x in ['out of vocabulary','pending','subset'] if x in statuses),'whole product')
                item={'productId':product['definition']['id'],'activityId':activity['definition']['id'],'frequencies':frequencies,'classification':status,'publicationStatus':'unverified'}
                for key in ['product','qualifier','qualifierClassification','placeRole']:
                    if key in product:item[key]=product[key]
                if 'activity' in activity:item['activity']=activity['activity']
                if activity.get('geographicRestriction'):item['geographicRestriction']=activity['geographicRestriction']
                if product.get('placeRole')=='trade partner' and item['activityId']!='3':
                    item['classification']='out of vocabulary'
                    item['reason']='An import-origin breakdown does not define the other activity.'
                if status!='whole product' and item.get('qualifierClassification')=='whole product' and activity['classification']!='whole product':
                    item['qualifierClassification']=activity['classification']
                combinations.append(item)
        result['candidateCombinations']=combinations
        result['classificationComplete']=all(x['classification']!='pending' for x in combinations)
    return result

def main():
    out=i.EVIDENCE/'series-catalog';out.mkdir(exist_ok=True)
    summary={'complete':False,'source':'Current collected EIA metadata, every advertised frequency. Place correspondence is separate.','routes':{},'counts':{}}
    counts={}
    for node in i.read(i.EVIDENCE/'route-census.json')['nodes']:
        if node.get('classification')!='FITS':continue
        data=build_node(node);target=out/(node['route'].replace('/','__')+'.json.gz')
        body=gzip.compress(encoded(data),mtime=0);target.write_bytes(body)
        per={fid:len(rows) for fid,rows in data['facets'].items()};per['dataColumns']=len(data['dataColumns'])
        for key,count in per.items():counts[key]=counts.get(key,0)+count
        from collections import Counter
        classCounts=Counter(r['classification'] for rows in data['facets'].values() for r in rows)
        summary['routes'][node['route']]={'file':str(target.relative_to(i.EVIDENCE)),'sha256':hashlib.sha256(body).hexdigest(),'counts':per,'classificationCounts':dict(classCounts),'classificationComplete':data['classificationComplete']}
        if 'candidateCombinations' in data:summary['routes'][node['route']]['combinationClassifications']=dict(Counter(r['classification'] for r in data['candidateCombinations']))
    summary['counts']=counts
    (i.EVIDENCE/'series-catalog-summary.json').write_text(json.dumps(summary,indent=2)+'\n')
    print(json.dumps({'routes':len(summary['routes']),'counts':counts,'compressedBytes':sum(p.stat().st_size for p in out.iterdir())}))
if __name__=='__main__':main()
