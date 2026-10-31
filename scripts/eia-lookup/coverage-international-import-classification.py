"""Research-only import correspondence. No app rules or publication claims.
Official source definitions and pre-edit expectations: international-import-source-review.json.
Product correspondence does not establish all-partner coverage.
"""
import importlib.util,json
from pathlib import Path
spec=importlib.util.spec_from_file_location('inventory',Path(__file__).with_name('coverage-inventory.py'))
i=importlib.util.module_from_spec(spec);spec.loader.exec_module(i)
SOURCE='international-import-source-review.json'

def classify(definition,review,crosswalk):
    code=definition['id'];native=review['productDefinition'];pa=review['productActivityDefinition']
    if native!={'id':int(code),'name':definition['name'],'parent':5}:
        raise ValueError('International product definition changed')
    if pa['productid']!=int(code) or pa['activityid']!=3 or pa['base_unit']!='TBPD':
        raise ValueError('International import activity or unit changed')
    title=review['subjectLabel']+' petroleum and other liquids gross imports'
    if code=='78':title+=' from OPEC'
    if pa['title']!=title:raise ValueError('International import source title changed')
    selected=review['selectionDefinitions']
    if len(selected)!=1 or any(r.get(k)!=v for r in selected for k,v in {'productid':int(code),'activityid':3,'toplevelproductid':5,'toplevelproductname':'petroleum and other liquids','frequencycode':'M','unitcode':'TBPD'}.items()):
        raise ValueError('International browser selection definition changed')
    subject=review['subjectGeographyCode']
    if subject:
        matches=[r for r in crosswalk if r['status']=='mapped' and r['geographyCode']==subject and r['definition']['name']==review['subjectName']]
        if not matches:raise ValueError('Fixed importer not verified in approved crosswalk')
    return {
        'classification':'whole product','product':'petroleum','placeRole':'trade partner',
        'reason':'Whole petroleum and other liquids product definition; importing subject is fixed, while countryRegionId identifies suppliers. Product classification is not an all-source coverage claim.',
        'basisLabel':pa['title']+'; by source country or country group',
        'subjectName':review['subjectName'],'subjectGeographyCode':subject,'subjectPlaceKind':review['subjectPlaceKind'],
        'geographyConstraint':'countryRegionId is the supplier. Never map its code to the importing subject or expand an aggregate importer into its members.',
        'partnerCoverageConstraint':'Require an independently documented all-source aggregate before accepting total imports; never sum supplier or overlapping group values.',
        'sourceRestriction':'OPEC' if code=='78' else 'source country or country group',
        'coverageEligible':False,
        'coverageEligibilityReason':'No all-source aggregate verified; '+('importing aggregate is outside the four place kinds.' if subject is None else 'retain as a candidate for B1 aggregate verification only.'),
        'publicationStatus':'unverified','definitionEvidence':SOURCE,
    }

def main():
    review=i.read(i.EVIDENCE/SOURCE)
    path=i.EVIDENCE/'international-classification.json';data=i.read(path)
    crosswalk=i.read(i.EVIDENCE/'place-crosswalk.json')['routes']['international']['facets']['countryRegionId']
    for code,row in review['products'].items():
        original=data['products'][code]['source']
        data['products'][code]={'source':original,**classify(original['definition'],row,crosswalk)}
    data['complete']=all(r['classification']!='pending' for group in ['products','activities'] for r in data[group].values())
    data['importDefinitionEvidence']=SOURCE
    data['scope']='Concept classification only. All dimensions, fixed importing subject, supplier coverage, units and observations must be verified separately. No current coverage claim.'
    path.write_text(json.dumps(data,indent=2)+'\n')
    print(json.dumps({'importDefinitions':len(review['products']),'complete':data['complete'],'acceptedForCoverage':0}))
if __name__=='__main__':main()
