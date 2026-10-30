"""Exact-join, missingness and scope properties against synthetic observations."""
import importlib.util,unittest,random,copy,tempfile,gzip,json,hashlib
from pathlib import Path
s=importlib.util.spec_from_file_location('obs',Path(__file__).with_name('coverage-observations.py'));m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
class ObservationTests(unittest.TestCase):
 def test_symbols_are_never_numeric_zero(self):
  for x in ['--','NA','W','(s)','*','',None,True,False,'NaN','inf']:self.assertIsNone(m.numeric(x),repr(x))
 def test_only_finite_numeric_values_count(self):
  for x in ['0',0,'0.00','-0',' 0 ']:self.assertEqual(m.numeric(x),0)
  for x in ['1','-1.7','1e2',4.2]:self.assertIsNotNone(m.numeric(x))
 def test_units_are_column_specific_and_never_converted(self):
  r={'a-units':'Btu','b-units':'tonnes','unit':'QBTU'};self.assertEqual(m.unit_for(r,'a'),'Btu');self.assertEqual(m.unit_for(r,'b'),'tonnes');self.assertIsNone(m.unit_for(r,'missing'));self.assertEqual(m.unit_for(r,'value'),'QBTU')
 def test_unit_fallback_requires_verified_column_definition(self):
  cat={'dataColumns':[{'id':'inventory','definition':{'unit':'tons'}}]}
  self.assertEqual(m.unit_for({},'inventory',cat),'tons');self.assertIsNone(m.unit_for({},'unknown',cat))
  self.assertEqual(m.unit_for({'inventory-units':'kg'},'inventory',cat),'kg')
 def test_id_only_trade_direction_retains_its_verified_meaning(self):
  cat={'dataColumns':[{'id':'price','basisLabel':'Coal trade unit value'}],'facets':{'direction':[{'definition':{'id':'Exports'},'frequencies':['annual'],'product':'coal','activity':'exports','calls':[1]}]}}
  label=m.basis({'direction':'Exports'},'price',cat,'annual')['label'];self.assertIn('exports',label);self.assertIn('Coal trade unit value',label)
 def fixtures(self):
  p={'cellId':'country|coal|production||','column':'value','placeFacetKeys':['place'],'placeCodes':['ISL','NOR'],'filters':{'place':['IC','NO'],'product':['coal','gas'],'activity':['production','consumption']},'cells':[{'cellId':'country|coal|production||','candidateStatus':'whole product','allowedMeasureFilters':[{'product':['coal'],'activity':['production']},{'product':['gas'],'activity':['consumption']}]}]}
  cross={'facets':{'place':[{'definition':{'id':n},'status':'mapped','geographyCode':c,'frequencies':['annual']} for n,c in [('IC','ISL'),('NO','NOR')]]}}
  return p,cross
 def test_union_does_not_authorize_crossed_combinations(self):
  p,c=self.fixtures();matcher=m.Matcher([p],c,'annual')
  self.assertEqual(len(list(matcher.find({'place':'IC','product':'coal','activity':'production'}))),1)
  self.assertEqual(list(matcher.find({'place':'IC','product':'coal','activity':'consumption'})),[])
 def test_unknown_geography_never_matches(self):
  p,c=self.fixtures();self.assertEqual(list(m.Matcher([p],c,'annual').find({'place':'ZZ','product':'coal','activity':'production'})),[])
 def test_frequency_specific_crosswalk(self):
  p,c=self.fixtures();self.assertEqual(list(m.Matcher([p],c,'monthly').find({'place':'IC','product':'coal','activity':'production'})),[])
 def test_no_place_route_requires_documented_us_scope(self):
  p,c=self.fixtures();p.update({'cellId':'US|coal|production||','placeFacetKeys':[],'placeCodes':['USA'],'filters':{'product':['coal']}});p['cells'][0]['cellId']=p['cellId']
  row={'product':'coal','activity':'production'};self.assertEqual(list(m.Matcher([p],{},'annual').find(row)),[])
  cross={'scopeEvidence':{'placeKind':'US'}};self.assertEqual(list(m.Matcher([p],cross,'annual').find(row))[0][-1],'USA')
  p['cellId']='state|coal|production||';self.assertEqual(list(m.Matcher([p],cross,'annual').find(row)),[])
 def test_required_place_filters_are_preserved(self):
  p,c=self.fixtures();c['facets']['place'][0]['requiredFilters']={'type':['state']};matcher=m.Matcher([p],c,'annual');row={'place':'IC','product':'coal','activity':'production','type':'country'}
  self.assertEqual(list(matcher.find(row)),[]);row['type']='state';self.assertTrue(list(matcher.find(row)))
 def test_seeded_exact_join_rejects_unapproved_tuples(self):
  rng=random.Random(20261030);p,c=self.fixtures();matcher=m.Matcher([p],c,'annual')
  for _ in range(250):
   place=rng.choice(['IC','NO','ZZ']);product=rng.choice(['coal','gas','petroleum']);activity=rng.choice(['production','consumption','prices']);r={'place':place,'product':product,'activity':activity};expected=place in ['IC','NO'] and (product,activity) in [('coal','production'),('gas','consumption')]
   self.assertEqual(bool(list(matcher.find(r))),expected,r)
 def test_frequency_periods(self):
  for p,f in [('2024','annual'),('2024-01','monthly'),('2024-Q2','quarterly'),('2024-01-05','weekly')]:self.assertTrue(m.period_valid(p,f))
  for p,f in [('2024-01','annual'),('2024-13','monthly'),('2024-Q5','quarterly')]:self.assertFalse(m.period_valid(p,f))
class AuditTests(unittest.TestCase):
 fixtures=ObservationTests.fixtures
 def audit(self,rows,frequency='annual',complete=True,attributes=None):
  p,c=self.fixtures();p['id']='p';p['route']='route';p['frequency']='annual'
  group={'id':'g','route':'route','frequency':'annual','columns':['value'],'originalPlanIds':['p'],'parts':[]}
  catalog={'dataColumns':[{'id':'value','definition':{'units':'tonnes'}}],'facets':{}}
  node={'facets':[{'id':x} for x in ['place','product','activity']+([a['field'] for a in attributes] if attributes else [])]}
  with tempfile.TemporaryDirectory() as temp:
   old=m.RUN;m.RUN=Path(temp)
   try:
    body=gzip.compress(json.dumps({'response':{'frequency':frequency,'total':len(rows),'data':rows}}).encode());(m.RUN/'page.gz').write_bytes(body)
    group['parts']=[{'id':'part','params':{'facets':p['filters']},'status':'complete' if complete else 'not checked','total':len(rows),'pages':[{'id':1,'offset':0,'rows':len(rows),'file':'page.gz','sha256':hashlib.sha256(body).hexdigest()}]}]
    return m.audit_group(group,{'p':p},c,node,catalog,attributes)
   finally:m.RUN=old
 def row(self,**extra):return {'period':'2020','place':'IC','product':'coal','activity':'production','value':'0','unit':'tonnes',**extra}
 def test_duplicate_native_period_identity_fails_audit(self):
  result=self.audit([self.row(),self.row(value='1')]);self.assertFalse(result['validated']);self.assertEqual(result['counts']['duplicateIdentities'],1)
 def test_wrong_frequency_fails_audit(self):self.assertFalse(self.audit([self.row()],frequency='monthly')['validated'])
 def test_outside_filters_fails_audit(self):self.assertFalse(self.audit([self.row(place='ZZ')])['validated'])
 def test_partial_retrieval_is_not_complete(self):self.assertFalse(self.audit([self.row()],complete=False)['retrievalComplete'])
 def test_zero_and_symbol_counts_remain_distinct(self):
  result=self.audit([self.row(),self.row(period='2021',value='--')]);p=next(iter(result['series'][0]['places'].values()));self.assertEqual(p['numeric'],1);self.assertEqual(p['zero'],1);self.assertEqual(p['symbols'],{'--':1})
 def test_distinct_units_never_combine(self):
  result=self.audit([self.row(),self.row(period='2021',unit='Btu')]);self.assertEqual(len(result['series']),2)
class AttributeTests(unittest.TestCase):
 fixtures=ObservationTests.fixtures
 audit=AuditTests.audit
 row=AuditTests.row
 def attributes(self):return [{'field':'flag','descriptionField':'flagName','definitions':[{'definition':{'id':v}} for v in ['5','1']],'nonnumericStatusCodes':['1']}]
 def test_observation_flags_do_not_split_history(self):
  r=self.audit([self.row(),self.row(period='2021',value='.0651',flag='5',flagName='Rounds to zero')],attributes=self.attributes());self.assertTrue(r['validated']);self.assertEqual(len(r['series']),1);p=next(iter(r['series'][0]['places'].values()));self.assertEqual(p['numeric'],2);self.assertEqual(p['zero'],1);self.assertTrue(p['observationFlags']);self.assertNotIn('flag',r['series'][0]['measureFacets'])
 def test_two_flags_for_same_native_period_do_not_create_two_values(self):self.assertFalse(self.audit([self.row(),self.row(flag='5')],attributes=self.attributes())['validated'])
 def test_numeric_with_explicit_unavailable_flag_is_conflict(self):self.assertFalse(self.audit([self.row(flag='1')],attributes=self.attributes())['validated'])
 def test_unknown_flag_is_not_silently_accepted(self):self.assertFalse(self.audit([self.row(flag='999')],attributes=self.attributes())['validated'])
if __name__=='__main__':unittest.main()
